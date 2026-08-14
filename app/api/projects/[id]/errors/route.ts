import { and, desc, eq, isNull } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_STATUSES, type ErrorStatus, errors } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || DEFAULT_LIMIT));

  // 'none' selects errors with no release tag; absent means "all releases".
  const release = request.nextUrl.searchParams.get('release');
  const releaseCondition =
    release === null ? undefined : release === 'none' ? isNull(errors.release) : eq(errors.release, release);

  // 'none' selects errors with no parsed error name; absent means "all".
  const errorName = request.nextUrl.searchParams.get('errorName');
  const errorNameCondition =
    errorName === null ? undefined : errorName === 'none' ? isNull(errors.errorName) : eq(errors.errorName, errorName);

  try {
    const rows = await db
      .select()
      .from(errors)
      .where(and(eq(errors.projectId, id), eq(errors.status, status), releaseCondition, errorNameCondition))
      .orderBy(desc(errors.lastSeenAt))
      .limit(limit);
    return NextResponse.json(rows.map(withMongoId));
  } catch (err) {
    console.error('Error fetching errors:', err);
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 });
  }
}
