import { sql } from 'drizzle-orm';
import { check, doublePrecision, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ALERT_METRICS, ALERT_THRESHOLD_TYPES, checkInList } from './enums';
import { projects } from './projects';

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    metric: varchar('metric', { length: 32 }).notNull(),
    // 'drop_pct': fire when the metric falls by >= thresholdValue percent vs the prior 24h.
    // 'value_below': fire when the metric's raw total falls below thresholdValue.
    thresholdType: varchar('threshold_type', { length: 32 }).notNull(),
    thresholdValue: doublePrecision('threshold_value').notNull(),
    webhookUrl: text('webhook_url').notNull(),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('alerts_project_id_created_at_idx').on(table.projectId, table.createdAt.desc()),
    check('alerts_metric_check', sql`${table.metric} IN (${checkInList(ALERT_METRICS)})`),
    check('alerts_threshold_type_check', sql`${table.thresholdType} IN (${checkInList(ALERT_THRESHOLD_TYPES)})`),
  ],
);
