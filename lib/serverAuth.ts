import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { projects, workspaceMembers } from '@/db/schema';
import { AUTH_COOKIE, type AuthUser, getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';

export async function requireUser(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser(request.cookies.get(AUTH_COOKIE)?.value);
  return user ?? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export async function requireProjectAccess(
  request: NextRequest,
  projectId: string,
  minimumRole: 'viewer' | 'member' | 'admin' = 'viewer',
) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  if (!isValidUuid(projectId)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const requestedWorkspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (requestedWorkspaceId && project.workspaceId !== requestedWorkspaceId) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const ranks = { viewer: 0, member: 1, admin: 2, owner: 3 };
  if (!member || ranks[member.role as keyof typeof ranks] < ranks[minimumRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { user, project };
}
