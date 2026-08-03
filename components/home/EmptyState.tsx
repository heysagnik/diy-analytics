import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, FolderOpenIcon } from '@phosphor-icons/react';

interface EmptyStateProps {
  searchQuery: string;
  onNewSiteClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, onNewSiteClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-border bg-surface my-4">
      <div className="p-4 rounded-full bg-surface-secondary mb-4 text-muted-foreground">
        <FolderOpenIcon size={48} weight="duotone" />
      </div>
      <p className="text-xl font-medium mb-2 text-foreground">No projects found</p>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {searchQuery ? "Try adjusting your search criteria." : "Create your first project to get started with analytics."}
      </p>
      <Button onClick={onNewSiteClick} className="px-6">
        <PlusIcon size={18} weight="bold" />
        <span>Create New Project</span>
      </Button>
    </div>
  );
};