import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import {
  ClockIcon,
  DesktopIcon,
  FingerprintIcon,
  FireIcon,
  MapPinIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import CountryFlag from 'react-country-flag';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useVisitorDetail, useVisitorHeatmap } from '@/hooks/useVisitorDetail';
import type { VisitorDetail, VisitorSession } from '@/types/visitors';
import { getCountryName } from '@/utils/country';
import { ActivityHeatmap } from './ActivityHeatmap';
import { VisitorAvatar } from './VisitorAvatar';

interface VisitorDetailPanelProps {
  projectId: string;
  userId: string | null;
  onClose: () => void;
  /** Rendered as a column inside a shared table card instead of its own floating card. */
  embedded?: boolean;
}

const formatExactLocation = (loc: VisitorDetail['location']) => {
  const parts = [loc.city, loc.region, loc.country && getCountryName(loc.country)].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
};

const formatCounted = (items: { name: string; count: number }[]) =>
  items.map((i) => (i.count > 1 ? `${i.name} ×${i.count}` : i.name)).join(', ');

export const VisitorDetailPanel: React.FC<VisitorDetailPanelProps> = ({
  projectId,
  userId,
  onClose,
  embedded = false,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)', true);
  const { detail, loading, error } = useVisitorDetail(projectId, userId);
  const [heatmapYear, setHeatmapYear] = useState(() => new Date().getUTCFullYear());
  const {
    days: heatmapDays,
    loading: loadingHeatmap,
    error: heatmapError,
  } = useVisitorHeatmap(projectId, userId, heatmapYear);

  const header = (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary/50 px-5 py-3.5">
      <div className="min-w-0 flex items-center gap-3">
        <VisitorAvatar userId={userId ?? ''} size={28} />
        <span
          className="font-mono text-xs font-semibold text-foreground truncate tracking-tight"
          title={userId ?? undefined}
        >
          {userId}
        </span>
      </div>
      {embedded && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close visitor detail"
          className="shrink-0 h-8 w-8 rounded-lg hover:bg-background/80 active:scale-[0.96] transition-transform"
        >
          <XIcon size={14} />
        </Button>
      )}
    </div>
  );

  const subheader = (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-2">
        <span className="icon-chip size-5 rounded-full">
          <FingerprintIcon size={12} weight="bold" />
        </span>
        <p className="label-eyebrow text-foreground/80">Visitor Profile</p>
      </div>
      {detail && (
        <p className="text-xs text-muted-foreground">
          First seen <span className="tabular-nums font-medium">{new Date(detail.firstSeen).toLocaleDateString()}</span>
        </p>
      )}
    </div>
  );

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      {subheader}

      <div key={loading ? 'loading' : error ? 'error' : 'detail'} className="animate-fade-in">
        {loading ? (
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="m-4">
            <Alert variant="destructive">
              <WarningIcon className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : detail ? (
          <div className="px-5 pb-5 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="surface-tile p-3.5">
                <p className="label-eyebrow text-muted-foreground mb-1">Sessions</p>
                <p className="text-xl font-semibold text-foreground tabular-nums font-display">
                  {detail.totalSessions}
                </p>
              </div>
              <div className="surface-tile p-3.5">
                <p className="label-eyebrow text-muted-foreground mb-1">Pageviews</p>
                <p className="text-xl font-semibold text-foreground tabular-nums font-display">
                  {detail.totalPageviews}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <MapPinIcon size={14} className="text-accent" weight="bold" />
                <h4 className="text-xs font-semibold text-foreground tracking-tight">Exact Location</h4>
              </div>
              <div className="surface-tile flex items-center gap-2.5 p-3">
                {detail.location.country && (
                  <CountryFlag
                    countryCode={detail.location.country}
                    svg
                    style={{ width: '18px', height: '13px' }}
                    className="rounded-xs ring-1 ring-black/10 dark:ring-white/10"
                  />
                )}
                <span className="text-xs font-medium text-foreground">{formatExactLocation(detail.location)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <DesktopIcon size={14} className="text-accent" weight="bold" />
                <h4 className="text-xs font-semibold text-foreground tracking-tight">Technology Stack</h4>
              </div>
              <div className="surface-tile divide-y divide-border overflow-hidden">
                {[
                  { label: 'Device', items: detail.devices },
                  { label: 'Browser', items: detail.browsers },
                  { label: 'OS', items: detail.operatingSystems },
                ]
                  .filter((row) => row.items.length > 0)
                  .map((row) => (
                    <div key={row.label} className="flex items-start gap-3 px-3.5 py-2.5 text-xs">
                      <span className="w-16 shrink-0 font-medium text-muted-foreground">{row.label}</span>
                      <span className="text-foreground truncate font-medium">{formatCounted(row.items)}</span>
                    </div>
                  ))}
                {detail.devices.length === 0 &&
                  detail.browsers.length === 0 &&
                  detail.operatingSystems.length === 0 && (
                    <p className="px-3.5 py-2.5 text-xs text-muted-foreground">No technology data recorded.</p>
                  )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <FireIcon size={14} className="text-accent" weight="bold" />
                <h4 className="text-xs font-semibold text-foreground tracking-tight">Activity Breakdown</h4>
              </div>
              {loadingHeatmap ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : heatmapError ? (
                <p
                  className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs font-medium text-danger"
                  role="status"
                >
                  Activity data could not be loaded. Try selecting the year again.
                </p>
              ) : (
                <ActivityHeatmap days={heatmapDays} selectedYear={heatmapYear} onYearChange={setHeatmapYear} />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <ClockIcon size={14} className="text-accent" weight="bold" />
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">Recent Sessions</h4>
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {detail.sessions.length} sessions
                </span>
              </div>

              <div className="surface-tile divide-y divide-border overflow-hidden">
                {detail.sessions.map((s: VisitorSession, idx: number) => (
                  <div
                    key={s.sessionId || idx}
                    className="p-2.5 text-xs hover:bg-surface-secondary/40 transition-colors duration-150 ease-out flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground tabular-nums text-xs">
                        {new Date(s.lastSeen).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/10 border-none font-semibold text-xs tabular-nums shadow-none"
                      >
                        {s.pageCount} {s.pageCount === 1 ? 'view' : 'views'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span className="truncate">{[s.device, s.browser, s.os].filter(Boolean).join(' · ')}</span>
                      {s.location && <span className="shrink-0 text-xs">📍 {s.location}</span>}
                    </div>

                    {s.paths && s.paths.length > 0 && (
                      <p
                        className="font-mono text-xs text-muted-foreground/80 truncate pt-0.5"
                        title={s.paths.join(', ')}
                      >
                        {s.paths.slice(0, 3).join(', ')}
                        {s.paths.length > 3 ? `, +${s.paths.length - 3} more` : ''}
                      </p>
                    )}
                  </div>
                ))}
                {detail.sessions.length === 0 && (
                  <p className="px-3.5 py-2.5 text-xs text-muted-foreground">No sessions recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer
        open={Boolean(userId)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DrawerContent aria-describedby={undefined} showCloseButton={false}>
          <DialogPrimitive.Title className="sr-only">Visitor profile</DialogPrimitive.Title>
          {header}
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  const emptyClasses = embedded
    ? 'p-8 flex flex-col items-center justify-center text-center h-full min-h-[320px] rounded-none border-0 lg:border-l lg:border-border shadow-none ring-0 bg-transparent'
    : 'p-8 border border-border bg-surface flex flex-col items-center justify-center text-center h-full min-h-[320px] rounded-xl';

  if (!userId) {
    return (
      <Empty className={emptyClasses}>
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="mb-0 flex items-center justify-center text-muted-foreground bg-accent/10 text-accent size-10 rounded-lg"
          >
            <FingerprintIcon size={20} weight="bold" />
          </EmptyMedia>
          <EmptyTitle className="text-sm font-semibold text-foreground tracking-tight">No visitor selected</EmptyTitle>
          <EmptyDescription className="text-pretty text-xs text-muted-foreground max-w-[220px] leading-relaxed">
            Click any visitor in the list to inspect their profile, telemetry, and activity history.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const panelClasses = embedded
    ? 'h-full overflow-hidden rounded-none border-0 lg:border-l lg:border-border shadow-none ring-0 bg-transparent p-0 gap-0'
    : 'border border-border bg-surface overflow-hidden rounded-xl p-0 gap-0';

  return (
    <Card className={panelClasses}>
      {header}
      {body}
    </Card>
  );
};
