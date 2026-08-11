import {
  GearIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SignOutIcon,
  SunIcon,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import type React from 'react';
import { useEffect, useState } from 'react';
import { VisitorAvatar } from '@/components/analytics/visitors/VisitorAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { getStorageStats } from '@/lib/api/system';

interface ProjectListHeaderProps {
  workspaceSlug: string;
  userId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewSiteClick: () => void;
}

function useEventsLeft() {
  const { data } = useQuery({ queryKey: ['system-storage'], queryFn: getStorageStats, staleTime: 60_000 });
  if (!data) return null;
  const totalRecords = data.pageviewCount + data.eventCount;
  const avgBytesPerRecord = totalRecords > 0 ? data.usedBytes / totalRecords : 0;
  if (avgBytesPerRecord <= 0) return null;
  return Math.max(0, Math.floor((data.capBytes - data.usedBytes) / avgBytesPerRecord));
}

function formatEventsLeft(n: number) {
  return n.toLocaleString('en-US');
}

export const ProjectListHeader: React.FC<ProjectListHeaderProps> = ({
  searchQuery,
  workspaceSlug,
  userId,
  onSearchChange,
  onNewSiteClick,
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const eventsLeft = useEventsLeft();

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium tracking-kicker text-accent">Workspace</p>
        <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Projects
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:w-64">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <Input
            id="project-search"
            type="text"
            placeholder="Search projects..."
            className="w-full h-9 pl-9 pr-4 bg-background text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={onNewSiteClick}
            size="lg"
            className="flex-1 sm:flex-none active:scale-[0.96] transition-transform"
          >
            <PlusIcon data-icon="inline-start" weight="bold" />
            <span>New Site</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] hover:bg-muted/50"
                >
                  <span className="overflow-hidden rounded-full">
                    <VisitorAvatar userId={userId} size={28} />
                  </span>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-64">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <LightningIcon size={14} weight="regular" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {eventsLeft === null ? '—' : formatEventsLeft(eventsLeft)}
                  </span>
                  <span className="text-xs text-muted-foreground">events left</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 px-2 py-2" render={<Link href={`/${workspaceSlug}/profile`} />}>
                <GearIcon size={16} weight="regular" className="text-muted-foreground" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 px-2 py-2" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                <span className="icon-crossfade size-4 text-muted-foreground">
                  <SunIcon size={16} weight="regular" className={isDark ? 'icon-crossfade-hidden' : undefined} />
                  <MoonIcon size={16} weight="regular" className={isDark ? undefined : 'icon-crossfade-hidden'} />
                </span>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="gap-2.5 px-2 py-2" render={<Link href="/logout" />}>
                <SignOutIcon size={16} weight="regular" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
