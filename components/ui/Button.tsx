import React from 'react';
import { Theme } from '../../types/settings';

interface ButtonProps { 
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  theme: Theme;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'secondary', 
  size = 'md', 
  disabled, 
  isLoading, 
  theme, 
  icon, 
  fullWidth = false 
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };
  
  const getBackgroundColor = () => {
    if (variant === 'primary') return theme.primary;
    if (variant === 'danger') return '#EF4444';
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'primary' || variant === 'danger') return 'white';
    return theme.accent;
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${sizeClasses[size]} rounded-md font-medium transition-colors focus:outline-none focus:ring-2 
        ${variant !== 'primary' && variant !== 'danger' ? 'border' : ''} 
        ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}
        ${fullWidth ? 'w-full' : ''}
        flex items-center justify-center gap-2`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: variant === 'secondary' ? theme.cardBorder : 'transparent',
        color: getTextColor(),
        outlineColor: theme.primary
      }}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};