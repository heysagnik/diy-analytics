'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface RfSegment {
  id: 'champions' | 'occasional' | 'lapsing' | 'dormant';
  label: string;
  description: string;
  count: number;
  pctOfTotal: number;
}

const DATE_RANGE_OPTIONS = [
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
  { value: 'LAST_12_MONTHS', label: 'Last 12 months' },
];

const SEGMENTS_LOAD_ERROR = "We couldn't load segments. Please try again.";

export const SegmentsPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [dateRange, setDateRange] = useState('LAST_6_MONTHS');
  const [segments, setSegments] = useState<RfSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/segments?dateRange=${dateRange}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      setSegments(result.data.segments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load segments');
    } finally {
      setLoading(false);
    }
  }, [projectId, dateRange]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-md">
          Visitors grouped by recency and frequency. Anonymous by default — call{' '}
          <code className="text-[11px] bg-surface-tertiary px-1 py-0.5 rounded">window.identify(uid)</code> from your
          app to track real people instead of browsers.
        </p>
        <Select value={dateRange} onValueChange={(v: unknown) => typeof v === 'string' && setDateRange(v)}>
          <SelectTrigger aria-label="Date range" className="shrink-0">
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
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{SEGMENTS_LOAD_ERROR}</AlertDescription>
        </Alert>
      ) : total === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Not enough visitor data yet.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {segments.map((segment) => (
            <Card key={segment.id} className="p-4">
              <p className="text-sm font-semibold text-foreground">{segment.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{segment.description}</p>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-display font-semibold text-foreground tabular-nums">
                  {segment.count.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{segment.pctOfTotal}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden mt-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${segment.pctOfTotal}%` }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
