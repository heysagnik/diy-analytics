import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { funnels } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; funnelId: string }> }) {
  const { id, funnelId } = await params;
  if (!isValidUuid(id) || !isValidUuid(funnelId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const [funnel] = await db
      .delete(funnels)
      .where(and(eq(funnels.id, funnelId), eq(funnels.projectId, id)))
      .returning({ id: funnels.id });
    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Funnel deleted successfully' });
  } catch (err) {
    console.error('Error deleting funnel:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
