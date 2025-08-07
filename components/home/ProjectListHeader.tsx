import React from 'react';
import { Theme } from '@/utils/theme';

interface ProjectListHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewSiteClick: () => void;
  theme: Theme;
}

export const ProjectListHeader: React.FC<ProjectListHeaderProps> = ({ searchQuery, onSearchChange, onNewSiteClick, theme }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.accent }}>
        Projects
      </h1>
      
      <div className="flex flex-col xs:flex-row w-full sm:w-auto items-stretch xs:items-center gap-3 mt-2 sm:mt-0">
        <div className="relative flex-1 xs:w-64">
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-1 transition-colors"
            style={{ 
              backgroundColor: theme.cardBg, 
              borderColor: theme.cardBorder,
              "--tw-ring-color": theme.primary
            } as React.CSSProperties}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <svg
            className="absolute left-4 top-3"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke={theme.accent}
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
        
        <button 
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-full transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ 
            background: theme.primary,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease-in-out',
            "--tw-ring-color": theme.primary,
          } as React.CSSProperties}
          onClick={onNewSiteClick}
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
  );
};