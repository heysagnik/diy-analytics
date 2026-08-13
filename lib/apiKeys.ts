import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { apiKeys, users } from '@/db/schema';
import { type AuthUser, hashToken } from '@/lib/auth';
import { db } from '@/lib/db';

const KEY_PREFIX = 'diy_';

export interface ApiKeySummary {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export async function createApiKey(
  userId: string,
  name: string,
  expiresAt?: Date | null,
): Promise<{ id: string; rawKey: string }> {
  const rawKey = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
  const [key] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      tokenHash: hashToken(rawKey),
      tokenPrefix: rawKey.slice(0, 12),
      expiresAt: expiresAt ?? null,
    })
    .returning({ id: apiKeys.id });
  return { id: key.id, rawKey };
}

export async function getApiKeyUser(rawKey?: string | null): Promise<AuthUser | null> {
  if (!rawKey) return null;
  const [updated] = await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(apiKeys.tokenHash, hashToken(rawKey)),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
      ),
    )
    .returning({ userId: apiKeys.userId });
  if (!updated) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, updated.userId))
    .limit(1);
  return user ?? null;
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const [revoked] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return !!revoked;
}

export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      tokenPrefix: apiKeys.tokenPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}
