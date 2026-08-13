import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { oauthAuthorizationCodes, oauthClients, oauthTokens, users } from '@/db/schema';
import { type AuthUser, hashToken } from '@/lib/auth';
import { db } from '@/lib/db';

const ACCESS_TOKEN_PREFIX = 'diy_oat_';
const REFRESH_TOKEN_PREFIX = 'diy_ort_';
const CODE_PREFIX = 'diy_oac_';
const CLIENT_ID_PREFIX = 'diy_client_';

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecretHash: string | null;
  clientName: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: string;
}

/** Recognized by prefix, distinct from the `diy_` API-key format so mcpAuth can dispatch to the right verifier without ambiguity. */
export function isOAuthAccessToken(token: string) {
  return token.startsWith(ACCESS_TOKEN_PREFIX);
}

export async function registerClient(params: {
  clientName: string;
  redirectUris: string[];
  tokenEndpointAuthMethod?: 'none' | 'client_secret_post';
}): Promise<{ clientId: string; clientSecret: string | null }> {
  const clientId = `${CLIENT_ID_PREFIX}${randomBytes(16).toString('base64url')}`;
  const isConfidential = params.tokenEndpointAuthMethod === 'client_secret_post';
  const clientSecret = isConfidential ? randomBytes(32).toString('base64url') : null;

  await db.insert(oauthClients).values({
    clientId,
    clientSecretHash: clientSecret ? hashToken(clientSecret) : null,
    clientName: params.clientName,
    redirectUris: params.redirectUris,
    tokenEndpointAuthMethod: isConfidential ? 'client_secret_post' : 'none',
  });

  return { clientId, clientSecret };
}

export async function getClientByClientId(clientId: string): Promise<OAuthClient | null> {
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId)).limit(1);
  return client ?? null;
}

export function verifyClientSecret(client: OAuthClient, secret: string | undefined): boolean {
  if (!client.clientSecretHash) return true; // public client — no secret required, PKCE carries the proof
  if (!secret) return false;
  return hashToken(secret) === client.clientSecretHash;
}

export async function createAuthorizationCode(params: {
  clientDbId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string | null;
}): Promise<string> {
  const code = `${CODE_PREFIX}${randomBytes(32).toString('base64url')}`;
  await db.insert(oauthAuthorizationCodes).values({
    codeHash: hashToken(code),
    clientId: params.clientDbId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    scope: params.scope ?? null,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });
  return code;
}

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash('sha256').update(codeVerifier).digest('base64url');
  return computed === codeChallenge;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string | null;
}

async function issueTokenPair(params: {
  clientDbId: string;
  userId: string;
  scope: string | null;
}): Promise<TokenPair> {
  const accessToken = `${ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  const refreshToken = `${REFRESH_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;

  await db.insert(oauthTokens).values({
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    clientId: params.clientDbId,
    userId: params.userId,
    scope: params.scope,
    accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
    scope: params.scope,
  };
}

export async function exchangeAuthorizationCode(params: {
  client: OAuthClient;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenPair | { error: string }> {
  const [record] = await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(oauthAuthorizationCodes.codeHash, hashToken(params.code)),
        eq(oauthAuthorizationCodes.clientId, params.client.id),
        isNull(oauthAuthorizationCodes.usedAt),
        gt(oauthAuthorizationCodes.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!record) return { error: 'invalid_grant' };

  if (record.redirectUri !== params.redirectUri) return { error: 'invalid_grant' };
  if (!verifyPkce(params.codeVerifier, record.codeChallenge)) return { error: 'invalid_grant' };

  return issueTokenPair({ clientDbId: params.client.id, userId: record.userId, scope: record.scope });
}

export async function exchangeRefreshToken(params: {
  client: OAuthClient;
  refreshToken: string;
}): Promise<TokenPair | { error: string }> {
  const [record] = await db
    .select()
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.refreshTokenHash, hashToken(params.refreshToken)),
        eq(oauthTokens.clientId, params.client.id),
        isNull(oauthTokens.revokedAt),
        or(isNull(oauthTokens.refreshTokenExpiresAt), gt(oauthTokens.refreshTokenExpiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!record) return { error: 'invalid_grant' };

  // Rotate: revoke the old token pair, issue a fresh one, so a leaked
  // refresh token can only be replayed once before detection.
  await db.update(oauthTokens).set({ revokedAt: new Date() }).where(eq(oauthTokens.id, record.id));

  return issueTokenPair({ clientDbId: params.client.id, userId: record.userId, scope: record.scope });
}

export interface ConnectedApp {
  clientId: string;
  clientName: string;
  createdAt: Date;
}

/**
 * One row per connected client, not per token — a client can accumulate
 * many token rows over time via refresh rotation, but the account page
 * should show "you connected X" once. Sorted by most recently issued token,
 * so a client that's still actively refreshing sorts to the top.
 */
export async function listConnectedApps(userId: string): Promise<ConnectedApp[]> {
  const rows = await db
    .select({
      clientId: oauthClients.clientId,
      clientName: oauthClients.clientName,
      createdAt: oauthTokens.createdAt,
    })
    .from(oauthTokens)
    .innerJoin(oauthClients, eq(oauthTokens.clientId, oauthClients.id))
    .where(and(eq(oauthTokens.userId, userId), isNull(oauthTokens.revokedAt)))
    .orderBy(desc(oauthTokens.createdAt));

  const byClient = new Map<string, ConnectedApp>();
  for (const row of rows) {
    if (byClient.has(row.clientId)) continue;
    byClient.set(row.clientId, row);
  }
  return Array.from(byClient.values());
}

export async function revokeConnectedApp(userId: string, clientId: string): Promise<boolean> {
  const client = await getClientByClientId(clientId);
  if (!client) return false;

  const revoked = await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.clientId, client.id), isNull(oauthTokens.revokedAt)))
    .returning({ id: oauthTokens.id });
  return revoked.length > 0;
}

export async function revokeOAuthToken(clientDbId: string, token: string): Promise<void> {
  const hash = hashToken(token);
  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.clientId, clientDbId),
        or(eq(oauthTokens.accessTokenHash, hash), eq(oauthTokens.refreshTokenHash, hash)),
      ),
    );
}

export async function verifyOAuthAccessToken(token: string): Promise<AuthUser | null> {
  const [record] = await db
    .select({ userId: oauthTokens.userId })
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.accessTokenHash, hashToken(token)),
        isNull(oauthTokens.revokedAt),
        gt(oauthTokens.accessTokenExpiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);
  return user ?? null;
}
