import { useState, useEffect, useCallback } from "react";
import type { AnalyticsResponse, QueryOptions } from "../app/api/analytics/types";
import { legacyToNewDateRangeMap, type DateRange } from "../types/analytics";

interface UseRestAnalyticsProps {
  projectId: string;
  dateRange: DateRange;
  timezone?: string;
  filters?: QueryOptions['filters'];
  skip?: boolean;
}

interface UseRestAnalyticsReturn {
  analyticsData: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRestAnalytics({ 
  projectId, 
  dateRange, 
  timezone = 'UTC',
  filters,
  skip = false 
}: UseRestAnalyticsProps): UseRestAnalyticsReturn {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!projectId || skip) {
      if (skip && !projectId) {
        setAnalyticsData(null);
      }
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
      setLoading(true);

      // Convert legacy date range to new format
      const newDateRange = legacyToNewDateRangeMap[dateRange] || 'LAST_7_DAYS';

      // Build query parameters
      const params = new URLSearchParams({
        projectId,
        dateRange: newDateRange,
        timezone
      });

      // Add filters to query params
      if (filters?.country?.length) {
        params.append('country', filters.country.join(','));
      }
      if (filters?.browser?.length) {
        params.append('browser', filters.browser.join(','));
      }
      if (filters?.device?.length) {
        params.append('device', filters.device.join(','));
      }
      if (filters?.source?.length) {
        params.append('source', filters.source.join(','));
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error fetching analytics data');
      }

      if (result.data) {
        setAnalyticsData(result.data);
      } else {
        setAnalyticsData(null);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching analytics:', err);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, dateRange, timezone, filters, skip]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analyticsData,
    loading,
    error,
    refetch: fetchAnalytics
  };
} 