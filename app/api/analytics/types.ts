export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DateRangeConfig {
  key: string;
  label: string;
  duration: number; // milliseconds
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  dataPoints: number;
}

export const DATE_RANGES: Record<string, DateRangeConfig> = {
  'LAST_HOUR': {
    key: 'LAST_HOUR',
    label: 'Last Hour',
    duration: 60 * 60 * 1000, // 1 hour
    granularity: 'minute',
    dataPoints: 60
  },
  'LAST_24_HOURS': {
    key: 'LAST_24_HOURS',
    label: 'Last 24 Hours',
    duration: 24 * 60 * 60 * 1000, // 24 hours
    granularity: 'hour',
    dataPoints: 24
  },
  'LAST_7_DAYS': {
    key: 'LAST_7_DAYS',
    label: 'Last 7 Days',
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    granularity: 'day',
    dataPoints: 7
  },
  'LAST_30_DAYS': {
    key: 'LAST_30_DAYS',
    label: 'Last 30 Days',
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days
    granularity: 'day',
    dataPoints: 30
  },
  'LAST_6_MONTHS': {
    key: 'LAST_6_MONTHS',
    label: 'Last 6 Months',
    duration: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months (approx)
    granularity: 'week',
    dataPoints: 26
  },
  'LAST_12_MONTHS': {
    key: 'LAST_12_MONTHS',
    label: 'Last 12 Months',
    duration: 12 * 30 * 24 * 60 * 60 * 1000, // 12 months (approx)
    granularity: 'month',
    dataPoints: 12
  },
  // All-time — used by the CSV export, which has no UI date picker of its
  // own. 5 years comfortably covers any self-hosted deployment's history.
  'ALL_TIME': {
    key: 'ALL_TIME',
    label: 'All Time',
    duration: 5 * 365 * 24 * 60 * 60 * 1000,
    granularity: 'month',
    dataPoints: 60
  },
  // Custom range — actual window comes from startDate/endDate on the request.
  'CUSTOM': {
    key: 'CUSTOM',
    label: 'Custom Range',
    duration: 30 * 24 * 60 * 60 * 1000,
    granularity: 'day',
    dataPoints: 30
  }
};

export interface MetricData {
  total: number;
  change: number;
  data: number[];
  labels: string[];
  previous: number;
}

export interface PageData {
  path: string;
  users: number;
  views: number;
  bounceRate?: number;
  avgTimeOnPage?: number;
}

export interface SourceData {
  name: string;
  users: number;
  sessions: number;
  conversion?: number;
}

export interface CampaignData {
  name: string;
  users: number;
  sessions: number;
}

export interface GoalConversionData {
  goalId: string;
  name: string;
  type: 'page' | 'event';
  conversions: number;
  totalSessions: number;
  rate: number;
}

export interface WebVitalData {
  metric: 'LCP' | 'CLS' | 'INP';
  p75: number;
  samples: number;
}

export interface CountryData {
  country: string;
  countryCode: string;
  users: number;
  sessions: number;
}

export interface BrowserData {
  browser: string;
  version?: string;
  users: number;
  sessions: number;
}

export interface DeviceData {
  device: string;
  category: 'desktop' | 'mobile' | 'tablet';
  users: number;
  sessions: number;
}

export interface EventData {
  name: string;
  count: number;
  uniqueUsers: number;
  avgValue?: number;
}

export type EventDataValue = string | number | boolean | null | undefined;
export type EventDataRecord = Record<string, EventDataValue | EventDataValue[] | Record<string, EventDataValue>>;

export interface RecentEvent {
  _id: string;
  name: string;
  url: string;
  path: string;
  data?: EventDataRecord;
  sessionId: string;
  // ISO 8601 string — JSON has no Date type, and the API serializes with
  // JSON.stringify, so consumers receive a string over the wire.
  timestamp: string;
  country?: string;
  browser?: string;
  device?: string;
}

export interface AnalyticsResponse {
  timeRange: TimeRange;
  granularity: GranularityType;
  uniqueUsers: MetricData;
  pageViews: MetricData;
  sessions: MetricData;
  bounceRate: MetricData;
  avgSessionDuration: MetricData;
  pages: PageData[];
  sources: SourceData[];
  countries: CountryData[];
  browsers: BrowserData[];
  devices: DeviceData[];
  campaigns: CampaignData[];
  entryPages: PageData[];
  exitPages: PageData[];
  goals: GoalConversionData[];
  webVitals: WebVitalData[];
  topEvents: EventData[];
  recentEvents: RecentEvent[];
}

export interface QueryOptions {
  projectId: string;
  dateRange: string;
  timezone?: string;
  // Optional custom absolute range. When both are present, the selected
  // preset's `dateRange` is only used to choose granularity; the actual
  // window is overridden by these dates.
  startDate?: string;
  endDate?: string;
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

export interface RealtimeVisitor {
  sessionId: string;
  path: string;
  country?: string;
  lastActiveAt: string;
}

export interface RealtimeResponse {
  count: number;
  visitors: RealtimeVisitor[];
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export type MetricKey = 'uniqueUsers' | 'pageViews' | 'sessions' | 'bounceRate' | 'avgSessionDuration';
export type DeviceCategory = 'desktop' | 'mobile' | 'tablet';
export type GranularityType = 'minute' | 'hour' | 'day' | 'week' | 'month';
