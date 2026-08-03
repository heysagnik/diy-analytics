import { TimeRange, DateRangeConfig, DATE_RANGES } from '../types';

type Granularity = DateRangeConfig['granularity'];

interface ZonedParts {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Reads the wall-clock date/time that `date` corresponds to inside
 * `timeZone`. This is the building block every timezone-aware helper below
 * uses instead of the server's local Date methods.
 */
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/** Offset (ms) such that localInstant = utcInstant + offset, for `timeZone` at `date`. */
function getZonedOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

/**
 * Converts wall-clock components (as seen in `timeZone`) back to the
 * corresponding UTC instant. Field overflow (e.g. day: 32, month: 13) is
 * handled by JS's own Date.UTC normalization, which lets callers do
 * calendar arithmetic by just adding to a field.
 */
function zonedPartsToUtc(parts: ZonedParts, timeZone: string): Date {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = getZonedOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMs);
}

function startOfDayInTz(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedPartsToUtc({ ...p, hour: 0, minute: 0, second: 0 }, timeZone);
}

function addCalendarDaysInTz(date: Date, days: number, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedPartsToUtc({ ...p, day: p.day + days }, timeZone);
}

function addCalendarMonthsInTz(date: Date, months: number, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedPartsToUtc({ ...p, month: p.month + months }, timeZone);
}

export function getDateRangeDetails(
  dateRangeKey: string,
  timezone: string = 'UTC'
): { timeRange: TimeRange; config: DateRangeConfig; previousRange: TimeRange } {
  const config = DATE_RANGES[dateRangeKey];

  if (!config) {
    throw new Error(`Invalid date range: ${dateRangeKey}`);
  }

  const tz = normalizeTimezone(timezone);
  const now = new Date();
  const timeRange = createTimeRange(now, config, tz);
  const previousRange = createPreviousTimeRange(timeRange, config, tz);

  return { timeRange, config, previousRange };
}

/**
 * Generates exactly `config.dataPoints` bucket start-instants, aligned to
 * calendar boundaries in `timezone` for day/week/month granularity. Using a
 * fixed count (rather than iterating while `current <= endDate`) guarantees
 * the series length always matches `dataPoints`/labels, regardless of DST
 * shifts or variable month lengths.
 */
export function generateTimeBuckets(
  startDate: Date,
  dataPoints: number,
  granularity: Granularity,
  timezone: string = 'UTC'
): Date[] {
  const tz = normalizeTimezone(timezone);
  const buckets: Date[] = [];

  for (let i = 0; i < dataPoints; i++) {
    buckets.push(advanceBucket(startDate, i, granularity, tz));
  }

  return buckets;
}

function advanceBucket(start: Date, index: number, granularity: Granularity, timezone: string): Date {
  return addPeriods(start, index, granularity, timezone);
}

/**
 * Adds `count` periods of `granularity` to `date`, respecting calendar
 * boundaries in `timezone` for day/week/month. Exported so callers that
 * need to know a bucket's end (e.g. matching a raw timestamp to its
 * bucket) use the exact same arithmetic as bucket generation.
 */
export function addPeriods(date: Date, count: number, granularity: Granularity, timezone: string = 'UTC'): Date {
  const tz = normalizeTimezone(timezone);
  switch (granularity) {
    case 'minute':
      return new Date(date.getTime() + count * 60 * 1000);
    case 'hour':
      return new Date(date.getTime() + count * 60 * 60 * 1000);
    case 'day':
      return addCalendarDaysInTz(date, count, tz);
    case 'week':
      return addCalendarDaysInTz(date, count * 7, tz);
    case 'month':
      return addCalendarMonthsInTz(date, count, tz);
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

export function generateTimeLabels(
  startDate: Date,
  dataPoints: number,
  granularity: Granularity,
  timezone: string = 'UTC'
): string[] {
  const tz = normalizeTimezone(timezone);
  const buckets = generateTimeBuckets(startDate, dataPoints, granularity, tz);
  const formatters = createLabelFormatters(tz);

  return buckets.map(formatters[granularity] || formatters.default);
}

export function createDateBucketKey(
  date: Date,
  granularity: Granularity,
  timezone: string = 'UTC'
): string {
  const tz = normalizeTimezone(timezone);
  const p = getZonedParts(date, tz);
  const year = p.year;
  const month = String(p.month).padStart(2, '0');
  const day = String(p.day).padStart(2, '0');
  const hour = String(p.hour).padStart(2, '0');
  const minute = String(p.minute).padStart(2, '0');

  switch (granularity) {
    case 'minute': return `${year}-${month}-${day}T${hour}:${minute}`;
    case 'hour': return `${year}-${month}-${day}T${hour}`;
    case 'day': return `${year}-${month}-${day}`;
    case 'week': return `${year}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
    case 'month': return `${year}-${month}`;
    default: return date.toISOString();
  }
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

/**
 * Builds the current window for a preset. For sub-day granularities
 * (minute/hour) this is a plain rolling window ending now. For day/week/
 * month granularities it is `dataPoints` full calendar periods, aligned to
 * `timezone`, ending at the close of the current period — e.g. LAST_7_DAYS
 * is exactly the 7 calendar dates from 6 days ago through today, never 8.
 */
function createTimeRange(now: Date, config: DateRangeConfig, timezone: string): TimeRange {
  if (!shouldAlignToDayBoundaries(config.granularity)) {
    return { start: new Date(now.getTime() - config.duration), end: now };
  }

  const periodStart = periodStartFor(now, config.granularity, timezone);
  const start = rewindPeriods(periodStart, config.dataPoints - 1, config.granularity, timezone);
  const end = new Date(nextPeriodStart(periodStart, config.granularity, timezone).getTime() - 1);

  return { start, end };
}

function createPreviousTimeRange(current: TimeRange, config: DateRangeConfig, timezone: string): TimeRange {
  if (!shouldAlignToDayBoundaries(config.granularity)) {
    const spanMs = current.end.getTime() - current.start.getTime();
    return {
      start: new Date(current.start.getTime() - spanMs - 1),
      end: new Date(current.start.getTime() - 1)
    };
  }

  const previousPeriodEndExclusive = current.start;
  const end = new Date(previousPeriodEndExclusive.getTime() - 1);
  const start = rewindPeriods(previousPeriodEndExclusive, config.dataPoints, config.granularity, timezone);

  return { start, end };
}

/**
 * Start-of-period instant containing `date`, in `timezone` — start of day
 * for day/week granularity, start of month for month granularity. Exported
 * so callers that need a real (data-driven, not fixed-lookback) range —
 * e.g. ALL_TIME anchored to a project's actual creation/first-data date —
 * can align to the same calendar boundaries as everything else.
 */
export function periodStartFor(date: Date, granularity: Granularity, timezone: string = 'UTC'): Date {
  const tz = normalizeTimezone(timezone);
  if (granularity === 'week' || granularity === 'day') {
    return startOfDayInTz(date, tz);
  }
  // month
  const p = getZonedParts(date, tz);
  return zonedPartsToUtc({ ...p, day: 1, hour: 0, minute: 0, second: 0 }, tz);
}

function nextPeriodStart(periodStart: Date, granularity: Granularity, timezone: string): Date {
  switch (granularity) {
    case 'day': return addCalendarDaysInTz(periodStart, 1, timezone);
    case 'week': return addCalendarDaysInTz(periodStart, 1, timezone);
    case 'month': return addCalendarMonthsInTz(periodStart, 1, timezone);
    default: return periodStart;
  }
}

function rewindPeriods(from: Date, count: number, granularity: Granularity, timezone: string): Date {
  switch (granularity) {
    case 'day': return addCalendarDaysInTz(from, -count, timezone);
    case 'week': return addCalendarDaysInTz(from, -count * 7, timezone);
    case 'month': return addCalendarMonthsInTz(from, -count, timezone);
    default: return from;
  }
}

function shouldAlignToDayBoundaries(granularity: Granularity): boolean {
  return ['day', 'week', 'month'].includes(granularity);
}

function createLabelFormatters(timezone: string) {
  return {
    minute: (date: Date) => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    }),
    hour: (date: Date) => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone
    }),
    day: (date: Date) => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    }),
    week: (date: Date) => `Week of ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    })}`,
    month: (date: Date) => date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: timezone
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
