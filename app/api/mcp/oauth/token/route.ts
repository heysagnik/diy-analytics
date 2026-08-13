import { NextResponse } from 'next/server';
import { exchangeAuthorizationCode, exchangeRefreshToken, getClientByClientId, verifyClientSecret } from '@/lib/oauth';
import { isRateLimited } from '@/lib/rateLimit';

const TOKEN_LIMIT = 20;
const TOKEN_WINDOW_MS = 60_000;

function errorResponse(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, ...(description ? { error_description: description } : {}) }, { status });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(`oauth-token:${ip}`, TOKEN_LIMIT, TOKEN_WINDOW_MS)) {
    return errorResponse('invalid_request', 'Too many requests', 429);
  }

  const contentType = request.headers.get('content-type') || '';
  let params: URLSearchParams;
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    params = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
  } else {
    params = new URLSearchParams(await request.text());
  }

  const grantType = params.get('grant_type');
  const clientId = params.get('client_id');
  if (!clientId) return errorResponse('invalid_client', 'client_id is required');

  const client = await getClientByClientId(clientId);
  if (!client) return errorResponse('invalid_client');
  if (!verifyClientSecret(client, params.get('client_secret') || undefined)) {
    return errorResponse('invalid_client', 'client authentication failed', 401);
  }

  let result: Awaited<ReturnType<typeof exchangeAuthorizationCode>>;

  if (grantType === 'authorization_code') {
    const code = params.get('code');
    const codeVerifier = params.get('code_verifier');
    const redirectUri = params.get('redirect_uri');
    if (!code || !codeVerifier || !redirectUri) {
      return errorResponse('invalid_request', 'code, code_verifier and redirect_uri are required');
    }
    result = await exchangeAuthorizationCode({ client, code, codeVerifier, redirectUri });
  } else if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token');
    if (!refreshToken) return errorResponse('invalid_request', 'refresh_token is required');
    result = await exchangeRefreshToken({ client, refreshToken });
  } else {
    return errorResponse('unsupported_grant_type');
  }

  if ('error' in result) return errorResponse(result.error);

  return NextResponse.json({
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: result.expiresIn,
    refresh_token: result.refreshToken,
    scope: result.scope ?? undefined,
  });
}
