import type {
  AnalyticsResponse,
  AnalyticsSegment,
  DateRange,
  EventPropertyKeyData,
  EventPropertyValueData,
} from '@/types/analytics';
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
  return (
    isRecord(value) &&
    typeof value.total === 'number' &&
    typeof value.change === 'number' &&
    Array.isArray(value.data) &&
    Array.isArray(value.labels) &&
    typeof value.previous === 'number'
  );
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

  return (
    metricKeys.every((key) => isMetricData(value[key])) && collectionKeys.every((key) => Array.isArray(value[key]))
  );
}

/**
 * A segment response carries only the fields it owns, so absent keys are
 * expected; present ones must still be well-formed.
 */
export function isAnalyticsSegmentResponse(value: unknown): value is Partial<AnalyticsResponse> {
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

  return (
    metricKeys.every((key) => value[key] === undefined || isMetricData(value[key])) &&
    collectionKeys.every((key) => value[key] === undefined || Array.isArray(value[key]))
  );
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
  segment?: AnalyticsSegment,
): Promise<AnalyticsResponse> {
  const params = serializeAnalyticsQuery(options);
  if (segment) params.set('segment', segment);
  const response = await fetch(`${endpoint}?${params.toString()}`, {
    cache: 'no-store',
    signal,
  });
  const result: unknown = await response.json().catch(() => null);

  const valid = segment
    ? isAnalyticsSegmentResponse((result as { data?: unknown })?.data)
    : isAnalyticsResponse((result as { data?: unknown })?.data);

  if (!response.ok || !isRecord(result) || result.success !== true || !valid) {
    throw new AnalyticsRequestError(response.status);
  }

  return result.data as AnalyticsResponse;
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

function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A first request right after the database's compute resumes from
 * autosuspend (see docs/database.md) pays a multi-second cold-start
 * penalty and can fail outright rather than just being slow — retrying
 * once or twice with a short backoff lets that resolve itself instead of
 * surfacing a transient infra hiccup as a user-facing error. 5xx and raw
 * network failures (no response at all) are retried; 4xx are not, since
 * those won't succeed on retry.
 */
async function withTransientRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (isAbortError(error)) throw error;
      const status = error instanceof AnalyticsRequestError ? error.status : undefined;
      const retriable = status === undefined || status >= 500;
      if (!retriable || attempt === attempts - 1) throw error;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError;
}

function serializeEventPropertyQuery(options: EventPropertyQueryOptions & { propertyKey?: string }): URLSearchParams {
  const params = serializeAnalyticsQuery(options);
  params.set('eventName', options.eventName);
  if (options.propertyKey) params.set('propertyKey', options.propertyKey);
  return params;
}

function isEventPropertyKeyData(value: unknown): value is EventPropertyKeyData {
  return isRecord(value) && typeof value.key === 'string' && typeof value.occurrences === 'number';
}

function isEventPropertyValueData(value: unknown): value is EventPropertyValueData {
  return (
    isRecord(value) &&
    typeof value.value === 'string' &&
    typeof value.count === 'number' &&
    typeof value.uniqueUsers === 'number'
  );
}

export async function fetchEventPropertyKeys(
  options: EventPropertyQueryOptions,
  signal?: AbortSignal,
): Promise<EventPropertyKeyData[]> {
  return withTransientRetry(async () => {
    const response = await fetch(
      `/api/analytics/events/properties?${serializeEventPropertyQuery(options).toString()}`,
      { cache: 'no-store', signal },
    );
    const result: unknown = await response.json().catch(() => null);

    if (
      !response.ok ||
      !isRecord(result) ||
      result.success !== true ||
      !Array.isArray(result.data) ||
      !result.data.every(isEventPropertyKeyData)
    ) {
      throw new AnalyticsRequestError(response.status);
    }

    return result.data;
  });
}

export async function fetchEventPropertyValues(
  options: EventPropertyQueryOptions & { propertyKey: string },
  signal?: AbortSignal,
): Promise<EventPropertyValueData[]> {
  return withTransientRetry(async () => {
    const response = await fetch(
      `/api/analytics/events/properties?${serializeEventPropertyQuery(options).toString()}`,
      { cache: 'no-store', signal },
    );
    const result: unknown = await response.json().catch(() => null);

    if (
      !response.ok ||
      !isRecord(result) ||
      result.success !== true ||
      !Array.isArray(result.data) ||
      !result.data.every(isEventPropertyValueData)
    ) {
      throw new AnalyticsRequestError(response.status);
    }

    return result.data;
  });
}
