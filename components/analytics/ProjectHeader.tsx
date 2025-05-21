import React from 'react';
import type { Project } from '../../types/analytics';
import Favicon from './Favicon'; // Import the Favicon component

interface ProjectHeaderProps {
  project: Project | null;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project }) => {
  return (
    <div className="mb-6 md:mb-8">
      
      
      {project ? (
        <div className="flex items-center gap-3">
          <Favicon 
            sourceName={project.url} 
            sizeClass="w-10 h-10" // Adjusted sizeClass, Favicon handles margins
            // textClass can be customized if needed, e.g., "text-lg" for a larger fallback letter
          />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">{project.name}</h1>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                {project.url}
              </span>
              {project.isPublic && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium">
                  Public
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-md bg-gray-200"></div>
          <div>
            <div className="h-6 w-40 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-60 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHeader;