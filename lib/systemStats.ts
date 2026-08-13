import { gte, sql } from 'drizzle-orm';
import { events, pageViews } from '@/db/schema';
import { db } from './db';

export interface StorageStats {
  connected: boolean;
  latencyMs: number;
  dataSizeBytes: number;
  indexSizeBytes: number;
  usedBytes: number;
  capBytes: number;
  usedPct: number;
  pageviewCount: number;
  eventCount: number;
  estDaysUntilFull: number | null;
}

export interface GrowthTrendPoint {
  date: string;
  count: number;
}

// Self-hosted or paid deployments can override via env so this stays
// honest instead of permanently assuming a fixed ceiling — this used to
// default to Atlas's M0 free-tier cap (512MB) when Mongo was the backing
// store; the concept (an operator-set soft cap) carries over generically.
const DEFAULT_STORAGE_CAP_MB = 512;

function resolveCapBytes(): number {
  const configured = Number(process.env.DATABASE_STORAGE_CAP_MB);
  const capMb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_STORAGE_CAP_MB;
  return capMb * 1024 * 1024;
}

/**
 * Daily pageview+event counts for the last `days` days (UTC buckets),
 * across every project — used both to render a growth sparkline and to
 * estimate how many days remain before hitting the storage cap.
 */
export async function getGrowthTrend(days = 14): Promise<GrowthTrendPoint[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [pageviewRows, eventRows] = await Promise.all([
    db
      .select({ date: sql<string>`to_char(${pageViews.timestamp}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(gte(pageViews.timestamp, since))
      .groupBy(sql`to_char(${pageViews.timestamp}, 'YYYY-MM-DD')`),
    db
      .select({ date: sql<string>`to_char(${events.timestamp}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(events)
      .where(gte(events.timestamp, since))
      .groupBy(sql`to_char(${events.timestamp}, 'YYYY-MM-DD')`),
  ]);

  const byDate = new Map<string, number>();
  for (const row of [...pageviewRows, ...eventRows]) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.count);
  }

  const points: GrowthTrendPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({ date: key, count: byDate.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

/**
 * Live database storage snapshot — used by the Profile "System" card and
 * the compact workspace-home widget. `pg_stat_user_tables` reports the
 * same data/index size split a Postgres admin dashboard would show;
 * `reltuples` gives a fast, planner-statistics-based approximate row
 * count (same "cheap, not exact" tradeoff `estimatedDocumentCount()` made
 * under Mongo, rather than an O(n) COUNT(*)).
 */
export async function getStorageStats(): Promise<StorageStats> {
  const start = Date.now();

  try {
    const [[sizeRow], [pvCountRow], [evCountRow], [avgRowRow], trend] = await Promise.all([
      db.execute<{ data_bytes: string; index_bytes: string }>(sql`
        SELECT
          COALESCE(SUM(pg_relation_size(relid)), 0)::bigint AS data_bytes,
          COALESCE(SUM(pg_total_relation_size(relid) - pg_relation_size(relid)), 0)::bigint AS index_bytes
        FROM pg_stat_user_tables
      `),
      db.execute<{ estimate: number }>(sql`
        SELECT GREATEST(0, round(reltuples))::int AS estimate FROM pg_class WHERE relname = 'pageviews'
      `),
      db.execute<{ estimate: number }>(sql`
        SELECT GREATEST(0, round(reltuples))::int AS estimate FROM pg_class WHERE relname = 'events'
      `),
      // Bytes-per-row estimated from pg_stats column widths (analyzer
      // samples of actual stored data) rather than usedBytes / row count.
      // The latter divides *table size on disk* — which includes bloat
      // left behind by deletions/retention purges until autovacuum
      // reclaims it — by the *current live row count*, so a single delete
      // cycle inflates the estimate arbitrarily (seen directly: 200K
      // seeded rows deleted, table still 179MB pre-vacuum against 540 live
      // rows, projecting 14 days to fill instead of years). avg_width
      // reflects genuine row content and is unaffected by bloat.
      db.execute<{ avg_row_bytes: number }>(sql`
        SELECT COALESCE(SUM(avg_width), 0)::int + 24 AS avg_row_bytes
        FROM pg_stats
        WHERE tablename IN ('pageviews', 'events')
      `),
      getGrowthTrend(7),
    ]);
    const latencyMs = Date.now() - start;

    const dataSizeBytes = Number(sizeRow?.data_bytes ?? 0);
    const indexSizeBytes = Number(sizeRow?.index_bytes ?? 0);
    const usedBytes = dataSizeBytes + indexSizeBytes;
    const capBytes = resolveCapBytes();
    const usedPct = capBytes > 0 ? Math.min(100, (usedBytes / capBytes) * 100) : 0;

    const pageviewCount = pvCountRow?.estimate ?? 0;
    const eventCount = evCountRow?.estimate ?? 0;

    // Index overhead is folded in proportionally so bytesPerDay lands on
    // the same basis as capBytes (data + index), without re-deriving it
    // from table size the way avgBytesPerDoc used to.
    const indexOverheadRatio = dataSizeBytes > 0 ? 1 + indexSizeBytes / dataSizeBytes : 1;
    const avgBytesPerDoc = Number(avgRowRow?.avg_row_bytes ?? 0) * indexOverheadRatio;
    const avgDocsPerDay = trend.reduce((sum, p) => sum + p.count, 0) / trend.length;
    const bytesPerDay = avgBytesPerDoc * avgDocsPerDay;
    const remainingBytes = capBytes - usedBytes;
    const estDaysUntilFull = bytesPerDay > 0 ? Math.max(0, Math.floor(remainingBytes / bytesPerDay)) : null;

    return {
      connected: true,
      latencyMs,
      dataSizeBytes,
      indexSizeBytes,
      usedBytes,
      capBytes,
      usedPct,
      pageviewCount,
      eventCount,
      estDaysUntilFull,
    };
  } catch (error) {
    console.error('Failed to load storage stats:', error);
    return {
      connected: false,
      latencyMs: Date.now() - start,
      dataSizeBytes: 0,
      indexSizeBytes: 0,
      usedBytes: 0,
      capBytes: resolveCapBytes(),
      usedPct: 0,
      pageviewCount: 0,
      eventCount: 0,
      estDaysUntilFull: null,
    };
  }
}
