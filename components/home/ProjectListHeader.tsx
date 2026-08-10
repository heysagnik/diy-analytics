import React from 'react';
import { Button } from '@/components/ui/button';
import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { VisitorAvatar } from '@/components/analytics/visitors/VisitorAvatar';

interface ProjectListHeaderProps {
  workspaceSlug: string;
  userId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewSiteClick: () => void;
}

export const ProjectListHeader: React.FC<ProjectListHeaderProps> = ({
  searchQuery,
  workspaceSlug,
  userId,
  onSearchChange,
  onNewSiteClick
}) => {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium tracking-kicker text-accent">Workspace</p>
        <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Projects
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:w-64">
          <label htmlFor="project-search" className="sr-only">Search projects</label>
           <Input
            id="project-search"
            type="text"
            placeholder="Search projects..."
             className="w-full pl-10 pr-4 bg-background"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onNewSiteClick} className="flex-1 sm:flex-none">
            <PlusIcon data-icon="inline-start" weight="bold" />
            <span>New Site</span>
          </Button>

          <Link
            href={`/${workspaceSlug}/profile`}
            aria-label="View profile"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg outline-none transition-[box-shadow,transform] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
          >
            <VisitorAvatar userId={userId} size={26} />
          </Link>
        </div>
      </div>
    </header>
  );
};