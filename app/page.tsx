"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { defaultTheme } from '@/utils/theme';
import { getProjects, createProject, Project } from '@/lib/api/projects';
import toast from 'react-hot-toast';
import ErrorState from '@/components/common/ErrorState';
import { 
  NewProjectModal, 
  ProjectGrid, 
  ProjectListHeader, 
  ProjectFilters, 
  ProjectListSkeleton,
  ProjectEmptyState
} from "@/components/index";

export default function Home() {
  const queryClient = useQueryClient();

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { 
    data: projects = [],
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const createProjectMutation = useMutation<Project | null, Error, { name: string; url: string }>({
    mutationFn: createProject,
    onSuccess: (createdProject) => {
      if (createdProject) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setShowNewProjectModal(false);
        toast.success("Project created successfully!");
      } else {
        toast.error("Failed to create project. Please check the details and try again.");
      }
    },
    onError: (err) => {
      toast.error(`An error occurred: ${err.message || "Please try again."}`);
    },
  });

  const handleCreateProject = async (newProject: { name: string; url: string }) => {
    if (!newProject.name || !newProject.url) return;
    
    const toastId = toast.loading("Creating project...");
    try {
      await createProjectMutation.mutateAsync(newProject);
      toast.dismiss(toastId);
    } catch (_err) {
      toast.error(`An unexpected error occurred. ${_err || "Please try again."}`, { id: toastId });
    }
  };
  
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = searchQuery === "" || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.url.toLowerCase().includes(searchQuery.toLowerCase());
        
      if (!matchesSearch) return false;
      
      if (filter === "All") return true;
      if (filter === "Growing" && project.analytics?.growth.startsWith("+")) return true;
      if (filter === "Declining" && !project.analytics?.growth.startsWith("+")) return true;
      return false;
    });
  }, [projects, searchQuery, filter]);

  const renderContent = () => {
    if (isLoading) {
      return <ProjectListSkeleton />;
    }
    if (isError) {
      return <ErrorState message={error?.message || "Failed to load projects."} onRetry={() => refetch()} />;
    }
    if (filteredProjects.length === 0) {
      return <ProjectEmptyState searchQuery={searchQuery} onNewSiteClick={() => setShowNewProjectModal(true)} theme={defaultTheme} />;
    }
    return <ProjectGrid projects={filteredProjects} theme={defaultTheme} />;
  };

  return (
    <div style={{ backgroundColor: defaultTheme.background }} className="min-h-screen">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 mx-auto">
        <ProjectListHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewSiteClick={() => setShowNewProjectModal(true)}
          theme={defaultTheme}
        />

        <ProjectFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          theme={defaultTheme}
        />

        {renderContent()}
        
        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          onCreateProject={handleCreateProject}
          theme={defaultTheme}
        />
      </div>
    </div>
  );
}