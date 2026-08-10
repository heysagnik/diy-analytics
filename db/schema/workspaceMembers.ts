import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { checkInList, WORKSPACE_MEMBER_ROLES } from './enums';
import { users } from './users';
import { workspaces } from './workspaces';

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('workspace_members_workspace_id_user_id_idx').on(table.workspaceId, table.userId),
    check('workspace_members_role_check', sql`${table.role} IN (${checkInList(WORKSPACE_MEMBER_ROLES)})`),
  ],
);
