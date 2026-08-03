import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { AUTH_COOKIE, getSessionUser, type AuthUser } from '@/lib/auth';
import Project from '@/models/Project';
import WorkspaceMember from '@/models/WorkspaceMember';
import connectToDatabase from '@/lib/mongodb';

export async function requireUser(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser(request.cookies.get(AUTH_COOKIE)?.value);
  return user ?? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export async function requireProjectAccess(request: NextRequest, projectId: string, minimumRole: 'viewer' | 'member' | 'admin' = 'viewer') {
  await connectToDatabase();
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  if (!mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  const project = await Project.findOne({
    _id: projectId,
    workspaceId: { $type: 'objectId' },
  }).select('_id workspaceId').lean();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const requestedWorkspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (requestedWorkspaceId && String(project.workspaceId) !== requestedWorkspaceId) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const member = await WorkspaceMember.findOne({ workspaceId: project.workspaceId, userId: user.id }).lean<{ role: string }>();
  const ranks = { viewer: 0, member: 1, admin: 2, owner: 3 };
  if (!member || ranks[member.role as keyof typeof ranks] < ranks[minimumRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { user, project };
}
