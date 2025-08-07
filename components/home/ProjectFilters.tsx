import React from 'react';
import { Theme } from '@/utils/theme';

const FILTER_OPTIONS = ["All", "Growing", "Declining"];

interface ProjectFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  theme: Theme;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({ activeFilter, onFilterChange, theme }) => {
  return (
    <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 border-b border-opacity-50" style={{ borderColor: theme.cardBorder }}>
      {FILTER_OPTIONS.map((option) => (
        <button 
          key={option}
          className="px-6 py-2.5 text-sm rounded-full font-medium transition-colors flex-shrink-0" 
          style={{ 
            background: activeFilter === option ? theme.primary : theme.cardBg,
            color: activeFilter === option ? 'white' : theme.accent,
            border: `1px solid ${activeFilter === option ? theme.primary : theme.cardBorder}`,
            boxShadow: activeFilter === option ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
          }}
          onClick={() => onFilterChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
};