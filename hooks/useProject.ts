import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/types/analytics';

interface UseProjectProps {
  projectId: string;
  isValidProjectId: boolean;
}

interface UseProjectReturn {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const MAX_RETRIES = 3;
const TIMEOUT = 10000;

export const useProject = ({ projectId, isValidProjectId }: UseProjectProps): UseProjectReturn => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async (attempt = 1): Promise<void> => {
    if (!isValidProjectId) {
      setError("Invalid or missing Project ID. Cannot fetch project details.");
      setIsLoading(false);
      return;
    }

    if (attempt === 1) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
      
      if (project) {
        setProject(project);
        document.title = `${project.name} - Analytics`;
        setIsLoading(false);
      } else {
        throw new Error('Project not found in API response.');
      }
    } catch (error: any) {
      console.error(`Error fetching project (attempt ${attempt}):`, error);
      
      const canRetry = error.name !== 'AbortError' && 
                       !error.message.toLowerCase().includes('not found') &&
                       !error.message.toLowerCase().includes('invalid project id');

      if (attempt < MAX_RETRIES && canRetry) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
        await fetchProject(attempt + 1);
      } else {
        setError(error instanceof Error ? error.message : 'An unknown error occurred while fetching project details.');
        setIsLoading(false); 
      }
    }
  }, [projectId, isValidProjectId]);

  useEffect(() => {
    if (isValidProjectId) {
      fetchProject();
    } else {
      if (projectId) {
        setError("Invalid Project ID format. Please check the URL.");
      }
      setIsLoading(false);
    }
  }, [projectId, isValidProjectId, fetchProject]);

  return {
    project,
    isLoading,
    error,
    refetch: () => fetchProject(1)
  };
}; 