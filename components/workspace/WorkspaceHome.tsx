'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createProject, getProjects, Project } from '@/lib/api/projects';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import { NewProjectModal } from '@/components/home/NewProjectModal';
import { ProjectGrid } from '@/components/home/ProjectGrid';
import { ProjectListHeader } from '@/components/home/ProjectListHeader';
import { ProjectListSkeleton } from '@/components/home/ProjectListSkeleton';
import { EmptyState } from '@/components/home/EmptyState';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { WorkspaceStatsBar } from '@/components/workspace/WorkspaceStatsBar';

export default function WorkspaceHome({ workspaceId, workspaceSlug, userId }: { workspaceId: string; workspaceSlug: string; userId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const query = useQuery<Project[], Error>({ queryKey: ['projects', workspaceId], queryFn: () => getProjects(workspaceId) });
  const mutation = useMutation<Project, Error, { name: string; url: string }>({
    mutationFn: (project) => createProject({ ...project, workspaceId }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setShowNewProjectModal(false);
      toast.success('Project created!');
      router.push(`/${workspaceSlug}/projects/${project._id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const filtered = useMemo(() => (query.data ?? []).filter((project) => !searchQuery || project.name.toLowerCase().includes(searchQuery.toLowerCase()) || project.url.toLowerCase().includes(searchQuery.toLowerCase())), [query.data, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProjectPageShell>
        <ProjectListHeader workspaceSlug={workspaceSlug} userId={userId} searchQuery={searchQuery} onSearchChange={setSearchQuery} onNewSiteClick={() => setShowNewProjectModal(true)} />
        <WorkspaceStatsBar workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
        {query.isLoading ? <ProjectListSkeleton /> : query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : filtered.length === 0 ? <EmptyState searchQuery={searchQuery} onNewSiteClick={() => setShowNewProjectModal(true)} /> : <ProjectGrid projects={filtered} workspaceSlug={workspaceSlug} />}
        <NewProjectModal isOpen={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} onCreateProject={(project) => mutation.mutate(project)} />
      </ProjectPageShell>
    </div>
  );
}
