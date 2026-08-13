import { type NextRequest, NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/apiKeys';
import { requireUser } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  const { keyId } = await params;
  if (!isValidUuid(keyId)) {
    return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
  }

  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const revoked = await revokeApiKey(user.id, keyId);
  if (!revoked) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
