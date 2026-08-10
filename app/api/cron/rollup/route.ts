import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectToDatabase from '../../../../lib/mongodb';
import Project from '../../../../models/Project';
import { computeDailyRollup } from '../../analytics/services/rollupService';
import { normalizeTimezone, periodStartFor, addPeriods } from '../../analytics/utils/dateUtils';

/**
 * Rolls up yesterday's pageviews into DailyRollup, one document per project.
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

  await connectToDatabase();

  const projects = await Project.find({}).select('_id timezone').lean<Array<{ _id: Types.ObjectId; timezone?: string | null }>>();

  let succeeded = 0;
  const failed: string[] = [];

  for (const project of projects) {
    try {
      const tz = normalizeTimezone(project.timezone || 'UTC');
      const todayStart = periodStartFor(new Date(), 'day', tz);
      const yesterdayStart = addPeriods(todayStart, -1, 'day', tz);
      await computeDailyRollup(project._id, yesterdayStart, todayStart);
      succeeded++;
    } catch (error) {
      console.error(`Rollup failed for project ${project._id}:`, error);
      failed.push(String(project._id));
    }
  }

  return NextResponse.json({ success: true, data: { projects: projects.length, succeeded, failed } });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
