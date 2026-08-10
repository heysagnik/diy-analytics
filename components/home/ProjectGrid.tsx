import type React from 'react';
import type { Project } from '@/lib/api/projects';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  workspaceSlug: string;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, workspaceSlug }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} workspaceSlug={workspaceSlug} />
      ))}
    </div>
  );
};
