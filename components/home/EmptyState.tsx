import React from 'react';
import { Theme } from '@/utils/theme';

interface EmptyStateProps {
  searchQuery: string;
  onNewSiteClick: () => void;
  theme: Theme;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, onNewSiteClick, theme }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border" 
      style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="48" 
        height="48" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ color: theme.textLight }}
        className="mb-4 opacity-60"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      <p className="text-lg mb-2" style={{ color: theme.accent }}>No projects found</p>
      <p className="mb-6 max-w-md" style={{ color: theme.textLight }}>
        {searchQuery ? "Try adjusting your search criteria." : "Create your first project to get started with analytics."}
      </p>
      <button 
        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-full transition-all hover:shadow-lg"
        style={{ backgroundColor: theme.primary }}
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
        <span className="text-sm font-medium">Create New Project</span>
      </button>
    </div>
  );
};