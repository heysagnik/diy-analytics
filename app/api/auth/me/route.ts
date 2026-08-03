import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getSessionUser } from '@/lib/auth';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
  const memberships = await WorkspaceMember.find({ userId: user.id }).lean<{ workspaceId: unknown; role: string }[]>();
  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).select('name slug').lean();
  const roles = new Map(memberships.map((membership) => [String(membership.workspaceId), membership.role]));
  return NextResponse.json({
    authenticated: true,
    user,
    workspaces: workspaces.map((workspace) => ({ ...workspace, role: roles.get(String(workspace._id)) })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
