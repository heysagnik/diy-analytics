import { useState, useEffect, useCallback } from "react";
import { AnalyticsData, DateRange } from "../types/analytics";

const DEFAULT_ANALYTICS_DATA: AnalyticsData = {
  uniqueUsers: { total: 0, change: 0, monthly: [] },
  pageViews: { total: 0, change: 0, monthly: [] },
  pages: [],
  sources: [],
  usersByCountry: [],
  usersByBrowser: [],
  usersByDevice: [],
  months: [],
  events: []
};

export function useAnalytics(projectId: string, dateRange: DateRange) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(DEFAULT_ANALYTICS_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setRefreshing(true);
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics?dateRange=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projectId, dateRange]);
  
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
    fetchAnalytics,
    formatLastUpdated: () => lastUpdated.toLocaleTimeString()
  };
} 