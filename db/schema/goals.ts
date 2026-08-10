import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { checkInList, GOAL_TYPES, type GoalType } from './enums';
import { projects } from './projects';

export const goals = pgTable(
  'goals',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    // 'page': matchValue is an exact path (e.g. "/thank-you").
    // 'event': matchValue is a custom event name tracked via window.trackEvent.
    type: varchar('type', { length: 16 }).notNull().$type<GoalType>(),
    matchValue: text('match_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('goals_project_id_created_at_idx').on(table.projectId, table.createdAt.desc()),
    check('goals_type_check', sql`${table.type} IN (${checkInList(GOAL_TYPES)})`),
  ],
);
