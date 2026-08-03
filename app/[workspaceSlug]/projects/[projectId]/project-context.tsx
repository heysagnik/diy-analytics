"use client";

import { createContext, useContext } from "react";
import type { Project } from "@/types/analytics";

interface ProjectContextValue {
  project: Project;
  updateProject: (updatedFields: Partial<Project>) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider = ProjectContext.Provider;

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }

  return context;
}
