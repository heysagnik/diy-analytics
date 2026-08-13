import { and, count, eq, gte, sql } from 'drizzle-orm';
import { pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { assertRowsWithinLimit } from './queryLimits';

export interface RetentionCohort {
  cohortWeek: string; // ISO date of the Monday that starts the cohort week
  cohortSize: number;
  // retention[k] = % of the cohort active k weeks after their first-seen week
  // (k=0 is always 100). null means that offset hasn't happened yet for this
  // cohort (e.g. week 3 of a cohort that started 1 week ago) — distinct from
  // 0, which means the offset occurred and nobody returned.
  retention: (number | null)[];
}

/**
 * Weekly cohort retention. A "user" is identified by the persisted
 * localStorage uid (PageView.userId) when present, falling back to
 * sessionId for visitors who predate that field or have it blocked —
 * matches the identity the tracking script already assigns.
 *
 * Approach: pull each identity's distinct set of active weeks within the
 * lookback window (small: one row per identity, not per pageview), then
 * bucket in application code — a cohort's return-rate table only needs
 * ~identities × weeks cells, which is trivial to compute in JS once the
 * per-identity week-set is aggregated in Postgres.
 */
export class RetentionService {
  async getRetentionMatrix(projectId: string, weeks: number = 8): Promise<RetentionCohort[]> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const now = new Date();
    const since = this.startOfWeek(new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000));

    const [{ count: rowCount }] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(and(eq(pageViews.projectId, projectId), gte(pageViews.timestamp, since)));
    assertRowsWithinLimit(rowCount, 'Retention analysis');

    const rows = await db
      .select({
        identity: sql<string>`coalesce(${pageViews.userId}, ${pageViews.sessionId})`,
        // jsonb_agg, not array_agg — a raw array_agg(...) inside a typed
        // .select() field comes back from postgres.js as an unparsed
        // Postgres array-literal string, not a JS array; jsonb_agg is
        // reliably parsed. See db/schema note in lib/db.ts if this bites
        // another query.
        weeks: sql<string[]>`jsonb_agg(distinct date_trunc('week', ${pageViews.timestamp}))`,
      })
      .from(pageViews)
      .where(and(eq(pageViews.projectId, projectId), gte(pageViews.timestamp, since)))
      .groupBy(sql`coalesce(${pageViews.userId}, ${pageViews.sessionId})`);

    const cohortBuckets = new Map<string, { size: number; returns: Map<number, number> }>();

    for (const row of rows) {
      if (!row.weeks.length) continue;
      const sortedWeeks = [...row.weeks].map((w) => new Date(w)).sort((a, b) => a.getTime() - b.getTime());
      const firstWeek = sortedWeeks[0];
      const key = firstWeek.toISOString();

      let bucket = cohortBuckets.get(key);
      if (!bucket) {
        bucket = { size: 0, returns: new Map() };
        cohortBuckets.set(key, bucket);
      }
      bucket.size++;

      for (const week of sortedWeeks) {
        const offset = Math.round((week.getTime() - firstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
        bucket.returns.set(offset, (bucket.returns.get(offset) || 0) + 1);
      }
    }

    const maxOffset = weeks - 1;
    const currentWeekStart = this.startOfWeek(now);

    return Array.from(cohortBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohortWeek, bucket]) => {
        const cohortStart = new Date(cohortWeek);
        // A cohort can only have "returned" for offsets that have actually
        // elapsed. The current, still-in-progress week is included (offset
        // 0 is always observable), later offsets are not yet meaningful.
        const observableMaxOffset = Math.floor(
          (currentWeekStart.getTime() - cohortStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );

        return {
          cohortWeek,
          cohortSize: bucket.size,
          retention: Array.from({ length: maxOffset + 1 }, (_, offset) => {
            if (offset > observableMaxOffset) return null;
            const active = bucket.returns.get(offset) || 0;
            return bucket.size > 0 ? Math.round((active / bucket.size) * 10000) / 100 : 0;
          }),
        };
      });
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday-based week start
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
