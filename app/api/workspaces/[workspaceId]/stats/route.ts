import { and, count, eq, gte, inArray } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { events, pageViews, projects, workspaceMembers } from '@/db/schema';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const { workspaceId } = await params;
  if (!isValidUuid(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
  }

  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
  const projectIds = projectRows.map((row) => row.id);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  let pageViewCount = 0;
  let eventCount = 0;
  if (projectIds.length > 0) {
    const [[pv], [ev]] = await Promise.all([
      db
        .select({ count: count() })
        .from(pageViews)
        .where(and(inArray(pageViews.projectId, projectIds), gte(pageViews.timestamp, since))),
      db
        .select({ count: count() })
        .from(events)
        .where(and(inArray(events.projectId, projectIds), gte(events.timestamp, since))),
    ]);
    pageViewCount = pv.count;
    eventCount = ev.count;
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        projectCount: projectIds.length,
        pageViews: pageViewCount,
        events: eventCount,
        since: since.toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
