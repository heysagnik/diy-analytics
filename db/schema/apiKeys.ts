import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    // First few characters of the raw token, shown in the UI so a user can
    // tell keys apart without the full value ever being retrievable again.
    tokenPrefix: varchar('token_prefix', { length: 12 }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    // Null means the key never expires — unlike sessions, API keys are
    // meant for long-lived programmatic/MCP client use.
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('api_keys_user_id_idx').on(table.userId)],
);
