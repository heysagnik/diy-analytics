import { NextResponse } from 'next/server';
import { getApiKeyUser } from '@/lib/apiKeys';
import type { AuthUser } from '@/lib/auth';

/**
 * MCP clients authenticate with a bearer API key, never a browser session
 * cookie — kept separate from requireUser (lib/serverAuth.ts) rather than
 * merged, so the two credential types can't be accidentally accepted on the
 * wrong surface.
 *
 * The key is normally sent as an Authorization header, but some MCP clients
 * (e.g. claude.ai's custom connector UI) only let the user configure a URL
 * with no custom headers — for those, a `?key=` query param is accepted too.
 */
export async function requireApiKeyUser(request: Request): Promise<AuthUser | NextResponse> {
  const header = request.headers.get('authorization') || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
  const queryToken = new URL(request.url).searchParams.get('key');
  const token = headerToken || queryToken;
  const user = await getApiKeyUser(token);
  return user ?? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
