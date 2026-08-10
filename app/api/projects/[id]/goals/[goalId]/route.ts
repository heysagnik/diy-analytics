import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { goals } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const { id, goalId } = await params;
  if (!isValidUuid(id) || !isValidUuid(goalId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const update: { name?: string; type?: 'page' | 'event'; matchValue?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (body.type === 'page' || body.type === 'event') update.type = body.type;
    if (typeof body.matchValue === 'string' && body.matchValue.trim()) update.matchValue = body.matchValue.trim();

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const [goal] = await db
      .update(goals)
      .set(update)
      .where(and(eq(goals.id, goalId), eq(goals.projectId, id)))
      .returning();

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json(withMongoId(goal));
  } catch (err) {
    console.error('Error updating goal:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const { id, goalId } = await params;
  if (!isValidUuid(id) || !isValidUuid(goalId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const [goal] = await db
      .delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.projectId, id)))
      .returning({ id: goals.id });
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (err) {
    console.error('Error deleting goal:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
