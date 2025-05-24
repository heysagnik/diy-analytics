"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultTheme } from '@/utils/theme';

interface Project {
  _id: string;
  name: string;
  url: string;
  analytics?: {
    views: number;
    users: number;
    growth: string;
  };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', url: '' });
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const router = useRouter();

  // Fetch projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        // Get analytics summaries for each project
        const projectsWithAnalytics = await Promise.all(data.map(async (project: Project) => {
          try {
            const analyticsRes = await fetch(`/api/projects/${project._id}/analytics?dateRange=Last 30 days`);
            const analytics = await analyticsRes.json();
            
            return {
              ...project,
              analytics: {
                views: analytics.pageViews?.total || 0,
                users: analytics.uniqueUsers?.total || 0,
                growth: (analytics.uniqueUsers?.change || 0) >= 0 
                  ? `+${analytics.uniqueUsers?.change || 0}%` 
                  : `${analytics.uniqueUsers?.change || 0}%`
              }
            };
          } catch (error) {
            console.log('Failed to fetch analytics for project:', project._id, error);
            return {
              ...project,
              analytics: { views: 0, users: 0, growth: "+0%" }
            };
          }
        }));
        
        setProjects(projectsWithAnalytics);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.url) return;
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProject)
      });
      
      const createdProject = await response.json();
      
      setProjects(prev => [{
        ...createdProject,
        analytics: { views: 0, users: 0, growth: "+0%" }
      }, ...prev]);
      
      setNewProject({ name: '', url: '' });
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };
  
  // Filter projects based on growth and search query
  const filteredProjects = projects.filter(project => {
    // Filter by search query first
    const matchesSearch = searchQuery === "" || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.url.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    // Then apply the growth filter
    if (filter === "All") return true;
    if (filter === "Growing" && project.analytics?.growth.startsWith("+")) return true;
    if (filter === "Declining" && !project.analytics?.growth.startsWith("+")) return true;
    return false;
  });

  return (
    <div style={{ backgroundColor: defaultTheme.background }} className="min-h-screen">
      {/* Improved container with better padding on different screen sizes */}
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 mx-auto">
        {/* Enhanced header with better alignment and spacing */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: defaultTheme.accent }}>
            Projects
          </h1>
          
          <div className="flex flex-col xs:flex-row w-full sm:w-auto items-stretch xs:items-center gap-3 mt-2 sm:mt-0">
            <div className="relative flex-1 xs:w-64">
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{ 
                  backgroundColor: defaultTheme.cardBg, 
                  borderColor: defaultTheme.cardBorder,
                  "--tw-ring-color": defaultTheme.primary
                } as React.CSSProperties}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-4 top-3"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke={defaultTheme.accent}
                opacity="0.6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            {/* Improved New Site Button */}
            <button 
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-full transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                background: defaultTheme.primary,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease-in-out',
                "--tw-ring-color": defaultTheme.primary,
              } as React.CSSProperties}
              onClick={() => setShowNewProjectModal(true)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16"
                fill="currentColor" 
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">New Site</span>
            </button>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 border-b border-opacity-50" style={{ borderColor: defaultTheme.cardBorder }}>
          {["All", "Growing", "Declining"].map((option) => (
            <button 
              key={option}
              className="px-6 py-2.5 text-sm rounded-full font-medium transition-colors flex-shrink-0" 
              style={{ 
                background: filter === option ? defaultTheme.primary : defaultTheme.cardBg,
                color: filter === option ? 'white' : defaultTheme.accent,
                border: `1px solid ${filter === option ? defaultTheme.primary : defaultTheme.cardBorder}`,
                boxShadow: filter === option ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
              }}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Enhanced Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="space-y-4 w-full max-w-md">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mx-auto"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border" 
            style={{ backgroundColor: defaultTheme.cardBg, borderColor: defaultTheme.cardBorder }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: defaultTheme.textLight }}
              className="mb-4 opacity-60"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <p className="text-lg mb-2" style={{ color: defaultTheme.accent }}>No projects found</p>
            <p className="mb-6 max-w-md" style={{ color: defaultTheme.textLight }}>
              {searchQuery ? "Try adjusting your search criteria." : "Create your first project to get started with analytics."}
            </p>
            <button 
              className="flex items-center gap-2 px-6 py-2.5 text-white rounded-full transition-all hover:shadow-lg"
              style={{ backgroundColor: defaultTheme.primary }}
              onClick={() => setShowNewProjectModal(true)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                fill="currentColor" 
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
              </svg>
              <span className="text-sm font-medium">Create New Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {filteredProjects.map((project) => (
              <div 
                key={project._id} 
                className="rounded-lg p-5 transition-all shadow-sm hover:shadow-lg cursor-pointer group"
                style={{ 
                  backgroundColor: defaultTheme.cardBg,
                  border: `1px solid ${defaultTheme.cardBorder}`
                }}
                onClick={() => router.push(`/projects/${project._id}`)}
              >
                {/* Enhanced Project Card Layout */}
                <div className="flex justify-between items-start mb-5">
                  <div className="overflow-hidden">
                    <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors truncate" 
                      style={{ color: defaultTheme.accent }}>
                      {project.name}
                    </h3>
                    <a 
                      href={`https://${project.url}`} 
                      className="text-xs hover:underline transition-opacity truncate block mt-1"
                      style={{ color: defaultTheme.textLight }}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.url}
                    </a>
                  </div>
                  <span className="ml-2 p-1.5 rounded-full hover:bg-opacity-80 transition-colors" 
                    style={{ backgroundColor: defaultTheme.background }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={defaultTheme.textLight}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14"></path>
                      <path d="M12 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
                
                {/* Enhanced Stats Layout */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex space-x-6">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: defaultTheme.textLight }}>
                        Views
                      </div>
                      <div className="text-base font-semibold mt-1" style={{ color: defaultTheme.accent }}>
                        {project.analytics?.views.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: defaultTheme.textLight }}>
                        Users
                      </div>
                      <div className="text-base font-semibold mt-1" style={{ color: defaultTheme.accent }}>
                        {project.analytics?.users.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                    project.analytics?.growth.startsWith("+") 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-rose-100 text-rose-700"
                  }`}>
                    {project.analytics?.growth || "+0%"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Improved Modal Layout */}
        {showNewProjectModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm p-4 transition-all duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowNewProjectModal(false);
              }
            }}
          >
            <div 
              className="rounded-xl p-7 max-w-md w-full mx-auto shadow-xl transform transition-all duration-300 scale-100" 
              style={{ backgroundColor: defaultTheme.cardBg }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: defaultTheme.accent }}>Add New Website</h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 transition-colors"
                  style={{ "--tw-ring-color": defaultTheme.primary } as React.CSSProperties}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: defaultTheme.accent }}>
                    Project Name
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors"
                    style={{ 
                      borderColor: defaultTheme.cardBorder,
                      backgroundColor: defaultTheme.background,
                      "--tw-ring-color": defaultTheme.primary
                    } as React.CSSProperties}
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    required
                    placeholder="My Awesome Website"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: defaultTheme.accent }}>
                    Website URL
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors"
                    style={{ 
                      borderColor: defaultTheme.cardBorder,
                      backgroundColor: defaultTheme.background,
                      "--tw-ring-color": defaultTheme.primary
                    } as React.CSSProperties}
                    value={newProject.url}
                    onChange={(e) => setNewProject({...newProject, url: e.target.value})}
                    placeholder="example.com"
                    required
                  />
                </div>
                <div className="flex justify-end gap-4 pt-2">
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-opacity-80"
                    style={{ 
                      color: defaultTheme.accent,
                      backgroundColor: defaultTheme.background,
                      border: `1px solid ${defaultTheme.cardBorder}`
                    }}
                    onClick={() => setShowNewProjectModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors hover:bg-opacity-90"
                    style={{ backgroundColor: defaultTheme.primary }}
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}