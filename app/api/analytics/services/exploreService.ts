import { and, count, eq, gte, lte, type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { getDateRangeDetails } from '../utils/dateUtils';
import { assertRowsWithinLimit } from './queryLimits';

export const EXPLORE_DIMENSIONS = [
  'country',
  'browser',
  'device',
  'source',
  'page',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'os',
  'city',
] as const;
export type ExploreDimension = (typeof EXPLORE_DIMENSIONS)[number];

export interface DimensionCondition {
  type: 'dimension';
  dimension: ExploreDimension;
  value: string;
}

export interface PageviewCondition {
  type: 'pageview';
  path: string;
}

export interface EventCondition {
  type: 'event';
  eventName: string;
  propertyKey?: string;
  propertyValue?: string;
}

export type ExploreCondition = DimensionCondition | PageviewCondition | EventCondition;

export interface ExploreQuery {
  dateRange: string;
  combinator: 'AND' | 'OR';
  conditions: ExploreCondition[];
}

export interface ExploreSessionSummary {
  sessionId: string;
  userId: string | null;
  country: string | null;
  browser: string | null;
  device: string | null;
  firstSeen: string;
  lastSeen: string;
  activityCount: number;
}

export interface ExploreResult {
  totalSessions: number;
  sessions: ExploreSessionSummary[];
}

export const MAX_CONDITIONS = 5;
const SAMPLE_SIZE = 50;

const DIMENSION_COLUMNS: Record<ExploreDimension, { pv: PgColumn; ev: PgColumn }> = {
  country: { pv: pageViews.country, ev: events.country },
  browser: { pv: pageViews.browser, ev: events.browser },
  device: { pv: pageViews.device, ev: events.device },
  source: { pv: pageViews.source, ev: events.source },
  page: { pv: pageViews.path, ev: events.path },
  utmSource: { pv: pageViews.utmSource, ev: events.utmSource },
  utmMedium: { pv: pageViews.utmMedium, ev: events.utmMedium },
  utmCampaign: { pv: pageViews.utmCampaign, ev: events.utmCampaign },
  os: { pv: pageViews.os, ev: events.os },
  city: { pv: pageViews.city, ev: events.city },
};

/**
 * Compiles a single condition into a SQL EXISTS fragment scoped to
 * `sessions.session_id` (the CTE alias runQuery builds around). Dimension
 * conditions check both pageviews and events, since a given attribute may
 * only have been recorded on one row type depending on what the visitor
 * did in that session.
 */
function compileCondition(projectId: string, condition: ExploreCondition, start: string, end: string): SQL {
  if (condition.type === 'dimension') {
    const cols = DIMENSION_COLUMNS[condition.dimension];
    return sql`EXISTS (
      SELECT 1 FROM ${pageViews}
      WHERE ${pageViews.sessionId} = sessions.session_id AND ${pageViews.projectId} = ${projectId}
        AND ${pageViews.timestamp} BETWEEN ${start} AND ${end} AND ${cols.pv} = ${condition.value}
      UNION ALL
      SELECT 1 FROM ${events}
      WHERE ${events.sessionId} = sessions.session_id AND ${events.projectId} = ${projectId}
        AND ${events.timestamp} BETWEEN ${start} AND ${end} AND ${cols.ev} = ${condition.value}
    )`;
  }

  if (condition.type === 'pageview') {
    return sql`EXISTS (
      SELECT 1 FROM ${pageViews}
      WHERE ${pageViews.sessionId} = sessions.session_id AND ${pageViews.projectId} = ${projectId}
        AND ${pageViews.timestamp} BETWEEN ${start} AND ${end} AND ${pageViews.path} = ${condition.path}
    )`;
  }

  if (condition.propertyKey) {
    return sql`EXISTS (
      SELECT 1 FROM ${events}
      WHERE ${events.sessionId} = sessions.session_id AND ${events.projectId} = ${projectId}
        AND ${events.timestamp} BETWEEN ${start} AND ${end} AND ${events.name} = ${condition.eventName}
        AND (${events.data} ->> ${condition.propertyKey}) = ${condition.propertyValue ?? ''}
    )`;
  }

  return sql`EXISTS (
    SELECT 1 FROM ${events}
    WHERE ${events.sessionId} = sessions.session_id AND ${events.projectId} = ${projectId}
      AND ${events.timestamp} BETWEEN ${start} AND ${end} AND ${events.name} = ${condition.eventName}
  )`;
}

function combineConditions(conditions: SQL[], combinator: 'AND' | 'OR'): SQL {
  const separator = combinator === 'AND' ? sql` AND ` : sql` OR `;
  return sql`(${sql.join(conditions, separator)})`;
}

export class ExploreService {
  async runQuery(projectId: string, query: ExploreQuery): Promise<ExploreResult> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }
    if (query.conditions.length === 0 || query.conditions.length > MAX_CONDITIONS) {
      throw new Error(`Query must have between 1 and ${MAX_CONDITIONS} conditions`);
    }

    const { timeRange } = getDateRangeDetails(query.dateRange);
    // Interpolated as raw text into sql`...` templates below rather than
    // Date objects — raw template interpolation bypasses the Date→driver
    // serialization drizzle applies for typed operators (eq/gte/lte), so a
    // bare Date here reaches postgres-js's param binder untranslated and
    // throws. ISO strings bind cleanly and Postgres casts them to
    // timestamptz for the BETWEEN comparison.
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    const [[pv], [ev]] = await Promise.all([
      db
        .select({ count: count() })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            gte(pageViews.timestamp, startDate),
            lte(pageViews.timestamp, endDate),
          ),
        ),
      db
        .select({ count: count() })
        .from(events)
        .where(and(eq(events.projectId, projectId), gte(events.timestamp, startDate), lte(events.timestamp, endDate))),
    ]);
    assertRowsWithinLimit(pv.count + ev.count, 'Explore query');

    const whereClause = combineConditions(
      query.conditions.map((c) => compileCondition(projectId, c, start, end)),
      query.combinator,
    );

    // `sessions` aggregates first/last activity across both pageviews and
    // events, so a session that only fired custom events (no pageview) is
    // still discoverable — matches the denominator used elsewhere (e.g.
    // AnalyticsService.getGoalConversions).
    const sessionsCte = sql`
      sessions AS (
        SELECT session_id, MIN(ts) AS first_seen, MAX(ts) AS last_seen, COUNT(*)::int AS activity_count
        FROM (
          SELECT ${pageViews.sessionId} AS session_id, ${pageViews.timestamp} AS ts
          FROM ${pageViews}
          WHERE ${pageViews.projectId} = ${projectId} AND ${pageViews.timestamp} BETWEEN ${start} AND ${end}
          UNION ALL
          SELECT ${events.sessionId} AS session_id, ${events.timestamp} AS ts
          FROM ${events}
          WHERE ${events.projectId} = ${projectId} AND ${events.timestamp} BETWEEN ${start} AND ${end}
        ) activity
        GROUP BY session_id
      )
    `;

    const [countRows, sampleRows] = await Promise.all([
      db.execute<{ total: number }>(sql`
        WITH ${sessionsCte}
        SELECT COUNT(*)::int AS total FROM sessions WHERE ${whereClause}
      `),
      db.execute<{
        session_id: string;
        first_seen: string;
        last_seen: string;
        activity_count: number;
      }>(sql`
        WITH ${sessionsCte}
        SELECT session_id, first_seen, last_seen, activity_count FROM sessions
        WHERE ${whereClause}
        ORDER BY last_seen DESC
        LIMIT ${SAMPLE_SIZE}
      `),
    ]);

    const sessionIds = sampleRows.map((r) => r.session_id);
    const enrichment = sessionIds.length
      ? await db.execute<{
          session_id: string;
          user_id: string | null;
          country: string | null;
          browser: string | null;
          device: string | null;
        }>(sql`
          SELECT DISTINCT ON (${pageViews.sessionId})
            ${pageViews.sessionId} AS session_id, ${pageViews.userId} AS user_id,
            ${pageViews.country} AS country, ${pageViews.browser} AS browser, ${pageViews.device} AS device
          FROM ${pageViews}
          WHERE ${pageViews.projectId} = ${projectId} AND ${sql.join(
            sessionIds.map((id) => sql`${pageViews.sessionId} = ${id}`),
            sql` OR `,
          )}
          ORDER BY ${pageViews.sessionId}, ${pageViews.timestamp} DESC
        `)
      : [];
    const enrichmentBySession = new Map(enrichment.map((row) => [row.session_id, row]));

    const sessions: ExploreSessionSummary[] = sampleRows.map((row) => {
      const info = enrichmentBySession.get(row.session_id);
      return {
        sessionId: row.session_id,
        userId: info?.user_id ?? null,
        country: info?.country ?? null,
        browser: info?.browser ?? null,
        device: info?.device ?? null,
        firstSeen: new Date(row.first_seen).toISOString(),
        lastSeen: new Date(row.last_seen).toISOString(),
        activityCount: row.activity_count,
      };
    });

    return { totalSessions: countRows[0]?.total ?? 0, sessions };
  }
}
