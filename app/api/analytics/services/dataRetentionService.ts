import { inArray, lt } from 'drizzle-orm';
import { errorOccurrences, events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';

// Postgres has no TTL index equivalent to Mongo's expireAfterSeconds — this
// batched delete loop replaces it, invoked from the daily rollup cron.
// Batched (not one giant DELETE) to avoid a single long-held lock/
// transaction on the highest-volume tables.
const BATCH_SIZE = 5000;

async function prunePageViews(cutoff: Date): Promise<number> {
  let totalDeleted = 0;
  for (;;) {
    const idsToDelete = db
      .select({ id: pageViews.id })
      .from(pageViews)
      .where(lt(pageViews.timestamp, cutoff))
      .limit(BATCH_SIZE);
    const deleted = await db
      .delete(pageViews)
      .where(inArray(pageViews.id, idsToDelete))
      .returning({ id: pageViews.id });
    totalDeleted += deleted.length;
    if (deleted.length < BATCH_SIZE) break;
  }
  return totalDeleted;
}

async function pruneEvents(cutoff: Date): Promise<number> {
  let totalDeleted = 0;
  for (;;) {
    const idsToDelete = db.select({ id: events.id }).from(events).where(lt(events.timestamp, cutoff)).limit(BATCH_SIZE);
    const deleted = await db.delete(events).where(inArray(events.id, idsToDelete)).returning({ id: events.id });
    totalDeleted += deleted.length;
    if (deleted.length < BATCH_SIZE) break;
  }
  return totalDeleted;
}

async function pruneErrorOccurrences(cutoff: Date): Promise<number> {
  let totalDeleted = 0;
  for (;;) {
    const idsToDelete = db
      .select({ id: errorOccurrences.id })
      .from(errorOccurrences)
      .where(lt(errorOccurrences.occurredAt, cutoff))
      .limit(BATCH_SIZE);
    const deleted = await db
      .delete(errorOccurrences)
      .where(inArray(errorOccurrences.id, idsToDelete))
      .returning({ id: errorOccurrences.id });
    totalDeleted += deleted.length;
    if (deleted.length < BATCH_SIZE) break;
  }
  return totalDeleted;
}

function retentionCutoff(envVar: string): Date | null {
  const days = Number(process.env[envVar]);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Opt-in retention: no-op unless PAGEVIEW_RETENTION_DAYS/EVENT_RETENTION_DAYS/
 * ERROR_OCCURRENCE_RETENTION_DAYS is explicitly set — same opt-in behavior
 * as the old Mongo TTL indexes. Pruning occurrences never touches the
 * `errors` grouping rows themselves (message/stack/count), only the
 * detailed per-occurrence rows.
 */
export async function pruneExpiredData(): Promise<{
  pageviewsDeleted: number;
  eventsDeleted: number;
  errorOccurrencesDeleted: number;
}> {
  const pageviewCutoff = retentionCutoff('PAGEVIEW_RETENTION_DAYS');
  const eventCutoff = retentionCutoff('EVENT_RETENTION_DAYS');
  const errorOccurrenceCutoff = retentionCutoff('ERROR_OCCURRENCE_RETENTION_DAYS');

  const [pageviewsDeleted, eventsDeleted, errorOccurrencesDeleted] = await Promise.all([
    pageviewCutoff ? prunePageViews(pageviewCutoff) : Promise.resolve(0),
    eventCutoff ? pruneEvents(eventCutoff) : Promise.resolve(0),
    errorOccurrenceCutoff ? pruneErrorOccurrences(errorOccurrenceCutoff) : Promise.resolve(0),
  ]);

  return { pageviewsDeleted, eventsDeleted, errorOccurrencesDeleted };
}
