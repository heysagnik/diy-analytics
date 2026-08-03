/**
 * Parses a query-string integer, clamped to [min, max]. `parseInt` alone
 * returns NaN for non-numeric input, which then poisons any arithmetic
 * downstream (e.g. Math.max(1, NaN) is NaN, not 1) — this normalizes bad
 * input to `fallback` instead of propagating NaN.
 */
export function parseBoundedInt(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value === '') return fallback;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
