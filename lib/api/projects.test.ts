import type { NewProjectData, Project } from './projects';
import { createProject, deleteProject, getProjects, updateProject } from './projects';

const project = {
  _id: 'project-1',
  name: 'Example',
  url: 'https://example.com',
  trackingCode: 'code',
  createdAt: '2026-01-01',
} as Project;
const newProject: NewProjectData = { name: 'Example', url: 'https://example.com' };

const response = (body: unknown, init: { status?: number; statusText?: string } = {}) => ({
  ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
  status: init.status ?? 200,
  statusText: init.statusText ?? '',
  json: async () => body,
});

describe('projects API client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns projects on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response([project]));
    await expect(getProjects('workspace-id')).resolves.toEqual([project]);
    expect(global.fetch).toHaveBeenCalledWith('/api/projects?workspaceId=workspace-id');
  });

  it('creates, updates, and deletes projects on success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(project))
      .mockResolvedValueOnce(response(project))
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined });

    await expect(createProject({ ...newProject, workspaceId: 'workspace-id' })).resolves.toEqual(project);
    await expect(updateProject('project-1', { name: 'Updated' })).resolves.toEqual(project);
    await expect(deleteProject('project-1')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/projects/project-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/projects/project-1', { method: 'DELETE' });
  });

  it('throws status text for getProjects non-OK responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({}, { status: 503, statusText: 'Service Unavailable' }));
    await expect(getProjects('workspace-id')).rejects.toThrow('Failed to fetch projects: Service Unavailable');
  });

  it('uses API error messages for create, update, and delete failures', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response({ message: 'Invalid project' }, { status: 400 }))
      .mockResolvedValueOnce(response({ error: 'Forbidden' }, { status: 403 }))
      .mockResolvedValueOnce(response({ error: 'Cannot delete' }, { status: 409 }));

    await expect(createProject({ ...newProject, workspaceId: 'workspace-id' })).rejects.toThrow('Invalid project');
    await expect(updateProject('project-1', {})).rejects.toThrow('Forbidden');
    await expect(deleteProject('project-1')).rejects.toThrow('Cannot delete');
  });
});
