import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const oauthClients = pgTable('oauth_clients', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  clientId: varchar('client_id', { length: 64 }).notNull().unique(),
  // Null for public clients (PKCE-only, no secret) — e.g. claude.ai's
  // connector registers itself as public and relies on PKCE alone.
  clientSecretHash: varchar('client_secret_hash', { length: 64 }),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  redirectUris: text('redirect_uris').array().notNull(),
  tokenEndpointAuthMethod: varchar('token_endpoint_auth_method', { length: 30 }).notNull().default('none'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
