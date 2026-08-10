import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import WorkspaceHome from '@/components/workspace/WorkspaceHome';
import { workspaceMembers, workspaces } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}`);
  const [workspace] = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!workspace) notFound();
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  if (!membership) notFound();
  return <WorkspaceHome workspaceId={workspace.id} workspaceSlug={workspace.slug} userId={user.id} />;
}
