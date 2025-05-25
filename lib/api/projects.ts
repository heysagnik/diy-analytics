// This file will contain functions for fetching and managing project data.

export interface Project {
  _id: string;
  name: string;
  url: string;
  analytics?: ProjectAnalytics; // Use ProjectAnalytics interface
}

// Interface for the structure of project analytics data
export interface ProjectAnalytics {
  views: number;
  users: number;
  growth: string;
}

export const getProjectAnalytics = async (projectId: string, dateRange: string): Promise<ProjectAnalytics> => {
  try {
    const analyticsRes = await fetch(`/api/projects/${projectId}/analytics?dateRange=${dateRange}`);
    // It's good practice to type the expected structure of analyticsRes.json()
    // For now, we'll assume it has pageViews.total and uniqueUsers.total/change
    const rawAnalytics = await analyticsRes.json(); 
    
    return {
      views: rawAnalytics.pageViews?.total || 0,
      users: rawAnalytics.uniqueUsers?.total || 0,
      growth: (rawAnalytics.uniqueUsers?.change || 0) >= 0 
        ? `+${rawAnalytics.uniqueUsers?.change || 0}%` 
        : `${rawAnalytics.uniqueUsers?.change || 0}%`
    };
  } catch (error) {
    console.log('Failed to fetch analytics for project:', projectId, error);
    return { views: 0, users: 0, growth: "+0%" }; // Default on error
  }
};

export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      // Log error or handle specific HTTP errors
      console.error('Failed to fetch projects, status:', response.status);
      // Optionally, throw an error to be caught by the caller
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const projectsWithAnalytics = await response.json();
    return projectsWithAnalytics;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    // Re-throw the error or return an empty array/specific error object
    // This allows the caller (e.g., app/page.tsx) to handle it
    throw error; 
  }
};

// Interface for the data required to create a new project
export interface NewProjectData {
  name: string;
  url: string;
}

export const createProject = async (projectData: NewProjectData): Promise<Project | null> => {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });
    
    if (!response.ok) {
      // Handle API errors (e.g., validation errors)
      const errorData = await response.json();
      console.error('Failed to create project:', errorData.message || 'Unknown error');
      return null;
    }
    
    const createdProject = await response.json();
    return {
      ...createdProject,
      analytics: { views: 0, users: 0, growth: "+0%" } // Initialize analytics for new project
    };
  } catch (error) {
    console.error('Failed to create project:', error);
    return null;
  }
};
