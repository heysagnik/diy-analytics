import { NextResponse } from 'next/server';
import { getApiKeyUser } from '@/lib/apiKeys';
import type { AuthUser } from '@/lib/auth';
import { isOAuthAccessToken, verifyOAuthAccessToken } from '@/lib/oauth';

/**
 * MCP clients authenticate with a bearer token, never a browser session
 * cookie — kept separate from requireUser (lib/serverAuth.ts) rather than
 * merged, so the two credential types can't be accidentally accepted on the
 * wrong surface.
 *
 * Two formats are accepted: a long-lived `diy_...` API key, or a
 * short-lived `diy_oat_...` OAuth access token (issued via
 * app/api/mcp/oauth/*) — the prefix disambiguates which verifier to use.
 * The token is normally sent as an Authorization header, but some clients
 * (e.g. claude.ai's connector UI without custom headers) send it as a
 * `?key=` query param instead.
 */
export async function requireApiKeyUser(request: Request): Promise<AuthUser | NextResponse> {
  const header = request.headers.get('authorization') || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
  const queryToken = new URL(request.url).searchParams.get('key');
  const token = headerToken || queryToken;

  const user = token
    ? isOAuthAccessToken(token)
      ? await verifyOAuthAccessToken(token)
      : await getApiKeyUser(token)
    : null;
  return user ?? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
