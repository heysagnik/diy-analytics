import { and, type SQL } from 'drizzle-orm';

/**
 * drizzle-orm's `and()` types as `SQL | undefined` because it returns
 * undefined when called with zero conditions — but every call site here
 * always passes at least one fixed condition (e.g. a projectId match), so
 * it never actually returns undefined. Throwing (rather than asserting
 * past it with `!`) turns that invariant into something that fails loudly
 * if it's ever violated, instead of a silent type-level promise.
 */
export function requireAnd(...conditions: (SQL | undefined)[]): SQL {
  const combined = and(...conditions);
  if (!combined) throw new Error('requireAnd() received no conditions');
  return combined;
}
