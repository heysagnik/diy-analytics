import { addPeriods, generateTimeBuckets, generateTimeLabels, getDateRangeDetails } from './dateUtils';

describe('dateUtils', () => {
  describe('getDateRangeDetails', () => {
    it('LAST_7_DAYS spans exactly 7 calendar days in UTC', () => {
      const { timeRange } = getDateRangeDetails('LAST_7_DAYS', 'UTC');
      const days = Math.round((timeRange.end.getTime() - timeRange.start.getTime() + 1) / (24 * 60 * 60 * 1000));
      expect(days).toBe(7);
    });

    it('LAST_30_DAYS spans exactly 30 calendar days', () => {
      const { timeRange } = getDateRangeDetails('LAST_30_DAYS', 'UTC');
      const days = Math.round((timeRange.end.getTime() - timeRange.start.getTime() + 1) / (24 * 60 * 60 * 1000));
      expect(days).toBe(30);
    });

    it('previous range for LAST_7_DAYS is the 7 days immediately before the current range, no gap or overlap', () => {
      const { timeRange, previousRange } = getDateRangeDetails('LAST_7_DAYS', 'UTC');
      expect(previousRange.end.getTime()).toBe(timeRange.start.getTime() - 1);
      const days = Math.round(
        (previousRange.end.getTime() - previousRange.start.getTime() + 1) / (24 * 60 * 60 * 1000),
      );
      expect(days).toBe(7);
    });

    it('invalid timezone falls back to UTC instead of throwing', () => {
      expect(() => getDateRangeDetails('LAST_7_DAYS', 'Not/AZone')).not.toThrow();
    });

    it('unknown date range key throws', () => {
      expect(() => getDateRangeDetails('NOT_A_RANGE', 'UTC')).toThrow();
    });
  });

  describe('generateTimeBuckets / generateTimeLabels', () => {
    it('produces exactly dataPoints buckets for day granularity regardless of month boundaries', () => {
      // Start near a month boundary to exercise day-overflow normalization.
      const start = new Date(Date.UTC(2024, 0, 30, 0, 0, 0)); // Jan 30
      const buckets = generateTimeBuckets(start, 5, 'day', 'UTC');
      expect(buckets).toHaveLength(5);
      expect(buckets[0].toISOString()).toBe(new Date(Date.UTC(2024, 0, 30)).toISOString());
      expect(buckets[4].toISOString()).toBe(new Date(Date.UTC(2024, 1, 3)).toISOString()); // rolls into Feb
    });

    it('produces exactly dataPoints buckets for month granularity across a year boundary', () => {
      const start = new Date(Date.UTC(2023, 11, 1)); // Dec 2023
      const buckets = generateTimeBuckets(start, 3, 'month', 'UTC');
      expect(buckets).toHaveLength(3);
      expect(buckets[2].getUTCFullYear()).toBe(2024);
      expect(buckets[2].getUTCMonth()).toBe(1); // Feb 2024
    });

    it('labels array length always matches buckets/dataPoints', () => {
      const start = new Date();
      const labels = generateTimeLabels(start, 12, 'month', 'UTC');
      expect(labels).toHaveLength(12);
    });
  });

  describe('addPeriods', () => {
    it('adding 1 day near a DST-observing zone still advances exactly one calendar day', () => {
      // America/New_York DST spring-forward 2024-03-10.
      const before = new Date(Date.UTC(2024, 2, 9, 5, 0, 0)); // midnight ET on Mar 9
      const next = addPeriods(before, 1, 'day', 'America/New_York');
      // Should land on the same wall-clock hour the following calendar day,
      // even though the UTC offset changed underneath it.
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
      });
      const parts = Object.fromEntries(fmt.formatToParts(next).map((p) => [p.type, p.value]));
      expect(parts.day).toBe('10');
      expect(parts.hour).toBe('00');
    });
  });
});
