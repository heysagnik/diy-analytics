import { eq, gte, type SQL, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { parseBoundedInt } from '@/lib/parseIntParam';
import { requireProjectAccess } from '@/lib/serverAuth';
import { requireAnd } from '@/lib/sql';
import { isValidUuid } from '@/lib/uuid';

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface QueryFilters {
  country?: string;
  lastSeen?: string;
  activity?: string;
  search?: string;
}

interface VisitorRow extends Record<string, unknown> {
  user_id: string;
  country: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  last_seen: Date;
  first_seen: Date;
  activity_count: number;
  path_count: number;
  session_count: number;
  session_ids: string[];
}

class UserAnalyticsHandler {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly MAX_LIMIT = 100;
  private static readonly RECENT_EVENTS_LIMIT = 3;

  private static readonly TIME_RANGES = {
    lastHour: () => new Date(Date.now() - 60 * 60 * 1000),
    today: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    },
    yesterday: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 1);
      return date;
    },
    lastWeek: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 7);
      return date;
    },
  } as const;

  private extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
    const page = parseBoundedInt(
      searchParams.get('page'),
      UserAnalyticsHandler.DEFAULT_PAGE,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const limit = parseBoundedInt(
      searchParams.get('limit'),
      UserAnalyticsHandler.DEFAULT_LIMIT,
      1,
      UserAnalyticsHandler.MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  private extractQueryFilters(searchParams: URLSearchParams): QueryFilters {
    return {
      country: searchParams.get('country') || undefined,
      lastSeen: searchParams.get('lastSeen') || undefined,
      activity: searchParams.get('activity') || undefined,
      search: searchParams.get('search')?.trim() || undefined,
    };
  }

  private buildBaseCondition(projectId: string, filters: QueryFilters): SQL {
    const conditions: SQL[] = [eq(pageViews.projectId, projectId)];
    if (filters.country) conditions.push(eq(pageViews.country, filters.country));
    if (filters.lastSeen && filters.lastSeen in UserAnalyticsHandler.TIME_RANGES) {
      const timeCalculator =
        UserAnalyticsHandler.TIME_RANGES[filters.lastSeen as keyof typeof UserAnalyticsHandler.TIME_RANGES];
      conditions.push(gte(pageViews.timestamp, timeCalculator()));
    }
    return requireAnd(...conditions);
  }

  private buildActivityCondition(activity?: string): SQL | undefined {
    switch (activity?.toLowerCase()) {
      case 'low':
        return sql`activity_count BETWEEN 1 AND 5`;
      case 'medium':
        return sql`activity_count > 5 AND activity_count <= 15`;
      case 'high':
        return sql`activity_count > 15`;
      default:
        return undefined;
    }
  }

  private escapeLike(value: string): string {
    return value.replace(/[%_\\]/g, (c) => `\\${c}`);
  }

  private buildSearchCondition(search?: string): SQL | undefined {
    if (!search) return undefined;
    const pattern = `%${this.escapeLike(search)}%`;
    return sql`(user_id ILIKE ${pattern} OR country ILIKE ${pattern} OR browser ILIKE ${pattern} OR device ILIKE ${pattern} OR os ILIKE ${pattern})`;
  }

  private combineWhere(...conditions: (SQL | undefined)[]): SQL {
    const list = conditions.filter((c): c is SQL => c !== undefined);
    return list.length ? sql.join(list, sql` AND `) : sql`TRUE`;
  }

  /**
   * Groups by the persistent visitor identity (`userId`, the localStorage
   * uid the tracker assigns) rather than `sessionId` — a returning visitor
   * across multiple sessions is one row, not one row per session. Falls
   * back to sessionId for the rare pageview predating the userId field.
   * `latest` picks the most recent pageview's dimension values per
   * identity (DISTINCT ON), `agg` computes the rest via a plain GROUP BY —
   * two passes over `base`, joined on identity, since Postgres window
   * aggregates don't support DISTINCT (needed for path/session counts).
   */
  private visitorsCTE(baseCondition: SQL): SQL {
    return sql`
      base AS (
        SELECT COALESCE(${pageViews.userId}, ${pageViews.sessionId}) AS identity,
               ${pageViews.sessionId} AS session_id, ${pageViews.path} AS path, ${pageViews.timestamp} AS timestamp,
               ${pageViews.country} AS country, ${pageViews.browser} AS browser, ${pageViews.device} AS device, ${pageViews.os} AS os
        FROM ${pageViews}
        WHERE ${baseCondition}
      ),
      latest AS (
        SELECT DISTINCT ON (identity) identity, country, browser, device, os
        FROM base
        ORDER BY identity, timestamp DESC
      ),
      agg AS (
        SELECT identity,
               MAX(timestamp) AS last_seen,
               MIN(timestamp) AS first_seen,
               COUNT(*)::int AS activity_count,
               COUNT(DISTINCT path)::int AS path_count,
               COUNT(DISTINCT session_id)::int AS session_count,
               array_agg(DISTINCT session_id) AS session_ids
        FROM base
        GROUP BY identity
      ),
      visitors AS (
        SELECT latest.identity AS user_id, latest.country, latest.browser, latest.device, latest.os,
               agg.last_seen, agg.first_seen, agg.activity_count, agg.path_count, agg.session_count, agg.session_ids
        FROM latest JOIN agg ON latest.identity = agg.identity
      )
    `;
  }

  private async fetchUsers(
    projectId: string,
    baseCondition: SQL,
    outerWhere: SQL,
    pagination: PaginationParams,
  ): Promise<Array<VisitorRow & { recentEvents: { name: string; timestamp: Date }[] }>> {
    const rows = await db.execute<VisitorRow & { recent_events: { name: string; timestamp: Date }[] | null }>(sql`
      WITH ${this.visitorsCTE(baseCondition)}
      SELECT v.*, COALESCE(re.recent_events, '[]'::json) AS recent_events
      FROM visitors v
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('name', e.name, 'timestamp', e.timestamp) ORDER BY e.timestamp DESC) AS recent_events
        FROM (
          SELECT ${events.name} AS name, ${events.timestamp} AS timestamp
          FROM ${events}
          WHERE ${events.sessionId} = ANY(v.session_ids) AND ${events.projectId} = ${projectId}
          ORDER BY ${events.timestamp} DESC
          LIMIT ${UserAnalyticsHandler.RECENT_EVENTS_LIMIT}
        ) e
      ) re ON true
      WHERE ${outerWhere}
      ORDER BY v.last_seen DESC
      LIMIT ${pagination.limit} OFFSET ${pagination.skip}
    `);

    return rows.map((r) => ({ ...r, recentEvents: r.recent_events ?? [] }));
  }

  private async fetchCount(baseCondition: SQL, outerWhere: SQL): Promise<number> {
    const [row] = await db.execute<{ total: number }>(sql`
      WITH ${this.visitorsCTE(baseCondition)}
      SELECT COUNT(*)::int AS total FROM visitors WHERE ${outerWhere}
    `);
    return row?.total ?? 0;
  }

  /**
   * Visitor-level rollup for the summary cards: how many distinct people
   * (not sessions) showed up, how many came back for a second session, and
   * average engagement — the "advanced analytics" the raw per-page table
   * can't answer on its own.
   */
  private async fetchSummary(
    baseCondition: SQL,
    outerWhere: SQL,
  ): Promise<{
    totalVisitors: number;
    returningVisitors: number;
    avgSessionsPerVisitor: number;
    avgActivityPerVisitor: number;
  }> {
    const [row] = await db.execute<{
      total_visitors: number;
      returning_visitors: number;
      avg_sessions: string | null;
      avg_activity: string | null;
    }>(sql`
      WITH ${this.visitorsCTE(baseCondition)}
      SELECT
        COUNT(*)::int AS total_visitors,
        COUNT(*) FILTER (WHERE session_count > 1)::int AS returning_visitors,
        AVG(session_count) AS avg_sessions,
        AVG(activity_count) AS avg_activity
      FROM visitors
      WHERE ${outerWhere}
    `);

    return {
      totalVisitors: row?.total_visitors ?? 0,
      returningVisitors: row?.returning_visitors ?? 0,
      avgSessionsPerVisitor: Number(row?.avg_sessions ?? 0),
      avgActivityPerVisitor: Number(row?.avg_activity ?? 0),
    };
  }

  private async fetchCountries(projectId: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ country: pageViews.country })
      .from(pageViews)
      .where(eq(pageViews.projectId, projectId))
      .orderBy(pageViews.country);

    return rows.map((r) => r.country).filter((c): c is string => Boolean(c));
  }

  async handleRequest(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    try {
      const { id: projectId } = await context.params;
      if (!isValidUuid(projectId)) {
        throw new Error('Invalid project ID format');
      }
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;

      const searchParams = request.nextUrl.searchParams;
      const pagination = this.extractPaginationParams(searchParams);
      const queryFilters = this.extractQueryFilters(searchParams);

      const baseCondition = this.buildBaseCondition(projectId, queryFilters);
      const outerWhere = this.combineWhere(
        this.buildActivityCondition(queryFilters.activity),
        this.buildSearchCondition(queryFilters.search),
      );

      const [users, total, countries, summary] = await Promise.all([
        this.fetchUsers(projectId, baseCondition, outerWhere, pagination),
        this.fetchCount(baseCondition, outerWhere),
        this.fetchCountries(projectId),
        this.fetchSummary(baseCondition, outerWhere),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      return NextResponse.json({
        users: users.map((u) => ({
          userId: u.user_id,
          country: u.country,
          lastSeen: u.last_seen,
          firstSeen: u.first_seen,
          browser: u.browser,
          device: u.device,
          os: u.os,
          pathCount: u.path_count,
          sessionCount: u.session_count,
          activityCount: u.activity_count,
          recentEvents: u.recentEvents,
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
        filters: {
          countries,
        },
        summary: {
          totalVisitors: summary.totalVisitors,
          returningVisitors: summary.returningVisitors,
          newVisitors: summary.totalVisitors - summary.returningVisitors,
          avgSessionsPerVisitor: Math.round(summary.avgSessionsPerVisitor * 100) / 100,
          avgActivityPerVisitor: Math.round(summary.avgActivityPerVisitor * 100) / 100,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      const status = error instanceof Error && error.message.includes('Invalid') ? 400 : 500;

      return NextResponse.json({ error: message }, { status });
    }
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const handler = new UserAnalyticsHandler();
  return handler.handleRequest(request, context);
}
