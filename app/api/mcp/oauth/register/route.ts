import { NextResponse } from 'next/server';
import { registerClient } from '@/lib/oauth';
import { isRateLimited } from '@/lib/rateLimit';

const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(`oauth-register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS)) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'Too many requests' }, { status: 429 });
  }

  let body: { redirect_uris?: unknown; client_name?: unknown; token_endpoint_auth_method?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === 'string')) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris is required' },
      { status: 400 },
    );
  }
  for (const uri of redirectUris) {
    try {
      new URL(uri);
    } catch {
      return NextResponse.json(
        { error: 'invalid_redirect_uri', error_description: `Invalid redirect_uri: ${uri}` },
        { status: 400 },
      );
    }
  }

  const authMethod = body.token_endpoint_auth_method === 'client_secret_post' ? 'client_secret_post' : 'none';
  const clientName =
    typeof body.client_name === 'string' && body.client_name.trim() ? body.client_name.trim() : 'MCP client';

  const { clientId, clientSecret } = await registerClient({
    clientName,
    redirectUris,
    tokenEndpointAuthMethod: authMethod,
  });

  return NextResponse.json(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: authMethod,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: clientName,
    },
    { status: 201 },
  );
}
