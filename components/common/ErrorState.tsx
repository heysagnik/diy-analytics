import React from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="flex size-16 items-center justify-center rounded-xl bg-danger/10 text-danger mb-4">
          <WarningIcon size={32} />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-medium text-foreground">Something went wrong</EmptyTitle>
        <EmptyDescription className="text-muted-foreground max-w-md text-sm">{message}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button onClick={onRetry}>
            Try Again
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}