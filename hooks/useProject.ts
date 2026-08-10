import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { Project } from '@/types/analytics';

interface UseProjectProps {
  projectId: string;
  isValidProjectId: boolean;
  workspaceId: string;
  // Fetched server-side by the layout that already confirmed this project
  // exists (see layout.tsx) — seeds the cache so the client tree renders
  // immediately instead of re-fetching the same row behind a skeleton.
  initialProject?: Project;
}

interface UseProjectReturn {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateProject: (updatedFields: Partial<Project>) => void;
}

async function fetchProject(projectId: string, workspaceId: string): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!response.ok) {
    let errorText = `HTTP error ${response.status}`;
    try {
      const errorJson = await response.json();
      errorText = errorJson?.error || errorJson.message || errorText;
    } catch {
      errorText = await response.text().catch(() => errorText);
    }
    throw new Error(`Failed to fetch project: ${errorText}`);
  }
  const project = await response.json();
  if (!project) throw new Error('Project not found in API response.');
  return project;
}

export const useProject = ({
  projectId,
  isValidProjectId,
  workspaceId,
  initialProject,
}: UseProjectProps): UseProjectReturn => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['project', projectId, workspaceId], [projectId, workspaceId]);

  const query = useQuery<Project>({
    queryKey,
    queryFn: () => fetchProject(projectId, workspaceId),
    enabled: isValidProjectId,
    initialData: initialProject,
    // The layout's server-side row is already fresh at request time — avoid
    // an immediate background re-fetch of data we just received.
    staleTime: initialProject ? 30_000 : 0,
  });

  const updateProject = useCallback(
    (updatedFields: Partial<Project>) => {
      queryClient.setQueryData<Project>(queryKey, (current) => (current ? { ...current, ...updatedFields } : current));
    },
    [queryClient, queryKey],
  );

  return {
    project: query.data ?? null,
    isLoading: isValidProjectId && query.isLoading,
    error: !isValidProjectId
      ? projectId
        ? 'Invalid Project ID format. Please check the URL.'
        : null
      : query.error
        ? query.error.message
        : null,
    refetch: () => {
      void query.refetch();
    },
    updateProject,
  };
};
