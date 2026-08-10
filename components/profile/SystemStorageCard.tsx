'use client';

import { DatabaseIcon, EyeIcon, HourglassIcon, LightningIcon, PulseIcon } from '@phosphor-icons/react';
import AreaChart from '@/components/analytics/AreaChart';
import { MetricTile } from '@/components/common/MetricTile';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { StorageStatsResponse } from '@/lib/api/system';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/utils/format';

interface SystemStorageCardProps {
  stats: StorageStatsResponse;
  className?: string;
}

function storageTier(pct: number): { label: string; badgeClass: string; barClass: string } {
  if (pct >= 90) return { label: 'Critical', badgeClass: 'bg-danger/10 text-danger', barClass: 'bg-danger' };
  if (pct >= 70) return { label: 'Filling up', badgeClass: 'bg-warning/10 text-warning', barClass: 'bg-warning' };
  return { label: 'Healthy', badgeClass: 'bg-success/10 text-success', barClass: 'bg-primary' };
}

export function SystemStorageCard({ stats, className }: SystemStorageCardProps) {
  const { connected, latencyMs, usedBytes, capBytes, usedPct, pageviewCount, eventCount, estDaysUntilFull, trend } =
    stats;

  const tier = storageTier(usedPct);
  const trendSeries = [{ name: 'Events', data: trend.map((p) => p.count), color: 'var(--chart-1)' }];
  const trendLabels = trend.map((p) => p.date);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          idx={0}
          icon={<DatabaseIcon size={14} weight="bold" />}
          label="Storage Used"
          value={`${usedPct.toFixed(1)}%`}
          footnote={<Badge className={cn('gap-1 tabular-nums', tier.badgeClass)}>{tier.label}</Badge>}
        />
        <MetricTile
          idx={1}
          icon={<EyeIcon size={14} weight="bold" />}
          label="Pageviews"
          value={pageviewCount.toLocaleString()}
        />
        <MetricTile
          idx={2}
          icon={<LightningIcon size={14} weight="bold" />}
          label="Events"
          value={eventCount.toLocaleString()}
        />
        <MetricTile
          idx={3}
          icon={<HourglassIcon size={14} weight="bold" />}
          label="Days Until Full"
          value={estDaysUntilFull === null ? '—' : estDaysUntilFull.toLocaleString()}
        />
      </div>

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="icon-chip size-6 rounded-md">
              <DatabaseIcon size={14} weight="bold" />
            </span>
            <h3 className="font-display font-semibold text-sm text-foreground">Database</h3>
          </div>
          <Badge
            variant={connected ? 'secondary' : 'destructive'}
            className={connected ? 'gap-1.5 bg-success/10 text-success' : 'gap-1.5'}
          >
            <PulseIcon size={12} weight="bold" />
            {connected ? `Connected · ${latencyMs}ms` : 'Disconnected'}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {formatBytes(usedBytes)} of {formatBytes(capBytes)} used
            </span>
          </div>
          <Progress value={usedPct} indicatorClassName={tier.barClass} />
        </div>

        <div className="pt-1">
          <p className="label-eyebrow text-muted-foreground mb-2">Daily volume — last {trend.length} days</p>
          <AreaChart
            seriesData={trendSeries}
            labels={trendLabels}
            height={72}
            showGrid={false}
            showXAxis={false}
            showYAxis={false}
            showTooltip
          />
        </div>
      </Card>
    </div>
  );
}
