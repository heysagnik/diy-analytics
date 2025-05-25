import { getProjects, createProject, getProjectAnalytics, Project } from './projects';
import fetchMock from 'jest-fetch-mock';

describe('Project API Functions', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  // Tests for getProjects
  describe('getProjects', () => {
    const mockProjects: Project[] = [
      { _id: '1', name: 'Project Alpha', url: 'alpha.com', analytics: { views: 100, users: 10, growth: '+5%' } },
      { _id: '2', name: 'Project Beta', url: 'beta.com', analytics: { views: 200, users: 20, growth: '-2%' } },
    ];

    it('should fetch projects successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockProjects));
      const projects = await getProjects();
      expect(fetchMock).toHaveBeenCalledWith('/api/projects');
      expect(projects).toEqual(mockProjects);
    });

    it('should throw an error on network failure', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      await expect(getProjects()).rejects.toThrow('Network error');
    });

    it('should throw an error on API error (non-ok response)', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Server error' }), { status: 500 });
      await expect(getProjects()).rejects.toThrow('Failed to fetch projects: Internal Server Error');
    });
  });

  // Tests for createProject
  describe('createProject', () => {
    const newProjectData = { name: 'Project Gamma', url: 'gamma.com' };
    const mockCreatedProject: Project = { 
      _id: '3', 
      ...newProjectData, 
      analytics: { views: 0, users: 0, growth: '+0%' } 
    };

    it('should create a project successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockCreatedProject), { status: 200 }); // Assuming 200 OK for successful creation
      const project = await createProject(newProjectData);
      
      expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjectData),
      });
      expect(project).toEqual(mockCreatedProject);
    });

    it('should return null on API error (e.g., 400 Bad Request)', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Validation failed' }), { status: 400 });
      const project = await createProject(newProjectData);
      expect(project).toBeNull();
    });
    
    it('should return null on other non-ok API errors (e.g., 500)', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server error' }), { status: 500 });
      const project = await createProject(newProjectData);
      expect(project).toBeNull();
    });

    it('should return null on network failure', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      const project = await createProject(newProjectData);
      expect(project).toBeNull();
    });
  });

  // Tests for getProjectAnalytics
  describe('getProjectAnalytics', () => {
    const mockAnalytics = { views: 150, users: 15, growth: '+10%' };
    const projectId = 'test-project-id';
    const dateRange = 'Last 7 days';

    it('should fetch project analytics successfully', async () => {
      // Simulate the structure returned by the analytics API endpoint
      const rawAnalyticsResponse = {
        pageViews: { total: 150 },
        uniqueUsers: { total: 15, change: 10 } 
      };
      fetchMock.mockResponseOnce(JSON.stringify(rawAnalyticsResponse));
      const analytics = await getProjectAnalytics(projectId, dateRange);
      
      expect(fetchMock).toHaveBeenCalledWith(`/api/projects/${projectId}/analytics?dateRange=${dateRange}`);
      expect(analytics).toEqual(mockAnalytics);
    });

    it('should return default analytics on network failure', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      const analytics = await getProjectAnalytics(projectId, dateRange);
      expect(analytics).toEqual({ views: 0, users: 0, growth: '+0%' });
    });

    it('should return default analytics on API error (non-ok response)', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Server error' }), { status: 500 });
      const analytics = await getProjectAnalytics(projectId, dateRange);
      expect(analytics).toEqual({ views: 0, users: 0, growth: '+0%' });
    });

    it('should handle missing analytics data gracefully', async () => {
      // Simulate API response with missing fields
      const partialAnalyticsResponse = {
        pageViews: { total: null }, // or undefined
        uniqueUsers: {} // missing total or change
      };
      fetchMock.mockResponseOnce(JSON.stringify(partialAnalyticsResponse));
      const analytics = await getProjectAnalytics(projectId, dateRange);
      expect(analytics).toEqual({ views: 0, users: 0, growth: '+0%' });
    });
  });
});
