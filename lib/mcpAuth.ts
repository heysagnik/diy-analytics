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
 * The token is normally sent as an Authorization header, but some MCP
 * clients (e.g. claude.ai's custom connector UI, when no OAuth is used)
 * only let the user configure a URL with no custom headers — for those, a
 * `?key=` query param is accepted too.
 *
 * Two credential formats are accepted: a long-lived `diy_...` API key, or a
 * short-lived `diy_oat_...` OAuth access token issued via the authorization
 * flow at app/api/mcp/oauth/*. The prefix disambiguates which verifier to
 * use — no need to try both against the DB.
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
