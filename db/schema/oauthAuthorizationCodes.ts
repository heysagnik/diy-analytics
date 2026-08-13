import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { oauthClients } from './oauthClients';
import { users } from './users';

export const oauthAuthorizationCodes = pgTable(
  'oauth_authorization_codes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    codeHash: varchar('code_hash', { length: 64 }).notNull().unique(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    redirectUri: varchar('redirect_uri', { length: 2000 }).notNull(),
    codeChallenge: varchar('code_challenge', { length: 200 }).notNull(),
    scope: varchar('scope', { length: 500 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // Codes are single-use: set the moment they're exchanged so a replay is
    // rejected even within the expiry window.
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_codes_client_id_idx').on(table.clientId),
    index('oauth_codes_expires_at_idx').on(table.expiresAt),
  ],
);
