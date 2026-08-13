import { NextResponse } from 'next/server';
import { AUTH_COOKIE, getSessionUser } from '@/lib/auth';
import { createAuthorizationCode, getClientByClientId } from '@/lib/oauth';

/**
 * Handles the consent screen's native form POST (not fetch — so the
 * browser follows the resulting redirect to the client's own redirect_uri
 * as a real navigation, including when that URI is cross-origin).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const clientId = form.get('client_id')?.toString();
  const redirectUri = form.get('redirect_uri')?.toString();
  const codeChallenge = form.get('code_challenge')?.toString();
  const state = form.get('state')?.toString();
  const scope = form.get('scope')?.toString();
  const decision = form.get('decision')?.toString();

  if (!clientId || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const client = await getClientByClientId(clientId);
  if (!client?.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set('state', state);

  if (decision !== 'approve') {
    target.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(target, { status: 303 });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  const user = await getSessionUser(match?.[1]);
  if (!user) {
    target.searchParams.set('error', 'login_required');
    return NextResponse.redirect(target, { status: 303 });
  }

  const code = await createAuthorizationCode({
    clientDbId: client.id,
    userId: user.id,
    redirectUri,
    codeChallenge,
    scope,
  });

  target.searchParams.set('code', code);
  return NextResponse.redirect(target, { status: 303 });
}
