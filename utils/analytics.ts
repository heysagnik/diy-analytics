import type { DateRange, AnalyticsData, MetricData } from "../types/analytics";
import { generateLabels } from "../lib/utils/labelUtils";

const generateDefaultNumericArray = (length: number): number[] =>
  Array(length).fill(0);

export const createEmptyMetricData = (labels: string[]): MetricData => ({
  total: 0,
  change: 0,
  data: generateDefaultNumericArray(labels.length),
  labels,
  previous: 0,
});

export const createEmptyAnalyticsData = (dateRange: DateRange): AnalyticsData => {
  const labels = generateLabels(dateRange);

  return {
    uniqueUsers: createEmptyMetricData(labels.labels),
    pageViews: createEmptyMetricData(labels.labels),
    sessions: createEmptyMetricData(labels.labels),
    bounceRate: createEmptyMetricData([]),
    avgSessionDuration: createEmptyMetricData([]),
    pages: [],
    sources: [],
    campaigns: [],
    entryPages: [],
    exitPages: [],
    goals: [],
    webVitals: [],
    countries: [],
    browsers: [],
    devices: [],
    topEvents: [],
    recentEvents: []
  };
};

export const validateAnalyticsData = (data: AnalyticsData): boolean => {
  return !!(
    data &&
    data.uniqueUsers &&
    data.pageViews &&
    Array.isArray(data.uniqueUsers.labels) &&
    Array.isArray(data.uniqueUsers.data) &&
    Array.isArray(data.pageViews.data)
  );
};
