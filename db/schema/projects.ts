import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

function generateTrackingCode(): string {
  return `site_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export const projects = pgTable(
  'projects',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 200 }).notNull(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    // Derived from `url` by app code (see projectService.ts) — Drizzle has
    // no schema-level hook equivalent to Mongoose's pre-save middleware.
    domain: varchar('domain', { length: 255 }),
    trackingCode: varchar('tracking_code', { length: 64 }).notNull().unique().$defaultFn(generateTrackingCode),
    publicMode: boolean('public_mode').notNull().default(false),
    // Reporting timezone (IANA name, e.g. "Asia/Kolkata"). Null means "use
    // each viewer's own browser timezone" — see AnalyticsService.getAnalytics.
    timezone: varchar('timezone', { length: 100 }),
    excludedIPs: text('excluded_ips').array().notNull().default([]),
    excludedPaths: text('excluded_paths').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('projects_workspace_id_idx').on(table.workspaceId)],
);
