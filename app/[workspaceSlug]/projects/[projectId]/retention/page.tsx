'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { type RetentionCohort, RetentionHeatmap } from '@/components/analytics/RetentionHeatmap';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const WEEK_OPTIONS = [4, 8, 12];
const RETENTION_LOAD_ERROR = "We couldn't load retention data. Please try again.";

export default function RetentionPage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const params = use(promiseParams);
  const { projectId } = params;

  const [weeks, setWeeks] = useState(8);
  const [cohorts, setCohorts] = useState<RetentionCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRetention = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/retention?weeks=${weeks}`, { cache: 'no-store' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      const result = await res.json();
      setCohorts(result.data.cohorts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load retention data');
    } finally {
      setLoading(false);
    }
  }, [projectId, weeks]);

  useEffect(() => {
    fetchRetention();
  }, [fetchRetention]);

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title="Retention"
      description="Weekly cohorts — the share of each week's new visitors who came back in later weeks."
      actions={
        <Select
          value={String(weeks)}
          onValueChange={(v: unknown) => {
            const parsed = typeof v === 'string' ? Number(v) : NaN;
            if (Number.isInteger(parsed) && WEEK_OPTIONS.includes(parsed)) setWeeks(parsed);
          }}
        >
          <SelectTrigger aria-label="Number of weeks">
            <SelectValue>{(v: number) => `${v} weeks`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WEEK_OPTIONS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {w} weeks
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{RETENTION_LOAD_ERROR}</AlertDescription>
        </Alert>
      ) : (
        <RetentionHeatmap cohorts={cohorts} weeks={weeks} />
      )}
    </ProjectPageShell>
  );
}
