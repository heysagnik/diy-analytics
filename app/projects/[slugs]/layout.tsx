"use client";

import React, { useState, useEffect, use, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../../components/layout/ErrorBoundary";
import Header from "../../../components/project/Header";
import Sidebar from "../../../components/project/Sidebar";
import { defaultTheme } from "../../../utils/theme";
import { getNavigationItems, getFooterLinks } from "../../../utils/navigation";

interface Project {
  _id: string;
  name: string;
  url: string;
  domain?: string;
}

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slugs: string[] }>;
}

const SkeletonCard = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-24"></div>
  </div>
);

const ProjectLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex">
    <div className="hidden lg:block w-64 bg-white border-r border-gray-200 animate-pulse">
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
    <div className="flex-1">
      <div className="bg-white border-b border-gray-200 h-16 animate-pulse">
        <div className="px-6 h-full flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Project</h1>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

export default function ProjectLayout({ children, params: paramsPromise }: ProjectLayoutProps) {
  const pathname = usePathname();
  const params = use(paramsPromise);
  const { slugs } = params;

  const [projectData, setProjectData] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  const slugsArray = useMemo(() => 
    Array.isArray(slugs) ? slugs : (slugs ? [slugs] : []), 
    [slugs]
  );

  const projectId = useMemo(() => slugsArray[0] || '', [slugsArray]);

  const initialActivePageId = useMemo(() => 
    slugsArray.length > 1 && slugsArray[1] ? slugsArray[1] : 'analytics', 
    [slugsArray]
  );

  const [activePageId, setActivePageId] = useState(initialActivePageId);

  const fetchProjectData = useCallback(async (id: string) => {
    if (!id) return;

    setIsLoadingProject(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/projects/${id}`);

      if (!response.ok) {
        const errorMessages = {
          404: 'Project not found',
          403: "You don't have access to this project",
        };
        throw new Error(errorMessages[response.status as keyof typeof errorMessages] || 
                       `Request failed with status: ${response.status}`);
      }

      const data = await response.json();
      setProjectData(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setLoadError(message);
    } finally {
      setIsLoadingProject(false);
    }
  }, []);

  const projectName = projectData?.name || "Loading...";
  const projectUrl = useMemo(() => 
    projectData?.url ? projectData.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : "",
    [projectData?.url]
  );

  const projectBasePath = `/projects/${projectId}`;
  const navigationItems = useMemo(() => getNavigationItems(projectBasePath), [projectBasePath]);
  const footerLinks = useMemo(() => getFooterLinks(), []);

  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (projectId) {
      fetchProjectData(projectId);
    }
  }, [projectId, fetchProjectData]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProjectData(projectId);
    } else {
      setIsLoadingProject(false);
    }
  }, [projectId, fetchProjectData]);

  useEffect(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      const pageId = pathParts.length > 2 ? pathParts[2] : 'analytics';
      setActivePageId(pageId);
    }
  }, [pathname]);

  useEffect(() => {
    setIsPageTransitioning(true);
    const timer = setTimeout(() => setIsPageTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  if (isLoadingProject) return <ProjectLoadingSkeleton />;

  if (loadError) {
    const canRetry = projectId && 
      !loadError.toLowerCase().includes("not found") && 
      !loadError.toLowerCase().includes("invalid");
    
    return <ErrorDisplay message={loadError} onRetry={canRetry ? handleRetry : undefined} />;
  }

  if (!projectData) {
    return <ErrorDisplay message="No project data available" />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen overflow-hidden">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={closeSidebar}
              projectId={projectId}
              projectName={projectName}
              projectUrl={projectUrl}
              navigationItems={navigationItems}
              activePageId={activePageId}
              setActivePageId={setActivePageId}
              handleNavClick={handleNavClick}
              theme={defaultTheme}
              footerLinks={footerLinks}
            />
          </div>

          {/* Main Content */}
          {/* Main Content (Mobile Only) */}
          <div className="flex-1 flex flex-col overflow-hidden ">
            <div className="lg:hidden">
            <Header
              onMenuToggle={() => setSidebarOpen(true)}
              projectName={projectName}
              theme={defaultTheme}
              isLoading={isLoadingProject}
            />
           </div>
            <main className="flex-1 overflow-y-auto px-2 sm:px-4 bg-gray-50">
              <div
                className={`w-full transition-opacity duration-150 ${
                  isPageTransitioning ? "opacity-75" : "opacity-100"
                }`}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}