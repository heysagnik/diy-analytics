import type { AnalyticsResponse, DateRange, EventPropertyKeyData, EventPropertyValueData } from '@/types/analytics';
import type { FilterDimension } from '@/types/filters';

export type AnalyticsFilters = Partial<Record<FilterDimension, string[]>>;

export interface AnalyticsQueryOptions {
  projectId: string;
  dateRange: DateRange;
  timezone?: string;
  customRange?: {
    startDate: string;
    endDate: string;
  } | null;
  filters?: AnalyticsFilters;
}

const DATE_RANGE_MAP: Record<DateRange, string> = {
  'Last Hour': 'LAST_HOUR',
  'Last 24 hours': 'LAST_24_HOURS',
  'Last 7 days': 'LAST_7_DAYS',
  'Last 30 days': 'LAST_30_DAYS',
  'Last 6 months': 'LAST_6_MONTHS',
  'Last 12 months': 'LAST_12_MONTHS',
  'All Time': 'ALL_TIME',
};

export const DATE_RANGE_OPTIONS = Object.keys(DATE_RANGE_MAP) as DateRange[];

export function isDateRange(value: unknown): value is DateRange {
  return typeof value === 'string' && DATE_RANGE_OPTIONS.includes(value as DateRange);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMetricData(value: unknown): boolean {
  return isRecord(value)
    && typeof value.total === 'number'
    && typeof value.change === 'number'
    && Array.isArray(value.data)
    && Array.isArray(value.labels)
    && typeof value.previous === 'number';
}

export function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  if (!isRecord(value) || !isRecord(value.timeRange) || typeof value.granularity !== 'string') return false;

  const metricKeys = ['uniqueUsers', 'pageViews', 'sessions', 'bounceRate', 'avgSessionDuration'] as const;
  const collectionKeys = [
    'pages',
    'sources',
    'countries',
    'browsers',
    'devices',
    'os',
    'cities',
    'campaigns',
    'utmBreakdown',
    'entryPages',
    'exitPages',
    'goals',
    'webVitals',
    'topEvents',
    'recentEvents',
  ] as const;

  return metricKeys.every((key) => isMetricData(value[key]))
    && collectionKeys.every((key) => Array.isArray(value[key]));
}

export function serializeAnalyticsQuery({
  projectId,
  dateRange,
  timezone,
  customRange,
  filters,
}: AnalyticsQueryOptions): URLSearchParams {
  const params = new URLSearchParams({
    projectId,
    dateRange: customRange ? 'CUSTOM' : DATE_RANGE_MAP[dateRange],
  });

  if (timezone) params.set('timezone', timezone);
  if (customRange) {
    params.set('startDate', customRange.startDate);
    params.set('endDate', customRange.endDate);
  }
  Object.entries(filters ?? {}).forEach(([dimension, values]) => {
    if (values?.length) params.set(dimension, values.join(','));
  });

  return params;
}

export function normalizeAnalyticsError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '';
  }
  if (error instanceof Error && error.name === 'AbortError') return '';
  if (error instanceof AnalyticsRequestError && error.status === 403) {
    return 'This analytics dashboard is not available.';
  }
  if (error instanceof AnalyticsRequestError && error.status === 404) {
    return 'The analytics project could not be found.';
  }
  return 'Unable to load analytics right now. Please try again.';
}

export class AnalyticsRequestError extends Error {
  constructor(public readonly status: number) {
    super('Analytics request failed');
    this.name = 'AnalyticsRequestError';
  }
}

export async function fetchAnalytics(
  endpoint: '/api/analytics' | '/api/public/analytics',
  options: AnalyticsQueryOptions,
  signal?: AbortSignal,
): Promise<AnalyticsResponse> {
  const response = await fetch(`${endpoint}?${serializeAnalyticsQuery(options).toString()}`, {
    cache: 'no-store',
    signal,
  });
  const result: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(result) || result.success !== true || !isAnalyticsResponse(result.data)) {
    throw new AnalyticsRequestError(response.status);
  }

  return result.data;
}

export interface EventPropertyQueryOptions {
  projectId: string;
  eventName: string;
  dateRange: DateRange;
  timezone?: string;
  customRange?: {
    startDate: string;
    endDate: string;
  } | null;
  filters?: AnalyticsFilters;
}

function serializeEventPropertyQuery(
  options: EventPropertyQueryOptions & { propertyKey?: string }
): URLSearchParams {
  const params = serializeAnalyticsQuery(options);
  params.set('eventName', options.eventName);
  if (options.propertyKey) params.set('propertyKey', options.propertyKey);
  return params;
}

function isEventPropertyKeyData(value: unknown): value is EventPropertyKeyData {
  return isRecord(value) && typeof value.key === 'string' && typeof value.occurrences === 'number';
}

function isEventPropertyValueData(value: unknown): value is EventPropertyValueData {
  return isRecord(value) && typeof value.value === 'string' && typeof value.count === 'number' && typeof value.uniqueUsers === 'number';
}

export async function fetchEventPropertyKeys(
  options: EventPropertyQueryOptions,
  signal?: AbortSignal,
): Promise<EventPropertyKeyData[]> {
  const response = await fetch(`/api/analytics/events/properties?${serializeEventPropertyQuery(options).toString()}`, {
    cache: 'no-store',
    signal,
  });
  const result: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(result) || result.success !== true || !Array.isArray(result.data) || !result.data.every(isEventPropertyKeyData)) {
    throw new AnalyticsRequestError(response.status);
  }

  return result.data;
}

export async function fetchEventPropertyValues(
  options: EventPropertyQueryOptions & { propertyKey: string },
  signal?: AbortSignal,
): Promise<EventPropertyValueData[]> {
  const response = await fetch(`/api/analytics/events/properties?${serializeEventPropertyQuery(options).toString()}`, {
    cache: 'no-store',
    signal,
  });
  const result: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(result) || result.success !== true || !Array.isArray(result.data) || !result.data.every(isEventPropertyValueData)) {
    throw new AnalyticsRequestError(response.status);
  }

  return result.data;
}
