import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { FunnelStepType } from './enums';
import { projects } from './projects';

export interface FunnelStep {
  type: FunnelStepType;
  matchValue: string;
  label: string;
}

// Ordered — array index is the funnel step order. Stored as jsonb rather
// than a child table: funnelService always reads/writes the whole ordered
// array as one unit and never queries individual steps, so a child table
// would only add a join with no query benefit. Length (2-10) and per-step
// shape are validated in the service layer, same as the old Mongoose
// schema-level validator.
export const funnels = pgTable(
  'funnels',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    steps: jsonb('steps').notNull().$type<FunnelStep[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('funnels_project_id_created_at_idx').on(table.projectId, table.createdAt.desc())],
);

export const MAX_FUNNEL_STEPS = 10;
export const MIN_FUNNEL_STEPS = 2;
