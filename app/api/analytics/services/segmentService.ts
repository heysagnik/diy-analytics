import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { getDateRangeDetails } from '../utils/dateUtils';

// Recency/Frequency only — there's no monetary/revenue field in this
// schema, so this is RF segmentation, not full RFM. "userId" is a
// tracker-generated anonymous id unless the site calls window.identify(),
// so frequency measures distinct browsers by default, not distinct people.
export type RfSegmentId = 'champions' | 'occasional' | 'lapsing' | 'dormant';

export interface RfSegment {
  id: RfSegmentId;
  label: string;
  description: string;
  count: number;
  pctOfTotal: number;
}

const SEGMENT_META: Record<RfSegmentId, { label: string; description: string }> = {
  champions: { label: 'Active & frequent', description: 'Visited recently and often' },
  occasional: { label: 'Active & occasional', description: 'Visited recently, but rarely' },
  lapsing: { label: 'Lapsing', description: 'Used to visit often, gone quiet' },
  dormant: { label: 'Dormant', description: "Haven't been back in a while" },
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export class SegmentService {
  async getRfSegments(projectId: string, dateRangeKey: string): Promise<RfSegment[]> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const { timeRange } = getDateRangeDetails(dateRangeKey);
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    const rows = await db.execute<{ user_id: string; last_seen: string; frequency: number }>(sql`
      WITH activity AS (
        SELECT ${pageViews.userId} AS user_id, ${pageViews.sessionId} AS session_id, ${pageViews.timestamp} AS ts
        FROM ${pageViews}
        WHERE ${and(eq(pageViews.projectId, projectId), gte(pageViews.timestamp, start), lte(pageViews.timestamp, end))}
        UNION ALL
        SELECT ${events.userId} AS user_id, ${events.sessionId} AS session_id, ${events.timestamp} AS ts
        FROM ${events}
        WHERE ${and(eq(events.projectId, projectId), gte(events.timestamp, start), lte(events.timestamp, end))}
      )
      SELECT user_id, MAX(ts) AS last_seen, COUNT(DISTINCT session_id)::int AS frequency
      FROM activity
      GROUP BY user_id
    `);

    if (rows.length === 0) return [];

    const now = end.getTime();
    const users = rows.map((row) => ({
      recencyDays: (now - new Date(row.last_seen).getTime()) / 86_400_000,
      frequency: row.frequency,
    }));

    const medianRecency = median(users.map((u) => u.recencyDays));
    const medianFrequency = median(users.map((u) => u.frequency));

    const counts: Record<RfSegmentId, number> = { champions: 0, occasional: 0, lapsing: 0, dormant: 0 };
    for (const user of users) {
      const isRecent = user.recencyDays <= medianRecency;
      const isFrequent = user.frequency >= medianFrequency;
      const id: RfSegmentId =
        isRecent && isFrequent ? 'champions' : isRecent ? 'occasional' : isFrequent ? 'lapsing' : 'dormant';
      counts[id]++;
    }

    const total = users.length;
    return (Object.keys(SEGMENT_META) as RfSegmentId[]).map((id) => ({
      id,
      ...SEGMENT_META[id],
      count: counts[id],
      pctOfTotal: total > 0 ? Math.round((counts[id] / total) * 1000) / 10 : 0,
    }));
  }
}
