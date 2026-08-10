import { type NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, revokeSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  await revokeSession(request.cookies.get(AUTH_COOKIE)?.value);
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
