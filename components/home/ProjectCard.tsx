import React from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/api/projects';
import { Theme } from '@/utils/theme';

interface ProjectCardProps {
  project: Project;
  theme: Theme;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, theme }) => {
  const router = useRouter();

  return (
    <div 
      key={project._id} 
      className="rounded-lg p-5 transition-all shadow-sm hover:shadow-lg cursor-pointer group"
      style={{ 
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`
      }}
      onClick={() => router.push(`/projects/${project._id}`)}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="overflow-hidden">
          <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors truncate" 
            style={{ color: theme.accent }}>
            {project.name}
          </h3>
          <a 
            href={`https://${project.url}`} 
            className="text-xs hover:underline transition-opacity truncate block mt-1"
            style={{ color: theme.textLight }}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {project.url}
          </a>
        </div>
        <span className="ml-2 p-1.5 rounded-full hover:bg-opacity-80 transition-colors" 
          style={{ backgroundColor: theme.background }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.textLight}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14"></path>
            <path d="M12 5l7 7-7 7"></path>
          </svg>
        </span>
      </div>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex space-x-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
              Views
            </div>
            <div className="text-base font-semibold mt-1" style={{ color: theme.accent }}>
              {project.analytics?.views.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
              Users
            </div>
            <div className="text-base font-semibold mt-1" style={{ color: theme.accent }}>
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
  );
};