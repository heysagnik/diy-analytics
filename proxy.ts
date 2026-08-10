import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_CORS_HEADERS } from '@/lib/corsHeaders';

const AUTH_COOKIE = 'diy_session';

const PUBLIC_PATH_PATTERNS: Array<RegExp> = [
  /^\/api\/track(\/.*)?$/,
  /^\/api\/tracker\.js(\/.*)?$/,
  /^\/api\/whoami(\/.*)?$/,
  /^\/api\/auth\/(login|register|logout|me)(\/.*)?$/,
  /^\/api\/public(\/.*)?$/,
  /^\/api\/site-icon(\/.*)?$/,
  /^\/public(\/.*)?$/,
  /^\/login(\/.*)?$/,
  /^\/register(\/.*)?$/,
  /^\/logout(\/.*)?$/,
  /^\/_next(\/.*)?$/,
  /^\/favicon\.ico$/,
];

async function verify(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  return Boolean(cookie);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (/^\/api\/track(\/.*)?$/.test(pathname) || /^\/api\/tracker\.js(\/.*)?$/.test(pathname)) {
      for (const [key, value] of Object.entries(PUBLIC_CORS_HEADERS)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  if (PUBLIC_PATH_PATTERNS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  if (pathname === '/public' || pathname.startsWith('/public/')) {
    return NextResponse.next();
  }

  const ok = await verify(request);
  if (ok) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
