import { NextResponse } from 'next/server';
import { getClientByClientId } from '@/lib/oauth';

/**
 * Entry point of the authorization-code flow (RFC 6749 §4.1.1). Validates
 * the request against the registered client, then hands off to the login
 * page (if no session) or the consent screen (app/oauth/consent) — both of
 * which forward the same query params so the flow can resume. Actual code
 * issuance happens on consent approval, not here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const responseType = params.get('response_type');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing client_id or redirect_uri' },
      { status: 400 },
    );
  }

  const client = await getClientByClientId(clientId);
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not registered' },
      { status: 400 },
    );
  }

  const fail = (error: string, description: string) => {
    const target = new URL(redirectUri);
    target.searchParams.set('error', error);
    target.searchParams.set('error_description', description);
    const state = params.get('state');
    if (state) target.searchParams.set('state', state);
    return NextResponse.redirect(target);
  };

  if (responseType !== 'code') return fail('unsupported_response_type', 'Only "code" is supported');
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return fail('invalid_request', 'PKCE (S256) is required');
  }

  const consentUrl = new URL('/oauth/consent', url.origin);
  consentUrl.search = params.toString();
  return NextResponse.redirect(consentUrl);
}
