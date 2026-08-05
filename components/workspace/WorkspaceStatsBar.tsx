'use client';

import { useQuery } from '@tanstack/react-query';
import { DatabaseIcon, EyeIcon, LightningIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricTile } from '@/components/common/MetricTile';
import { getStorageStats, getWorkspaceStats } from '@/lib/api/system';
import { cn } from '@/lib/utils';

function storageTier(pct: number): { label: string; badgeClass: string } {
  if (pct >= 90) return { label: 'Critical', badgeClass: 'bg-danger/10 text-danger' };
  if (pct >= 70) return { label: 'Filling up', badgeClass: 'bg-warning/10 text-warning' };
  return { label: 'Healthy', badgeClass: 'bg-success/10 text-success' };
}

export function WorkspaceStatsBar({ workspaceId }: { workspaceId: string; workspaceSlug: string }) {
  const storageQuery = useQuery({ queryKey: ['system-storage'], queryFn: getStorageStats, staleTime: 60_000 });
  const statsQuery = useQuery({
    queryKey: ['workspace-stats', workspaceId],
    queryFn: () => getWorkspaceStats(workspaceId),
    staleTime: 60_000,
  });

  // Non-critical widget — if both calls fail, fail quietly rather than
  // blocking the project list underneath it.
  if (storageQuery.isError && statsQuery.isError) return null;

  if (storageQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }

  const storage = storageQuery.data;
  const weekly = statsQuery.data;
  const tier = storage ? storageTier(storage.usedPct) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {storage && tier && (
        <MetricTile
          idx={0}
          icon={<DatabaseIcon size={14} weight="bold" />}
          label="Storage Used"
          value={`${storage.usedPct.toFixed(1)}%`}
          footnote={<Badge className={cn('gap-1 tabular-nums', tier.badgeClass)}>{tier.label}</Badge>}
        />
      )}
      {weekly && (
        <>
          <MetricTile
            idx={1}
            icon={<EyeIcon size={14} weight="bold" />}
            label="Pageviews (7d)"
            value={weekly.pageViews.toLocaleString()}
          />
          <MetricTile
            idx={2}
            icon={<LightningIcon size={14} weight="bold" />}
            label="Events (7d)"
            value={weekly.events.toLocaleString()}
          />
        </>
      )}
    </div>
  );
}
