'use client';

import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  CursorClickIcon,
  GlobeIcon,
  MagicWandIcon,
  NavigationArrowIcon,
  TerminalIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import type React from 'react';
import { use, useCallback, useEffect, useState } from 'react';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ErrorStatus = 'active' | 'resolved';
type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface ErrorGroup {
  _id: string;
  message: string;
  errorName: string | null;
  stack: string | null;
  sourceUrl: string | null;
  line: number | null;
  col: number | null;
  path: string | null;
  severity: ErrorSeverity;
  status: ErrorStatus;
  release: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  regressedAt: string | null;
}

interface ResolvedStackFrame {
  sourceUrl: string;
  line: number;
  column: number;
  functionName: string | null;
  resolved: { source: string; line: number; column: number; name: string | null; context: string | null } | null;
}

interface OccurrenceSummary {
  totalOccurrences: number;
  affectedSessions: number;
  affectedUsers: number;
}

interface TimelineBucket {
  date: string;
  count: number;
}

interface BreakdownItem {
  value: string | null;
  count: number;
}

interface Breadcrumb {
  type: 'console' | 'ui.click' | 'http' | 'navigation';
  message: string;
  data?: Record<string, unknown>;
  ts: number;
}

interface LatestOccurrence {
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  url: string | null;
  breadcrumbs: Breadcrumb[] | null;
  occurredAt: string;
}

const SEVERITY_BADGE: Record<ErrorSeverity, string> = {
  fatal: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none',
  error: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none',
  warning: 'bg-warning/10 text-warning hover:bg-warning/10 border-none shadow-none',
  info: 'bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none',
  debug: 'bg-muted text-muted-foreground hover:bg-muted border-none shadow-none',
};

const BREADCRUMB_ICON: Record<Breadcrumb['type'], React.ElementType> = {
  console: TerminalIcon,
  'ui.click': CursorClickIcon,
  http: GlobeIcon,
  navigation: NavigationArrowIcon,
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function BreakdownPanel({ title, items }: { title: string; items: BreakdownItem[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, 6).map((item) => (
            <div key={item.value ?? 'unknown'} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate text-foreground">{item.value ?? 'Unknown'}</span>
              <div className="h-1.5 flex-1 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, (item.count / total) * 100)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-muted-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Timeline({ buckets }: { buckets: TimelineBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">Occurrences (last 14 days)</p>
      {buckets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No occurrences in this window.</p>
      ) : (
        <div className="flex items-end gap-1 h-24">
          {buckets.map((b) => (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1" title={`${b.date}: ${b.count}`}>
              <div className="w-full rounded-t bg-accent min-h-[2px]" style={{ height: `${(b.count / max) * 100}%` }} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ErrorDetailPage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string; errorId: string }>;
}) {
  const { workspaceSlug, projectId, errorId } = use(promiseParams);

  const [error, setError] = useState<ErrorGroup | null>(null);
  const [summary, setSummary] = useState<OccurrenceSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [breakdowns, setBreakdowns] = useState<Record<string, BreakdownItem[]>>({});
  const [latest, setLatest] = useState<LatestOccurrence | null>(null);
  const [frames, setFrames] = useState<ResolvedStackFrame[] | null>(null);
  const [resolvingSource, setResolvingSource] = useState(false);
  const [sourceResolveError, setSourceResolveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const base = `/api/projects/${projectId}/errors/${errorId}`;
      const [errorRes, summaryRes, timelineRes, browserRes, osRes, deviceRes, countryRes, latestRes] =
        await Promise.all([
          fetch(base, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=summary`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=timeline&days=14`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=breakdown&by=browser`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=breakdown&by=os`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=breakdown&by=device`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=breakdown&by=country`, { cache: 'no-store' }),
          fetch(`${base}/occurrences?view=latest`, { cache: 'no-store' }),
        ]);
      if (!errorRes.ok) throw new Error(`Error ${errorRes.status}`);
      setError(await errorRes.json());
      setSummary(summaryRes.ok ? await summaryRes.json() : null);
      setTimeline(summaryRes.ok && timelineRes.ok ? (await timelineRes.json()).buckets : []);
      const [browser, os, device, country] = await Promise.all([
        browserRes.ok ? browserRes.json() : { items: [] },
        osRes.ok ? osRes.json() : { items: [] },
        deviceRes.ok ? deviceRes.json() : { items: [] },
        countryRes.ok ? countryRes.json() : { items: [] },
      ]);
      setBreakdowns({ Browser: browser.items, OS: os.items, Device: device.items, Country: country.items });
      setLatest(latestRes.ok ? (await latestRes.json()).occurrence : null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load error');
    } finally {
      setLoading(false);
    }
  }, [projectId, errorId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleResolveSource = async () => {
    setResolvingSource(true);
    setSourceResolveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/errors/${errorId}/source`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const body: { frames: ResolvedStackFrame[] } = await res.json();
      setFrames(body.frames);
    } catch (e) {
      setSourceResolveError(e instanceof Error ? e.message : 'Failed to resolve source map');
    } finally {
      setResolvingSource(false);
    }
  };

  const handleResolve = async (nextStatus: ErrorStatus) => {
    await fetch(`/api/projects/${projectId}/errors/${errorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchAll();
  };

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title={error?.errorName || 'Error detail'}
      description={error?.message}
      actions={
        error && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleResolve(error.status === 'resolved' ? 'active' : 'resolved')}
          >
            {error.status === 'resolved' ? (
              <>
                <ArrowCounterClockwiseIcon size={14} />
                <span>Reopen</span>
              </>
            ) : (
              <>
                <CheckCircleIcon size={14} />
                <span>Mark resolved</span>
              </>
            )}
          </Button>
        )
      }
    >
      <Link
        href={`/${workspaceSlug}/projects/${projectId}/errors`}
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon size={14} />
        Back to Errors
      </Link>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : loadError || !error ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError || "We couldn't load this error."}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs font-medium ${SEVERITY_BADGE[error.severity]}`}>{error.severity}</Badge>
            {error.errorName && (
              <Badge variant="outline" className="text-xs font-mono">
                {error.errorName}
              </Badge>
            )}
            {error.release && (
              <Badge variant="outline" className="text-xs">
                {error.release}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {error.path || 'unknown path'} · first seen {relativeTime(error.firstSeenAt)} · last seen{' '}
              {relativeTime(error.lastSeenAt)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total occurrences</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {(summary?.totalOccurrences ?? error.count).toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Affected sessions</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {(summary?.affectedSessions ?? 0).toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Affected users</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {(summary?.affectedUsers ?? 0).toLocaleString()}
              </p>
            </Card>
          </div>

          <Timeline buckets={timeline} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(breakdowns).map(([title, items]) => (
              <BreakdownPanel key={title} title={title} items={items} />
            ))}
          </div>

          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Stack trace</p>
            {error.stack ? (
              <pre className="text-xs bg-surface-tertiary rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">
                {error.stack}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">No stack trace captured.</p>
            )}

            {frames && (
              <div className="flex flex-col gap-3 mt-3">
                {frames.map((frame) => (
                  <div key={`${frame.sourceUrl}:${frame.line}:${frame.column}`} className="text-xs">
                    {frame.resolved ? (
                      <>
                        <p className="text-foreground font-medium mb-1">
                          {frame.resolved.source}:{frame.resolved.line}:{frame.resolved.column}
                          {frame.resolved.name && (
                            <span className="text-muted-foreground"> in {frame.resolved.name}</span>
                          )}
                        </p>
                        {frame.resolved.context && (
                          <pre className="bg-surface-tertiary rounded-md p-3 overflow-x-auto whitespace-pre text-muted-foreground">
                            {frame.resolved.context}
                          </pre>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        {frame.sourceUrl}:{frame.line}:{frame.column} — no source map
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {sourceResolveError && <p className="text-xs text-danger mt-2">{sourceResolveError}</p>}
            {error.stack && !frames && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={handleResolveSource}
                disabled={resolvingSource}
              >
                <MagicWandIcon size={14} />
                <span>{resolvingSource ? 'Resolving…' : 'Resolve source'}</span>
              </Button>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Breadcrumbs leading up to the latest occurrence
            </p>
            {!latest?.breadcrumbs || latest.breadcrumbs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No breadcrumbs captured for the latest occurrence.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {latest.breadcrumbs.map((crumb) => {
                  const Icon = BREADCRUMB_ICON[crumb.type] || ChatCircleIcon;
                  return (
                    <div key={`${crumb.ts}:${crumb.type}:${crumb.message}`} className="flex items-start gap-2 text-xs">
                      <Icon size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-10 shrink-0">
                        {new Date(crumb.ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <span className="text-foreground break-words">{crumb.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </ProjectPageShell>
  );
}
