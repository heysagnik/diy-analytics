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

// Define specific types for event data
export type EventDataValue = string | number | boolean | null | undefined;
export type EventDataRecord = Record<string, EventDataValue | EventDataValue[] | Record<string, EventDataValue>>;

export interface RecentEvent {
  _id: string;
  name: string;
  url: string;
  path: string;
  data?: EventDataRecord;
  sessionId: string;
  timestamp: Date;
  country?: string;
  browser?: string;
  device?: string;
}

export interface AnalyticsResponse {
  timeRange: TimeRange;
  granularity: string;
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
  topEvents: EventData[];
  recentEvents: RecentEvent[];
}

export interface QueryOptions {
  projectId: string;
  dateRange: string;
  timezone?: string;
  filters?: {
    country?: string[];
    browser?: string[];
    device?: string[];
    source?: string[];
  };
}

// Define specific types for MongoDB aggregation pipelines
export interface MongoMatchCondition {
  [key: string]: string | number | boolean | Date | RegExp | {
    $in?: (string | number)[];
    $nin?: (string | number)[];
    $gt?: string | number | Date;
    $gte?: string | number | Date;
    $lt?: string | number | Date;
    $lte?: string | number | Date;
    $exists?: boolean;
    $regex?: string | RegExp;
    $options?: string;
    $ne?: string | number | boolean | Date;
    $or?: MongoMatchCondition[];
    $and?: MongoMatchCondition[];
  };
}

export interface MongoGroupStage {
  _id: string | Record<string, string | number | {
    $dateToString?: {
      format: string;
      date: string;
      timezone?: string;
    };
    $year?: string;
    $month?: string;
    $dayOfMonth?: string;
    $hour?: string;
    $minute?: string;
  }> | null;
  [key: string]: {
    $sum?: number | string;
    $avg?: string;
    $count?: Record<string, never>;
    $addToSet?: string;
    $first?: string;
    $last?: string;
    $max?: string;
    $min?: string;
    $push?: string | Record<string, string>;
  } | string | Record<string, unknown> | null;
}

export interface MongoSortStage {
  [key: string]: 1 | -1;
}

export interface AggregationPipeline {
  match: MongoMatchCondition;
  group: MongoGroupStage;
  sort?: MongoSortStage;
  limit?: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Additional utility types for better type safety
export type MetricKey = 'uniqueUsers' | 'pageViews' | 'sessions' | 'bounceRate' | 'avgSessionDuration';
export type DeviceCategory = 'desktop' | 'mobile' | 'tablet';
export type GranularityType = 'minute' | 'hour' | 'day' | 'week' | 'month';

// Helper type for aggregation results
export interface AggregationResult {
  _id: string | Record<string, unknown> | null;
  count?: number;
  sum?: number;
  avg?: number;
  users?: number;
  sessions?: number;
  value?: number;
  date?: string;
  [key: string]: unknown;
}

// Type for database query filters
export interface DatabaseFilters {
  projectId: string;
  timestamp: {
    $gte: Date;
    $lte: Date;
  };
  country?: { $in: string[] };
  browser?: { $in: string[] };
  device?: { $in: string[] };
  utmSource?: { $in: string[] };
}