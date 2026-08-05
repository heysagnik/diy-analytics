import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, FolderOpenIcon } from '@phosphor-icons/react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';

interface EmptyStateProps {
  searchQuery: string;
  onNewSiteClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, onNewSiteClick }) => {
  return (
    <Empty className="py-16 px-4 bg-surface my-4">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="p-4 size-20 rounded-full bg-surface-secondary text-muted-foreground mb-4 flex items-center justify-center">
          <FolderOpenIcon size={48} weight="duotone" />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-medium text-foreground">No projects found</EmptyTitle>
        <EmptyDescription className="text-muted-foreground text-sm max-w-md">
          {searchQuery ? "Try adjusting your search criteria." : "Create your first project to get started with analytics."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onNewSiteClick} className="px-6">
          <PlusIcon data-icon="inline-start" weight="bold" />
          <span>Create New Project</span>
        </Button>
      </EmptyContent>
    </Empty>
  );
};