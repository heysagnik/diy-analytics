import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

// One row per (projectId, day) — the pre-aggregated equivalent of what
// AnalyticsService.getCoreMetricsBundle computes live from raw pageviews.
// Populated by the daily rollup cron once a calendar day has fully closed
// in the project's reporting timezone.
export const dailyRollups = pgTable(
  'daily_rollups',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Start-of-day instant in the project's reporting timezone, stored as
    // UTC like every other timestamp in this app.
    date: timestamp('date', { withTimezone: true }).notNull(),
    pageViews: integer('page_views').notNull().default(0),
    sessions: integer('sessions').notNull().default(0),
    bounces: integer('bounces').notNull().default(0),
    sessionDurationSec: integer('session_duration_sec').notNull().default(0),
    durationSessionCount: integer('duration_session_count').notNull().default(0),
    // Distinct identity (userId, falling back to sessionId) seen that day.
    // Stored as a raw id list rather than a probabilistic sketch — see
    // the original DailyRollup.ts rationale (hobby-project scale).
    userIds: text('user_ids').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('daily_rollups_project_id_date_idx').on(table.projectId, table.date)],
);
