import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/Project";
import PageView from "@/models/PageView";
import mongoose from "mongoose";
import type { NewProjectData } from "@/lib/api/projects";
import { normalizeProjectUrl } from "@/utils/url";
import { requireUser } from '@/lib/serverAuth';
import WorkspaceMember from '@/models/WorkspaceMember';

async function getAnalyticsSummary(projectId: mongoose.Types.ObjectId) {
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

    const [
      totalUniqueUsersCurrent,
      totalPageViewsCurrent,
      totalUniqueUsersPrevious,
    ] = await Promise.all([
      PageView.distinct('sessionId', { projectId, timestamp: { $gte: startDate30Days, $lte: endDate30Days } }).then(sessions => sessions.length),
      PageView.countDocuments({ projectId, timestamp: { $gte: startDate30Days, $lte: endDate30Days } }),
      PageView.distinct('sessionId', { projectId, timestamp: { $gte: previousPeriodStartDate, $lte: previousPeriodEndDate } }).then(sessions => sessions.length),
    ]);

    const uniqueUsersChange =
      totalUniqueUsersPrevious === 0
        ? (totalUniqueUsersCurrent > 0 ? 100 : 0)
        : Math.round(((totalUniqueUsersCurrent - totalUniqueUsersPrevious) / totalUniqueUsersPrevious) * 100);

    return {
      views: totalPageViewsCurrent || 0,
      users: totalUniqueUsersCurrent || 0,
      growth: uniqueUsersChange >= 0 ? `+${uniqueUsersChange}%` : `${uniqueUsersChange}%`,
    };
  } catch (error) {
    console.error(`Error fetching analytics for project ${projectId}:`, error);
    return { views: 0, users: 0, growth: "+0%" };
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
    const membership = await WorkspaceMember.exists({ userId: user.id, workspaceId });
    if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const projectsFromDB = await Project.find({ workspaceId }).sort({ createdAt: -1 }).lean();

    const projectsWithAnalytics = await Promise.all(
      projectsFromDB.map(async (project) => {
        const analyticsSummary = await getAnalyticsSummary(project._id as mongoose.Types.ObjectId);
        return {
          ...project,
          analytics: analyticsSummary,
        };
      })
    );

    return NextResponse.json(projectsWithAnalytics);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;
    const body = await req.json() as NewProjectData & { workspaceId: string };
    const { name, url, workspaceId } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }
    const normalized = normalizeProjectUrl(url);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
    const membership = await WorkspaceMember.findOne({ workspaceId, userId: user.id, role: { $in: ['owner', 'admin', 'member'] } }).lean();
    if (!membership) return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 });

    const project = new Project({
      name: name.trim(),
      workspaceId: membership.workspaceId,
      url: normalized.hostname
    });

    await project.save();
    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
