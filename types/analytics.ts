// ====================================================================
// Client-facing analytics types — canonical source for the frontend.
// Server-side analytics implementation types live in
// app/api/analytics/types.ts; only the few needed here are imported, and
// `AnalyticsResponse`/`TimeRange` are re-declared below rather than
// re-exported as-is, because the server types use `Date` for
// `timeRange.start`/`end` while the actual wire format (this API
// serializes with JSON.stringify, which has no Date type) is ISO strings.
// Typing the client response as `Date` let code call Date methods on a
// value that's actually a string at runtime.
// ====================================================================

import type { AnalyticsResponse as ServerAnalyticsResponse } from '../app/api/analytics/types';

export type { AnalyticsSegment } from '../app/api/analytics/types';

export { WEB_VITAL_BREAKDOWN_DIMENSIONS } from '../app/api/analytics/types';

export interface TimeRange {
  start: string;
  end: string;
}

export type AnalyticsResponse = Omit<ServerAnalyticsResponse, 'timeRange'> & {
  timeRange: TimeRange;
};

export type DateRange =
  | 'Last Hour'
  | 'Last 24 hours'
  | 'Last 7 days'
  | 'Last 30 days'
  | 'Last 6 months'
  | 'Last 12 months'
  | 'All Time';

export type {
  BrowserData,
  CampaignData,
  CityData,
  CountryData,
  DeviceData,
  EventData,
  EventPropertyKeyData,
  EventPropertyValueData,
  GoalConversionData,
  GranularityType as Granularity,
  MetricData,
  OSData,
  PageData,
  RecentEvent,
  ResourceTimingData,
  SourceData,
  UtmBreakdownData,
  WebVitalBreakdown,
  WebVitalBreakdownItem,
  WebVitalData,
  WebVitalDimension,
} from '../app/api/analytics/types';

export type AnalyticsData = Omit<AnalyticsResponse, 'timeRange'>;

// --------------------------------------------------------------------
// Canonical Project type — the single source of truth used across the
// frontend and the REST API client.
// --------------------------------------------------------------------
export interface Project {
  _id: string;
  name: string;
  url: string;
  domain?: string;
  additionalDomains?: string[];
  trackingCode: string;
  publicMode?: boolean;
  timezone?: string | null;
  excludedIPs?: string[];
  excludedPaths?: string[];
  createdAt: string;
  analytics?: ProjectAnalytics;
}

interface ProjectAnalytics {
  views: number;
  users: number;
  growth: string;
}

export interface NewProjectData {
  name: string;
  url: string;
}
