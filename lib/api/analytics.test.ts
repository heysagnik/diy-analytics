import type { AnalyticsResponse } from '@/types/analytics';
import type { AnalyticsQueryOptions } from './analytics';
import {
  AnalyticsRequestError,
  DATE_RANGE_OPTIONS,
  fetchAnalytics,
  isAnalyticsResponse,
  isDateRange,
  normalizeAnalyticsError,
  serializeAnalyticsQuery,
} from './analytics';

const options: AnalyticsQueryOptions = {
  projectId: 'project 1',
  dateRange: 'Last 7 days',
  timezone: 'America/New_York',
  filters: { country: ['US', 'CA'], page: ['/home'] },
};

const metric = { total: 10, change: 1, data: [10], labels: ['today'], previous: 9 };
const analyticsResponse: AnalyticsResponse = {
  timeRange: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-02T00:00:00.000Z' },
  granularity: 'day',
  uniqueUsers: metric,
  pageViews: metric,
  sessions: metric,
  bounceRate: metric,
  avgSessionDuration: metric,
  pages: [],
  sources: [],
  countries: [],
  browsers: [],
  devices: [],
  os: [],
  cities: [],
  campaigns: [],
  utmBreakdown: [],
  entryPages: [],
  exitPages: [],
  goals: [],
  webVitals: [],
  topEvents: [],
  recentEvents: [],
};

const response = (body: unknown, init: { status?: number; statusText?: string } = {}) => ({
  ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
  status: init.status ?? 200,
  statusText: init.statusText ?? '',
  json: async () => body,
});

describe('analytics API utilities', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('validates supported date ranges', () => {
    expect(DATE_RANGE_OPTIONS).toHaveLength(7);
    expect(isDateRange('Last 30 days')).toBe(true);
    expect(isDateRange('LAST_30_DAYS')).toBe(false);
    expect(isDateRange(null)).toBe(false);
  });

  it('serializes preset, timezone, filters, and custom range queries', () => {
    expect(serializeAnalyticsQuery(options).toString()).toBe(
      'projectId=project+1&dateRange=LAST_7_DAYS&timezone=America%2FNew_York&country=US%2CCA&page=%2Fhome',
    );
    expect(
      serializeAnalyticsQuery({
        ...options,
        customRange: { startDate: '2026-01-01', endDate: '2026-01-15' },
      }).toString(),
    ).toContain('dateRange=CUSTOM');
  });

  it('accepts a structurally valid analytics response', () => {
    expect(isAnalyticsResponse(analyticsResponse)).toBe(true);
    expect(isAnalyticsResponse({ ...analyticsResponse, pageViews: { total: 1 } })).toBe(false);
  });

  it('fetches analytics and serializes the request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({ success: true, data: analyticsResponse }));

    await expect(fetchAnalytics('/api/analytics', options)).resolves.toBe(analyticsResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics?projectId=project+1&dateRange=LAST_7_DAYS&timezone=America%2FNew_York&country=US%2CCA&page=%2Fhome',
      { cache: 'no-store', signal: undefined },
    );
  });

  it.each([
    [403, 'This analytics dashboard is not available.'],
    [404, 'The analytics project could not be found.'],
    [500, 'Unable to load analytics right now. Please try again.'],
  ])('normalizes non-OK response status %p', async (status, message) => {
    (global.fetch as jest.Mock).mockResolvedValue(response({ error: 'failed' }, { status }));
    const error = await fetchAnalytics('/api/analytics', options).catch((value) => value);
    expect(error).toBeInstanceOf(AnalyticsRequestError);
    expect(normalizeAnalyticsError(error)).toBe(message);
  });

  it('rejects successful responses with invalid payloads and hides abort errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({ success: true, data: {} }));
    await expect(fetchAnalytics('/api/analytics', options)).rejects.toMatchObject({ status: 200 });
    expect(normalizeAnalyticsError(new DOMException('aborted', 'AbortError'))).toBe('');
  });
});
