import { and, count, countDistinct, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { pageViews, projects, workspaceMembers } from '@/db/schema';
import type { NewProjectData } from '@/lib/api/projects';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';
import { createProject as createProjectRow } from './services/projectService';

interface AnalyticsSummary {
  views: number;
  users: number;
  growth: string;
}

async function getAnalyticsSummaries(projectIds: string[]): Promise<Map<string, AnalyticsSummary>> {
  const summaries = new Map<string, AnalyticsSummary>();
  if (projectIds.length === 0) return summaries;

  try {
    const now = new Date();
    const startDate30Days = new Date(now);
    startDate30Days.setDate(now.getDate() - 29);
    startDate30Days.setHours(0, 0, 0, 0);

    const endDate30Days = new Date(now);
    endDate30Days.setHours(23, 59, 59, 999);

    const previousPeriodStartDate = new Date(startDate30Days);
    previousPeriodStartDate.setDate(startDate30Days.getDate() - 30);
    const previousPeriodEndDate = new Date(startDate30Days);
    previousPeriodEndDate.setDate(startDate30Days.getDate() - 1);
    previousPeriodEndDate.setHours(23, 59, 59, 999);

    const [currentRows, previousRows] = await Promise.all([
      db
        .select({ projectId: pageViews.projectId, views: count(), users: countDistinct(pageViews.sessionId) })
        .from(pageViews)
        .where(
          and(
            inArray(pageViews.projectId, projectIds),
            gte(pageViews.timestamp, startDate30Days),
            lte(pageViews.timestamp, endDate30Days),
          ),
        )
        .groupBy(pageViews.projectId),
      db
        .select({ projectId: pageViews.projectId, users: countDistinct(pageViews.sessionId) })
        .from(pageViews)
        .where(
          and(
            inArray(pageViews.projectId, projectIds),
            gte(pageViews.timestamp, previousPeriodStartDate),
            lte(pageViews.timestamp, previousPeriodEndDate),
          ),
        )
        .groupBy(pageViews.projectId),
    ]);

    const previousUsersByProject = new Map(previousRows.map((row) => [row.projectId, row.users]));

    for (const row of currentRows) {
      const previousUsers = previousUsersByProject.get(row.projectId) ?? 0;
      const uniqueUsersChange =
        previousUsers === 0
          ? row.users > 0
            ? 100
            : 0
          : Math.round(((row.users - previousUsers) / previousUsers) * 100);
      summaries.set(row.projectId, {
        views: row.views,
        users: row.users,
        growth: uniqueUsersChange >= 0 ? `+${uniqueUsersChange}%` : `${uniqueUsersChange}%`,
      });
    }
  } catch (error) {
    console.error('Error fetching analytics summaries:', error);
  }

  return summaries;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId || !isValidUuid(workspaceId))
      return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });

    const [membership] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const projectsFromDB = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt));

    const summaries = await getAnalyticsSummaries(projectsFromDB.map((project) => project.id));

    const projectsWithAnalytics = projectsFromDB.map((project) => ({
      ...withMongoId(project),
      analytics: summaries.get(project.id) ?? { views: 0, users: 0, growth: '+0%' },
    }));

    return NextResponse.json(projectsWithAnalytics);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;
    const body = (await req.json()) as NewProjectData & { workspaceId: string };
    const { name, url, workspaceId } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    if (!workspaceId || !isValidUuid(workspaceId))
      return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.id),
          inArray(workspaceMembers.role, ['owner', 'admin', 'member']),
        ),
      )
      .limit(1);
    if (!membership) return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 });

    const project = await createProjectRow({ name: name.trim(), url, workspaceId: membership.workspaceId });
    if (!project) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    return NextResponse.json(withMongoId(project));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
