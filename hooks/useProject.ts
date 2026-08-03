import { useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '@/types/analytics';

interface UseProjectProps {
  projectId: string;
  isValidProjectId: boolean;
  workspaceId: string;
}

interface UseProjectReturn {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateProject: (updatedFields: Partial<Project>) => void;
}

const MAX_RETRIES = 3;
const TIMEOUT = 10000;

export const useProject = ({ projectId, isValidProjectId, workspaceId }: UseProjectProps): UseProjectReturn => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const fetchProject = useCallback(async (): Promise<void> => {
    requestControllerRef.current?.abort();

    if (!isValidProjectId) {
      setError("Invalid or missing Project ID. Cannot fetch project details.");
      setIsLoading(false);
      return;
    }

    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    setIsLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      const attemptController = new AbortController();
      const abortAttempt = () => attemptController.abort();
      requestController.signal.addEventListener('abort', abortAttempt, { once: true });
      const timeoutId = setTimeout(() => attemptController.abort(), TIMEOUT);

      try {
        const response = await fetch(`/api/projects/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: attemptController.signal,
        });

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

        const nextProject = await response.json();
        if (!nextProject) {
          throw new Error('Project not found in API response.');
        }

        if (!requestController.signal.aborted) {
          setProject(nextProject);
          setIsLoading(false);
        }
        if (requestControllerRef.current === requestController) {
          requestControllerRef.current = null;
        }
        return;
      } catch (caughtError: unknown) {
        if (requestController.signal.aborted) return;

        let errorMessage = 'An unknown error occurred while fetching project details.';
        let canRetry = true;

        if (caughtError instanceof Error) {
          errorMessage = caughtError.name === 'AbortError'
            ? 'The project request timed out. Please try again.'
            : caughtError.message;
          canRetry = caughtError.name !== 'AbortError' &&
            !errorMessage.toLowerCase().includes('not found') &&
            !errorMessage.toLowerCase().includes('invalid project id');
        } else {
          canRetry = false;
        }

        console.error(`Error fetching project (attempt ${attempt}):`, caughtError);

        if (attempt >= MAX_RETRIES || !canRetry) {
          setError(errorMessage);
          setIsLoading(false);
          if (requestControllerRef.current === requestController) {
            requestControllerRef.current = null;
          }
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        if (requestController.signal.aborted) return;
      } finally {
        clearTimeout(timeoutId);
        requestController.signal.removeEventListener('abort', abortAttempt);
      }
    }

  }, [projectId, isValidProjectId, workspaceId]);

  useEffect(() => {
    if (isValidProjectId) {
      fetchProject();
    } else {
      if (projectId) {
        setError("Invalid Project ID format. Please check the URL.");
      }
      setIsLoading(false);
    }

    return () => requestControllerRef.current?.abort();
  }, [projectId, isValidProjectId, fetchProject]);

  const updateProject = useCallback((updatedFields: Partial<Project>) => {
    setProject((currentProject) => currentProject
      ? { ...currentProject, ...updatedFields }
      : null
    );
  }, []);

  return {
    project,
    isLoading,
    error,
    refetch: () => { void fetchProject(); },
    updateProject,
  };
};
