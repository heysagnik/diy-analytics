import { notFound, redirect } from 'next/navigation';
import mongoose from 'mongoose';
import ProjectLayoutClient from './project-layout-client';
import { getRequestUser } from '@/lib/auth';
import Project from '@/models/Project';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export default async function WorkspaceProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspaceSlug: string; projectId: string }> }) {
  const { workspaceSlug, projectId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}/projects/${projectId}`);
  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();
  const workspace = await Workspace.findOne({ slug: workspaceSlug }).select('_id slug').lean();
  if (!workspace) notFound();
  const workspaceId = String(workspace._id);
  const [membership, project] = await Promise.all([
    WorkspaceMember.exists({ workspaceId, userId: user.id }),
    Project.exists({ _id: projectId, workspaceId }),
  ]);
  if (!membership || !project) notFound();
  return <ProjectLayoutClient workspaceId={workspaceId} workspaceSlug={workspace.slug} projectId={projectId}>{children}</ProjectLayoutClient>;
}
