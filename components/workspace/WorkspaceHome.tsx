'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import { EmptyState } from '@/components/home/EmptyState';
import { NewProjectModal } from '@/components/home/NewProjectModal';
import { ProjectGrid } from '@/components/home/ProjectGrid';
import { ProjectListHeader } from '@/components/home/ProjectListHeader';
import { ProjectListSkeleton } from '@/components/home/ProjectListSkeleton';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { createProject, getProjects, type Project } from '@/lib/api/projects';

export default function WorkspaceHome({
  workspaceId,
  workspaceSlug,
  userId,
}: {
  workspaceId: string;
  workspaceSlug: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const query = useQuery<Project[], Error>({
    queryKey: ['projects', workspaceId],
    queryFn: () => getProjects(workspaceId),
  });
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
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (project) =>
          !searchQuery ||
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.url.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [query.data, searchQuery],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProjectPageShell>
        <ProjectListHeader
          workspaceSlug={workspaceSlug}
          userId={userId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewSiteClick={() => setShowNewProjectModal(true)}
        />
        {query.isLoading ? (
          <ProjectListSkeleton />
        ) : query.isError ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState searchQuery={searchQuery} onNewSiteClick={() => setShowNewProjectModal(true)} />
        ) : (
          <ProjectGrid projects={filtered} workspaceSlug={workspaceSlug} />
        )}
        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          onCreateProject={(project) => mutation.mutate(project)}
        />
        <footer className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-4 pb-2 text-xs text-muted-foreground/70">
          <div className="flex items-center gap-6">
            <span>diy-analytics</span>
            <a
              href="https://github.com/heysagnik/diy-analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/heysagnik/diy-analytics/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              License
            </a>
          </div>
          <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </footer>
      </ProjectPageShell>
    </div>
  );
}
