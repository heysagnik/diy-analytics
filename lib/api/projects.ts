import type { NewProjectData, Project } from '@/types/analytics';

export type { NewProjectData, Project };

/**
 * Backend error responses aren't shaped consistently (`{ error }`,
 * `{ message }`, `{ success, error, code }`, ...) — this pulls whichever
 * field is present instead of every call site re-deriving its own
 * precedence order.
 */
async function parseApiError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}) as Record<string, unknown>);
  const message =
    typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : undefined;
  return message || fallback;
}

export const getProjects = async (workspaceId: string): Promise<Project[]> => {
  const response = await fetch(`/api/projects?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
};

export const createProject = async (projectData: NewProjectData & { workspaceId: string }): Promise<Project> => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to create project (${response.status})`));
  }
  return response.json();
};

export const updateProject = async (
  projectId: string,
  fields: Partial<Project>,
  errorMessage?: string,
): Promise<Project> => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!response.ok) {
    throw new Error(errorMessage || (await parseApiError(response, `Failed to update project (${response.status})`)));
  }
  return response.json();
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to delete project'));
  }
};
