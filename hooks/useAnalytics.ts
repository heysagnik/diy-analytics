import { useQuery } from '@tanstack/react-query';
import type { CustomDateRange } from '../components/analytics/DateRangePicker';
import { normalizeAnalyticsError, fetchAnalytics as requestAnalytics } from '../lib/api/analytics';
import type { AnalyticsData, DateRange } from '../types/analytics';
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

export function useAnalytics(projectId: string, dateRange: DateRange, options: UseAnalyticsOptions = {}) {
  // Falling back to a hardcoded 'UTC' here (instead of the browser's own
  // timezone) meant every chart bucket/label was computed in UTC regardless
  // of where the viewer actually is — a visit at 10am IST would land on the
  // "4am" bucket. No caller in this codebase passes `timezone` explicitly,
  // so this default is what every dashboard view actually uses.
  const { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, customRange, filters } = options;

  const query = useQuery<AnalyticsData, Error>({
    // react-query dedupes/caches by this key — switching between tabs/date
    // ranges the user has already visited in this session renders instantly
    // from cache while a fresh request revalidates in the background,
    // instead of showing a loading spinner on every toggle.
    queryKey: ['analytics', projectId, dateRange, timezone, customRange, filters],
    queryFn: ({ signal }) =>
      requestAnalytics('/api/analytics', { projectId, dateRange, timezone, customRange, filters }, signal),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  return {
    analyticsData: query.data ?? createEmptyAnalyticsData(dateRange),
    loading: query.isLoading,
    error: query.error ? normalizeAnalyticsError(query.error) || null : null,
    retry: () => query.refetch(),
  };
}
