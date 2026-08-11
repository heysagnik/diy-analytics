import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { getDateRangeDetails } from '../utils/dateUtils';

export interface FlowEdge {
  from: string;
  to: string;
  count: number;
}

const MAX_EDGES = 30;

/**
 * Page-to-page transitions within a session, derived with a window
 * function rather than loading sessions into application code (unlike
 * FunnelService, which needs ordered-subsequence matching that SQL can't
 * express) — a plain LAG() over each session's pageview timestamps is a
 * one-pass query.
 */
export class FlowService {
  async getPageFlow(projectId: string, dateRangeKey: string): Promise<FlowEdge[]> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const { timeRange } = getDateRangeDetails(dateRangeKey);
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    const rows = await db.execute<{ from_path: string; to_path: string; count: number }>(sql`
      WITH ordered AS (
        SELECT
          ${pageViews.path} AS path,
          LAG(${pageViews.path}) OVER (PARTITION BY ${pageViews.sessionId} ORDER BY ${pageViews.timestamp}) AS prev_path
        FROM ${pageViews}
        WHERE ${and(eq(pageViews.projectId, projectId), gte(pageViews.timestamp, start), lte(pageViews.timestamp, end))}
      )
      SELECT prev_path AS from_path, path AS to_path, COUNT(*)::int AS count
      FROM ordered
      WHERE prev_path IS NOT NULL AND prev_path <> path
      GROUP BY prev_path, path
      ORDER BY count DESC
      LIMIT ${MAX_EDGES}
    `);

    return rows.map((r) => ({ from: r.from_path, to: r.to_path, count: r.count }));
  }
}
