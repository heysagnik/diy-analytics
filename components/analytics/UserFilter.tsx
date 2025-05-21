import React from 'react';
import { defaultTheme } from '../../utils/theme';
import { UserFilter as UserFilterType } from '../../types/analytics';

interface UserFilterProps {
  activeFilter: UserFilterType;
  onFilterChange: (filter: UserFilterType) => void;
}

export default function UserFilter({ activeFilter, onFilterChange }: UserFilterProps) {
  const theme = defaultTheme;
  const filters: UserFilterType[] = ["Country", "Browser", "Device"];

  return (
    <div 
      className="flex border rounded-lg overflow-hidden text-xs sm:text-sm" 
      style={{ borderColor: theme.cardBorder }}
    >
      {filters.map((filter) => (
        <button
          key={filter}
          className="px-2.5 sm:px-3.5 py-1.5 hover:bg-gray-50 transition-colors"
          style={{
            background: activeFilter === filter ? theme.lightAccent : 'transparent',
            color: theme.accent,
            fontWeight: activeFilter === filter ? 500 : 'normal',
            opacity: activeFilter === filter ? 1 : 0.7,
          }}
          onClick={() => onFilterChange(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}