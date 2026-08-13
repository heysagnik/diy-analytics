import { NextResponse } from 'next/server';
import { getClientByClientId } from '@/lib/oauth';

// Unauthenticated by design: the consent screen needs to show the
// requesting client's name before the user has necessarily signed in.
// Returns only the display name — nothing secret about a client is exposed.
export async function GET(request: Request) {
  const clientId = new URL(request.url).searchParams.get('client_id');
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const client = await getClientByClientId(clientId);
  if (!client) return NextResponse.json({ error: 'invalid_client' }, { status: 404 });

  return NextResponse.json({ clientName: client.clientName });
}
