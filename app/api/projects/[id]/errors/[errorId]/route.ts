import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_STATUSES, type ErrorStatus, errors } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

function isErrorStatus(value: unknown): value is ErrorStatus {
  return typeof value === 'string' && (ERROR_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; errorId: string }> }) {
  const { id, errorId } = await params;
  if (!isValidUuid(id) || !isValidUuid(errorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const [row] = await db
    .select()
    .from(errors)
    .where(and(eq(errors.id, errorId), eq(errors.projectId, id)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: 'Error not found' }, { status: 404 });
  }
  return NextResponse.json(withMongoId(row));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; errorId: string }> }) {
  const { id, errorId } = await params;
  if (!isValidUuid(id) || !isValidUuid(errorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const { status } = body;
    if (!isErrorStatus(status)) {
      return NextResponse.json({ error: `status must be one of: ${ERROR_STATUSES.join(', ')}` }, { status: 400 });
    }

    const [row] = await db
      .update(errors)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(errors.id, errorId), eq(errors.projectId, id)))
      .returning();
    if (!row) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 });
    }
    return NextResponse.json(withMongoId(row));
  } catch (err) {
    console.error('Error updating error status:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; errorId: string }> }) {
  const { id, errorId } = await params;
  if (!isValidUuid(id) || !isValidUuid(errorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const [row] = await db
      .delete(errors)
      .where(and(eq(errors.id, errorId), eq(errors.projectId, id)))
      .returning({ id: errors.id });
    if (!row) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error deleted successfully' });
  } catch (err) {
    console.error('Error deleting error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
