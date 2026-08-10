import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { projects } from './projects';

// path/source/browser/os/device/country are not individually indexed —
// every query in this app filters by projectId first (there is no
// cross-project query), so the `projectId + field` compound indexes below
// already cover these lookups via their prefix.
export const pageViews = pgTable(
  'pageviews',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 2048 }).notNull(),
    path: varchar('path', { length: 1024 }).notNull(),
    referrer: varchar('referrer', { length: 2048 }),
    // Derived at write time from `referrer` (hostname, or 'Direct' when
    // absent) so it can be filtered/grouped on directly.
    source: varchar('source', { length: 255 }).notNull().default('Direct'),
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
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    userId: varchar('user_id', { length: 100 }),
    userAgent: varchar('user_agent', { length: 512 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('pageviews_project_id_timestamp_idx').on(table.projectId, table.timestamp.desc()),
    index('pageviews_project_id_session_id_idx').on(table.projectId, table.sessionId),
    index('pageviews_project_id_path_idx').on(table.projectId, table.path),
    index('pageviews_project_id_source_idx').on(table.projectId, table.source),
    index('pageviews_project_id_country_idx').on(table.projectId, table.country),
    index('pageviews_project_id_browser_idx').on(table.projectId, table.browser),
    index('pageviews_project_id_device_idx').on(table.projectId, table.device),
    index('pageviews_project_id_timestamp_session_id_idx').on(table.projectId, table.timestamp.desc(), table.sessionId),
    index('pageviews_project_id_utm_source_idx').on(table.projectId, table.utmSource),
    index('pageviews_project_id_utm_campaign_idx').on(table.projectId, table.utmCampaign),
  ],
);
