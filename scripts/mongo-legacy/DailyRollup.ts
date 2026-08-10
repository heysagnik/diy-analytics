import mongoose from 'mongoose';

// One document per (projectId, day) — the pre-aggregated equivalent of what
// AnalyticsService.getCoreMetricsBundle computes live from raw PageViews.
// Populated by the daily rollup cron (app/api/cron/rollup/route.ts) once a
// calendar day has fully closed in the project's reporting timezone, so a
// rollup is never written for a day that's still accumulating pageviews.
const dailyRollupSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
      index: true,
    },
    // Start-of-day instant in the project's reporting timezone (matches
    // dateUtils.periodStartFor(date, 'day', timezone)), stored as UTC like
    // every other timestamp in this app.
    date: {
      type: Date,
      required: true,
    },
    pageViews: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    bounces: { type: Number, default: 0 },
    sessionDurationSec: { type: Number, default: 0 },
    durationSessionCount: { type: Number, default: 0 },
    // Distinct identity (userId, falling back to sessionId) seen that day.
    // Stored as a raw id list rather than a probabilistic sketch (HyperLogLog)
    // — at hobby-project scale (tens to low-thousands of daily actives) this
    // stays small, keeps cross-day unique-user merges exact, and needs no new
    // dependency.
    userIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'daily_rollups',
  },
);

dailyRollupSchema.index({ projectId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyRollup || mongoose.model('DailyRollup', dailyRollupSchema);
