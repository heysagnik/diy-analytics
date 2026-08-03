import React from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-danger/10 mb-4 text-danger">
        <WarningIcon size={32} />
      </div>
      <h2 className="text-xl font-medium mb-2 text-center text-foreground">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md text-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}