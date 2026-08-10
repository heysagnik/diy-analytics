import { type SQL, sql } from 'drizzle-orm';
import { events } from '@/db/schema';
import { db } from '@/lib/db';

/**
 * Postgres-specific jsonb SQL, isolated from analyticsService.ts so a
 * future MySQL/SQLite dialect only needs a per-dialect variant of this one
 * file (both have their own JSON-key-iteration syntax) — the surrounding
 * service logic doesn't change.
 */

export interface EventPropertyKeyRow {
  key: string;
  occurrences: number;
}

export interface EventPropertyValueRow {
  value: string;
  count: number;
  uniqueUsers: number;
}

/**
 * Distinct property keys on events matching `whereClause`, ranked by
 * frequency. Only scalar-valued keys are surfaced — array/object values are
 * excluded via jsonb_typeof, mirroring the old $type-based Mongo filter.
 */
export async function queryEventPropertyKeys(whereClause: SQL): Promise<EventPropertyKeyRow[]> {
  const rows = await db.execute<{ key: string; occurrences: number }>(sql`
    SELECT kv.key AS key, COUNT(*)::int AS occurrences
    FROM ${events}, jsonb_each(${events.data}) AS kv(key, value)
    WHERE ${whereClause}
      AND ${events.data} IS NOT NULL
      AND jsonb_typeof(kv.value) NOT IN ('array', 'object')
    GROUP BY kv.key
    ORDER BY occurrences DESC
    LIMIT 50
  `);
  return rows.map((r) => ({ key: r.key, occurrences: Number(r.occurrences) }));
}

/**
 * Value distribution for one property key on events matching `whereClause`.
 * `propertyKey` is bound as a query parameter (not interpolated into SQL
 * text), so it's safe even though it's user-controlled — the caller still
 * validates it upstream (isValidPropertyKey) to reject unreasonable input.
 */
export async function queryEventPropertyBreakdown(
  whereClause: SQL,
  propertyKey: string,
): Promise<EventPropertyValueRow[]> {
  const rows = await db.execute<{ value: string; count: number; users: number }>(sql`
    SELECT (${events.data} ->> ${propertyKey}) AS value,
           COUNT(*)::int AS count,
           COUNT(DISTINCT ${events.sessionId})::int AS users
    FROM ${events}
    WHERE ${whereClause}
      AND (${events.data} ->> ${propertyKey}) IS NOT NULL
      AND jsonb_typeof(${events.data} -> ${propertyKey}) NOT IN ('array', 'object')
    GROUP BY value
    ORDER BY count DESC
    LIMIT 20
  `);
  return rows.map((r) => ({ value: r.value, count: Number(r.count), uniqueUsers: Number(r.users) }));
}
