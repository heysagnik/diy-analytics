import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { parseBoundedInt } from '@/lib/parseIntParam';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

// GET /api/projects/:id/activity-heatmap?userId=<visitor id>
// One year of daily pageview counts for a single visitor — a GitHub-style
// contribution calendar showing when this specific person is active over
// the last 12 months. `userId` is required: this is a per-visitor pattern,
// not a project-wide one.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const currentYear = new Date().getUTCFullYear();
  const yearParam = request.nextUrl.searchParams.get('year');
  if (yearParam !== null && !/^\d+$/.test(yearParam)) {
    return NextResponse.json({ error: 'year must be a valid calendar year' }, { status: 400 });
  }
  const year = parseBoundedInt(yearParam, currentYear, 2000, currentYear + 1);

  try {
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Visitor identity is userId when present, falling back to sessionId —
    // matches the grouping in /api/projects/:id/users, so the id passed
    // here (whichever form it took there) resolves to the same visitor.
    const rows = await db
      .select({ date: sql<string>`to_char(${pageViews.timestamp}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.projectId, id),
          gte(pageViews.timestamp, startDate),
          lte(pageViews.timestamp, endDate),
          or(eq(pageViews.userId, userId), eq(pageViews.sessionId, userId)),
        ),
      )
      .groupBy(sql`to_char(${pageViews.timestamp}, 'YYYY-MM-DD')`);

    const countsByDate = new Map(rows.map((r) => [r.date, r.count]));
    const days: { date: string; count: number }[] = [];
    const cursor = new Date(startDate);

    // Fill full year from Jan 1 to Dec 31
    while (cursor <= endDate) {
      const iso = cursor.toISOString().slice(0, 10);
      days.push({ date: iso, count: countsByDate.get(iso) || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return NextResponse.json({ success: true, data: { days } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Activity heatmap error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
