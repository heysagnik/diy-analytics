import { and, count, eq, gte, lt, sql } from 'drizzle-orm';
import { dailyRollups, pageViews } from '@/db/schema';
import { db } from '@/lib/db';

interface DailySessionRollup {
  sessionId: string;
  userId: string | null;
  pageCount: number;
  timestamps: string[];
}

// Gaps between consecutive pageviews are clipped to this ceiling before
// being summed — matches AnalyticsService.getCoreMetricsBundle's durationOf,
// so a session's rolled-up duration is computed the same way a live query
// would compute it for that single day.
const MAX_GAP_SEC = 30 * 60;

/**
 * Computes and upserts one project's rollup for a single, already-closed
 * calendar day. `dayStart`/`dayEnd` must be exact day boundaries (see
 * dateUtils.periodStartFor/addPeriods with granularity 'day') so the result
 * matches what a live single-day query would produce for that date.
 */
export async function computeDailyRollup(projectId: string, dayStart: Date, dayEnd: Date): Promise<void> {
  const rows: DailySessionRollup[] = await db
    .select({
      sessionId: pageViews.sessionId,
      // Old Mongo pipeline used `$first: '$userId'` — only ever consumed
      // downstream as "some non-null identity for that session", so any
      // single-value aggregate is equivalent.
      userId: sql<string | null>`max(${pageViews.userId})`,
      pageCount: count(),
      // jsonb_agg, not array_agg — see retentionService.ts for why.
      timestamps: sql<string[]>`jsonb_agg(${pageViews.timestamp})`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.timestamp, dayStart), lt(pageViews.timestamp, dayEnd)))
    .groupBy(pageViews.sessionId);

  let pageViewCount = 0;
  let bounces = 0;
  let sessionDurationSec = 0;
  let durationSessionCount = 0;
  const userIds = new Set<string>();

  for (const s of rows) {
    pageViewCount += s.pageCount;
    if (s.pageCount === 1) bounces += 1;
    userIds.add(s.userId || s.sessionId);

    if (s.pageCount > 1) {
      const sorted = [...s.timestamps].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      let sec = 0;
      for (let i = 1; i < sorted.length; i++) {
        const gapSec = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 1000;
        sec += Math.min(gapSec, MAX_GAP_SEC);
      }
      sessionDurationSec += sec;
      durationSessionCount += 1;
    }
  }

  const values = {
    pageViews: pageViewCount,
    sessions: rows.length,
    bounces,
    sessionDurationSec: Math.round(sessionDurationSec),
    durationSessionCount,
    userIds: Array.from(userIds),
  };

  await db
    .insert(dailyRollups)
    .values({ projectId, date: dayStart, ...values })
    .onConflictDoUpdate({
      target: [dailyRollups.projectId, dailyRollups.date],
      set: { ...values, updatedAt: new Date() },
    });
}
