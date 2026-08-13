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

export interface ProjectRoleResult {
  project: { id: string; workspaceId: string };
}

export interface ProjectRoleError {
  error: string;
  status: number;
}

/**
 * Core of the project-access check, callable with a plain userId — used by
 * both requireProjectAccess (NextRequest-based route handlers) and the MCP
 * route's tool handlers, which resolve the user once per request and then
 * re-check project access per tool call without a NextRequest in hand.
 */
export async function checkProjectRole(
  userId: string,
  projectId: string,
  minimumRole: 'viewer' | 'member' | 'admin' = 'viewer',
  requestedWorkspaceId?: string | null,
): Promise<ProjectRoleResult | ProjectRoleError> {
  if (!isValidUuid(projectId)) return { error: 'Invalid project ID', status: 400 };

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return { error: 'Project not found', status: 404 };

  if (requestedWorkspaceId && project.workspaceId !== requestedWorkspaceId) {
    return { error: 'Project not found', status: 404 };
  }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  const ranks = { viewer: 0, member: 1, admin: 2, owner: 3 };
  if (!member || ranks[member.role as keyof typeof ranks] < ranks[minimumRole]) {
    return { error: 'Forbidden', status: 403 };
  }
  return { project };
}

export async function requireProjectAccess(
  request: NextRequest,
  projectId: string,
  minimumRole: 'viewer' | 'member' | 'admin' = 'viewer',
) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const result = await checkProjectRole(
    user.id,
    projectId,
    minimumRole,
    request.nextUrl.searchParams.get('workspaceId'),
  );
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return { user, project: result.project };
}
