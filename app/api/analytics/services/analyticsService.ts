import { and, count, countDistinct, desc, eq, gte, inArray, lte, type SQL, sql } from 'drizzle-orm';

import { events, goals as goalsTable, pageViews, projects } from '@/db/schema';
import { db } from '@/lib/db';
import { requireAnd } from '@/lib/sql';
import { isValidUuid } from '@/lib/uuid';
import type {
  AnalyticsResponse,
  AnalyticsSegment,
  AnalyticsSegmentResponse,
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

interface SessionMetrics {
  sessions: number;
  users: number;
  views: number;
  bounced: number;
  durationTotalSec: number;
  sessionSeries: Map<number, number>;
  userSeries: Map<number, number>;
}

// Gaps between consecutive pageviews are clipped to this ceiling before
// being summed, so a tab left open in the background for hours doesn't get
// counted as active session time and blow out the average.
const MAX_GAP_SEC = 30 * 60;

// Process-local cache for getAnalytics results. Serverless instances stay
// warm across nearby requests (tab switches, filter toggles on the same
// dashboard view), so this avoids re-running ~15 queries against the
// database for identical queries within the TTL. Not shared across
// instances/regions — that's fine, it's a latency optimization, not a
// correctness guarantee, and results are never more than TTL_MS stale.
const analyticsCache = new Map<string, { expiresAt: number; data: AnalyticsSegmentResponse }>();
const ANALYTICS_CACHE_TTL_MS = 60_000;

type BreakdownDimension = 'country' | 'browser' | 'os' | 'device' | 'source' | 'campaign';
interface BreakdownRow {
  value: string | null;
  users: number;
  sessions: number;
}
const BREAKDOWN_LIMIT = 10;
const WEB_VITAL_METRICS: readonly WebVitalData['metric'][] = ['LCP', 'CLS', 'INP'];

function analyticsCacheKey(options: QueryOptions): string {
  const { projectId, dateRange, timezone, filters, startDate, endDate } = options;
  return JSON.stringify({ projectId, dateRange, timezone, filters, startDate, endDate });
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
    return (await this.getAnalyticsSegment(options, 'all')) as AnalyticsResponse;
  }

  async getAnalyticsSegment(options: QueryOptions, segment: AnalyticsSegment): Promise<AnalyticsSegmentResponse> {
    const key = `${segment}|${analyticsCacheKey(options)}`;
    const cached = analyticsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchAnalytics(options, segment);
    analyticsCache.set(key, { expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS, data });
    return data;
  }

  /**
   * Resolves everything a segment fetch needs before touching the metric
   * queries: the project's reporting timezone, the effective window, and
   * the shared dimension-filter conditions.
   */
  private async resolveQueryContext(options: QueryOptions) {
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
    return {
      projectId,
      tzResolved,
      timeRange,
      previousRange,
      config,
      dimConditions: pageViewDimensionConditions(filters),
      eventDimConditions: eventDimensionConditions(filters),
    };
  }

  /**
   * Fetches one slice of the dashboard. The panels have very different
   * costs, so requesting them together meant the fastest numbers waited on
   * the slowest panel before anything could render. Segments let the client
   * issue them in parallel and paint each as it lands; `all` preserves the
   * single-payload contract for the public dashboard and MCP tools.
   */
  private async fetchAnalytics(options: QueryOptions, segment: AnalyticsSegment): Promise<AnalyticsSegmentResponse> {
    const ctx = await this.resolveQueryContext(options);
    const wants = (s: AnalyticsSegment) => segment === 'all' || segment === s;

    const [core, breakdowns, insights] = await Promise.all([
      wants('core') ? this.fetchCoreSegment(ctx) : undefined,
      wants('breakdowns') ? this.fetchBreakdownSegment(ctx) : undefined,
      wants('insights') ? this.fetchInsightSegment(ctx, options.projectId) : undefined,
    ]);

    return {
      timeRange: ctx.timeRange,
      granularity: ctx.config.granularity,
      ...core,
      ...breakdowns,
      ...insights,
    };
  }

  private async fetchCoreSegment(ctx: Awaited<ReturnType<AnalyticsService['resolveQueryContext']>>) {
    const core = await this.getCoreMetricsBundle(
      ctx.projectId,
      ctx.dimConditions,
      ctx.timeRange,
      ctx.previousRange,
      ctx.config.granularity,
      ctx.config.dataPoints,
      ctx.tzResolved,
    );
    return core;
  }

  private async fetchBreakdownSegment(ctx: Awaited<ReturnType<AnalyticsService['resolveQueryContext']>>) {
    const { projectId, dimConditions, timeRange, previousRange } = ctx;
    const [pages, breakdowns, browserVersions, osVersions, deviceModels, cities, utmBreakdown, entryExit] =
      await Promise.all([
        this.getTopPages(projectId, dimConditions, timeRange, previousRange),
        this.getDimensionBreakdowns(projectId, dimConditions, timeRange),
        this.getVersionSummaryMap(projectId, dimConditions, timeRange, pageViews.browser, pageViews.browserVersion),
        this.getVersionSummaryMap(projectId, dimConditions, timeRange, pageViews.os, pageViews.osVersion),
        this.getDeviceModelSummaryMap(projectId, dimConditions, timeRange),
        this.getUsersByCity(projectId, dimConditions, timeRange),
        this.getUtmBreakdown(projectId, dimConditions, timeRange),
        this.getEntryExitPages(projectId, dimConditions, timeRange),
      ]);

    return {
      pages,
      sources: this.mapSources(breakdowns),
      countries: this.mapCountries(breakdowns),
      browsers: this.mapBrowsers(breakdowns, browserVersions),
      devices: this.mapDevices(breakdowns, deviceModels),
      os: this.mapOS(breakdowns, osVersions),
      campaigns: this.mapCampaigns(breakdowns),
      cities,
      utmBreakdown,
      entryPages: entryExit.entryPages,
      exitPages: entryExit.exitPages,
    };
  }

  private async fetchInsightSegment(
    ctx: Awaited<ReturnType<AnalyticsService['resolveQueryContext']>>,
    projectId: string,
  ) {
    const { dimConditions, eventDimConditions, timeRange } = ctx;

    // Goals are only defined per-project when the user opts in via
    // settings, so this is a cheap indexed lookup — the (usually empty)
    // common case costs one extra small round-trip, and conversion
    // computation itself is skipped entirely when there are none.
    const projectGoals = await db.select().from(goalsTable).where(eq(goalsTable.projectId, projectId));

    const [goalConversions, vitals, resourceTimings, topEvents, recentEvents] = await Promise.all([
      this.getGoalConversions(projectGoals, projectId, dimConditions, eventDimConditions, timeRange),
      this.getWebVitalsBundle(projectId, eventDimConditions, timeRange),
      this.getResourceTimings(projectId, eventDimConditions, timeRange),
      this.getTopEvents(projectId, eventDimConditions, timeRange),
      this.getRecentEvents(projectId, eventDimConditions, timeRange),
    ]);

    return {
      goals: goalConversions,
      webVitals: vitals.webVitals,
      webVitalsBreakdown: vitals.breakdown,
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
  /**
   * All session-derived core metrics for one window, computed entirely in
   * SQL. Nothing per-session crosses the wire: the response is a handful of
   * scalar rows plus at most one row per chart bucket, so the payload is
   * flat in the size of the window rather than linear in pageviews.
   *
   * `edges` drives the session/user series; pass null for the comparison
   * window, which only needs the scalars.
   */
  private async getSessionMetrics(
    projectId: string,
    dimConditions: SQL[],
    window: { start: Date; end: Date },
    edges: { starts: number[]; ends: number[] } | null,
  ): Promise<SessionMetrics> {
    const gap = sql`
      CASE
        WHEN lag(${pageViews.timestamp}) OVER (PARTITION BY ${pageViews.sessionId} ORDER BY ${pageViews.timestamp}) IS NULL
          THEN 0
        ELSE least(
          extract(epoch FROM ${pageViews.timestamp} - lag(${pageViews.timestamp}) OVER (PARTITION BY ${pageViews.sessionId} ORDER BY ${pageViews.timestamp})),
          ${MAX_GAP_SEC}
        )
      END`;

    // Identity mirrors the old JS `userId || sessionId`, where an empty
    // string is falsy — hence nullif, not a bare coalesce.
    const base = sql`
      WITH gaps AS (
        SELECT
          ${pageViews.sessionId} AS session_id,
          ${pageViews.userId} AS user_id,
          ${pageViews.timestamp} AS ts,
          ${gap} AS gap
        FROM ${pageViews}
        WHERE ${and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, window.start),
          lte(pageViews.timestamp, window.end),
        )}
      ),
      sess AS (
        SELECT
          session_id,
          coalesce(nullif(max(user_id), ''), session_id) AS identity,
          min(ts) AS first_ts,
          count(*)::int AS page_count,
          coalesce(sum(gap), 0) AS duration_sec
        FROM gaps
        GROUP BY session_id
      ),
      ident AS (
        SELECT identity, min(first_ts) AS first_ts FROM sess GROUP BY identity
      )`;

    const scalars = sql`
      SELECT 'sessions' AS kind, -1 AS idx, count(*)::double precision AS n FROM sess
      UNION ALL SELECT 'users', -1, count(*)::double precision FROM ident
      UNION ALL SELECT 'views', -1, coalesce(sum(page_count), 0)::double precision FROM sess
      UNION ALL SELECT 'bounced', -1, count(*) FILTER (WHERE page_count = 1)::double precision FROM sess
      UNION ALL SELECT 'duration', -1, coalesce(sum(duration_sec), 0)::double precision FROM sess`;

    const query = edges
      ? sql`${base}, bucket(idx, lo, hi) AS (VALUES ${this.bucketValues(edges)})
          ${scalars}
          UNION ALL SELECT 'sessionSeries', bucket.idx, count(*)::double precision
            FROM sess JOIN bucket ON sess.first_ts >= bucket.lo AND sess.first_ts < bucket.hi
            GROUP BY bucket.idx
          UNION ALL SELECT 'userSeries', bucket.idx, count(*)::double precision
            FROM ident JOIN bucket ON ident.first_ts >= bucket.lo AND ident.first_ts < bucket.hi
            GROUP BY bucket.idx`
      : sql`${base} ${scalars}`;

    const rows = await db.execute<{ kind: string; idx: number; n: number }>(query);

    const metrics: SessionMetrics = {
      sessions: 0,
      users: 0,
      views: 0,
      bounced: 0,
      durationTotalSec: 0,
      sessionSeries: new Map(),
      userSeries: new Map(),
    };

    for (const row of rows) {
      const n = Number(row.n) || 0;
      if (row.kind === 'sessions') metrics.sessions = n;
      else if (row.kind === 'users') metrics.users = n;
      else if (row.kind === 'views') metrics.views = n;
      else if (row.kind === 'bounced') metrics.bounced = n;
      else if (row.kind === 'duration') metrics.durationTotalSec = n;
      else if (row.kind === 'sessionSeries') metrics.sessionSeries.set(Number(row.idx), n);
      else if (row.kind === 'userSeries') metrics.userSeries.set(Number(row.idx), n);
    }
    return metrics;
  }

  private bucketValues(edges: { starts: number[]; ends: number[] }): SQL {
    return sql.join(
      edges.starts.map(
        (start, i) =>
          sql`(${i}::int, ${new Date(start).toISOString()}::timestamptz, ${new Date(edges.ends[i]).toISOString()}::timestamptz)`,
      ),
      sql`, `,
    );
  }

  /**
   * Pageview counts per chart bucket, aggregated in SQL so the series costs
   * one row per bucket (≤60) instead of one row per pageview.
   *
   * The bucket edges are computed in JS and joined in as a VALUES list
   * rather than re-derived with date_trunc. Deriving them independently
   * looked equivalent but silently disagreed with the JS boundaries in
   * non-UTC timezones, shifting counts into neighbouring buckets; passing
   * the same edges the locator uses keeps one definition of a bucket.
   */
  private async getPageViewSeries(
    projectId: string,
    dimConditions: SQL[],
    window: { start: Date; end: Date },
    edges: { starts: number[]; ends: number[] },
  ): Promise<Map<number, number>> {
    if (edges.starts.length === 0) return new Map();

    const rows = await db.execute<{ idx: number; views: number }>(sql`
      SELECT bucket.idx AS idx, count(*)::int AS views
      FROM ${pageViews}
      JOIN (VALUES ${this.bucketValues(edges)}) AS bucket(idx, lo, hi)
        ON ${pageViews.timestamp} >= bucket.lo AND ${pageViews.timestamp} < bucket.hi
      WHERE ${and(
        eq(pageViews.projectId, projectId),
        ...dimConditions,
        gte(pageViews.timestamp, window.start),
        lte(pageViews.timestamp, window.end),
      )}
      GROUP BY bucket.idx
    `);

    return new Map(rows.map((row) => [Number(row.idx), row.views]));
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
    const buckets = generateTimeBuckets(new Date(timeRange.start), dataPoints, granularity, timezone);
    const labels = generateTimeLabels(new Date(timeRange.start), dataPoints, granularity, timezone);
    const edges = this.computeBucketEdges(buckets, granularity, timezone);

    const [current, previous, viewBuckets] = await Promise.all([
      this.getSessionMetrics(
        projectId,
        dimConditions,
        { start: new Date(timeRange.start), end: new Date(timeRange.end) },
        edges,
      ),
      this.getSessionMetrics(
        projectId,
        dimConditions,
        { start: new Date(previousRange.start), end: new Date(previousRange.end) },
        null,
      ),
      this.getPageViewSeries(
        projectId,
        dimConditions,
        { start: new Date(timeRange.start), end: new Date(timeRange.end) },
        edges,
      ),
    ]);

    const currentViews = current.views;
    const previousViews = previous.views;
    const currentUsers = current.users;
    const previousUsers = previous.users;
    const currentSessionCount = current.sessions;
    const previousSessionCount = previous.sessions;

    const sessionSeries = labels.map((_, i) => current.sessionSeries.get(i) || 0);
    const userSeries = labels.map((_, i) => current.userSeries.get(i) || 0);
    const viewSeries = labels.map((_, i) => viewBuckets.get(i) || 0);

    const rateOf = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
    const meanOf = (total: number, whole: number) => (whole === 0 ? 0 : total / whole);

    const currentBounce = rateOf(current.bounced, current.sessions);
    const previousBounce = rateOf(previous.bounced, previous.sessions);
    const currentDuration = meanOf(current.durationTotalSec, current.sessions);
    const previousDuration = meanOf(previous.durationTotalSec, previous.sessions);

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

    const windowStartIso = new Date(timeRange.start).toISOString();
    const windowEndIso = new Date(timeRange.end).toISOString();

    const [result, perPath] = await Promise.all([
      db
        .select({ path: pageViews.path, views: count(), users: countDistinct(pageViews.sessionId) })
        .from(pageViews)
        .where(narrowWindow)
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(20),
      // Per-path entry/bounce and time-on-page, aggregated in SQL. This
      // previously pulled every path and timestamp in the window as jsonb
      // arrays and rebuilt the sequences in JS — at 200K pageviews that one
      // query dominated the whole dashboard. The window function does the
      // same sequencing next to the data and returns one row per path.
      //
      // The scan is deliberately widened to `previousRange.start` so a
      // session that began before the window isn't misread as a bounce;
      // only rows whose own timestamp falls inside the window contribute.
      db.execute<{ kind: string; path: string; a: number; b: number }>(sql`
        WITH seq AS (
          SELECT
            ${pageViews.path} AS path,
            ${pageViews.timestamp} AS ts,
            lead(${pageViews.timestamp}) OVER (PARTITION BY ${pageViews.sessionId} ORDER BY ${pageViews.timestamp}) AS next_ts,
            row_number() OVER (PARTITION BY ${pageViews.sessionId} ORDER BY ${pageViews.timestamp}) AS rn,
            count(*) OVER (PARTITION BY ${pageViews.sessionId}) AS page_count
          FROM ${pageViews}
          WHERE ${and(
            eq(pageViews.projectId, projectId),
            ...dimConditions,
            gte(pageViews.timestamp, new Date(previousRange.start)),
            lte(pageViews.timestamp, new Date(timeRange.end)),
          )}
        )
        SELECT 'entry' AS kind, path,
               count(*)::double precision AS a,
               count(*) FILTER (WHERE page_count = 1)::double precision AS b
        FROM seq
        WHERE rn = 1 AND ts >= ${windowStartIso}::timestamptz AND ts <= ${windowEndIso}::timestamptz
        GROUP BY path
        UNION ALL
        SELECT 'duration', path,
               coalesce(sum(extract(epoch FROM next_ts - ts)), 0)::double precision,
               count(*)::double precision
        FROM seq
        WHERE next_ts IS NOT NULL AND ts >= ${windowStartIso}::timestamptz AND ts <= ${windowEndIso}::timestamptz
        GROUP BY path
      `),
    ]);

    const entryBounce = new Map<string, { entries: number; bounces: number }>();
    const duration = new Map<string, { totalSec: number; count: number }>();

    for (const row of perPath) {
      if (row.kind === 'entry') {
        entryBounce.set(row.path, { entries: Number(row.a), bounces: Number(row.b) });
      } else {
        duration.set(row.path, { totalSec: Number(row.a), count: Number(row.b) });
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
   * Single-column pageview breakdowns (country, browser, os, device,
   * source, campaign) in one pass. Each was previously its own query with
   * an identical WHERE clause, so Postgres scanned the same window six
   * times — measurably the dominant cost on small/shared compute, where
   * the round trips parallelize but the scans still contend for CPU.
   * GROUPING SETS collapses them to a single scan; row_number keeps the
   * per-dimension top-N bound server-side so high-cardinality dimensions
   * (source, campaign) can't stream unbounded rows into Node.
   */
  private async getDimensionBreakdowns(
    projectId: string,
    dimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<Map<BreakdownDimension, BreakdownRow[]>> {
    const rows = await db.execute<{ dimension: BreakdownDimension; value: string | null; users: number }>(sql`
      WITH base AS (
        SELECT
          ${pageViews.country} AS country,
          ${pageViews.browser} AS browser,
          ${pageViews.os} AS os,
          ${pageViews.device} AS device,
          coalesce(${pageViews.source}, 'Direct') AS source,
          coalesce(${pageViews.utmCampaign}, '(none)') AS campaign,
          ${pageViews.sessionId} AS session_id
        FROM ${pageViews}
        WHERE ${and(
          eq(pageViews.projectId, projectId),
          ...dimConditions,
          gte(pageViews.timestamp, new Date(timeRange.start)),
          lte(pageViews.timestamp, new Date(timeRange.end)),
        )}
      ),
      agg AS (
        SELECT
          CASE
            WHEN grouping(country) = 0 THEN 'country'
            WHEN grouping(browser) = 0 THEN 'browser'
            WHEN grouping(os) = 0 THEN 'os'
            WHEN grouping(device) = 0 THEN 'device'
            WHEN grouping(source) = 0 THEN 'source'
            ELSE 'campaign'
          END AS dimension,
          coalesce(country, browser, os, device, source, campaign) AS value,
          count(DISTINCT session_id)::int AS users
        FROM base
        GROUP BY GROUPING SETS ((country), (browser), (os), (device), (source), (campaign))
      )
      SELECT dimension, value, users
      FROM (SELECT agg.*, row_number() OVER (PARTITION BY dimension ORDER BY users DESC, value ASC) AS rn FROM agg) ranked
      WHERE rn <= ${BREAKDOWN_LIMIT}
      ORDER BY dimension, users DESC, value ASC
    `);

    const grouped = new Map<BreakdownDimension, BreakdownRow[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.dimension) ?? [];
      bucket.push({ value: row.value, users: row.users, sessions: row.users });
      grouped.set(row.dimension, bucket);
    }
    return grouped;
  }

  /**
   * Get top traffic sources — `source` is computed and stored at ingest
   * time (see trackingService.deriveSource), so this is a plain indexed
   * GROUP BY instead of regex-parsing `referrer` on every query.
   */
  private mapSources(breakdowns: Map<BreakdownDimension, BreakdownRow[]>): SourceData[] {
    return (breakdowns.get('source') ?? []).map((row) => ({
      name: row.value ?? 'Direct',
      users: row.users,
      sessions: row.sessions,
    }));
  }

  /**
   * Get top UTM campaigns — buckets by utmCampaign, falling back to
   * "(none)" for traffic with no campaign tag (direct/organic visits).
   */
  private mapCampaigns(breakdowns: Map<BreakdownDimension, BreakdownRow[]>): CampaignData[] {
    return (breakdowns.get('campaign') ?? []).map((row) => ({
      name: row.value ?? '(none)',
      users: row.users,
      sessions: row.sessions,
    }));
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

    const results = await Promise.all(
      projectGoals.map(async (goal): Promise<GoalConversionData> => {
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

        return {
          goalId: goal.id,
          name: goal.name,
          type: goal.type,
          conversions,
          totalSessions,
          rate: totalSessions > 0 ? Math.round((conversions / totalSessions) * 10000) / 100 : 0,
        };
      }),
    );

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
  /**
   * Site-wide vitals and the four per-dimension breakdowns in one scan.
   * Previously the overall figures and each of page/country/device/browser
   * were separate queries with an identical WHERE clause, so the same
   * `name = '__web_vital'` slice was scanned five times per request.
   * GROUPING SETS keeps metric in every set and varies only the dimension
   * column, so one pass yields all five result shapes.
   */
  private async getWebVitalsBundle(
    projectId: string,
    eventDimConditions: SQL[],
    timeRange: TimeRange,
  ): Promise<{ webVitals: WebVitalData[]; breakdown: WebVitalBreakdown }> {
    const rows = await db.execute<{
      dimension: WebVitalDimension | 'overall';
      key: string | null;
      metric: string;
      p50: number;
      p75: number;
      samples: number;
    }>(sql`
      WITH base AS (
        SELECT
          (${events.data} ->> 'metric') AS metric,
          (${events.data} ->> 'value')::double precision AS value,
          ${events.path} AS page,
          ${events.country} AS country,
          ${events.device} AS device,
          ${events.browser} AS browser
        FROM ${events}
        WHERE ${and(
          eq(events.projectId, projectId),
          ...eventDimConditions,
          eq(events.name, '__web_vital'),
          gte(events.timestamp, new Date(timeRange.start)),
          lte(events.timestamp, new Date(timeRange.end)),
        )}
      )
      SELECT
        CASE
          WHEN grouping(page) = 0 THEN 'page'
          WHEN grouping(country) = 0 THEN 'country'
          WHEN grouping(device) = 0 THEN 'device'
          WHEN grouping(browser) = 0 THEN 'browser'
          ELSE 'overall'
        END AS dimension,
        coalesce(page, country, device, browser) AS key,
        metric,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
        count(*)::int AS samples
      FROM base
      GROUP BY GROUPING SETS ((metric), (metric, page), (metric, country), (metric, device), (metric, browser))
    `);

    const webVitals: WebVitalData[] = [];
    const byDimension = new Map<WebVitalDimension, Map<string, WebVitalBreakdownItem>>();

    for (const row of rows) {
      if (!WEB_VITAL_METRICS.includes(row.metric as WebVitalData['metric'])) continue;
      const metric = row.metric as WebVitalData['metric'];

      if (row.dimension === 'overall') {
        webVitals.push({
          metric,
          p50: Number(row.p50) || 0,
          p75: Number(row.p75) || 0,
          samples: row.samples,
        });
        continue;
      }

      if (!row.key) continue;
      const items = byDimension.get(row.dimension) ?? new Map<string, WebVitalBreakdownItem>();
      const item = items.get(row.key) ?? { key: row.key, samples: 0 };
      const p75 = Number(row.p75) || 0;
      if (metric === 'LCP') item.lcp = p75;
      else if (metric === 'CLS') item.cls = p75;
      else if (metric === 'INP') item.inp = p75;
      item.samples += row.samples;
      items.set(row.key, item);
      byDimension.set(row.dimension, items);
    }

    const breakdown = Object.fromEntries(
      WEB_VITAL_BREAKDOWN_DIMENSIONS.map((dimension) => [
        dimension,
        [...(byDimension.get(dimension)?.values() ?? [])].sort((a, b) => b.samples - a.samples).slice(0, 20),
      ]),
    ) as WebVitalBreakdown;

    return { webVitals, breakdown };
  }

  /**
   * p75-per-metric grouped by an extra dimension (page path, country,
   * device, or browser) so a regression can be traced to a specific slice
   * instead of only the site-wide aggregate. Each dimension is a top-level
   * indexed events column, not the jsonb `data` field — trackEvent already
   * writes both.
   */
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
    const rows = await db.execute<{
      name: string;
      type: string;
      p75_duration: number;
      avg_size: number;
      samples: number;
    }>(sql`
      SELECT
        (resource ->> 'name') AS name,
        (resource ->> 'type') AS type,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY (resource ->> 'duration')::double precision) AS p75_duration,
        avg((resource ->> 'size')::double precision) AS avg_size,
        count(*)::int AS samples
      FROM ${events}, jsonb_array_elements(${events.data} -> 'resources') AS resource
      WHERE ${and(eq(events.projectId, projectId), ...eventDimConditions, eq(events.name, '__resource_timing'), gte(events.timestamp, new Date(timeRange.start)), lte(events.timestamp, new Date(timeRange.end)))}
      GROUP BY (resource ->> 'name'), (resource ->> 'type')
      ORDER BY p75_duration DESC
      LIMIT 15
    `);

    return rows.map((row) => ({
      name: row.name,
      type: row.type,
      p75Duration: Number(row.p75_duration) || 0,
      avgSize: Math.round(Number(row.avg_size) || 0),
      samples: row.samples,
    }));
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
  private mapCountries(breakdowns: Map<BreakdownDimension, BreakdownRow[]>): CountryData[] {
    return (breakdowns.get('country') ?? []).map((row) => ({
      country: row.value || 'Unknown',
      countryCode: row.value || 'UN',
      users: row.users,
      sessions: row.sessions,
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
  private mapBrowsers(
    breakdowns: Map<BreakdownDimension, BreakdownRow[]>,
    versionSummary: Map<string, string>,
  ): BrowserData[] {
    return (breakdowns.get('browser') ?? []).map((row) => ({
      browser: row.value || 'Unknown',
      version: versionSummary.get(row.value || 'Unknown'),
      users: row.users,
      sessions: row.sessions,
    }));
  }

  /**
   * Get users by device
   */
  private mapDevices(
    breakdowns: Map<BreakdownDimension, BreakdownRow[]>,
    modelSummary: Map<string, string>,
  ): DeviceData[] {
    return (breakdowns.get('device') ?? []).map((row) => {
      const device = row.value || 'desktop';
      return {
        device,
        category: device === 'mobile' || device === 'tablet' ? device : 'desktop',
        detail: modelSummary.get(device),
        users: row.users,
        sessions: row.sessions,
      };
    });
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
  private mapOS(breakdowns: Map<BreakdownDimension, BreakdownRow[]>, versionSummary: Map<string, string>): OSData[] {
    return (breakdowns.get('os') ?? []).map((row) => ({
      os: row.value || 'Unknown',
      version: versionSummary.get(row.value || 'Unknown'),
      users: row.users,
      sessions: row.sessions,
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
  /**
   * Builds a reusable bucket locator. Bucket boundaries are resolved once
   * per request rather than per timestamp: `getBucketEnd` performs Intl
   * timezone math, so calling it inside a per-timestamp scan made this
   * O(timestamps × buckets) Intl conversions — ~16 minutes of blocking JS
   * at 200K pageviews. Buckets are contiguous and ascending, so the
   * precomputed edges support a binary search instead.
   */
  private computeBucketEdges(
    buckets: Date[],
    granularity: GranularityType,
    timezone: string,
  ): { starts: number[]; ends: number[] } {
    // Month buckets in DST-transitioning zones (e.g. America/Santiago) can
    // end up to 24h past the next bucket's start — a latent bug in
    // dateUtils' calendar arithmetic. The previous linear scan resolved
    // such overlaps by returning the first matching bucket, so the
    // overlapped span is absorbed by the earlier bucket here: each start is
    // pushed forward past the preceding end. That preserves the old
    // assignment exactly while leaving the intervals disjoint and ascending,
    // which is what the binary search below requires.
    const starts: number[] = [];
    const ends: number[] = [];
    for (let i = 0; i < buckets.length; i++) {
      const end = this.getBucketEnd(buckets[i], granularity, timezone).getTime();
      const prevEnd = ends[i - 1];
      const start = buckets[i].getTime();
      starts.push(prevEnd !== undefined && prevEnd > start ? prevEnd : start);
      ends.push(end);
    }

    return { starts, ends };
  }

  /**
   * Get the end time for a time bucket
   */
  private getBucketEnd(bucketStart: Date, granularity: GranularityType, timezone: string): Date {
    return addPeriods(bucketStart, 1, granularity, timezone);
  }
}
