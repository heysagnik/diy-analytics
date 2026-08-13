import { NextResponse } from 'next/server';
import { getClientByClientId, revokeOAuthToken, verifyClientSecret } from '@/lib/oauth';

// RFC 7009 — always returns 200 on a well-formed request, even for an
// already-invalid token, per spec (revocation is idempotent from the
// client's point of view).
export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  const token = params.get('token');
  const clientId = params.get('client_id');
  if (!token || !clientId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const client = await getClientByClientId(clientId);
  if (!client || !verifyClientSecret(client, params.get('client_secret') || undefined)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }

  await revokeOAuthToken(client.id, token);
  return new NextResponse(null, { status: 200 });
}
