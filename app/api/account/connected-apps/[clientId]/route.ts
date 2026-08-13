import { type NextRequest, NextResponse } from 'next/server';
import { revokeConnectedApp } from '@/lib/oauth';
import { requireUser } from '@/lib/serverAuth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const revoked = await revokeConnectedApp(user.id, clientId);
  if (!revoked) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
