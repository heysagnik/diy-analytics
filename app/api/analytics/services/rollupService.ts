import { Types } from 'mongoose';
import PageView from '../../../../models/PageView';
import DailyRollup from '../../../../models/DailyRollup';

interface DailySessionRollup {
  _id: string;
  userId?: string;
  pageCount: number;
  timestamps: Date[];
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
export async function computeDailyRollup(
  projectObjectId: Types.ObjectId,
  dayStart: Date,
  dayEnd: Date
): Promise<void> {
  const sessions = await PageView.aggregate<DailySessionRollup>([
    { $match: { projectId: projectObjectId, timestamp: { $gte: dayStart, $lt: dayEnd } } },
    {
      $group: {
        _id: '$sessionId',
        userId: { $first: '$userId' },
        pageCount: { $sum: 1 },
        timestamps: { $push: '$timestamp' }
      }
    }
  ]);

  let pageViews = 0;
  let bounces = 0;
  let sessionDurationSec = 0;
  let durationSessionCount = 0;
  const userIds = new Set<string>();

  for (const s of sessions) {
    pageViews += s.pageCount;
    if (s.pageCount === 1) bounces += 1;
    userIds.add(s.userId || s._id);

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

  await DailyRollup.updateOne(
    { projectId: projectObjectId, date: dayStart },
    {
      $set: {
        pageViews,
        sessions: sessions.length,
        bounces,
        sessionDurationSec,
        durationSessionCount,
        userIds: Array.from(userIds)
      }
    },
    { upsert: true }
  );
}
