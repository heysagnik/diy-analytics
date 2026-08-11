import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { errors } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { resolveSourceLocation } from '@/lib/sourceMapResolver';
import { isValidUuid } from '@/lib/uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; errorId: string }> }) {
  const { id, errorId } = await params;
  if (!isValidUuid(id) || !isValidUuid(errorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const [error] = await db
    .select({ sourceUrl: errors.sourceUrl, line: errors.line, col: errors.col })
    .from(errors)
    .where(and(eq(errors.id, errorId), eq(errors.projectId, id)))
    .limit(1);
  if (!error) {
    return NextResponse.json({ error: 'Error not found' }, { status: 404 });
  }
  if (!error.sourceUrl || error.line === null) {
    return NextResponse.json({ error: 'No source location captured for this error' }, { status: 422 });
  }

  try {
    const resolved = await resolveSourceLocation(error.sourceUrl, error.line, error.col ?? 0);
    if (!resolved) {
      return NextResponse.json({ error: 'No source map found for this file' }, { status: 404 });
    }
    return NextResponse.json(resolved);
  } catch (err) {
    console.error('Source map resolution error:', err);
    return NextResponse.json({ error: 'Failed to resolve source map' }, { status: 502 });
  }
}
