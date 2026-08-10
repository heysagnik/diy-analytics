import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { users } from '@/db/schema';
import { AUTH_COOKIE, AUTH_MAX_AGE, createSession, normalizeEmail, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rateLimit';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many login attempts. Try again shortly.' }, { status: 429 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(body.email)))
    .limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_MAX_AGE,
  });
  return response;
}
