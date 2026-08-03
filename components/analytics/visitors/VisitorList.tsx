import React from 'react';
import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { Visitor, VisitorFiltersState, VisitorListViewState, VisitorPagination } from '@/types/visitors';
import { getCountryName } from '@/utils/country';
import { VisitorAvatar } from './VisitorAvatar';

const LAST_SEEN_LABELS: Record<string, string> = {
  '': 'Any Time',
  lastHour: 'Last Hour',
  today: 'Today',
  yesterday: 'Yesterday',
  lastWeek: 'Last Week',
};

const HIGH_ACTIVITY_THRESHOLD = 15;

interface VisitorFiltersProps {
  filters: VisitorFiltersState;
  countries: string[];
  loading: boolean;
  hasActiveFilters: boolean;
  onFilterChange: (name: keyof VisitorFiltersState, value: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

export function VisitorFilters({ filters, countries, loading, hasActiveFilters, onFilterChange, onClearFilters, onRefresh }: VisitorFiltersProps) {
  return (
    <div className="space-y-3 py-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <MagnifyingGlassIcon aria-hidden="true" size={16} className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search visitors"
            placeholder="Search visitor ID, country, browser, OS..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full bg-background pr-9 pl-10"
          />
          {filters.search && (
             <Button
               variant="ghost"
               size="icon-xs"
              onClick={() => onFilterChange('search', '')}
               className="absolute top-1/2 right-2 z-10 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon size={14} />
             </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Select value={filters.country} onValueChange={(v: unknown) => onFilterChange('country', v as string)}>
            <SelectTrigger className="w-full sm:min-w-[140px] bg-background text-xs" aria-label="Filter by country">
              <SelectValue>{(v: string) => (v ? getCountryName(v) : 'All Countries')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {getCountryName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.lastSeen} onValueChange={(v: unknown) => onFilterChange('lastSeen', v as string)}>
            <SelectTrigger className="w-full sm:min-w-[130px] bg-background text-xs" aria-label="Filter by last seen">
              <SelectValue>{(v: string) => LAST_SEEN_LABELS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LAST_SEEN_LABELS).map(([value, label]) => (
                <SelectItem key={value || 'any'} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={onRefresh} disabled={loading} className="col-span-2 sm:col-span-1 justify-center">
            <ArrowClockwiseIcon size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="label-eyebrow text-muted-foreground">Active Filters:</span>

          {filters.country && (
            <Badge variant="secondary" className="gap-1.5">
              Country: {getCountryName(filters.country)}
               <Button variant="ghost" size="icon-xs" onClick={() => onFilterChange('country', '')} className="hover:text-danger" aria-label="Remove country filter">
                 <XIcon size={12} />
               </Button>
            </Badge>
          )}

          {filters.lastSeen && (
            <Badge variant="secondary" className="gap-1.5">
              Time: {LAST_SEEN_LABELS[filters.lastSeen] ?? filters.lastSeen}
               <Button variant="ghost" size="icon-xs" onClick={() => onFilterChange('lastSeen', '')} className="hover:text-danger" aria-label="Remove time filter">
                 <XIcon size={12} />
               </Button>
            </Badge>
          )}

          {filters.search && (
            <Badge variant="secondary" className="gap-1.5">
              Search: {filters.search}
               <Button variant="ghost" size="icon-xs" onClick={() => onFilterChange('search', '')} className="hover:text-danger" aria-label="Remove search filter">
                 <XIcon size={12} />
               </Button>
            </Badge>
          )}

           <Button variant="link" size="xs" onClick={onClearFilters} className="ml-2 text-xs text-muted-foreground">
             Clear all
           </Button>
        </div>
      )}
    </div>
  );
}

function VisitorRow({ user, isSelected, onSelect }: { user: Visitor; isSelected: boolean; onSelect: (userId: string) => void }) {
  return (
    <button
      onClick={() => onSelect(user.userId)}
      className={`group/row relative w-full flex items-center gap-3 py-3.5 pr-9 pl-5 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
        isSelected ? 'bg-accent/[0.07]' : 'hover:bg-surface-secondary/50'
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-accent transition-transform duration-150 ease-out ${
          isSelected ? 'scale-y-100' : ''
        }`}
      />

      <div className="flex min-w-0 items-center gap-2">
        <VisitorAvatar userId={user.userId} size={26} />
        <span className="truncate font-mono text-xs font-medium text-foreground" title={user.userId}>
          {user.userId.substring(0, 10)}...
        </span>
        {user.activityCount > HIGH_ACTIVITY_THRESHOLD && (
          <Badge className="gap-1 bg-success/10 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            High Activity
          </Badge>
        )}
      </div>

      <CaretRightIcon
        size={14}
        className={`absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-[opacity,transform,filter] duration-150 ease-out ${
          isSelected
            ? 'translate-x-0 opacity-100 blur-none'
            : 'translate-x-[-4px] opacity-0 blur-[4px] group-hover/row:translate-x-0 group-hover/row:opacity-100 group-hover/row:blur-none'
        }`}
      />
    </button>
  );
}

interface VisitorListProps {
  viewState: VisitorListViewState;
  users: Visitor[];
  error: string | null;
  selectedUserId: string | null;
  hasActiveFilters: boolean;
  pagination: VisitorPagination;
  onSelect: (userId: string) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}

export function VisitorList({
  viewState,
  users,
  error,
  selectedUserId,
  hasActiveFilters,
  pagination,
  onSelect,
  onRetry,
  onClearFilters,
  onPageChange,
}: VisitorListProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin animate-fade-in">
        {viewState === 'loading' && (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {viewState === 'error' && (
          <div className="space-y-3 px-5 py-16 text-center">
            <WarningCircleIcon size={36} className="mx-auto text-danger" weight="duotone" />
            <p className="text-sm font-medium text-danger">{error}</p>
            <Button onClick={onRetry}>Try Again</Button>
          </div>
        )}

        {viewState === 'empty' && (
          <div className="space-y-3 px-5 py-16 text-center">
            <GlobeIcon size={36} className="mx-auto text-muted-foreground" weight="duotone" />
            <p className="text-sm text-muted-foreground">No visitor telemetry matches your selected criteria.</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {viewState === 'ready' && (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <VisitorRow key={user.userId} user={user} isSelected={selectedUserId === user.userId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      {viewState === 'ready' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-1 border-t border-border bg-surface-secondary/40 px-3 py-2.5 shrink-0 overflow-hidden text-xs">
           <p className="text-xs text-muted-foreground truncate shrink-0">
            <span className="tabular-nums">{users.length}</span>/<span className="tabular-nums">{pagination.total}</span>
          </p>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => onPageChange(pagination.page - 1)}
               className="h-7 px-1.5 text-xs gap-1"
            >
              <CaretLeftIcon size={12} />
              <span className="hidden sm:inline">Prev</span>
            </Button>

             <span className="px-1 font-mono text-xs tabular-nums text-foreground whitespace-nowrap">
              {pagination.page}/{pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
               className="h-7 px-1.5 text-xs gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <CaretRightIcon size={12} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
