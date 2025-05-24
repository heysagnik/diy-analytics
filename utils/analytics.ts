import type { DateRange, AnalyticsData, MetricData } from "../types/analytics";
import type { AnalyticsResponse } from "../app/api/analytics/types";
import { generateLabels } from "../lib/utils/labelUtils";

// Core utility functions
export const generateDefaultNumericArray = (length: number): number[] => 
  Array(length).fill(0);

export const createEmptyMetricData = (dataLength: number): MetricData => ({
  total: 0,
  change: 0,
  data: generateDefaultNumericArray(dataLength)
});

export const createEmptyAnalyticsData = (dateRange: DateRange): AnalyticsData => {
  const labels = generateLabels(dateRange);
  
  return {
    uniqueUsers: createEmptyMetricData(labels.labels.length),
    pageViews: createEmptyMetricData(labels.labels.length),
    pages: [],
    sources: [],
    usersByCountry: [],
    usersByBrowser: [],
    usersByDevice: [],
    eventAnalytics: {
      topEvents: [],
      recentEvents: []
    },
    labels: labels.labels
  };
};

export const enrichAnalyticsDataWithLabels = (
  analyticsData: Partial<AnalyticsData>, 
  dateRange: DateRange
): AnalyticsData => {
  const labels = generateLabels(dateRange);
  return {
    ...analyticsData,
    labels: labels.labels
  } as AnalyticsData;
};

export const validateAnalyticsData = (data: AnalyticsData): boolean => {
  return !!(
    data &&
    data.uniqueUsers &&
    data.pageViews &&
    Array.isArray(data.labels) &&
    Array.isArray(data.uniqueUsers.data) &&
    Array.isArray(data.pageViews.data)
  );
};

// API adapter function
export const adaptNewToLegacyAnalytics = (newData: AnalyticsResponse): AnalyticsData => {
  return {
    uniqueUsers: {
      total: newData.uniqueUsers.total,
      change: newData.uniqueUsers.change,
      data: newData.uniqueUsers.data
    },
    pageViews: {
      total: newData.pageViews.total,
      change: newData.pageViews.change,
      data: newData.pageViews.data
    },
    pages: newData.pages.map(p => ({
      path: p.path,
      users: p.users,
      views: p.views
    })),
    sources: newData.sources.map(s => ({
      name: s.name,
      users: s.users
    })),
    usersByCountry: newData.countries.map(c => ({
      country: c.country,
      users: c.users
    })),
    usersByBrowser: newData.browsers.map(b => ({
      browser: b.browser,
      users: b.users
    })),
    usersByDevice: newData.devices.map(d => ({
      device: d.device,
      users: d.users
    })),
    eventAnalytics: {
      topEvents: newData.topEvents.map(e => ({
        name: e.name,
        count: e.count
      })),
      recentEvents: newData.recentEvents.map(e => ({
        _id: e._id,
        name: e.name,
        url: e.url,
        path: e.path,
        data: e.data ? JSON.stringify(e.data) : undefined,
        sessionId: e.sessionId,
        timestamp: e.timestamp.toISOString()
      }))
    },
    labels: newData.uniqueUsers.labels
  };
};

// Date range mapping
export const legacyToNewDateRangeMap: Record<string, string> = {
  'Last Hour': 'LAST_HOUR',
  'Last 24 hours': 'LAST_24_HOURS',
  'Last 7 days': 'LAST_7_DAYS',
  'Last 30 days': 'LAST_30_DAYS',
  'Last 6 months': 'LAST_6_MONTHS',
  'Last 12 months': 'LAST_12_MONTHS'
};

// Formatting utilities
export const formatMetricValue = (value: number, type: 'number' | 'percentage' | 'duration' = 'number'): string => {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}m ${seconds}s`;
    default:
      return value.toLocaleString();
  }
};

export const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

// Chart data utilities
export const prepareChartData = (data: number[], labels: string[]) => {
  return {
    labels,
    datasets: [{
      data,
      fill: true,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };
};

// Data validation utilities
export const isValidAnalyticsResponse = (data: any): data is AnalyticsResponse => {
  return !!(
    data &&
    typeof data === 'object' &&
    data.timeRange &&
    data.uniqueUsers &&
    data.pageViews &&
    Array.isArray(data.pages) &&
    Array.isArray(data.sources)
  );
}; 