import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/mongodb';
import Session from '@/models/Session';
import '@/models/User';

const scrypt = promisify(scryptCallback);
export const AUTH_COOKIE = 'diy_session';
export const AUTH_MAX_AGE = 30 * 24 * 60 * 60;

export interface AuthUser { id: string; email: string; name: string }

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, salt, expectedHex] = encoded.split('$');
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(userId: string) {
  await connectToDatabase();
  const token = randomBytes(32).toString('base64url');
  await Session.create({ tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + AUTH_MAX_AGE * 1000) });
  return token;
}

export async function getSessionUser(token?: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  await connectToDatabase();
  const session = await Session.findOneAndUpdate(
    { tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { lastUsedAt: new Date() } },
    { returnDocument: 'after' }
  ).populate('userId', 'email name').lean() as unknown as {
    userId?: { _id: unknown; email: string; name: string };
  } | null;
  if (!session?.userId) return null;
  return { id: String(session.userId._id), email: session.userId.email, name: session.userId.name };
}

export async function getRequestUser() {
  const store = await cookies();
  return getSessionUser(store.get(AUTH_COOKIE)?.value);
}

export async function revokeSession(token?: string | null) {
  if (!token) return;
  await connectToDatabase();
  await Session.updateOne({ tokenHash: hashToken(token) }, { $set: { revokedAt: new Date() } });
}

export { normalizeEmail };
