import { type NextRequest, NextResponse } from 'next/server';
import { createApiKey, listApiKeys } from '@/lib/apiKeys';
import { requireUser } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const keys = await listApiKeys(user.id);
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const { id, rawKey } = await createApiKey(user.id, name);
    return NextResponse.json({ id, name, rawKey }, { status: 201 });
  } catch (err) {
    console.error('Error creating API key:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}
