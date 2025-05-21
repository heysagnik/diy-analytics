import React from 'react';
import { TabProps } from '../../types/settings';

export const Tab: React.FC<TabProps> = ({ 
  label, 
  icon: Icon, 
  isActive, 
  onClick, 
  theme 
}) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5`}
    style={ isActive ? 
      { borderColor: theme.primary, color: theme.primary } : 
      { borderColor: 'transparent', color: theme.textLight }
    }
  >
    <Icon size={16} weight={isActive ? "fill" : "regular"} />
    {label}
  </button>
);