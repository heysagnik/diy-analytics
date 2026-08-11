'use client';

import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  MagicWandIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { use, useCallback, useEffect, useState } from 'react';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type ErrorStatus = 'active' | 'resolved';

interface ErrorGroup {
  _id: string;
  message: string;
  stack: string | null;
  sourceUrl: string | null;
  line: number | null;
  col: number | null;
  path: string | null;
  severity: 'error' | 'warning';
  status: ErrorStatus;
  release: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  regressedAt: string | null;
}

const ERRORS_LOAD_FAILED = "We couldn't load errors. Please try again.";

const SEVERITY_BADGE: Record<ErrorGroup['severity'], string> = {
  error: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none',
  warning: 'bg-warning/10 text-warning hover:bg-warning/10 border-none shadow-none',
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

interface ResolvedSource {
  source: string;
  line: number;
  column: number;
  name: string | null;
  context: string | null;
}

function ErrorRow({
  error,
  projectId,
  onResolve,
  onDelete,
}: {
  error: ErrorGroup;
  projectId: string;
  onResolve: (id: string, status: ErrorStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolvedSource, setResolvedSource] = useState<ResolvedSource | null>(null);
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
      setResolvedSource(await res.json());
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
            {error.regressedAt && (
              <Badge className="text-xs font-medium bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none">
                regression
              </Badge>
            )}
            {error.release && (
              <Badge variant="outline" className="text-xs">
                {error.release}
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
          ) : (
            <p className="text-xs text-muted-foreground">No stack trace captured.</p>
          )}
          {error.sourceUrl && (
            <p className="text-xs text-muted-foreground">
              {error.sourceUrl}
              {error.line !== null ? `:${error.line}${error.col !== null ? `:${error.col}` : ''}` : ''}
            </p>
          )}

          {resolvedSource && (
            <div className="text-xs">
              <p className="text-foreground font-medium mb-1">
                {resolvedSource.source}:{resolvedSource.line}:{resolvedSource.column}
                {resolvedSource.name && <span className="text-muted-foreground"> in {resolvedSource.name}</span>}
              </p>
              {resolvedSource.context && (
                <pre className="bg-surface-tertiary rounded-md p-3 overflow-x-auto whitespace-pre text-muted-foreground">
                  {resolvedSource.context}
                </pre>
              )}
            </div>
          )}
          {sourceResolveError && <p className="text-xs text-danger">{sourceResolveError}</p>}

          <div className="flex items-center gap-2">
            {error.sourceUrl && error.line !== null && !resolvedSource && (
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
  const { projectId } = use(promiseParams);

  const [status, setStatus] = useState<ErrorStatus>('active');
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/errors?status=${status}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setErrorGroups(await res.json());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, [projectId, status]);

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

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title="Errors"
      description="Uncaught exceptions and unhandled rejections, grouped by fingerprint."
      actions={
        <Select
          value={status}
          onValueChange={(v: unknown) => (v === 'active' || v === 'resolved' ? setStatus(v) : undefined)}
        >
          <SelectTrigger aria-label="Status">
            <SelectValue>{(v: ErrorStatus) => (v === 'active' ? 'Active' : 'Resolved')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
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
