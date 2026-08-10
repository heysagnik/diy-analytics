import { eq, inArray } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { workspaceMembers, workspaces } from '@/db/schema';
import { AUTH_COOKIE, getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const workspaceRows = workspaceIds.length
    ? await db
        .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
        .from(workspaces)
        .where(inArray(workspaces.id, workspaceIds))
    : [];
  const roles = new Map(memberships.map((membership) => [membership.workspaceId, membership.role]));
  return NextResponse.json(
    {
      authenticated: true,
      user,
      workspaces: workspaceRows.map((workspace) => ({ ...workspace, role: roles.get(workspace.id) })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
