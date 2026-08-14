import { and, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { errorOccurrences, errors } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

const BREAKDOWN_DIMENSIONS = ['browser', 'os', 'device', 'country'] as const;
type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

function isBreakdownDimension(value: string | null): value is BreakdownDimension {
  return !!value && (BREAKDOWN_DIMENSIONS as readonly string[]).includes(value);
}

async function assertErrorInProject(errorId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: errors.id })
    .from(errors)
    .where(and(eq(errors.id, errorId), eq(errors.projectId, projectId)))
    .limit(1);
  return !!row;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; errorId: string }> }) {
  const { id, errorId } = await params;
  if (!isValidUuid(id) || !isValidUuid(errorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  if (!(await assertErrorInProject(errorId, id))) {
    return NextResponse.json({ error: 'Error not found' }, { status: 404 });
  }

  const view = request.nextUrl.searchParams.get('view') || 'summary';

  try {
    if (view === 'timeline') {
      const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days')) || 14));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${errorOccurrences.occurredAt}), 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(errorOccurrences)
        .where(and(eq(errorOccurrences.errorId, errorId), gte(errorOccurrences.occurredAt, since)))
        .groupBy(sql`date_trunc('day', ${errorOccurrences.occurredAt})`)
        .orderBy(sql`date_trunc('day', ${errorOccurrences.occurredAt})`);

      return NextResponse.json({ buckets: rows });
    }

    if (view === 'breakdown') {
      const by = request.nextUrl.searchParams.get('by');
      if (!isBreakdownDimension(by)) {
        return NextResponse.json({ error: `by must be one of: ${BREAKDOWN_DIMENSIONS.join(', ')}` }, { status: 400 });
      }
      const column = errorOccurrences[by];
      const rows = await db
        .select({ value: column, count: count() })
        .from(errorOccurrences)
        .where(eq(errorOccurrences.errorId, errorId))
        .groupBy(column)
        .orderBy(sql`count(*) desc`);

      return NextResponse.json({ by, items: rows });
    }

    if (view === 'latest') {
      const [latest] = await db
        .select()
        .from(errorOccurrences)
        .where(eq(errorOccurrences.errorId, errorId))
        .orderBy(desc(errorOccurrences.occurredAt))
        .limit(1);
      return NextResponse.json({ occurrence: latest ?? null });
    }

    // Default: affected-user/session summary.
    const [summary] = await db
      .select({
        totalOccurrences: count(),
        affectedSessions: countDistinct(errorOccurrences.sessionId),
        affectedUsers: countDistinct(sql`coalesce(${errorOccurrences.userId}, ${errorOccurrences.sessionId})`),
      })
      .from(errorOccurrences)
      .where(eq(errorOccurrences.errorId, errorId));

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Error fetching error occurrences:', err);
    return NextResponse.json({ error: 'Failed to fetch occurrences' }, { status: 500 });
  }
}
