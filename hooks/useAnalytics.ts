import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { CustomDateRange } from '../components/analytics/DateRangePicker';
import { normalizeAnalyticsError, fetchAnalytics as requestAnalytics } from '../lib/api/analytics';
import type { AnalyticsData, AnalyticsSegment, DateRange } from '../types/analytics';
import { createEmptyAnalyticsData } from '../utils/analytics';

interface UseAnalyticsOptions {
  timezone?: string;
  customRange?: CustomDateRange | null;
  filters?: {
    country?: string[];
    browser?: string[];
    device?: string[];
    source?: string[];
    page?: string[];
    utmSource?: string[];
    utmMedium?: string[];
    utmCampaign?: string[];
    os?: string[];
    city?: string[];
  };
}

// Ordered cheapest-first: `core` backs the metric tiles and main chart, so
// it resolves well before the breakdown and insight panels and lets the
// top of the dashboard paint instead of waiting on the slowest query.
const SEGMENTS: AnalyticsSegment[] = ['core', 'breakdowns', 'insights'];

export function useAnalytics(projectId: string, dateRange: DateRange, options: UseAnalyticsOptions = {}) {
  // Falling back to a hardcoded 'UTC' here (instead of the browser's own
  // timezone) meant every chart bucket/label was computed in UTC regardless
  // of where the viewer actually is — a visit at 10am IST would land on the
  // "4am" bucket. No caller in this codebase passes `timezone` explicitly,
  // so this default is what every dashboard view actually uses.
  const { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, customRange, filters } = options;

  const queries = useQueries({
    queries: SEGMENTS.map((segment) => ({
      // react-query dedupes/caches by this key — switching between tabs/date
      // ranges the user has already visited in this session renders instantly
      // from cache while a fresh request revalidates in the background,
      // instead of showing a loading spinner on every toggle.
      queryKey: ['analytics', segment, projectId, dateRange, timezone, customRange, filters],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        requestAnalytics('/api/analytics', { projectId, dateRange, timezone, customRange, filters }, signal, segment),
      enabled: Boolean(projectId),
      staleTime: 60_000,
    })),
  });

  const [coreQuery, breakdownQuery, insightQuery] = queries;

  // Each segment returns a full-shaped response with the fields it does not
  // own left empty, so merging in order yields the same object the
  // single-request endpoint produced — panels whose segment is still in
  // flight simply render their empty state. react-query keeps `data`
  // referentially stable between refetches, so this only recomputes when a
  // segment actually resolves.
  const analyticsData = useMemo<AnalyticsData>(
    () => ({
      ...createEmptyAnalyticsData(dateRange),
      ...coreQuery.data,
      ...breakdownQuery.data,
      ...insightQuery.data,
    }),
    [coreQuery.data, breakdownQuery.data, insightQuery.data, dateRange],
  );

  const error = queries.find((q) => q.error)?.error;

  return {
    analyticsData,
    // Only the core segment gates the page-level spinner; the heavier
    // segments fill in behind it rather than blocking first paint.
    loading: coreQuery.isLoading,
    error: error ? normalizeAnalyticsError(error) || null : null,
    retry: () => {
      for (const query of queries) query.refetch();
    },
  };
}
