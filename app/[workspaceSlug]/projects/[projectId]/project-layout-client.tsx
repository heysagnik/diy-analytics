"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Header from "@/components/project/Header";
import Sidebar from "@/components/project/Sidebar";
import { getNavigationItems, getFooterLinks } from "@/utils/navigation";
import { useProject } from "@/hooks/useProject";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { normalizeProjectUrl } from "@/utils/url";
import { ProjectProvider } from "./project-context";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const PROJECT_LOAD_ERROR = "We couldn't load this project. Please try again.";

interface ProjectLayoutProps {
  children: React.ReactNode;
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
}

const ProjectLoadingSkeleton = () => (
  <div className="min-h-screen bg-background flex">
    <div className="hidden lg:block w-64 bg-surface border-r border-border p-4 space-y-4">
      <Skeleton className="h-8 w-32 rounded-lg" />
      <div className="space-y-2 pt-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="bg-surface border-b border-border h-14 px-6 flex items-center justify-between">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i} className="p-4 bg-surface space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </Card>
          ))}
        </div>
        <Card className="p-6 bg-surface rounded-2xl space-y-4">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
    <Card className="text-center max-w-md p-6 bg-surface rounded-2xl">
      <div className="text-danger text-4xl mb-3"><span role="img" aria-hidden="true">⚠️</span></div>
      <h1 className="font-display text-xl font-semibold text-foreground mb-2">Unable to Load Project</h1>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Card>
  </div>
);

export default function ProjectLayoutClient({ children, workspaceId, workspaceSlug, projectId }: ProjectLayoutProps) {
  const pathname = usePathname();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const [activePageId, setActivePageId] = useState("analytics");

  const isValidProjectId = useMemo(
    () => (projectId ? OBJECT_ID_REGEX.test(projectId) : false),
    [projectId]
  );

  const {
    project: projectData,
    isLoading: isLoadingProject,
    error: projectError,
    refetch: refetchProject,
    updateProject,
  } = useProject({ projectId, isValidProjectId, workspaceId });

  const projectName = projectData?.name || "Loading...";
  const projectUrl = projectData?.url
    ? normalizeProjectUrl(projectData.url)?.hostname || ""
    : "";

  const projectBasePath = `/${workspaceSlug}/projects/${projectId}`;
  const navigationItems = useMemo(() => getNavigationItems(projectBasePath), [projectBasePath]);
  const footerLinks = useMemo(() => getFooterLinks(workspaceSlug), [workspaceSlug]);

  const handleNavClick = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    setActivePageId(pathParts[3] || "analytics");
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!projectData) return;

    const previousTitle = document.title;
    document.title = `${projectData.name} - Analytics`;

    return () => {
      document.title = previousTitle;
    };
  }, [projectData]);

  if (isLoadingProject) return <ProjectLoadingSkeleton />;

  if (projectError || !projectData) {
    const canRetry = projectId && projectError && !projectError.toLowerCase().includes("not found");
    return (
      <ErrorDisplay
        message={PROJECT_LOAD_ERROR}
        onRetry={canRetry ? refetchProject : undefined}
      />
    );
  }

  return (
    <ProjectProvider value={{ project: projectData, updateProject }}>
      <ErrorBoundary>
        <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          projectId={projectId}
          projectName={projectName}
          projectUrl={projectUrl}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          navigationItems={navigationItems}
          activePageId={activePageId}
          setActivePageId={setActivePageId}
          handleNavClick={handleNavClick}
          footerLinks={footerLinks}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isSidebarCollapsed && (
            <div className="hidden lg:flex items-center h-14 px-4 flex-shrink-0 border-b border-border bg-surface">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebarCollapsed}
                className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform"
                aria-label="Expand sidebar"
              >
                <SidebarSimpleIcon size={18} weight="bold" />
              </Button>
            </div>
          )}

          <div className="lg:hidden">
            <Header
              onMenuToggle={() => setSidebarOpen(true)}
              projectName={projectName}
              isLoading={isLoadingProject}
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="w-full">{children}</div>
          </div>
        </div>
        </div>
      </ErrorBoundary>
    </ProjectProvider>
  );
}
