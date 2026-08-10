import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { projects, workspaceMembers, workspaces } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { getRequestUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import ProjectLayoutClient from './project-layout-client';

export default async function WorkspaceProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}/projects/${projectId}`);
  if (!isValidUuid(projectId)) notFound();
  const [workspace] = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!workspace) notFound();
  const workspaceId = workspace.id;
  const [[membership], [project]] = await Promise.all([
    db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .limit(1),
    db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1),
  ]);
  if (!membership || !project) notFound();
  // Fetched once here so the client tree can render immediately instead of
  // showing a full-page skeleton while re-fetching the same row it just
  // confirmed exists — see hooks/useProject.ts, which seeds react-query's
  // cache from this instead of always fetching on mount.
  const initialProject = {
    ...withMongoId(project),
    createdAt: project.createdAt.toISOString(),
    domain: project.domain ?? undefined,
  };
  return (
    <ProjectLayoutClient
      workspaceId={workspaceId}
      workspaceSlug={workspace.slug}
      projectId={projectId}
      initialProject={initialProject}
    >
      {children}
    </ProjectLayoutClient>
  );
}
