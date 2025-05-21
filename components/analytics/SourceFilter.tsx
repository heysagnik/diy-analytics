import React from 'react';
import { defaultTheme } from '../../utils/theme';
import { SourceFilter as SourceFilterType } from '../../types/analytics';

interface SourceFilterProps {
  activeFilter: SourceFilterType;
  onFilterChange: (filter: SourceFilterType) => void;
}

export default function SourceFilter({ activeFilter, onFilterChange }: SourceFilterProps) {
  const theme = defaultTheme;
  const filters: SourceFilterType[] = ["Referrer", "Ref", "UTM"];

  return (
    <div className="flex border rounded-lg overflow-hidden text-xs sm:text-sm" style={{ borderColor: theme.cardBorder }}>
      {filters.map(filter => (
        <button 
          key={filter}
          className="px-2.5 sm:px-3.5 py-1.5 hover:bg-gray-50 transition-colors" 
          style={{ 
            background: activeFilter === filter ? theme.lightAccent : 'transparent', 
            color: theme.accent,
            fontWeight: activeFilter === filter ? 500 : 'normal',
            opacity: activeFilter === filter ? 1 : 0.7 
          }}
          onClick={() => onFilterChange(filter)}
          aria-pressed={activeFilter === filter} // Added for accessibility
        >
          {filter}
        </button>
      ))}
    </div>
  );
}