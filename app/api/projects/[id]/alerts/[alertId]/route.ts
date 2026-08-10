import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { alerts } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; alertId: string }> }) {
  const { id, alertId } = await params;
  if (!isValidUuid(id) || !isValidUuid(alertId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const [alert] = await db
      .delete(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.projectId, id)))
      .returning({ id: alerts.id });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Error deleting alert:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
