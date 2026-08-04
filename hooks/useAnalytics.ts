import { useState, useEffect, useCallback, useRef } from "react";
import { AnalyticsData, DateRange } from "../types/analytics";
import { createEmptyAnalyticsData } from "../utils/analytics";
import type { CustomDateRange } from "../components/analytics/DateRangePicker";
import { fetchAnalytics as requestAnalytics, normalizeAnalyticsError } from "../lib/api/analytics";

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
  };
}

export function useAnalytics(
  projectId: string,
  dateRange: DateRange,
  options: UseAnalyticsOptions = {}
) {
  // Falling back to a hardcoded 'UTC' here (instead of the browser's own
  // timezone) meant every chart bucket/label was computed in UTC regardless
  // of where the viewer actually is — a visit at 10am IST would land on the
  // "4am" bucket. No caller in this codebase passes `timezone` explicitly,
  // so this default is what every dashboard view actually uses.
  const { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, customRange, filters } = options;
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(createEmptyAnalyticsData(dateRange));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);

  const fetchAnalytics = useCallback(async (showLoadingState = true) => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    if (showLoadingState) setRefreshing(true);
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;

    try {
      setError(null);
      const data = await requestAnalytics('/api/analytics', { projectId, dateRange, timezone, customRange, filters }, controller.signal);
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const message = normalizeAnalyticsError(err);
      if (message) setError(message);
    } finally {
      if (requestController.current === controller) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [projectId, dateRange, timezone, customRange, filters]);

  useEffect(() => {
    setLoading(true);
    void fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => () => requestController.current?.abort(), []);

  return {
    analyticsData,
    loading,
    refreshing,
    lastUpdated,
    error,
    fetchAnalytics,
    formatLastUpdated: () => lastUpdated.toLocaleTimeString(),
    retry: () => fetchAnalytics(true),
    hasData: analyticsData.uniqueUsers.total > 0 || analyticsData.pageViews.total > 0,
  };
}
