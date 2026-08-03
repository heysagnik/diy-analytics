import { Types } from 'mongoose';
import PageView from '../../../../models/PageView';
import Event from '../../../../models/Event';
import Goal from '../../../../models/Goal';
import Project from '../../../../models/Project';
import type {
  QueryOptions,
  AnalyticsResponse,
  MetricData,
  PageData,
  SourceData,
  CampaignData,
  CountryData,
  BrowserData,
  DeviceData,
  EventData,
  RecentEvent,
  RealtimeResponse,
  TimeRange,
  GoalConversionData,
  WebVitalData,
  GranularityType
} from '../types';
import {
  getDateRangeDetails,
  generateTimeLabels,
  calculatePercentageChange,
  generateTimeBuckets,
  normalizeTimezone,
  addPeriods,
  periodStartFor
} from '../utils/dateUtils';
import { DATE_RANGES } from '../types';

interface SessionRollup {
  _id: string;
  userId?: string;
  firstTs: Date;
  lastTs: Date;
  pageCount: number;
}

interface CoreMetricsFacetResult {
  currentSessionRollup: SessionRollup[];
  previousSessionRollup: SessionRollup[];
  currentPageViewCount: { count: number }[];
  previousPageViewCount: { count: number }[];
  currentPageViewTimestamps: { timestamp: Date }[];
}

/**
 * Analytics Service
 *
 * Core metrics (uniqueUsers/pageViews/sessions/bounceRate/avgSessionDuration
 * + their time series) are computed with a single $facet aggregation per
 * request instead of ~13 separate round-trips — see getCoreMetricsBundle.
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
    allTimeStart?: Date
  ): { timeRange: TimeRange; config: typeof DATE_RANGES[string]; previousRange: TimeRange } {
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
    if (isNaN(end.getTime())) throw new Error('Invalid endDate');
    const now = new Date();
    if (!endDate) end.setTime(now.getTime());

    const start = startDate ? new Date(startDate) : (() => {
      const s = new Date(end);
      switch (config.granularity) {
        case 'minute': s.setHours(s.getHours() - 1); break;
        case 'hour': s.setDate(s.getDate() - 1); break;
        case 'day': s.setDate(s.getDate() - 30); break;
        case 'week': s.setMonth(s.getMonth() - 6); break;
        case 'month': s.setFullYear(s.getFullYear() - 1); break;
      }
      return s;
    })();
    if (isNaN(start.getTime())) throw new Error('Invalid startDate');
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
    const resolvedConfig = { ...config, granularity, dataPoints: Math.max(1, Math.ceil(spanMs / this.msPerBucket(granularity))) };
    return { timeRange, config: resolvedConfig, previousRange };
  }

  private msPerBucket(granularity: GranularityType): number {
    switch (granularity) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
    }
  }

  // ALL_TIME's monthly bucket count is capped so a very old project still
  // renders a readable chart instead of hundreds of monthly bars.
  private static readonly ALL_TIME_MAX_MONTHS = 60;

  /**
   * Project.createdAt — used as the start of "All Time" instead of a fixed
   * lookback window. Without this, ALL_TIME always showed the same ~5-year
   * window regardless of when the project was actually created, so a
   * project added a few months ago would show years of empty leading
   * buckets predating its own existence.
   */
  private async resolveAllTimeStart(projectObjectId: Types.ObjectId): Promise<Date> {
    const project = await Project.findById(projectObjectId).select('createdAt').lean<{ createdAt?: Date }>();
    return project?.createdAt ?? new Date();
  }

  private buildAllTimeRange(
    creationDate: Date,
    timezone: string
  ): { timeRange: TimeRange; config: typeof DATE_RANGES[string]; previousRange: TimeRange } {
    const config = DATE_RANGES['ALL_TIME'];
    const now = new Date();

    const currentMonthStart = periodStartFor(now, 'month', timezone);
    const desiredStartMonth = periodStartFor(creationDate, 'month', timezone);
    // Never look back further than the cap, even if the project is older.
    const earliestAllowedStart = addPeriods(currentMonthStart, -(AnalyticsService.ALL_TIME_MAX_MONTHS - 1), 'month', timezone);
    const start = desiredStartMonth.getTime() > earliestAllowedStart.getTime() ? desiredStartMonth : earliestAllowedStart;

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
      previousRange
    };
  }

  /**
   * Get comprehensive analytics data for a project
   */
  async getAnalytics(options: QueryOptions): Promise<AnalyticsResponse> {
    const { projectId, dateRange, timezone = 'UTC', filters, startDate, endDate } = options;

    if (!Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const projectObjectId = new Types.ObjectId(projectId);
    const tzResolved = normalizeTimezone(timezone);
    const allTimeStart = dateRange === 'ALL_TIME' && !startDate && !endDate
      ? await this.resolveAllTimeStart(projectObjectId)
      : undefined;
    const { timeRange, config, previousRange } = this.resolveTimeRange(dateRange, tzResolved, startDate, endDate, allTimeStart);

    // One match object drives every dimension — filters apply uniformly to
    // core metrics and every breakdown, which is what makes click-to-filter
    // (drill into a country/browser/page and see the whole page re-scope)
    // possible.
    const dimensionMatch = this.buildDimensionMatch(filters);
    const baseMatch = { projectId: projectObjectId, ...dimensionMatch };

    // Goals are only defined per-project when the user opts in via
    // settings, so this is a cheap indexed find — the (usually empty)
    // common case costs one extra small round-trip, and conversion
    // aggregation itself is skipped entirely when there are none.
    const projectGoals = await Goal.find({ projectId: projectObjectId }).lean();

    const [core, pages, sources, countries, browsers, devices, campaigns, { entryPages, exitPages }, goals, webVitals, topEvents, recentEvents] = await Promise.all([
      this.getCoreMetricsBundle(baseMatch, timeRange, previousRange, config.granularity, config.dataPoints, tzResolved),
      this.getTopPages({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getTopSources({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getUsersByCountry({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getUsersByBrowser({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getUsersByDevice({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getTopCampaigns({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getEntryExitPages({ ...baseMatch, timestamp: { $gte: timeRange.start, $lte: timeRange.end } }),
      this.getGoalConversions(projectGoals, projectObjectId, dimensionMatch, timeRange),
      this.getWebVitals(projectObjectId, timeRange, dimensionMatch),
      this.getTopEvents(projectObjectId, timeRange, dimensionMatch),
      this.getRecentEvents(projectObjectId, timeRange, dimensionMatch)
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
      campaigns,
      entryPages,
      exitPages,
      goals,
      webVitals,
      topEvents,
      recentEvents
    };
  }

  /**
   * Active-now visitors, derived from the last 5 minutes of pageviews.
   * Deliberately cheap: no aggregation over historical ranges, just a
   * narrow indexed timestamp scan.
   */
  async getRealtime(projectId: string, windowMs: number = 5 * 60 * 1000): Promise<RealtimeResponse> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const since = new Date(Date.now() - windowMs);
    const rows = await PageView.aggregate([
      {
        $match: {
          projectId: new Types.ObjectId(projectId),
          timestamp: { $gte: since }
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$sessionId',
          path: { $first: '$path' },
          country: { $first: '$country' },
          lastActiveAt: { $first: '$timestamp' }
        }
      },
      { $sort: { lastActiveAt: -1 } },
      { $limit: 50 }
    ]);

    return {
      count: rows.length,
      visitors: rows.map((r) => ({
        sessionId: r._id,
        path: r.path,
        country: r.country,
        lastActiveAt: (r.lastActiveAt as Date).toISOString()
      }))
    };
  }

  /**
   * Build the dimension-filter portion of the match (everything except
   * projectId/timestamp, which callers layer on per-query).
   */
  private buildDimensionMatch(filters?: QueryOptions['filters']): Record<string, unknown> {
    const match: Record<string, unknown> = {};
    if (!filters) return match;

    if (filters.country?.length) match.country = { $in: filters.country };
    if (filters.browser?.length) match.browser = { $in: filters.browser };
    if (filters.device?.length) match.device = { $in: filters.device };
    if (filters.source?.length) match.source = { $in: filters.source };
    if (filters.page?.length) match.path = { $in: filters.page };
    if (filters.utmSource?.length) match.utmSource = { $in: filters.utmSource };
    if (filters.utmMedium?.length) match.utmMedium = { $in: filters.utmMedium };
    if (filters.utmCampaign?.length) match.utmCampaign = { $in: filters.utmCampaign };

    return match;
  }

  /**
   * Event documents carry the same dimension fields as PageView (country,
   * browser, device, path, source, UTM — see models/Event.ts), so every
   * filter dimension applies the same way to event-based panels as it does
   * to pageview-based ones.
   */
  private buildEventDimensionMatch(dimensionMatch: Record<string, unknown>): Record<string, unknown> {
    const eventCompatibleKeys = ['country', 'browser', 'device', 'path', 'source', 'utmSource', 'utmMedium', 'utmCampaign'];
    const match: Record<string, unknown> = {};
    for (const key of eventCompatibleKeys) {
      if (key in dimensionMatch) match[key] = dimensionMatch[key];
    }
    return match;
  }

  /**
   * Computes current and previous core metrics in one $facet aggregation.
   * Session rollups preserve per-window bounce-rate and duration semantics;
   * page-view counts remain separate to avoid double-counting sessions
   * spanning a boundary.
   */
  private async getCoreMetricsBundle(
    baseMatch: Record<string, unknown>,
    timeRange: TimeRange,
    previousRange: TimeRange,
    granularity: GranularityType,
    dataPoints: number,
    timezone: string
  ): Promise<{
    uniqueUsers: MetricData;
    pageViews: MetricData;
    sessions: MetricData;
    bounceRate: MetricData;
    avgSessionDuration: MetricData;
  }> {
    const currentWindow = { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) };
    const previousWindow = { $gte: new Date(previousRange.start), $lte: new Date(previousRange.end) };

    const [result] = await PageView.aggregate<CoreMetricsFacetResult>([
      { $match: { ...baseMatch, timestamp: { $gte: new Date(previousRange.start), $lte: new Date(timeRange.end) } } },
      {
        $facet: {
          currentSessionRollup: [
            { $match: { timestamp: currentWindow } },
            { $group: { _id: '$sessionId', userId: { $first: '$userId' }, firstTs: { $min: '$timestamp' }, lastTs: { $max: '$timestamp' }, pageCount: { $sum: 1 } } }
          ],
          previousSessionRollup: [
            { $match: { timestamp: previousWindow } },
            { $group: { _id: '$sessionId', userId: { $first: '$userId' }, firstTs: { $min: '$timestamp' }, lastTs: { $max: '$timestamp' }, pageCount: { $sum: 1 } } }
          ],
          currentPageViewCount: [
            { $match: { timestamp: currentWindow } },
            { $count: 'count' }
          ],
          previousPageViewCount: [
            { $match: { timestamp: previousWindow } },
            { $count: 'count' }
          ],
          currentPageViewTimestamps: [
            { $match: { timestamp: currentWindow } },
            { $project: { timestamp: 1, _id: 0 } }
          ]
        }
      }
    ]);

    const buckets = generateTimeBuckets(new Date(timeRange.start), dataPoints, granularity, timezone);
    const labels = generateTimeLabels(new Date(timeRange.start), dataPoints, granularity, timezone);

    const currentSessions = result?.currentSessionRollup ?? [];
    const previousSessions = result?.previousSessionRollup ?? [];
    const currentViews = result?.currentPageViewCount[0]?.count ?? 0;
    const previousViews = result?.previousPageViewCount[0]?.count ?? 0;
    const pageViewTimestamps = result?.currentPageViewTimestamps ?? [];

    // Identity for "unique users" is the persistent userId when present,
    // falling back to sessionId for anonymous rows so every session still
    // counts as at least one user. This is deliberately distinct from
    // "sessions" below, which always counts sessionId.
    const identityOf = (s: SessionRollup) => s.userId || s._id;

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
    const userFirstSeen = (sessions: SessionRollup[]) => {
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
    for (const { timestamp } of pageViewTimestamps) {
      const idx = this.findBucketIndex(new Date(timestamp), buckets, granularity, timezone);
      if (idx !== -1) viewBucketMap.set(idx, (viewBucketMap.get(idx) || 0) + 1);
    }
    const viewSeries = labels.map((_, i) => viewBucketMap.get(i) || 0);

    const currentUsers = currentUserFirstSeen.size;
    const previousUsers = previousUserFirstSeen.size;
    const currentSessionCount = currentSessions.length;
    const previousSessionCount = previousSessions.length;

    const bounceOf = (rollup: SessionRollup[]) => {
      if (rollup.length === 0) return 0;
      const bounced = rollup.filter((s) => s.pageCount === 1).length;
      return (bounced / rollup.length) * 100;
    };

    const durationOf = (rollup: SessionRollup[]) => {
      const multiPage = rollup.filter((s) => s.pageCount > 1);
      if (multiPage.length === 0) return 0;
      const totalSec = multiPage.reduce(
        (acc, s) => acc + (new Date(s.lastTs).getTime() - new Date(s.firstTs).getTime()) / 1000,
        0
      );
      return totalSec / multiPage.length;
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
        labels
      },
      pageViews: {
        total: currentViews,
        previous: previousViews,
        change: calculatePercentageChange(currentViews, previousViews),
        data: viewSeries,
        labels
      },
      sessions: {
        total: currentSessionCount,
        previous: previousSessionCount,
        change: calculatePercentageChange(currentSessionCount, previousSessionCount),
        data: sessionSeries,
        labels
      },
      bounceRate: {
        total: Math.round(currentBounce * 100) / 100,
        previous: Math.round(previousBounce * 100) / 100,
        change: calculatePercentageChange(currentBounce, previousBounce),
        data: [],
        labels: []
      },
      avgSessionDuration: {
        total: Math.round(currentDuration),
        previous: Math.round(previousDuration),
        change: calculatePercentageChange(currentDuration, previousDuration),
        data: [],
        labels: []
      }
    };
  }

  /**
   * Get top pages data
   */
  private async getTopPages(match: Record<string, unknown>): Promise<PageData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$path',
          views: { $sum: 1 },
          users: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          path: '$_id',
          views: 1,
          users: { $size: '$users' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 20 }
    ]);

    return result.map(item => ({
      path: item.path,
      views: item.views,
      users: item.users
    }));
  }

  /**
   * Get top traffic sources — `source` is computed and stored at ingest
   * time (see trackingService.deriveSource), so this is a plain indexed
   * $group instead of regex-parsing `referrer` on every query.
   */
  private async getTopSources(match: Record<string, unknown>): Promise<SourceData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$source', 'Direct'] },
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          name: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      name: item.name,
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get top UTM campaigns — buckets by utmCampaign, falling back to
   * "(none)" for traffic with no campaign tag (direct/organic visits).
   */
  private async getTopCampaigns(match: Record<string, unknown>): Promise<CampaignData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$utmCampaign', '(none)'] },
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          name: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      name: item.name,
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Goal conversion rates — for each defined goal, counts distinct sessions
   * that hit the matching page (type:'page') or fired the matching custom
   * event (type:'event') within the window, against the same dimension
   * filters as everything else. Skips the query work entirely when the
   * project has no goals defined.
   */
  private async getGoalConversions(
    goals: Array<{ _id: unknown; name: string; type: 'page' | 'event'; matchValue: string }>,
    projectObjectId: Types.ObjectId,
    dimensionMatch: Record<string, unknown>,
    timeRange: TimeRange
  ): Promise<GoalConversionData[]> {
    if (!goals.length) return [];

    const window = { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) };
    const pageViewMatch = { projectId: projectObjectId, ...dimensionMatch, timestamp: window };
    const eventMatch = { projectId: projectObjectId, ...this.buildEventDimensionMatch(dimensionMatch), timestamp: window };

    // Denominator is every session with qualifying activity — pageview or
    // event — under the same filters, not just pageview sessions. Using
    // pageview-only sessions here undercounted the denominator for
    // event-goal conversions from sessions that fired an event without a
    // matching pageview.
    const [pageViewSessionIds, eventSessionIds] = await Promise.all([
      PageView.distinct('sessionId', pageViewMatch),
      Event.distinct('sessionId', eventMatch)
    ]);
    const totalSessions = new Set([...pageViewSessionIds, ...eventSessionIds]).size;

    const results: GoalConversionData[] = [];
    for (const goal of goals) {
      let conversions = 0;
      if (goal.type === 'page') {
        const [row] = await PageView.aggregate([
          { $match: { ...pageViewMatch, path: goal.matchValue } },
          { $group: { _id: '$sessionId' } },
          { $count: 'total' }
        ]);
        conversions = row?.total ?? 0;
      } else {
        const [row] = await Event.aggregate([
          { $match: { projectId: projectObjectId, ...this.buildEventDimensionMatch(dimensionMatch), timestamp: window, name: goal.matchValue } },
          { $group: { _id: '$sessionId' } },
          { $count: 'total' }
        ]);
        conversions = row?.total ?? 0;
      }

      results.push({
        goalId: String(goal._id),
        name: goal.name,
        type: goal.type,
        conversions,
        totalSessions,
        rate: totalSessions > 0 ? Math.round((conversions / totalSessions) * 10000) / 100 : 0
      });
    }

    return results;
  }

  /**
   * Web Vitals (LCP/CLS/INP) — p75 per metric, the standard threshold used
   * to judge "good"/"needs improvement"/"poor" (matches Google's own
   * reporting convention). Computed in application code from a grouped
   * value array rather than Mongo's $percentile (requires MongoDB 7+, not
   * guaranteed on self-hosted deployments).
   */
  private async getWebVitals(
    projectId: Types.ObjectId,
    timeRange: TimeRange,
    dimensionMatch: Record<string, unknown> = {}
  ): Promise<WebVitalData[]> {
    const rows = await Event.aggregate<{ _id: string; values: number[] }>([
      {
        $match: {
          projectId,
          ...this.buildEventDimensionMatch(dimensionMatch),
          name: '__web_vital',
          timestamp: { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) }
        }
      },
      { $group: { _id: '$data.metric', values: { $push: '$data.value' } } }
    ]);

    return rows
      .filter((r): r is { _id: 'LCP' | 'CLS' | 'INP'; values: number[] } => ['LCP', 'CLS', 'INP'].includes(r._id))
      .map((r) => {
        const sorted = [...r.values].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
        return { metric: r._id, p75: sorted[idx] ?? 0, samples: sorted.length };
      });
  }

  /**
   * Entry/exit pages — per session, the first and last pageview path within
   * the window, then bucketed by path. Reuses the sort-then-group-by-session
   * idiom from getCoreMetricsBundle's session rollups, just keyed on `path`
   * instead of timestamps.
   */
  private async getEntryExitPages(
    match: Record<string, unknown>
  ): Promise<{ entryPages: PageData[]; exitPages: PageData[] }> {
    const [entryRows, exitRows] = await Promise.all([
      PageView.aggregate([
        { $match: match },
        { $sort: { sessionId: 1, timestamp: 1 } },
        { $group: { _id: '$sessionId', path: { $first: '$path' } } },
        { $group: { _id: '$path', sessions: { $sum: 1 } } },
        { $sort: { sessions: -1 } },
        { $limit: 10 }
      ]),
      PageView.aggregate([
        { $match: match },
        { $sort: { sessionId: 1, timestamp: -1 } },
        { $group: { _id: '$sessionId', path: { $first: '$path' } } },
        { $group: { _id: '$path', sessions: { $sum: 1 } } },
        { $sort: { sessions: -1 } },
        { $limit: 10 }
      ])
    ]);

    const toPageData = (rows: { _id: string; sessions: number }[]): PageData[] =>
      rows.map((r) => ({ path: r._id, users: r.sessions, views: r.sessions }));

    return { entryPages: toPageData(entryRows), exitPages: toPageData(exitRows) };
  }

  /**
   * Get users by country
   */
  private async getUsersByCountry(match: Record<string, unknown>): Promise<CountryData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$country',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          country: '$_id',
          countryCode: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      country: item.country || 'Unknown',
      countryCode: item.countryCode || 'UN',
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get users by browser
   */
  private async getUsersByBrowser(match: Record<string, unknown>): Promise<BrowserData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$browser',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          browser: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      browser: item.browser || 'Unknown',
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get users by device
   */
  private async getUsersByDevice(match: Record<string, unknown>): Promise<DeviceData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$device',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          device: '$_id',
          category: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'mobile'] }, then: 'mobile' },
                { case: { $eq: ['$_id', 'tablet'] }, then: 'tablet' }
              ],
              default: 'desktop'
            }
          },
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      device: item.device || 'desktop',
      category: item.category,
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get top events
   */
  private async getTopEvents(
    projectId: Types.ObjectId,
    timeRange: TimeRange,
    dimensionMatch: Record<string, unknown> = {}
  ): Promise<EventData[]> {
    const result = await Event.aggregate([
      {
        $match: {
          projectId,
          ...this.buildEventDimensionMatch(dimensionMatch),
          timestamp: {
            $gte: new Date(timeRange.start),
            $lte: new Date(timeRange.end)
          }
        }
      },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      name: item.name,
      count: item.count,
      uniqueUsers: item.uniqueUsers
    }));
  }

  /**
   * Get recent events (newest first) within the selected time range.
   */
  private async getRecentEvents(
    projectId: Types.ObjectId,
    timeRange: TimeRange,
    dimensionMatch: Record<string, unknown> = {}
  ): Promise<RecentEvent[]> {
    const events = (await Event.find({
      projectId,
      ...this.buildEventDimensionMatch(dimensionMatch),
      timestamp: {
        $gte: new Date(timeRange.start),
        $lte: new Date(timeRange.end),
      },
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean()) as unknown as Array<{
        _id: import('mongoose').Types.ObjectId;
        name: string;
        url: string;
        path: string;
        data?: RecentEvent['data'];
        sessionId: string;
        timestamp: Date | string;
        country?: string;
        browser?: string;
        device?: string;
      }>;

    return events.map((e) => ({
      _id: String(e._id),
      name: e.name,
      url: e.url,
      path: e.path,
      data: e.data,
      sessionId: e.sessionId,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
      country: e.country,
      browser: e.browser,
      device: e.device,
    })) satisfies RecentEvent[];
  }

  /**
   * Find the correct bucket index for a given timestamp
   */
  private findBucketIndex(
    timestamp: Date,
    buckets: Date[],
    granularity: GranularityType,
    timezone: string
  ): number {
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
