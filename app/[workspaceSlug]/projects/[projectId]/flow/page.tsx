'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { type FlowEdge, PageFlowDiagram } from '@/components/analytics/PageFlowDiagram';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const DATE_RANGE_OPTIONS = [
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
];

const FLOW_LOAD_ERROR = "We couldn't load page flow data. Please try again.";

export default function FlowPage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { projectId } = use(promiseParams);

  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlow = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/flow?dateRange=${dateRange}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      setEdges(result.data.edges);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load page flow');
    } finally {
      setLoading(false);
    }
  }, [projectId, dateRange]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title="Journeys"
      description="The most common page-to-page transitions within a session."
      actions={
        <Select value={dateRange} onValueChange={(v: unknown) => typeof v === 'string' && setDateRange(v)}>
          <SelectTrigger aria-label="Date range">
            <SelectValue>{(v: string) => DATE_RANGE_OPTIONS.find((o) => o.value === v)?.label ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{FLOW_LOAD_ERROR}</AlertDescription>
        </Alert>
      ) : (
        <Card className="p-4">
          <PageFlowDiagram edges={edges} />
        </Card>
      )}
    </ProjectPageShell>
  );
}
