// Core Analytics Types
export type DateRange = 
  | "Last Hour"
  | "Last 24 hours" 
  | "Last 7 days"
  | "Last 30 days"
  | "Last 6 months"
  | "Last 12 months";

export interface MetricData {
  total: number;
  change: number;
  data: number[];
}

export interface PageData {
  path: string;
  users: number;
  views: number;
}

export interface SourceData {
  name: string;
  users: number;
}

export interface CountryData {
  country: string;
  users: number;
}

export interface BrowserData {
  browser: string;
  users: number;
}

export interface DeviceData {
  device: string;
  users: number;
}

export interface Event {
  _id: string;
  name: string;
  url: string;
  path: string;
  data?: string;
  sessionId: string;
  timestamp: string;
}

export interface TopEvent {
  name: string;
  count: number;
}

export interface EventAnalytics {
  topEvents: TopEvent[];
  recentEvents: Event[];
}

export interface Project {
  _id: string;
  name: string;
  url: string;
  domain?: string;
  publicMode?: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  uniqueUsers: MetricData;
  pageViews: MetricData;
  pages: PageData[];
  sources: SourceData[];
  usersByCountry: CountryData[];
  usersByBrowser: BrowserData[];
  usersByDevice: DeviceData[];
  eventAnalytics: EventAnalytics;
  labels: string[];
}

// Re-export new API types
export * from '../app/api/analytics/types';

// Date range mapping for API compatibility
export const legacyToNewDateRangeMap: Record<string, string> = {
  'Last Hour': 'LAST_HOUR',
  'Last 24 hours': 'LAST_24_HOURS',
  'Last 7 days': 'LAST_7_DAYS',
  'Last 30 days': 'LAST_30_DAYS',
  'Last 6 months': 'LAST_6_MONTHS',
  'Last 12 months': 'LAST_12_MONTHS'
};