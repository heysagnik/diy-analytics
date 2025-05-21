import React from 'react';
import { Theme } from '../../types/settings';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from './Button';

interface ErrorMessageProps {
  theme: Theme;
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  theme, 
  title = "Error", 
  message, 
  onRetry, 
  retryLabel = "Try Again" 
}) => (
  <div className="p-8 text-center" style={{ color: theme.errorText }}>
    <WarningCircleIcon size={48} className="mx-auto mb-4" />
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p className="mb-4">{message}</p>
    {onRetry && (
      <Button
        onClick={onRetry}
        variant="primary"
        theme={theme}
      >
        {retryLabel}
      </Button>
    )}
  </div>
);