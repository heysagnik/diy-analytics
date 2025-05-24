import { TimeRange, DateRangeConfig, DATE_RANGES } from '../types';

/**
 * Get date range details for analytics queries
 * Supports timezone conversion and proper boundary calculations
 */
export function getDateRangeDetails(
  dateRangeKey: string, 
  timezone: string = 'UTC'
): { timeRange: TimeRange; config: DateRangeConfig; previousRange: TimeRange } {
  const config = DATE_RANGES[dateRangeKey];
  
  if (!config) {
    throw new Error(`Invalid date range: ${dateRangeKey}`);
  }

  // Validate timezone for safety
  normalizeTimezone(timezone);
  
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now.getTime() - config.duration);

  // For day-based ranges, align to day boundaries
  if (config.granularity === 'day' || config.granularity === 'week' || config.granularity === 'month') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  // Calculate previous period for comparison
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - config.duration);

  return {
    timeRange: { start: startDate, end: endDate },
    config,
    previousRange: { start: previousStartDate, end: previousEndDate }
  };
}

/**
 * Generate time series buckets based on granularity
 */
export function generateTimeBuckets(
  startDate: Date, 
  endDate: Date, 
  granularity: DateRangeConfig['granularity']
): Date[] {
  const buckets: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    buckets.push(new Date(current));

    switch (granularity) {
      case 'minute':
        current.setMinutes(current.getMinutes() + 1);
        break;
      case 'hour':
        current.setHours(current.getHours() + 1);
        break;
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return buckets;
}

/**
 * Generate labels for time series data
 */
export function generateTimeLabels(
  startDate: Date, 
  endDate: Date, 
  granularity: DateRangeConfig['granularity']
): string[] {
  const buckets = generateTimeBuckets(startDate, endDate, granularity);
  
  return buckets.map(date => {
    switch (granularity) {
      case 'minute':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      case 'hour':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit',
          hour12: false 
        });
      case 'day':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case 'week':
        return `Week of ${date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}`;
      case 'month':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
      default:
        return date.toISOString();
    }
  });
}

/**
 * Get MongoDB aggregation date format based on granularity
 */
export function getDateFormat(granularity: DateRangeConfig['granularity']): Record<string, unknown> {
  switch (granularity) {
    case 'minute':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
        minute: { $minute: '$timestamp' }
      };
    case 'hour':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    case 'day':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
    case 'week':
      return {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' }
      };
    case 'month':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * Create date bucket key for grouping
 */
export function createDateBucketKey(
  date: Date, 
  granularity: DateRangeConfig['granularity']
): string {
  switch (granularity) {
    case 'minute':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    case 'hour':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
    case 'day':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    case 'week':
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString();
  }
}

/**
 * Get ISO week number
 */
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

/**
 * Calculate percentage change between current and previous values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number(((current - previous) / previous * 100).toFixed(2));
}

/**
 * Validate and normalize timezone
 */
export function normalizeTimezone(timezone?: string): string {
  if (!timezone) return 'UTC';
  
  try {
    // Test if timezone is valid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    return 'UTC';
  }
}