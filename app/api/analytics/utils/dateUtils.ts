import { TimeRange, DateRangeConfig, DATE_RANGES } from '../types';

export function getDateRangeDetails(
  dateRangeKey: string, 
  timezone: string = 'UTC'
): { timeRange: TimeRange; config: DateRangeConfig; previousRange: TimeRange } {
  const config = DATE_RANGES[dateRangeKey];
  
  if (!config) {
    throw new Error(`Invalid date range: ${dateRangeKey}`);
  }

  validateTimezone(timezone);
  
  const now = new Date();
  const timeRange = createTimeRange(now, config);
  const previousRange = createPreviousTimeRange(timeRange.start, config);

  return { timeRange, config, previousRange };
}

export function generateTimeBuckets(
  startDate: Date, 
  endDate: Date, 
  granularity: DateRangeConfig['granularity']
): Date[] {
  const buckets: Date[] = [];
  const current = new Date(startDate);

  const incrementors = {
    minute: () => current.setMinutes(current.getMinutes() + 1),
    hour: () => current.setHours(current.getHours() + 1),
    day: () => current.setDate(current.getDate() + 1),
    week: () => current.setDate(current.getDate() + 7),
    month: () => current.setMonth(current.getMonth() + 1)
  };

  const increment = incrementors[granularity];
  if (!increment) {
    throw new Error(`Unsupported granularity: ${granularity}`);
  }

  while (current <= endDate) {
    buckets.push(new Date(current));
    increment();
  }

  return buckets;
}

export function generateTimeLabels(
  startDate: Date, 
  endDate: Date, 
  granularity: DateRangeConfig['granularity']
): string[] {
  const buckets = generateTimeBuckets(startDate, endDate, granularity);
  const formatters = createLabelFormatters();
  
  return buckets.map(formatters[granularity] || formatters.default);
}

export function getDateFormat(granularity: DateRangeConfig['granularity']): Record<string, unknown> {
  const baseFields = {
    year: { $year: '$timestamp' },
    month: { $month: '$timestamp' },
    day: { $dayOfMonth: '$timestamp' },
    hour: { $hour: '$timestamp' },
    minute: { $minute: '$timestamp' }
  };

  const formatMappings = {
    minute: ['year', 'month', 'day', 'hour', 'minute'],
    hour: ['year', 'month', 'day', 'hour'],
    day: ['year', 'month', 'day'],
    week: ['year'],
    month: ['year', 'month']
  };

  const fields = formatMappings[granularity];
  if (!fields) {
    throw new Error(`Unsupported granularity: ${granularity}`);
  }

  const result: Record<string, unknown> = {};
  fields.forEach(field => {
    result[field] = baseFields[field as keyof typeof baseFields];
  });

  if (granularity === 'week') {
    result.week = { $week: '$timestamp' };
  }

  return result;
}

export function createDateBucketKey(
  date: Date, 
  granularity: DateRangeConfig['granularity']
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  const keyGenerators = {
    minute: () => `${year}-${month}-${day}T${hour}:${minute}`,
    hour: () => `${year}-${month}-${day}T${hour}`,
    day: () => `${year}-${month}-${day}`,
    week: () => `${year}-W${String(getWeekNumber(date)).padStart(2, '0')}`,
    month: () => `${year}-${month}`,
    default: () => date.toISOString()
  };

  return (keyGenerators[granularity] || keyGenerators.default)();
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number(((current - previous) / previous * 100).toFixed(2));
}

export function normalizeTimezone(timezone?: string): string {
  if (!timezone) return 'UTC';
  
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    return 'UTC';
  }
}

function createTimeRange(now: Date, config: DateRangeConfig): TimeRange {
  const endDate = new Date(now);
  const startDate = new Date(now.getTime() - config.duration);

  if (shouldAlignToDayBoundaries(config.granularity)) {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  return { start: startDate, end: endDate };
}

function createPreviousTimeRange(currentStart: Date, config: DateRangeConfig): TimeRange {
  const end = new Date(currentStart.getTime() - 1);
  const start = new Date(end.getTime() - config.duration);
  
  return { start, end };
}

function shouldAlignToDayBoundaries(granularity: DateRangeConfig['granularity']): boolean {
  return ['day', 'week', 'month'].includes(granularity);
}

function createLabelFormatters() {
  return {
    minute: (date: Date) => date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    hour: (date: Date) => date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      hour12: false 
    }),
    day: (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    week: (date: Date) => `Week of ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`,
    month: (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    }),
    default: (date: Date) => date.toISOString()
  };
}

function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function validateTimezone(timezone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}