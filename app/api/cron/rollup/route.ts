import { type NextRequest, NextResponse } from 'next/server';
import { projects } from '@/db/schema';
import { db } from '@/lib/db';
import { pruneExpiredData } from '../../analytics/services/dataRetentionService';
import { computeDailyRollup } from '../../analytics/services/rollupService';
import { addPeriods, normalizeTimezone, periodStartFor } from '../../analytics/utils/dateUtils';

/**
 * Rolls up yesterday's pageviews into daily_rollups, one row per project,
 * then prunes any pageviews/events past the configured retention window.
 * Intended to run once a day (see vercel.json) well after most timezones'
 * "yesterday" has closed, so every rollup covers a day that's fully done
 * accumulating data — never the still-open current day.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * that env var is configured; this route rejects anything else so it can't
 * be triggered by an outside caller to force redundant recomputation.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectRows = await db.select({ id: projects.id, timezone: projects.timezone }).from(projects);

  let succeeded = 0;
  const failed: string[] = [];

  for (const project of projectRows) {
    try {
      const tz = normalizeTimezone(project.timezone || 'UTC');
      const todayStart = periodStartFor(new Date(), 'day', tz);
      const yesterdayStart = addPeriods(todayStart, -1, 'day', tz);
      await computeDailyRollup(project.id, yesterdayStart, todayStart);
      succeeded++;
    } catch (error) {
      console.error(`Rollup failed for project ${project.id}:`, error);
      failed.push(project.id);
    }
  }

  let retention: { pageviewsDeleted: number; eventsDeleted: number } | null = null;
  try {
    retention = await pruneExpiredData();
  } catch (error) {
    console.error('Retention pruning failed:', error);
  }

  return NextResponse.json({ success: true, data: { projects: projectRows.length, succeeded, failed, retention } });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
