import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { checkInList, ERROR_SEVERITIES, ERROR_STATUSES, type ErrorSeverity, type ErrorStatus } from './enums';
import { projects } from './projects';

// One row per distinct error (grouped by fingerprint), not one row per
// occurrence — `count`/`firstSeenAt`/`lastSeenAt` are updated in place on
// each new occurrence (see TrackingService.trackError). This keeps the
// table small regardless of how often a given error fires, unlike the
// append-only `events` table.
export const errors = pgTable(
  'errors',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // sha1(message + top stack frame), truncated — stable across
    // occurrences of the same error, distinct across different ones.
    fingerprint: varchar('fingerprint', { length: 40 }).notNull(),
    message: text('message').notNull(),
    // e.g. "TypeError" — from event.error.name, or parsed server-side from
    // a leading "SomeError:" message prefix if the client didn't send one.
    errorName: varchar('error_name', { length: 100 }),
    stack: text('stack'),
    sourceUrl: text('source_url'),
    line: integer('line'),
    col: integer('col'),
    path: varchar('path', { length: 1024 }),
    severity: varchar('severity', { length: 16 }).notNull().default('error').$type<ErrorSeverity>(),
    status: varchar('status', { length: 16 }).notNull().default('active').$type<ErrorStatus>(),
    release: varchar('release', { length: 100 }),
    count: integer('count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    regressedAt: timestamp('regressed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('errors_project_id_fingerprint_idx').on(table.projectId, table.fingerprint),
    index('errors_project_id_last_seen_at_idx').on(table.projectId, table.lastSeenAt.desc()),
    index('errors_project_id_error_name_idx').on(table.projectId, table.errorName),
    check('errors_severity_check', sql`${table.severity} IN (${checkInList(ERROR_SEVERITIES)})`),
    check('errors_status_check', sql`${table.status} IN (${checkInList(ERROR_STATUSES)})`),
  ],
);
