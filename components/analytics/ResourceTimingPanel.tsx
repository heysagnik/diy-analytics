import { ArrowsOutSimpleIcon, TimerIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ResourceTimingData } from '@/types/analytics';

interface ResourceTimingPanelProps {
  resourceTimings: ResourceTimingData[];
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)}kb` : `${bytes}b`;
}

function ResourceRow({ resource, maxDuration }: { resource: ResourceTimingData; maxDuration: number }) {
  const barWidth = Math.max((resource.p75Duration / maxDuration) * 100, 4);
  return (
    <div className="flex flex-col gap-1 px-2.5 py-2 rounded-md hover:bg-surface-tertiary">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {resource.type}
          </Badge>
          <span className="truncate text-xs font-medium text-foreground" title={resource.name}>
            {resource.name}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDuration(resource.p75Duration)} · {formatSize(resource.avgSize)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-tertiary overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

export const ResourceTimingPanel: React.FC<ResourceTimingPanelProps> = ({ resourceTimings }) => {
  const [open, setOpen] = useState(false);
  if (!resourceTimings.length) return null;

  const slowest = resourceTimings[0];
  const maxDuration = slowest.p75Duration;

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-surface-tertiary/60 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          aria-haspopup="dialog"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="icon-chip size-7 rounded-md shrink-0">
              <TimerIcon size={15} weight="bold" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Resource Timing</h3>
              <p className="text-xs text-muted-foreground truncate">
                Slowest: {slowest.name} · {formatDuration(slowest.p75Duration)}
              </p>
            </div>
          </div>
          <ArrowsOutSimpleIcon size={14} className="text-muted-foreground shrink-0" />
        </button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg h-[min(38rem,80vh)] grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border gap-0">
            <DialogTitle className="flex items-center gap-2 font-display text-sm">
              <span className="icon-chip size-6 rounded-md">
                <TimerIcon size={14} weight="bold" />
              </span>
              Resource timing
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto scrollbar-thin p-4 flex flex-col gap-1">
            {resourceTimings.map((resource) => (
              <ResourceRow key={`${resource.name}:${resource.type}`} resource={resource} maxDuration={maxDuration} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
