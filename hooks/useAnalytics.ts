import { useState, useEffect, useCallback } from "react";
import { AnalyticsData, DateRange, legacyToNewDateRangeMap } from "../types/analytics";
import { adaptNewToLegacyAnalytics, createEmptyAnalyticsData } from "../utils/analytics";
import type { AnalyticsResponse } from "../app/api/analytics/types";

interface UseAnalyticsOptions {
  timezone?: string;
  filters?: {
    country?: string[];
    browser?: string[];
    device?: string[];
    source?: string[];
  };
}

export function useAnalytics(
  projectId: string, 
  dateRange: DateRange, 
  options: UseAnalyticsOptions = {}
) {
  const { timezone = 'UTC', filters } = options;
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(createEmptyAnalyticsData(dateRange));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (showLoadingState = true) => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setRefreshing(true);
    }
    
    try {
      setError(null);
      
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

      // Adapt new API response to legacy format
      const adaptedData = adaptNewToLegacyAnalytics(result.data as AnalyticsResponse);
      setAnalyticsData(adaptedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics');
    } finally {
      setRefreshing(false);
    }
  }, [projectId, dateRange, timezone, filters]);
  
  // Initial data fetch
  useEffect(() => {
    setLoading(true);
    fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  return {
    analyticsData,
    loading,
    refreshing,
    lastUpdated,
    error,
    fetchAnalytics,
    formatLastUpdated: () => lastUpdated.toLocaleTimeString(),
    retry: () => fetchAnalytics(true),
    hasData: analyticsData.uniqueUsers.total > 0 || analyticsData.pageViews.total > 0
  };
} 