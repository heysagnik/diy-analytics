'use client';

import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  MagicWandIcon,
  ShieldWarningIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface ReleaseCount {
  release: string | null;
  count: number;
}

interface ErrorNameCount {
  errorName: string | null;
  count: number;
}

const ERRORS_LOAD_FAILED = "We couldn't load errors. Please try again.";

const SEVERITY_BADGE: Record<ErrorSeverity, string> = {
  fatal: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none',
  error: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none',
  warning: 'bg-warning/10 text-warning hover:bg-warning/10 border-none shadow-none',
  info: 'bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none',
  debug: 'bg-muted text-muted-foreground hover:bg-muted border-none shadow-none',
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

const NEW_ERROR_WINDOW_MS = 24 * 60 * 60 * 1000;

function isNewError(firstSeenAt: string): boolean {
  return Date.now() - new Date(firstSeenAt).getTime() < NEW_ERROR_WINDOW_MS;
}

// Browsers redact the real message/stack for uncaught errors thrown by a
// cross-origin <script> that isn't served with crossorigin="anonymous" (and
// a matching Access-Control-Allow-Origin header), replacing everything with
// the literal string "Script error." and no stack/source. This is a browser
// security feature — the app can never recover the real error after the
// fact, so surface an explanation instead of a dead-end "no data" message.
function isCrossOriginScriptError(error: ErrorGroup): boolean {
  return error.message === 'Script error.' && !error.stack && !error.sourceUrl;
}

interface ResolvedStackFrame {
  sourceUrl: string;
  line: number;
  column: number;
  functionName: string | null;
  resolved: {
    source: string;
    line: number;
    column: number;
    name: string | null;
    context: string | null;
  } | null;
}

function ErrorRow({
  error,
  workspaceSlug,
  projectId,
  onResolve,
  onDelete,
}: {
  error: ErrorGroup;
  workspaceSlug: string;
  projectId: string;
  onResolve: (id: string, status: ErrorStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolvedFrames, setResolvedFrames] = useState<ResolvedStackFrame[] | null>(null);
  const [resolvingSource, setResolvingSource] = useState(false);
  const [sourceResolveError, setSourceResolveError] = useState<string | null>(null);

  const handleResolveSource = async () => {
    setResolvingSource(true);
    setSourceResolveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/errors/${error._id}/source`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const body: { frames: ResolvedStackFrame[] } = await res.json();
      setResolvedFrames(body.frames);
    } catch (e) {
      setSourceResolveError(e instanceof Error ? e.message : 'Failed to resolve source map');
    } finally {
      setResolvingSource(false);
    }
  };

  return (
    <li className="px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs font-medium ${SEVERITY_BADGE[error.severity]}`}>{error.severity}</Badge>
            {error.errorName && (
              <Badge variant="outline" className="text-xs font-mono">
                {error.errorName}
              </Badge>
            )}
            {error.regressedAt ? (
              <Badge className="text-xs font-medium bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none">
                regression
              </Badge>
            ) : (
              isNewError(error.firstSeenAt) && (
                <Badge className="text-xs font-medium bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none">
                  new
                </Badge>
              )
            )}
            {error.release && (
              <Badge variant="outline" className="text-xs">
                {error.release}
              </Badge>
            )}
            {isCrossOriginScriptError(error) && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-warning border-warning/30"
                title="Browsers hide error details for cross-origin scripts without CORS headers"
              >
                cross-origin
              </Badge>
            )}
            <p className="text-sm font-medium text-foreground truncate">{error.message}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {error.path || 'unknown path'} · {error.count.toLocaleString()} occurrence{error.count === 1 ? '' : 's'} ·
            first seen {relativeTime(error.firstSeenAt)} · last seen {relativeTime(error.lastSeenAt)}
          </p>
        </div>
        <CaretDownIcon
          size={14}
          className={`shrink-0 mt-1 text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          {error.stack ? (
            <pre className="text-xs bg-surface-tertiary rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">
              {error.stack}
            </pre>
          ) : isCrossOriginScriptError(error) ? (
            <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-xs text-foreground">
              <ShieldWarningIcon size={16} className="shrink-0 mt-0.5 text-warning" />
              <p>
                This error was thrown by a script on a different origin. Browsers hide the real message and stack trace
                unless that script is served with{' '}
                <code className="rounded bg-surface-tertiary px-1 py-0.5">crossorigin="anonymous"</code> on the{' '}
                <code className="rounded bg-surface-tertiary px-1 py-0.5">&lt;script&gt;</code> tag and a matching{' '}
                <code className="rounded bg-surface-tertiary px-1 py-0.5">Access-Control-Allow-Origin</code> header from
                that origin. This can't be recovered after the fact — fix it at the source and reload to see full
                details on future occurrences.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No stack trace captured.</p>
          )}
          {error.sourceUrl && (
            <p className="text-xs text-muted-foreground">
              {error.sourceUrl}
              {error.line !== null ? `:${error.line}${error.col !== null ? `:${error.col}` : ''}` : ''}
            </p>
          )}

          {resolvedFrames && (
            <div className="flex flex-col gap-3">
              {resolvedFrames.map((frame) => (
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
          {sourceResolveError && <p className="text-xs text-danger">{sourceResolveError}</p>}

          <div className="flex items-center gap-2">
            <Link href={`/${workspaceSlug}/projects/${projectId}/errors/${error._id}`}>
              <Button size="sm" variant="outline">
                <span>View details</span>
              </Button>
            </Link>
            {error.sourceUrl && error.line !== null && !resolvedFrames && (
              <Button size="sm" variant="outline" onClick={handleResolveSource} disabled={resolvingSource}>
                <MagicWandIcon size={14} />
                <span>{resolvingSource ? 'Resolving…' : 'Resolve source'}</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(error._id, error.status === 'resolved' ? 'active' : 'resolved')}
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
            <Button size="sm" variant="ghost" onClick={() => onDelete(error._id)}>
              <TrashIcon size={14} className="text-danger" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function ErrorsPage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = use(promiseParams);

  const [status, setStatus] = useState<ErrorStatus>('active');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [releases, setReleases] = useState<ReleaseCount[]>([]);
  const [errorNameFilter, setErrorNameFilter] = useState('all');
  const [errorNames, setErrorNames] = useState<ErrorNameCount[]>([]);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const errorsQuery =
        (releaseFilter === 'all' ? '' : `&release=${encodeURIComponent(releaseFilter)}`) +
        (errorNameFilter === 'all' ? '' : `&errorName=${encodeURIComponent(errorNameFilter)}`);
      const [errorsRes, releasesRes, errorNamesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/errors?status=${status}${errorsQuery}`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/errors/releases?status=${status}`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/errors/errorNames?status=${status}`, { cache: 'no-store' }),
      ]);
      if (!errorsRes.ok) throw new Error(`Error ${errorsRes.status}`);
      setErrorGroups(await errorsRes.json());
      setReleases(releasesRes.ok ? await releasesRes.json() : []);
      setErrorNames(errorNamesRes.ok ? await errorNamesRes.json() : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, [projectId, status, releaseFilter, errorNameFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleResolve = async (errorId: string, nextStatus: ErrorStatus) => {
    setErrorGroups((prev) => prev.filter((e) => e._id !== errorId));
    await fetch(`/api/projects/${projectId}/errors/${errorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => fetchErrors());
  };

  const handleDelete = async (errorId: string) => {
    setErrorGroups((prev) => prev.filter((e) => e._id !== errorId));
    await fetch(`/api/projects/${projectId}/errors/${errorId}`, { method: 'DELETE' }).catch(() => fetchErrors());
  };

  const releaseLabel = (release: string | null) => (release === null ? 'No release' : release);
  const errorNameLabel = (name: string | null) => (name === null ? 'Unknown type' : name);

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title="Errors"
      description="Uncaught exceptions and unhandled rejections, grouped by fingerprint."
      actions={
        <div className="flex items-center gap-2">
          {releases.length > 0 && (
            <Select value={releaseFilter} onValueChange={(v: unknown) => typeof v === 'string' && setReleaseFilter(v)}>
              <SelectTrigger aria-label="Release">
                <SelectValue>
                  {(v: string) => (v === 'all' ? 'All releases' : releaseLabel(v === 'none' ? null : v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All releases</SelectItem>
                {releases.map((r) => (
                  <SelectItem key={r.release ?? 'none'} value={r.release ?? 'none'}>
                    {releaseLabel(r.release)} ({r.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errorNames.length > 0 && (
            <Select
              value={errorNameFilter}
              onValueChange={(v: unknown) => typeof v === 'string' && setErrorNameFilter(v)}
            >
              <SelectTrigger aria-label="Error type">
                <SelectValue>
                  {(v: string) => (v === 'all' ? 'All types' : errorNameLabel(v === 'none' ? null : v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {errorNames.map((n) => (
                  <SelectItem key={n.errorName ?? 'none'} value={n.errorName ?? 'none'}>
                    {errorNameLabel(n.errorName)} ({n.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={status}
            onValueChange={(v: unknown) => {
              if (v === 'active' || v === 'resolved') {
                setStatus(v);
                setReleaseFilter('all');
                setErrorNameFilter('all');
              }
            }}
          >
            <SelectTrigger aria-label="Status">
              <SelectValue>{(v: ErrorStatus) => (v === 'active' ? 'Active' : 'Resolved')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{ERRORS_LOAD_FAILED}</AlertDescription>
        </Alert>
      ) : errorGroups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {status === 'active' ? 'No active errors. Nice.' : 'No resolved errors yet.'}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-border">
            {errorGroups.map((error) => (
              <ErrorRow
                key={error._id}
                error={error}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </Card>
      )}
    </ProjectPageShell>
  );
}
