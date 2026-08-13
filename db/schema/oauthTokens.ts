import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { oauthClients } from './oauthClients';
import { users } from './users';

export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accessTokenHash: varchar('access_token_hash', { length: 64 }).notNull().unique(),
    // Null once rotated away, or for tokens issued without offline access.
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).unique(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scope: varchar('scope', { length: 500 }),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_tokens_user_id_idx').on(table.userId),
    index('oauth_tokens_client_id_idx').on(table.clientId),
  ],
);
