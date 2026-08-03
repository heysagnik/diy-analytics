import { notFound, redirect } from 'next/navigation';
import WorkspaceHome from '@/components/workspace/WorkspaceHome';
import { getRequestUser } from '@/lib/auth';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}`);
  const workspace = await Workspace.findOne({ slug: workspaceSlug }).select('_id slug').lean();
  if (!workspace) notFound();
  const workspaceId = String(workspace._id);
  if (!await WorkspaceMember.exists({ workspaceId, userId: user.id })) notFound();
  return <WorkspaceHome workspaceId={workspaceId} workspaceSlug={workspace.slug} userId={user.id} />;
}
