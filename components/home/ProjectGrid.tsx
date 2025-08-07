import React from 'react';
import { Project } from '@/lib/api/projects';
import { Theme } from '@/utils/theme';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  theme: Theme;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, theme }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} theme={theme} />
      ))}
    </div>
  );
};