/**
 * In-process sliding-window-ish rate limiter (fixed window, reset on
 * expiry). This is a best-effort guard, not a hard security boundary: on
 * serverless/multi-instance deployments each instance has its own counter,
 * so the effective global limit is (limit * instance count). It still
 * meaningfully raises the cost of casual abuse and bounds a single
 * instance's memory/CPU exposure. For a hard global limit, front this
 * endpoint with a shared store (Redis) or an edge/WAF rate limiter.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory: if a deployment gets hit from many distinct keys, don't
// grow the map unbounded. Sweep the oldest entries once the map gets big.
const MAX_BUCKETS = 50_000;

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    if (buckets.size > MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    return false;
  }

  bucket.count++;
  return bucket.count > limit;
}
