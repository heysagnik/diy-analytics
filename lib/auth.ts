import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { sessions, users } from '@/db/schema';
import { db } from '@/lib/db';

const scrypt = promisify(scryptCallback);
export const AUTH_COOKIE = 'diy_session';
export const AUTH_MAX_AGE = 30 * 24 * 60 * 60;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, salt, expectedHex] = encoded.split('$');
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + AUTH_MAX_AGE * 1000),
  });
  return token;
}

export async function getSessionUser(token?: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  const [updated] = await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(
      and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())),
    )
    .returning({ userId: sessions.userId });
  if (!updated) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, updated.userId))
    .limit(1);
  if (!user) return null;
  return user;
}

export async function getRequestUser() {
  const store = await cookies();
  return getSessionUser(store.get(AUTH_COOKIE)?.value);
}

export async function revokeSession(token?: string | null) {
  if (!token) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(token)));
}

export { normalizeEmail };
