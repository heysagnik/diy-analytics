import { and, count, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_STATUSES, type ErrorStatus, errors } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

function isErrorStatus(value: string): value is ErrorStatus {
  return (ERROR_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const status = request.nextUrl.searchParams.get('status') || 'active';
  if (!isErrorStatus(status)) {
    return NextResponse.json({ error: `status must be one of: ${ERROR_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const rows = await db
      .select({ release: errors.release, count: count() })
      .from(errors)
      .where(and(eq(errors.projectId, id), eq(errors.status, status)))
      .groupBy(errors.release);

    const releases = rows.map((r) => ({ release: r.release, count: r.count })).sort((a, b) => b.count - a.count);
    return NextResponse.json(releases);
  } catch (err) {
    console.error('Error fetching error releases:', err);
    return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
  }
}
