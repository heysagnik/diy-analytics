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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { WarningIcon } from "@phosphor-icons/react";
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

// Mirrors the real Sidebar/Header/MetricsGrid/MainChart shapes (not just
// generic bars) so there's no layout jump when the loaded content swaps in,
// and the page reads as "this page is loading" rather than a placeholder.
const ProjectLoadingSkeleton = () => (
  <div className="h-screen w-full flex overflow-hidden bg-background">
    <div className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-border bg-surface">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <Skeleton className="h-4 w-24 rounded-sm" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="size-6 rounded-md" />
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5">
          <Skeleton className="size-5 rounded-full flex-shrink-0" />
          <Skeleton className="h-3.5 flex-1 rounded-sm" />
          <Skeleton className="size-3.5 rounded-sm flex-shrink-0" />
        </div>
      </div>

      <div className="flex-1 px-2 py-3 flex flex-col gap-1">
        {[16, 14, 20, 12, 18].map((w, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
            <Skeleton className="size-[18px] rounded-sm flex-shrink-0" />
            <Skeleton className="h-3.5 rounded-sm" style={{ width: `${w * 0.25}rem` }} />
          </div>
        ))}
      </div>

      <div className="p-2.5 flex flex-col gap-0.5 border-t border-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-[18px] rounded-sm flex-shrink-0" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
        ))}
      </div>
    </div>

    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="lg:hidden px-3 py-3 flex items-center gap-3 bg-surface-secondary/90 border-b border-border">
        <Skeleton className="size-7 rounded-md flex-shrink-0" />
        <Skeleton className="h-5 w-40 rounded-sm" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-10 sm:px-6 sm:py-16 lg:px-8 flex flex-col gap-4 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i} className="p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16 rounded-sm" />
                  <Skeleton className="size-6 rounded-md" />
                </div>
                <div className="flex items-baseline justify-between">
                  <Skeleton className="h-6 w-14 rounded-sm" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-36 rounded-sm" />
                <Skeleton className="h-3 w-48 rounded-sm" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton className="h-3 w-20 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
              </div>
            </div>
            <Skeleton className="h-56 sm:h-64 w-full rounded-lg" />
          </Card>
        </div>
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
    <Card className="max-w-md w-full bg-surface rounded-2xl">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-danger/10 text-danger">
            <WarningIcon size={24} weight="fill" />
          </EmptyMedia>
          <EmptyTitle className="font-display text-xl font-semibold text-foreground">Unable to Load Project</EmptyTitle>
          <EmptyDescription className="text-sm">{message}</EmptyDescription>
        </EmptyHeader>
        {onRetry && (
          <EmptyContent>
            <Button onClick={onRetry}>Try Again</Button>
          </EmptyContent>
        )}
      </Empty>
    </Card>
  </div>
);

export default function ProjectLayoutClient({ children, workspaceId, workspaceSlug, projectId }: ProjectLayoutProps) {
  const pathname = usePathname();

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const handleSidebarOpenChange = useCallback((open: boolean) => {
    const nextCollapsed = !open;
    setSidebarCollapsed(nextCollapsed);
    window.localStorage.setItem("sidebar-collapsed", String(nextCollapsed));
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

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    setActivePageId(pathParts[3] || "analytics");
  }, [pathname]);

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
        <SidebarProvider open={!isSidebarCollapsed} onOpenChange={handleSidebarOpenChange}>
          <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
            <Sidebar
              projectId={projectId}
              projectName={projectName}
              projectUrl={projectUrl}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              navigationItems={navigationItems}
              activePageId={activePageId}
              setActivePageId={setActivePageId}
              footerLinks={footerLinks}
            />

            <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="lg:hidden">
                <Header
                  projectName={projectName}
                  isLoading={isLoadingProject}
                />
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="w-full">{children}</div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </ErrorBoundary>
    </ProjectProvider>
  );
}
