import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { errors } from './errors';
import { projects } from './projects';

export interface Breadcrumb {
  type: 'console' | 'ui.click' | 'http' | 'navigation';
  message: string;
  data?: Record<string, unknown>;
  ts: number;
}

// One row per occurrence of an `errors` group — append-only, unlike
// `errors` itself (which upserts by fingerprint).
export const errorOccurrences = pgTable(
  'error_occurrences',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    errorId: uuid('error_id')
      .notNull()
      .references(() => errors.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 100 }),
    userId: varchar('user_id', { length: 100 }),
    browser: varchar('browser', { length: 64 }),
    browserVersion: varchar('browser_version', { length: 32 }),
    os: varchar('os', { length: 64 }),
    osVersion: varchar('os_version', { length: 32 }),
    device: varchar('device', { length: 32 }),
    deviceVendor: varchar('device_vendor', { length: 64 }),
    deviceModel: varchar('device_model', { length: 128 }),
    country: varchar('country', { length: 64 }),
    region: varchar('region', { length: 128 }),
    city: varchar('city', { length: 128 }),
    url: varchar('url', { length: 2048 }),
    sourceUrl: varchar('source_url', { length: 2048 }),
    line: integer('line'),
    col: integer('col'),
    breadcrumbs: jsonb('breadcrumbs').$type<Breadcrumb[]>(),
    tags: jsonb('tags').$type<Record<string, string>>(),
    extra: jsonb('extra').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('error_occurrences_error_id_occurred_at_idx').on(table.errorId, table.occurredAt.desc()),
    index('error_occurrences_project_id_occurred_at_idx').on(table.projectId, table.occurredAt.desc()),
    index('error_occurrences_error_id_session_id_idx').on(table.errorId, table.sessionId),
  ],
);
