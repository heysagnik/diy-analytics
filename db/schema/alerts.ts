import { sql } from 'drizzle-orm';
import { check, doublePrecision, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ALERT_CHANNELS, ALERT_METRICS, ALERT_THRESHOLD_TYPES, type AlertChannel, checkInList } from './enums';
import { funnels } from './funnels';
import { goals } from './goals';
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
    channel: varchar('channel', { length: 16 }).notNull().default('generic').$type<AlertChannel>(),
    // When set, the alert tracks that goal's/funnel's conversion rate
    // instead of `metric` — mutually exclusive with each other and with a
    // plain site-wide metric alert (see alerts_single_target_check).
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'cascade' }),
    funnelId: uuid('funnel_id').references(() => funnels.id, { onDelete: 'cascade' }),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('alerts_project_id_created_at_idx').on(table.projectId, table.createdAt.desc()),
    index('alerts_goal_id_idx').on(table.goalId),
    index('alerts_funnel_id_idx').on(table.funnelId),
    check('alerts_metric_check', sql`${table.metric} IN (${checkInList(ALERT_METRICS)})`),
    check('alerts_threshold_type_check', sql`${table.thresholdType} IN (${checkInList(ALERT_THRESHOLD_TYPES)})`),
    check('alerts_channel_check', sql`${table.channel} IN (${checkInList(ALERT_CHANNELS)})`),
    check('alerts_single_target_check', sql`NOT (${table.goalId} IS NOT NULL AND ${table.funnelId} IS NOT NULL)`),
  ],
);
