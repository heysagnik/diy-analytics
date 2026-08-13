import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { projects } from './projects';

// name/sessionId are not individually indexed — every query filters by
// projectId first, so the compound indexes below already cover them.
export const events = pgTable(
  'events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    path: varchar('path', { length: 1024 }).notNull(),
    // Free-form event payload — direct equivalent of Mongo's Mixed field.
    // trackingService caps its serialized size before insert (see
    // normalizeEventData), so no length cap is needed at the column level.
    data: jsonb('data').$type<Record<string, unknown>>(),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    userId: varchar('user_id', { length: 100 }),
    country: varchar('country', { length: 64 }),
    region: varchar('region', { length: 128 }),
    city: varchar('city', { length: 128 }),
    browser: varchar('browser', { length: 64 }),
    browserVersion: varchar('browser_version', { length: 32 }),
    os: varchar('os', { length: 64 }),
    osVersion: varchar('os_version', { length: 32 }),
    device: varchar('device', { length: 32 }),
    deviceVendor: varchar('device_vendor', { length: 64 }),
    deviceModel: varchar('device_model', { length: 128 }),
    referrer: varchar('referrer', { length: 2048 }),
    source: varchar('source', { length: 255 }).notNull().default('Direct'),
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
    index('events_project_id_timestamp_idx').on(table.projectId, table.timestamp.desc()),
    index('events_project_id_name_idx').on(table.projectId, table.name),
    index('events_project_id_session_id_idx').on(table.projectId, table.sessionId),
    index('events_project_id_source_idx').on(table.projectId, table.source),
    index('events_project_id_country_idx').on(table.projectId, table.country),
    index('events_project_id_browser_idx').on(table.projectId, table.browser),
    index('events_project_id_os_idx').on(table.projectId, table.os),
    index('events_project_id_device_idx').on(table.projectId, table.device),
    index('events_project_id_path_idx').on(table.projectId, table.path),
    index('events_project_id_utm_source_idx').on(table.projectId, table.utmSource),
    index('events_project_id_utm_medium_idx').on(table.projectId, table.utmMedium),
    index('events_project_id_utm_campaign_idx').on(table.projectId, table.utmCampaign),
  ],
);
