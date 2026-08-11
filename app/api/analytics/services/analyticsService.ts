import { and, count, countDistinct, desc, eq, gte, inArray, lte, max, min, type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { events, goals as goalsTable, pageViews, projects } from '@/db/schema';
import { db } from '@/lib/db';
import { requireAnd } from '@/lib/sql';
import { isValidUuid } from '@/lib/uuid';
import type {
  AnalyticsResponse,
  BrowserData,
  CampaignData,
  CityData,
  CountryData,
  DeviceData,
  EventData,
  EventPropertyKeyData,
  EventPropertyQueryOptions,
  EventPropertyValueData,
  GoalConversionData,
  GranularityType,
  MetricData,
  OSData,
  PageData,
  QueryOptions,
  RealtimeResponse,
  RecentEvent,
  ResourceTimingData,
  SourceData,
  TimeRange,
  UtmBreakdownData,
  WebVitalBreakdown,
  WebVitalBreakdownItem,
  WebVitalData,
  WebVitalDimension,
} from '../types';
import { DATE_RANGES, WEB_VITAL_BREAKDOWN_DIMENSIONS } from '../types';
import {
  addPeriods,
  calculatePercentageChange,
  generateTimeBuckets,
  generateTimeLabels,
  getDateRangeDetails,
  normalizeTimezone,
  periodStartFor,
} from '../utils/dateUtils';
import { queryEventPropertyBreakdown, queryEventPropertyKeys } from './eventPropertyQueries';

interface SessionRollupRow {
  sessionId: string;
  userId: string | null;
  firstTs: Date;
  pageCount: number;
  timestamps: string[];
}

interface SessionPageSequenceRow {
  sessionId: string;
  paths: string[];
  timestamps: string[];
}

// Process-local cache for getAnalytics results. Serverless instances stay
// warm across nearby requests (tab switches, filter toggles on the same
// dashboard view), so this avoids re-running ~15 queries against the
// database for identical queries within the TTL. Not shared across
// instances/regions — that's fine, it's a latency optimization, not a
// correctness guarantee, and results are never more than TTL_MS stale.
const analyticsCache = new Map<string, { expiresAt: number; data: AnalyticsResponse }>();
const ANALYTICS_CACHE_TTL_MS = 60_000;

function analyticsCacheKey(options: QueryOptions): string {
  const { projectId, dateRange, timezone, filters, startDate, endDate } = options;
  return JSON.stringify({ projectId, dateRange, timezone, filters, startDate, endDate });
}

/** Nearest-rank percentile over an already-sorted numeric array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

/**
 * Dimension-filter conditions shared by pageview- and event-based queries —
 * both tables carry the same filterable columns (see db/schema/pageviews.ts
 * and events.ts), so every filter dimension applies the same way to both.
 */
function pageViewDimensionConditions(filters?: QueryOptions['filters']): SQL[] {
  const c: SQL[] = [];
  if (!filters) return c;
  if (filters.country?.length) c.push(inArray(pageViews.country, filters.country));
  if (filters.browser?.length) c.push(inArray(pageViews.browser, filters.browser));
  if (filters.device?.length) c.push(inArray(pageViews.device, filters.device));
  if (filters.source?.length) c.push(inArray(pageViews.source, filters.source));
  if (filters.page?.length) c.push(inArray(pageViews.path, filters.page));
  if (filters.utmSource?.length) c.push(inArray(pageViews.utmSource, filters.utmSource));
  if (filters.utmMedium?.length) c.push(inArray(pageViews.utmMedium, filters.utmMedium));
  if (filters.utmCampaign?.length) c.push(inArray(pageViews.utmCampaign, filters.utmCampaign));
  if (filters.os?.length) c.push(inArray(pageViews.os, filters.os));
  if (filters.city?.length) c.push(inArray(pageViews.city, filters.city));
  return c;
}

function eventDimensionConditions(filters?: QueryOptions['filters']): SQL[] {
  const c: SQL[] = [];
  if (!filters) return c;
  if (filters.country?.length) c.push(inArray(events.country, filters.country));
  if (filters.browser?.length) c.push(inArray(events.browser, filters.browser));
  if (filters.device?.length) c.push(inArray(events.device, filters.device));
  if (filters.source?.length) c.push(inArray(events.source, filters.source));
  if (filters.page?.length) c.push(inArray(events.path, filters.page));
  if (filters.utmSource?.length) c.push(inArray(events.utmSource, filters.utmSource));
  if (filters.utmMedium?.length) c.push(inArray(events.utmMedium, filters.utmMedium));
  if (filters.utmCampaign?.length) c.push(inArray(events.utmCampaign, filters.utmCampaign));
  if (filters.os?.length) c.push(inArray(events.os, filters.os));
  if (filters.city?.length) c.push(inArray(events.city, filters.city));
  return c;
}

/**
 * Analytics Service
 *
 * Core metrics (uniqueUsers/pageViews/sessions/bounceRate/avgSessionDuration
 * + their time series) are computed from two grouped session-rollup queries
 * (current + previous window, run concurrently) instead of Mongo's single
 * $facet aggregation — Postgres has no single-query equivalent of $facet,
 * and running the two windows as separate concurrent queries is simpler to
 * read than a hand-written multi-CTE query. See getCoreMetricsBundle.
 */
export class AnalyticsService {
  /**
   * Resolve the effective time range for a query. When `startDate`/`endDate`
   * are supplied (custom date range from the picker), they override the
   * preset's window; granularity is picked from the span so the chart
   * buckets remain readable.
   */
  private resolveTimeRange(
    dateRangeKey: string,
    timezone: string = 'UTC',
    startDate?: string,
    endDate?: string,
    allTimeStart?: Date,
  ): { timeRange: TimeRange; config: (typeof DATE_RANGES)[string]; previousRange: TimeRange } {
    const config = DATE_RANGES[dateRangeKey];
    if (!config) throw new Error(`Invalid date range: ${dateRangeKey}`);

    const tz = normalizeTimezone(timezone);

    if (!startDate && !endDate) {
      if (dateRangeKey === 'ALL_TIME' && allTimeStart) {
        return this.buildAllTimeRange(allTimeStart, tz);
      }
      // Default preset behaviour (delegate to dateUtils for parity).
      return getDateRangeDetails(dateRangeKey, tz);
    }

    const end = endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(end.getTime())) throw new Error('Invalid endDate');
    const now = new Date();
    if (!endDate) end.setTime(now.getTime());

    const start = startDate
      ? new Date(startDate)
      : (() => {
          const s = new Date(end);
          switch (config.granularity) {
            case 'minute':
              s.setHours(s.getHours() - 1);
              break;
            case 'hour':
              s.setDate(s.getDate() - 1);
              break;
            case 'day':
              s.setDate(s.getDate() - 30);
              break;
            case 'week':
              s.setMonth(s.getMonth() - 6);
              break;
            case 'month':
              s.setFullYear(s.getFullYear() - 1);
              break;
          }
          return s;
        })();
    if (Number.isNaN(start.getTime())) throw new Error('Invalid startDate');
    if (start > end) throw new Error('startDate must be before endDate');

    // Auto-pick granularity from span so chart buckets stay readable
    // regardless of the preset the request named.
    const spanMs = end.getTime() - start.getTime();
    let granularity = config.granularity;
    if (spanMs <= 60 * 60 * 1000) granularity = 'minute';
    else if (spanMs <= 24 * 60 * 60 * 1000) granularity = 'hour';
    else if (spanMs <= 90 * 24 * 60 * 60 * 1000) granularity = 'day';
    else if (spanMs <= 365 * 24 * 60 * 60 * 1000) granularity = 'week';
    else granularity = 'month';

    const timeRange: TimeRange = { start, end };
    const previousRange: TimeRange = {
      start: new Date(start.getTime() - spanMs - 1),
      end: new Date(start.getTime() - 1),
    };

    // Reuse a synthetic config so the rest of the pipeline reads granularity/dataPoints.
    const resolvedConfig = {
      ...config,
      granularity,
      dataPoints: Math.max(1, Math.ceil(spanMs / this.msPerBucket(granularity))),
    };
    return { timeRange, config: resolvedConfig, previousRange };
  }

  private msPerBucket(granularity: GranularityType): number {
    switch (granularity) {
      case 'minute':
        return 60 * 1000;
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  // ALL_TIME's monthly bucket count is capped so a very old project still
  // renders a readable chart instead of hundreds of monthly bars.
  private static readonly ALL_TIME_MAX_MONTHS = 60;

  /**
   * Project.createdAt (used as the start of "All Time" instead of a fixed
   * lookback window — without it ALL_TIME always showed the same ~5-year
   * window regardless of when the project was actually created) and
   * Project.timezone (the saved reporting timezone, if the project owner
   * set one in Settings — see AnalyticsService.getAnalytics, where it takes
   * priority over whatever timezone the individual viewer's browser
   * reports, so every viewer of a given project sees the same buckets).
   */
  private async resolveProjectTimeContext(projectId: string): Promise<{ createdAt: Date; timezone?: string | null }> {
    const [project] = await db
      .select({ createdAt: projects.createdAt, timezone: projects.timezone })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return { createdAt: project?.createdAt ?? new Date(), timezone: project?.timezone };
  }

  private buildAllTimeRange(
    creationDate: Date,
    timezone: string,
  ): { timeRange: TimeRange; config: (typeof DATE_RANGES)[string]; previousRange: TimeRange } {
    const config = DATE_RANGES.ALL_TIME;
    const now = new Date();

    const currentMonthStart = periodStartFor(now, 'month', timezone);
    const desiredStartMonth = periodStartFor(creationDate, 'month', timezone);
    // Never look back further than the cap, even if the project is older.
    const earliestAllowedStart = addPeriods(
      currentMonthStart,
      -(AnalyticsService.ALL_TIME_MAX_MONTHS - 1),
      'month',
      timezone,
    );
    const start =
      desiredStartMonth.getTime() > earliestAllowedStart.getTime() ? desiredStartMonth : earliestAllowedStart;

    let dataPoints = 1;
    let cursor = start;
    while (cursor.getTime() < currentMonthStart.getTime() && dataPoints < AnalyticsService.ALL_TIME_MAX_MONTHS) {
      cursor = addPeriods(cursor, 1, 'month', timezone);
      dataPoints++;
    }

    const end = new Date(addPeriods(currentMonthStart, 1, 'month', timezone).getTime() - 1);
    const spanMs = end.getTime() - start.getTime();
    const previousRange: TimeRange = {
      start: new Date(start.getTime() - spanMs - 1),
      end: new Date(start.getTime() - 1),
    };

    return {
      timeRange: { start, end },
      config: { ...config, dataPoints },
      previousRange,
    };
  }

  /**
   * Get comprehensive analytics data for a project. Cached in-process for
   * ANALYTICS_CACHE_TTL_MS so repeated requests for the same query (tab
   * switches, filter toggles) skip the ~15-query round-trip.
   */
  async getAnalytics(options: QueryOptions): Promise<AnalyticsResponse> {
    const key = analyticsCacheKey(options);
    const cached = analyticsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchAnalytics(options);
    analyticsCache.set(key, { expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS, data });
    return data;
  }

  private async fetchAnalytics(options: QueryOptions): Promise<AnalyticsResponse> {
    const { projectId, dateRange, timezone = 'UTC', filters, startDate, endDate } = options;

    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const { createdAt: projectCreatedAt, timezone: projectTimezone } = await this.resolveProjectTimeContext(projectId);
    const tzResolved = normalizeTimezone(projectTimezone || timezone);
    const allTimeStart = dateRange === 'ALL_TIME' && !startDate && !endDate ? projectCreatedAt : undefined;
    const { timeRange, config, previousRange } = this.resolveTimeRange(
      dateRange,
      tzResolved,
      startDate,
      endDate,
      allTimeStart,
    );

    // One condition list drives every dimension — filters apply uniformly
    // to core metrics and every breakdown, which is what makes
    // click-to-filter (drill into a country/browser/page and see the whole
    // page re-scope) possible.
    const dimConditions = pageViewDimensionConditions(filters);
    const eventDimConditions = eventDimensionConditions(filters);

    // Goals are only defined per-project when the user opts in via
    // settings, so this is a cheap indexed lookup — the (usually empty)
    // common case costs one extra small round-trip, and conversion
    // computation itself is skipped entirely when there are none.
    const projectGoals = await db.select().from(goalsTable).where(eq(goalsTable.projectId, projectId));

    const [
      core,
      pages,
      sources,
      countries,
      browsers,
      devices,
      os,
      cities,
      campaigns,
      utmBreakdown,
      { entryPages, exitPages },
      goalConversions,
      webVitals,
      webVitalsBreakdown,
      resourceTimings,
      topEvents,
      recentEvents,
    ] = await Promise.all([
      this.getCoreMetricsBundle(
        projectId,
        dimConditions,
        timeRange,
        previousRange,
        config.granularity,
        config.dataPoints,
        tzResolved,
      ),
      this.getTopPages(projectId, dimConditions, timeRange, previousRange),
      this.getTopSources(projectId, dimConditions, timeRange),
      this.getUsersByCountry(projectId, dimConditions, timeRange),
      this.getUsersByBrowser(projectId, dimConditions, timeRange),
      this.getUsersByDevice(projectId, dimConditions, timeRange),
      this.getUsersByOS(projectId, dimConditions, timeRange),
      this.getUsersByCity(projectId, dimConditions, timeRange),
      this.getTopCampaigns(projectId, dimConditions, timeRange),
      this.getUtmBreakdown(projectId, dimConditions, timeRange),
      this.getEntryExitPages(projectId, dimConditions, timeRange),
      this.getGoalConversions(projectGoals, projectId, dimConditions, eventDimConditions, timeRange),
      this.getWebVitals(projectId, eventDimConditions, timeRange),
      this.getWebVitalsBreakdown(projectId, eventDimConditions, timeRange),
      this.getResourceTimings(projectId, eventDimConditions, timeRange),
      this.getTopEvents(projectId, eventDimConditions, timeRange),
      this.getRecentEvents(projectId, eventDimConditions, timeRange),
    ]);

    return {
      timeRange,
      granularity: config.granularity,
      ...core,
      pages,
      sources,
      countries,
      browsers,
      devices,
      os,
      cities,
      campaigns,
      utmBreakdown,
      entryPages,
      exitPages,
      goals: goalConversions,
      webVitals,
      webVitalsBreakdown,
      resourceTimings,
      topEvents,
      recentEvents,
    };
  }

  /**
   * Active-now visitors, derived from the last 5 minutes of pageviews.
   * Deliberately cheap: no aggregation over historical ranges, just a
   * narrow indexed timestamp scan.
   */
  async getRealtime(projectId: string, windowMs: number = 5 * 60 * 1000): Promise<RealtimeResponse> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const since = new Date(Date.now() - windowMs);
    const rows = await db.execute<{
      session_id: string;
      path: string;
      country: string | null;
      last_active_at: Date;
    }>(sql`
      SELECT DISTINCT ON (${pageViews.sessionId}) ${pageViews.sessionId} AS session_id, ${pageViews.path} AS path, ${pageViews.country} AS country, ${pageViews.timestamp} AS last_active_at
      FROM ${pageViews}
      WHERE ${pageViews.projectId} = ${projectId} AND ${pageViews.timestamp} >= ${since.toISOString()}
      ORDER BY ${pageViews.sessionId}, ${pageViews.timestamp} DESC
    `);

    const visitors = rows
      .map((r) => ({
        sessionId: r.session_id,
        path: r.path,
        country: r.country ?? undefined,
        lastActiveAt: new Date(r.last_active_at).toISOString(),
      }))
      .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
      .slice(0, 50);

    return { count: visitors.length, visitors };
  }

  /**
   * Event documents carry the same dimension fields as PageView (country,
   * browser, device, path, source, UTM — see db/schema/events.ts), so every
   * filter dimension applies the same way to event-based panels as it does
   * to pageview-based ones.
   */
  private async getSessionRollup(
    projectId: string,
    dimConditions: SQL[],
    window: { start: Date; end: Date },
  ): Promise<SessionRollupRow[]> {
    const rows = await db
      .select({
        sessionId: pageViews.sessionId,
        // Old Mongo pipeline used `$first: '$userId'` — only ever consumed
        // downstream as "some non-null identity for that session", so any
        // single-value aggregate is equivalent.
        userId: max(pageViews.userId),
        // MIN over a GROUP BY session_id is never null — every group has
        // at least one row by construction.
        firstTs: min(pageViews.timestamp),
        pageCount: count(),
        // jsonb_agg, not array_agg — a raw array_agg(...) inside a typed
        // .select() field comes back from postgres.js as an unparsed
        // Postgres array-literal string, not a JS array; jsonb_agg is
        // reliably parsed.
        timestamps: sql<string[]>`jsonb_agg(${pageViews.timestamp})`,
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, window.start),
          lte(pageViews.timestamp, window.end),
        ),
      )
      .groupBy(pageViews.sessionId);
    return rows as SessionRollupRow[];
  }

  /**
   * Computes current and previous core metrics from two grouped
   * session-rollup queries run concurrently. Session rollups preserve
   * per-window bounce-rate and duration semantics; page-view counts are
   * derived from the same rollup (sum of pageCount) to avoid a redundant
   * extra query.
   */
  private async getCoreMetricsBundle(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
    previousRange: TimeRange,
    granularity: GranularityType,
    dataPoints: number,
    timezone: string,
  ): Promise<{
    uniqueUsers: MetricData;
    pageViews: MetricData;
    sessions: MetricData;
    bounceRate: MetricData;
    avgSessionDuration: MetricData;
  }> {
    const [currentSessions, previousSessions] = await Promise.all([
      this.getSessionRollup(projectId, dimConditions, {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      }),
      this.getSessionRollup(projectId, dimConditions, {
        start: new Date(previousRange.start),
        end: new Date(previousRange.end),
      }),
    ]);

    const buckets = generateTimeBuckets(new Date(timeRange.start), dataPoints, granularity, timezone);
    const labels = generateTimeLabels(new Date(timeRange.start), dataPoints, granularity, timezone);

    // Already fetched per-session in currentSessionRollup — reusing it here
    // avoids a redundant query re-scanning the same rows.
    const pageViewTimestamps = currentSessions.flatMap((s) => s.timestamps);
    const currentViews = pageViewTimestamps.length;
    const previousViews = previousSessions.reduce((acc, s) => acc + s.pageCount, 0);

    // Identity for "unique users" is the persistent userId when present,
    // falling back to sessionId for anonymous rows so every session still
    // counts as at least one user. This is deliberately distinct from
    // "sessions" below, which always counts sessionId.
    const identityOf = (s: SessionRollupRow) => s.userId || s.sessionId;

    // Sessions series — bucketed by each session's first pageview.
    const sessionBucketMap = new Map<number, number>();
    for (const s of currentSessions) {
      const idx = this.findBucketIndex(new Date(s.firstTs), buckets, granularity, timezone);
      if (idx !== -1) sessionBucketMap.set(idx, (sessionBucketMap.get(idx) || 0) + 1);
    }
    const sessionSeries = labels.map((_, i) => sessionBucketMap.get(i) || 0);

    // Unique-users series — bucketed by each distinct user's earliest
    // session start in the window, so a returning user with several
    // sessions is only counted once, in their first bucket.
    const userFirstSeen = (sessions: SessionRollupRow[]) => {
      const map = new Map<string, Date>();
      for (const s of sessions) {
        const id = identityOf(s);
        const ts = new Date(s.firstTs);
        const existing = map.get(id);
        if (!existing || ts < existing) map.set(id, ts);
      }
      return map;
    };
    const currentUserFirstSeen = userFirstSeen(currentSessions);
    const previousUserFirstSeen = userFirstSeen(previousSessions);

    const userBucketMap = new Map<number, number>();
    for (const ts of currentUserFirstSeen.values()) {
      const idx = this.findBucketIndex(ts, buckets, granularity, timezone);
      if (idx !== -1) userBucketMap.set(idx, (userBucketMap.get(idx) || 0) + 1);
    }
    const userSeries = labels.map((_, i) => userBucketMap.get(i) || 0);

    // Page views series — bucketed by each raw pageview's own timestamp.
    const viewBucketMap = new Map<number, number>();
    for (const timestamp of pageViewTimestamps) {
      const idx = this.findBucketIndex(new Date(timestamp), buckets, granularity, timezone);
      if (idx !== -1) viewBucketMap.set(idx, (viewBucketMap.get(idx) || 0) + 1);
    }
    const viewSeries = labels.map((_, i) => viewBucketMap.get(i) || 0);

    const currentUsers = currentUserFirstSeen.size;
    const previousUsers = previousUserFirstSeen.size;
    const currentSessionCount = currentSessions.length;
    const previousSessionCount = previousSessions.length;

    const bounceOf = (rollup: SessionRollupRow[]) => {
      if (rollup.length === 0) return 0;
      const bounced = rollup.filter((s) => s.pageCount === 1).length;
      return (bounced / rollup.length) * 100;
    };

    // Gaps between consecutive pageviews are clipped to this ceiling before
    // being summed, so a tab left open in the background for hours doesn't
    // get counted as active session time and blow out the average.
    const MAX_GAP_SEC = 30 * 60;

    const durationOf = (rollup: SessionRollupRow[]) => {
      if (rollup.length === 0) return 0;
      const totalSec = rollup.reduce((acc, s) => {
        if (s.pageCount <= 1) return acc;
        const sorted = [...s.timestamps].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        let sessionSec = 0;
        for (let i = 1; i < sorted.length; i++) {
          const gapSec = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 1000;
          sessionSec += Math.min(gapSec, MAX_GAP_SEC);
        }
        return acc + sessionSec;
      }, 0);
      return totalSec / rollup.length;
    };

    const currentBounce = bounceOf(currentSessions);
    const previousBounce = bounceOf(previousSessions);
    const currentDuration = durationOf(currentSessions);
    const previousDuration = durationOf(previousSessions);

    return {
      uniqueUsers: {
        total: currentUsers,
        previous: previousUsers,
        change: calculatePercentageChange(currentUsers, previousUsers),
        data: userSeries,
        labels,
      },
      pageViews: {
        total: currentViews,
        previous: previousViews,
        change: calculatePercentageChange(currentViews, previousViews),
        data: viewSeries,
        labels,
      },
      sessions: {
        total: currentSessionCount,
        previous: previousSessionCount,
        change: calculatePercentageChange(currentSessionCount, previousSessionCount),
        data: sessionSeries,
        labels,
      },
      bounceRate: {
        total: Math.round(currentBounce * 100) / 100,
        previous: Math.round(previousBounce * 100) / 100,
        change: calculatePercentageChange(currentBounce, previousBounce),
        data: [],
        labels: [],
      },
      avgSessionDuration: {
        total: Math.round(currentDuration),
        previous: Math.round(previousDuration),
        change: calculatePercentageChange(currentDuration, previousDuration),
        data: [],
        labels: [],
      },
    };
  }

  /**
   * Get top pages data, including per-page bounce rate and avg time on
   * page. No Session table exists, so both are derived from ordered
   * per-session pageview sequences computed in application code — the same
   * division of labor getCoreMetricsBundle uses for its own bounce/duration
   * numbers, just keyed by path instead of aggregated across the session.
   *
   * bounceRate for a path = of the sessions that *entered* on that path,
   * the fraction that were single-pageview (bounce) sessions — matches the
   * "entry page" definition already used by getEntryExitPages.
   * avgTimeOnPage = mean gap to the *next* pageview in the same session for
   * visits to that path; a page with no following pageview (last page of a
   * session) contributes no data point, matching how GA/Plausible exclude
   * exit-only visits from this average.
   */
  private async getTopPages(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
    previousRange: TimeRange,
  ): Promise<PageData[]> {
    const narrowWindow = and(
      eq(pageViews.projectId, projectId),
      ...dimConditions,
      gte(pageViews.timestamp, new Date(timeRange.start)),
      lte(pageViews.timestamp, new Date(timeRange.end)),
    );

    const [result, sessionRows] = await Promise.all([
      db
        .select({ path: pageViews.path, views: count(), users: countDistinct(pageViews.sessionId) })
        .from(pageViews)
        .where(narrowWindow)
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(20),
      // Widened past the window's start (to `previousRange.start`) so a
      // session that began before the window isn't misread as a bounce —
      // same fix getCoreMetricsBundle applies to its own session rollups.
      db
        .select({
          sessionId: pageViews.sessionId,
          // jsonb_agg, not array_agg — see getSessionRollup's comment above.
          paths: sql<string[]>`jsonb_agg(${pageViews.path} ORDER BY ${pageViews.timestamp})`,
          timestamps: sql<string[]>`jsonb_agg(${pageViews.timestamp} ORDER BY ${pageViews.timestamp})`,
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            ...dimConditions,
            gte(pageViews.timestamp, new Date(previousRange.start)),
            lte(pageViews.timestamp, new Date(timeRange.end)),
          ),
        )
        .groupBy(pageViews.sessionId) as unknown as Promise<SessionPageSequenceRow[]>,
    ]);

    const windowStart = new Date(timeRange.start).getTime();
    const windowEnd = new Date(timeRange.end).getTime();

    const entryBounce = new Map<string, { entries: number; bounces: number }>();
    const duration = new Map<string, { totalSec: number; count: number }>();

    for (const session of sessionRows) {
      const pages = session.paths.map((path, i) => ({ path, timestamp: session.timestamps[i] }));
      if (pages.length === 0) continue;

      const entryTs = new Date(pages[0].timestamp).getTime();
      if (entryTs >= windowStart && entryTs <= windowEnd) {
        const stat = entryBounce.get(pages[0].path) ?? { entries: 0, bounces: 0 };
        stat.entries += 1;
        if (pages.length === 1) stat.bounces += 1;
        entryBounce.set(pages[0].path, stat);
      }

      for (let i = 0; i < pages.length - 1; i++) {
        const curTs = new Date(pages[i].timestamp).getTime();
        if (curTs < windowStart || curTs > windowEnd) continue;
        const seconds = (new Date(pages[i + 1].timestamp).getTime() - curTs) / 1000;
        const stat = duration.get(pages[i].path) ?? { totalSec: 0, count: 0 };
        stat.totalSec += seconds;
        stat.count += 1;
        duration.set(pages[i].path, stat);
      }
    }

    return result.map((item) => {
      const bounceStat = entryBounce.get(item.path);
      const durationStat = duration.get(item.path);
      return {
        path: item.path,
        views: item.views,
        users: item.users,
        bounceRate:
          bounceStat && bounceStat.entries > 0
            ? Math.round((bounceStat.bounces / bounceStat.entries) * 10000) / 100
            : undefined,
        avgTimeOnPage:
          durationStat && durationStat.count > 0 ? Math.round(durationStat.totalSec / durationStat.count) : undefined,
      };
    });
  }

  /**
   * Get top traffic sources — `source` is computed and stored at ingest
   * time (see trackingService.deriveSource), so this is a plain indexed
   * GROUP BY instead of regex-parsing `referrer` on every query.
   */
  private async getTopSources(projectId: string, dimConditions: SQL[], timeRange: TimeRange): Promise<SourceData[]> {
    const result = await db
      .select({
        name: sql<string>`coalesce(${pageViews.source}, 'Direct')`,
        users: countDistinct(pageViews.sessionId),
        sessions: countDistinct(pageViews.sessionId),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
        ),
      )
      .groupBy(sql`coalesce(${pageViews.source}, 'Direct')`)
      .orderBy(desc(countDistinct(pageViews.sessionId)))
      .limit(10);

    return result;
  }

  /**
   * Get top UTM campaigns — buckets by utmCampaign, falling back to
   * "(none)" for traffic with no campaign tag (direct/organic visits).
   */
  private async getTopCampaigns(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<CampaignData[]> {
    const result = await db
      .select({
        name: sql<string>`coalesce(${pageViews.utmCampaign}, '(none)')`,
        users: countDistinct(pageViews.sessionId),
        sessions: countDistinct(pageViews.sessionId),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
        ),
      )
      .groupBy(sql`coalesce(${pageViews.utmCampaign}, '(none)')`)
      .orderBy(desc(countDistinct(pageViews.sessionId)))
      .limit(10);

    return result;
  }

  /**
   * Conversion rate for a single goal over a preset date range, unfiltered
   * by dashboard dimensions — used by goal-based alerting (see
   * app/api/projects/[id]/alerts/check/route.ts), which evaluates a goal
   * against its site-wide rate rather than a dashboard-scoped view.
   */
  async getGoalConversionRate(
    projectId: string,
    goal: { id: string; name: string; type: 'page' | 'event'; matchValue: string },
    dateRangeKey: string,
  ): Promise<GoalConversionData> {
    const { timeRange } = this.resolveTimeRange(dateRangeKey);
    const [result] = await this.getGoalConversions([goal], projectId, [], [], timeRange);
    return result;
  }

  /**
   * Goal conversion rates — for each defined goal, counts distinct sessions
   * that hit the matching page (type:'page') or fired the matching custom
   * event (type:'event') within the window, against the same dimension
   * filters as everything else. Skips the query work entirely when the
   * project has no goals defined.
   */
  private async getGoalConversions(
    projectGoals: Array<{ id: string; name: string; type: 'page' | 'event'; matchValue: string }>,
    projectId: string,
    dimConditions: SQL[],
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<GoalConversionData[]> {
    if (!projectGoals.length) return [];

    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    const pageViewMatch = and(
      eq(pageViews.projectId, projectId),
      ...dimConditions,
      gte(pageViews.timestamp, start),
      lte(pageViews.timestamp, end),
    );
    const eventMatch = and(
      eq(events.projectId, projectId),
      ...eventDimConditions,
      gte(events.timestamp, start),
      lte(events.timestamp, end),
    );

    // Denominator is every session with qualifying activity — pageview or
    // event — under the same filters, not just pageview sessions. Using
    // pageview-only sessions here would undercount the denominator for
    // event-goal conversions from sessions that fired an event without a
    // matching pageview.
    const [pageViewSessionRows, eventSessionRows] = await Promise.all([
      db.selectDistinct({ sessionId: pageViews.sessionId }).from(pageViews).where(pageViewMatch),
      db.selectDistinct({ sessionId: events.sessionId }).from(events).where(eventMatch),
    ]);
    const totalSessions = new Set([
      ...pageViewSessionRows.map((r) => r.sessionId),
      ...eventSessionRows.map((r) => r.sessionId),
    ]).size;

    const results: GoalConversionData[] = [];
    for (const goal of projectGoals) {
      let conversions = 0;
      if (goal.type === 'page') {
        const [row] = await db
          .select({ count: countDistinct(pageViews.sessionId) })
          .from(pageViews)
          .where(and(pageViewMatch, eq(pageViews.path, goal.matchValue)));
        conversions = row?.count ?? 0;
      } else {
        const [row] = await db
          .select({ count: countDistinct(events.sessionId) })
          .from(events)
          .where(and(eventMatch, eq(events.name, goal.matchValue)));
        conversions = row?.count ?? 0;
      }

      results.push({
        goalId: goal.id,
        name: goal.name,
        type: goal.type,
        conversions,
        totalSessions,
        rate: totalSessions > 0 ? Math.round((conversions / totalSessions) * 10000) / 100 : 0,
      });
    }

    return results;
  }

  /**
   * Web Vitals (LCP/CLS/INP) — p50 and p75 per metric. p75 is the standard
   * threshold used to judge "good"/"needs improvement"/"poor" (matches
   * Google's own reporting convention); p50 is shown alongside it so a p75
   * regression can be told apart from a shift in the typical (median)
   * experience vs. just a heavier slow tail. Computed in application code
   * from a grouped value array rather than a SQL percentile function, for
   * parity with the Mongo-era implementation (which avoided requiring
   * MongoDB 7+'s $percentile) — a straight port keeps behavior identical.
   */
  private async getWebVitals(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<WebVitalData[]> {
    const rows = await db.execute<{ metric: string; values: number[] }>(sql`
      SELECT (${events.data} ->> 'metric') AS metric, array_agg((${events.data} ->> 'value')::double precision) AS values
      FROM ${events}
      WHERE ${and(eq(events.projectId, projectId), ...eventDimConditions, eq(events.name, '__web_vital'), gte(events.timestamp, new Date(timeRange.start)), lte(events.timestamp, new Date(timeRange.end)))}
      GROUP BY metric
    `);

    return rows
      .filter((r): r is { metric: 'LCP' | 'CLS' | 'INP'; values: number[] } => ['LCP', 'CLS', 'INP'].includes(r.metric))
      .map((r) => {
        const sorted = [...r.values].sort((a, b) => a - b);
        return {
          metric: r.metric,
          p50: percentile(sorted, 0.5),
          p75: percentile(sorted, 0.75),
          samples: sorted.length,
        };
      });
  }

  /**
   * p75-per-metric grouped by an extra dimension (page path, country,
   * device, or browser) so a regression can be traced to a specific slice
   * instead of only the site-wide aggregate. Each dimension is a top-level
   * indexed events column, not the jsonb `data` field — trackEvent already
   * writes both.
   */
  private async getWebVitalsBreakdown(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<WebVitalBreakdown> {
    const dimensionColumns: Record<WebVitalDimension, PgColumn> = {
      page: events.path,
      country: events.country,
      device: events.device,
      browser: events.browser,
    };

    const entries = await Promise.all(
      WEB_VITAL_BREAKDOWN_DIMENSIONS.map(async (dimension) => {
        const items = await this.getWebVitalsByDimension(
          projectId,
          eventDimConditions,
          timeRange,
          dimensionColumns[dimension],
        );
        return [dimension, items] as const;
      }),
    );

    return Object.fromEntries(entries) as WebVitalBreakdown;
  }

  private async getWebVitalsByDimension(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
    dimensionColumn: PgColumn,
  ): Promise<WebVitalBreakdownItem[]> {
    const rows = await db.execute<{ key: string | null; metric: string; values: number[] }>(sql`
      SELECT ${dimensionColumn} AS key, (${events.data} ->> 'metric') AS metric, array_agg((${events.data} ->> 'value')::double precision) AS values
      FROM ${events}
      WHERE ${and(eq(events.projectId, projectId), ...eventDimConditions, eq(events.name, '__web_vital'), gte(events.timestamp, new Date(timeRange.start)), lte(events.timestamp, new Date(timeRange.end)))}
      GROUP BY key, metric
    `);

    const itemByKey = new Map<string, WebVitalBreakdownItem>();
    for (const row of rows) {
      if (!row.key || !['LCP', 'CLS', 'INP'].includes(row.metric)) continue;
      const sorted = [...row.values].sort((a, b) => a - b);
      const p75 = percentile(sorted, 0.75);

      const item = itemByKey.get(row.key) ?? { key: row.key, samples: 0 };
      if (row.metric === 'LCP') item.lcp = p75;
      else if (row.metric === 'CLS') item.cls = p75;
      else if (row.metric === 'INP') item.inp = p75;
      item.samples += sorted.length;
      itemByKey.set(row.key, item);
    }

    return [...itemByKey.values()].sort((a, b) => b.samples - a.samples).slice(0, 20);
  }

  /**
   * Slowest resources across all page loads. The tracker only reports
   * resources over 200ms, sampled at 20% of pageviews (see tracker.js), so
   * `samples` undercounts real request volume — it's a signal of which
   * assets are slow, not a precise hit count.
   */
  private async getResourceTimings(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<ResourceTimingData[]> {
    const rows = await db.execute<{ name: string; type: string; duration: number; size: number }>(sql`
      SELECT
        (resource ->> 'name') AS name,
        (resource ->> 'type') AS type,
        (resource ->> 'duration')::double precision AS duration,
        (resource ->> 'size')::double precision AS size
      FROM ${events}, jsonb_array_elements(${events.data} -> 'resources') AS resource
      WHERE ${and(eq(events.projectId, projectId), ...eventDimConditions, eq(events.name, '__resource_timing'), gte(events.timestamp, new Date(timeRange.start)), lte(events.timestamp, new Date(timeRange.end)))}
    `);

    const durationsByResource = new Map<
      string,
      { name: string; type: string; durations: number[]; totalSize: number }
    >();
    for (const row of rows) {
      const key = `${row.name}::${row.type}`;
      const entry = durationsByResource.get(key) ?? { name: row.name, type: row.type, durations: [], totalSize: 0 };
      entry.durations.push(row.duration);
      entry.totalSize += row.size;
      durationsByResource.set(key, entry);
    }

    return [...durationsByResource.values()]
      .map((entry) => ({
        name: entry.name,
        type: entry.type,
        p75Duration: percentile(
          [...entry.durations].sort((a, b) => a - b),
          0.75,
        ),
        avgSize: Math.round(entry.totalSize / entry.durations.length),
        samples: entry.durations.length,
      }))
      .sort((a, b) => b.p75Duration - a.p75Duration)
      .slice(0, 15);
  }

  /**
   * Entry/exit pages — per session, the first and last pageview path within
   * the window, then bucketed by path. Uses Postgres's DISTINCT ON to pick
   * one row per session directly, rather than the two-stage group-by-session
   * idiom the old Mongo pipeline needed.
   */
  private async getEntryExitPages(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<{ entryPages: PageData[]; exitPages: PageData[] }> {
    const whereClause = and(
      eq(pageViews.projectId, projectId),
      ...dimConditions,
      gte(pageViews.timestamp, new Date(timeRange.start)),
      lte(pageViews.timestamp, new Date(timeRange.end)),
    );

    const [entryRows, exitRows] = await Promise.all([
      db.execute<{ path: string; sessions: number }>(sql`
        WITH entries AS (
          SELECT DISTINCT ON (${pageViews.sessionId}) ${pageViews.path} AS path
          FROM ${pageViews}
          WHERE ${whereClause}
          ORDER BY ${pageViews.sessionId}, ${pageViews.timestamp} ASC
        )
        SELECT path, COUNT(*)::int AS sessions FROM entries GROUP BY path ORDER BY sessions DESC LIMIT 10
      `),
      db.execute<{ path: string; sessions: number }>(sql`
        WITH exits AS (
          SELECT DISTINCT ON (${pageViews.sessionId}) ${pageViews.path} AS path
          FROM ${pageViews}
          WHERE ${whereClause}
          ORDER BY ${pageViews.sessionId}, ${pageViews.timestamp} DESC
        )
        SELECT path, COUNT(*)::int AS sessions FROM exits GROUP BY path ORDER BY sessions DESC LIMIT 10
      `),
    ]);

    const toPageData = (rows: { path: string; sessions: number }[]): PageData[] =>
      rows.map((r) => ({ path: r.path, users: Number(r.sessions), views: Number(r.sessions) }));

    return { entryPages: toPageData(entryRows), exitPages: toPageData(exitRows) };
  }

  /**
   * Get users by country
   */
  private async getUsersByCountry(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<CountryData[]> {
    const result = await db
      .select({
        country: pageViews.country,
        users: countDistinct(pageViews.sessionId),
        sessions: countDistinct(pageViews.sessionId),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
        ),
      )
      .groupBy(pageViews.country)
      .orderBy(desc(countDistinct(pageViews.sessionId)))
      .limit(10);

    return result.map((item) => ({
      country: item.country || 'Unknown',
      countryCode: item.country || 'UN',
      users: item.users,
      sessions: item.sessions,
    }));
  }

  /**
   * Builds a "top-3 sub-values" summary per top-level group (e.g. per
   * browser, which versions; per OS, which versions) — a display-only
   * detail string rather than a separate filterable dimension, so version
   * fragmentation doesn't dilute the primary Browsers/OS tabs. Only rows
   * ingested after browserVersion/osVersion started being persisted will
   * have a sub-value; older rows are excluded rather than showing as a
   * misleading "(none) (100%)" bucket.
   */
  private async getVersionSummaryMap(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
    groupColumn: typeof pageViews.browser | typeof pageViews.os,
    subColumn: typeof pageViews.browserVersion | typeof pageViews.osVersion,
  ): Promise<Map<string, string>> {
    const rows = await db
      .select({ group: groupColumn, sub: subColumn, count: count() })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
          sql`${subColumn} IS NOT NULL AND ${subColumn} <> ''`,
        ),
      )
      .groupBy(groupColumn, subColumn)
      .orderBy(desc(count()));

    const byGroup = new Map<string, { sub: string; count: number }[]>();
    for (const row of rows) {
      const group = row.group || 'Unknown';
      const sub = row.sub;
      if (!sub) continue;
      const arr = byGroup.get(group) ?? [];
      arr.push({ sub, count: row.count });
      byGroup.set(group, arr);
    }

    const summaries = new Map<string, string>();
    for (const [group, subs] of byGroup) {
      const total = subs.reduce((acc, s) => acc + s.count, 0);
      const top = subs
        .slice(0, 3)
        .map((s) => `v${s.sub} (${Math.round((s.count / total) * 100)}%)`)
        .join(', ');
      summaries.set(group, top);
    }
    return summaries;
  }

  /**
   * Get users by browser
   */
  private async getUsersByBrowser(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<BrowserData[]> {
    const [result, versionSummary] = await Promise.all([
      db
        .select({
          browser: pageViews.browser,
          users: countDistinct(pageViews.sessionId),
          sessions: countDistinct(pageViews.sessionId),
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            ...dimConditions,
            gte(pageViews.timestamp, new Date(timeRange.start)),
            lte(pageViews.timestamp, new Date(timeRange.end)),
          ),
        )
        .groupBy(pageViews.browser)
        .orderBy(desc(countDistinct(pageViews.sessionId)))
        .limit(10),
      this.getVersionSummaryMap(projectId, dimConditions, timeRange, pageViews.browser, pageViews.browserVersion),
    ]);

    return result.map((item) => ({
      browser: item.browser || 'Unknown',
      version: versionSummary.get(item.browser || 'Unknown'),
      users: item.users,
      sessions: item.sessions,
    }));
  }

  /**
   * Get users by device
   */
  private async getUsersByDevice(projectId: string, dimConditions: SQL[], timeRange: TimeRange): Promise<DeviceData[]> {
    const category = sql<
      'mobile' | 'tablet' | 'desktop'
    >`CASE ${pageViews.device} WHEN 'mobile' THEN 'mobile' WHEN 'tablet' THEN 'tablet' ELSE 'desktop' END`;
    const [result, modelSummary] = await Promise.all([
      db
        .select({
          device: pageViews.device,
          category,
          users: countDistinct(pageViews.sessionId),
          sessions: countDistinct(pageViews.sessionId),
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            ...dimConditions,
            gte(pageViews.timestamp, new Date(timeRange.start)),
            lte(pageViews.timestamp, new Date(timeRange.end)),
          ),
        )
        .groupBy(pageViews.device)
        .orderBy(desc(countDistinct(pageViews.sessionId)))
        .limit(10),
      this.getDeviceModelSummaryMap(projectId, dimConditions, timeRange),
    ]);

    return result.map((item) => ({
      device: item.device || 'desktop',
      category: item.category,
      detail: modelSummary.get(item.device || 'desktop'),
      users: item.users,
      sessions: item.sessions,
    }));
  }

  /**
   * Top-3 vendor+model combos per device category — same display-only
   * detail idea as getVersionSummaryMap, but keyed on a concatenated
   * vendor/model since neither field alone identifies a device.
   */
  private async getDeviceModelSummaryMap(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<Map<string, string>> {
    const rows = await db
      .select({
        device: pageViews.device,
        vendor: pageViews.deviceVendor,
        model: pageViews.deviceModel,
        count: count(),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
          sql`${pageViews.deviceModel} IS NOT NULL AND ${pageViews.deviceModel} <> ''`,
        ),
      )
      .groupBy(pageViews.device, pageViews.deviceVendor, pageViews.deviceModel)
      .orderBy(desc(count()));

    const byDevice = new Map<string, { label: string; count: number }[]>();
    for (const row of rows) {
      const device = row.device || 'desktop';
      const label = [row.vendor, row.model].filter(Boolean).join(' ');
      if (!label) continue;
      const arr = byDevice.get(device) ?? [];
      arr.push({ label, count: row.count });
      byDevice.set(device, arr);
    }

    const summaries = new Map<string, string>();
    for (const [device, models] of byDevice) {
      const total = models.reduce((acc, m) => acc + m.count, 0);
      const top = models
        .slice(0, 3)
        .map((m) => `${m.label} (${Math.round((m.count / total) * 100)}%)`)
        .join(', ');
      summaries.set(device, top);
    }
    return summaries;
  }

  /**
   * Get users by OS — mirrors getUsersByBrowser; `os` is stored/indexed the
   * same way.
   */
  private async getUsersByOS(projectId: string, dimConditions: SQL[], timeRange: TimeRange): Promise<OSData[]> {
    const [result, versionSummary] = await Promise.all([
      db
        .select({
          os: pageViews.os,
          users: countDistinct(pageViews.sessionId),
          sessions: countDistinct(pageViews.sessionId),
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            ...dimConditions,
            gte(pageViews.timestamp, new Date(timeRange.start)),
            lte(pageViews.timestamp, new Date(timeRange.end)),
          ),
        )
        .groupBy(pageViews.os)
        .orderBy(desc(countDistinct(pageViews.sessionId)))
        .limit(10),
      this.getVersionSummaryMap(projectId, dimConditions, timeRange, pageViews.os, pageViews.osVersion),
    ]);

    return result.map((item) => ({
      os: item.os || 'Unknown',
      version: versionSummary.get(item.os || 'Unknown'),
      users: item.users,
      sessions: item.sessions,
    }));
  }

  /**
   * Get users by city — `city`/`region` are best-effort (only populated
   * when the hosting edge/proxy supplies geo headers, see
   * trackingService.extractGeoData), so rows without a city are excluded
   * up front rather than surfacing as a noisy "Unknown" row.
   */
  private async getUsersByCity(projectId: string, dimConditions: SQL[], timeRange: TimeRange): Promise<CityData[]> {
    const result = await db
      .select({
        city: pageViews.city,
        region: pageViews.region,
        country: pageViews.country,
        users: countDistinct(pageViews.sessionId),
        sessions: countDistinct(pageViews.sessionId),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
          sql`${pageViews.city} IS NOT NULL`,
        ),
      )
      .groupBy(pageViews.city, pageViews.region, pageViews.country)
      .orderBy(desc(countDistinct(pageViews.sessionId)))
      .limit(10);

    return result.map((item) => ({
      city: item.city ?? '',
      region: item.region || '',
      country: item.country || 'Unknown',
      users: item.users,
      sessions: item.sessions,
    }));
  }

  /**
   * UTM source + medium + campaign combined breakdown — getTopCampaigns
   * stays as its own (campaign-only) query since collapsing this combo
   * data into a campaign-only rollup would double-count sessions that
   * appear under more than one source/medium for the same campaign.
   */
  private async getUtmBreakdown(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<UtmBreakdownData[]> {
    const source = sql<string>`coalesce(${pageViews.utmSource}, '(none)')`;
    const medium = sql<string>`coalesce(${pageViews.utmMedium}, '(none)')`;
    const campaign = sql<string>`coalesce(${pageViews.utmCampaign}, '(none)')`;

    const result = await db
      .select({
        source,
        medium,
        campaign,
        users: countDistinct(pageViews.sessionId),
        sessions: countDistinct(pageViews.sessionId),
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
        ),
      )
      .groupBy(source, medium, campaign)
      .orderBy(desc(countDistinct(pageViews.sessionId)))
      .limit(20);

    return result;
  }

  /**
   * Get top events
   */
  private async getTopEvents(projectId: string, eventDimConditions: SQL[], timeRange: TimeRange): Promise<EventData[]> {
    const result = await db
      .select({ name: events.name, count: count(), uniqueUsers: countDistinct(events.sessionId) })
      .from(events)
      .where(
        and(
          eq(events.projectId, projectId),
          ...eventDimConditions,
          gte(events.timestamp, new Date(timeRange.start)),
          lte(events.timestamp, new Date(timeRange.end)),
        ),
      )
      .groupBy(events.name)
      .orderBy(desc(count()))
      .limit(10);

    return result;
  }

  /**
   * Get recent events (newest first) within the selected time range.
   */
  private async getRecentEvents(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<RecentEvent[]> {
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.projectId, projectId),
          ...eventDimConditions,
          gte(events.timestamp, new Date(timeRange.start)),
          lte(events.timestamp, new Date(timeRange.end)),
        ),
      )
      .orderBy(desc(events.timestamp))
      .limit(20);

    return rows.map((e) => ({
      _id: e.id,
      name: e.name,
      url: e.url,
      path: e.path,
      data: e.data as RecentEvent['data'],
      sessionId: e.sessionId,
      timestamp: e.timestamp.toISOString(),
      country: e.country ?? undefined,
      browser: e.browser ?? undefined,
      device: e.device ?? undefined,
    })) satisfies RecentEvent[];
  }

  /**
   * Shared time-range/dimension-condition resolution for the on-demand
   * event property endpoints — same logic getAnalytics uses for the main
   * bundle, factored out since these are separate on-demand requests
   * rather than part of it.
   */
  private async resolveEventPropertyContext(
    projectId: string,
    dateRange: string,
    timezone: string,
    filters: EventPropertyQueryOptions['filters'],
    startDate?: string,
    endDate?: string,
  ): Promise<{ timeRange: TimeRange; eventDimConditions: SQL[] }> {
    const { createdAt: projectCreatedAt, timezone: projectTimezone } = await this.resolveProjectTimeContext(projectId);
    const tzResolved = normalizeTimezone(projectTimezone || timezone);
    const allTimeStart = dateRange === 'ALL_TIME' && !startDate && !endDate ? projectCreatedAt : undefined;
    const { timeRange } = this.resolveTimeRange(dateRange, tzResolved, startDate, endDate, allTimeStart);
    return { timeRange, eventDimConditions: eventDimensionConditions(filters) };
  }

  /**
   * Basic sanity guard on a user-controlled query param used as a jsonb key
   * — rejects operator-like keys ($-prefixed), dotted paths, null bytes,
   * and unreasonably long keys. The value itself is always bound as a SQL
   * parameter (see eventPropertyQueries.ts), so this isn't an injection
   * guard so much as input sanity-checking.
   */
  private isValidPropertyKey(key: string): boolean {
    return (
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 128 &&
      !key.startsWith('$') &&
      !key.includes('.') &&
      !key.includes('\0')
    );
  }

  /**
   * Distinct property keys observed on a custom event's structured `data`,
   * ranked by frequency — feeds the key-selector in the event property
   * drill-down UI. Only scalar-valued keys are surfaced (array/object
   * values are excluded) since "breakdown by property" only makes sense
   * for primitive values.
   */
  async getEventPropertyKeys(options: EventPropertyQueryOptions): Promise<EventPropertyKeyData[]> {
    const { projectId, eventName, dateRange, timezone = 'UTC', filters, startDate, endDate } = options;
    if (!isValidUuid(projectId)) throw new Error('Invalid project ID');

    const { timeRange, eventDimConditions } = await this.resolveEventPropertyContext(
      projectId,
      dateRange,
      timezone,
      filters,
      startDate,
      endDate,
    );

    const whereClause = requireAnd(
      eq(events.projectId, projectId),
      ...eventDimConditions,
      eq(events.name, eventName),
      gte(events.timestamp, new Date(timeRange.start)),
      lte(events.timestamp, new Date(timeRange.end)),
    );

    const rows = await queryEventPropertyKeys(whereClause);
    return rows.map((r) => ({ key: r.key, occurrences: r.occurrences }));
  }

  /**
   * Value distribution for one property key on a custom event.
   */
  async getEventPropertyBreakdown(
    options: EventPropertyQueryOptions & { propertyKey: string },
  ): Promise<EventPropertyValueData[]> {
    const { projectId, eventName, propertyKey, dateRange, timezone = 'UTC', filters, startDate, endDate } = options;
    if (!isValidUuid(projectId)) throw new Error('Invalid project ID');
    if (!this.isValidPropertyKey(propertyKey)) throw new Error('Invalid property key');

    const { timeRange, eventDimConditions } = await this.resolveEventPropertyContext(
      projectId,
      dateRange,
      timezone,
      filters,
      startDate,
      endDate,
    );

    const whereClause = requireAnd(
      eq(events.projectId, projectId),
      ...eventDimConditions,
      eq(events.name, eventName),
      gte(events.timestamp, new Date(timeRange.start)),
      lte(events.timestamp, new Date(timeRange.end)),
    );

    const rows = await queryEventPropertyBreakdown(whereClause, propertyKey);
    return rows.map((r) => ({ value: r.value, count: r.count, uniqueUsers: r.uniqueUsers }));
  }

  /**
   * Find the correct bucket index for a given timestamp
   */
  private findBucketIndex(timestamp: Date, buckets: Date[], granularity: GranularityType, timezone: string): number {
    for (let i = 0; i < buckets.length; i++) {
      const bucketStart = buckets[i];
      const bucketEnd = this.getBucketEnd(bucketStart, granularity, timezone);

      if (timestamp >= bucketStart && timestamp < bucketEnd) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get the end time for a time bucket
   */
  private getBucketEnd(bucketStart: Date, granularity: GranularityType, timezone: string): Date {
    return addPeriods(bucketStart, 1, granularity, timezone);
  }
}
