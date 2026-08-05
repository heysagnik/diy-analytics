import mongoose from 'mongoose';
import connectToDatabase from './mongodb';
import PageView from '@/models/PageView';
import Event from '@/models/Event';

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

// Atlas free tier (M0) caps a cluster at 512MB; self-hosted or paid
// deployments can override via env so this stays honest instead of
// permanently assuming the free-tier ceiling.
const DEFAULT_STORAGE_CAP_MB = 512;

function resolveCapBytes(): number {
  const configured = Number(process.env.MONGODB_STORAGE_CAP_MB);
  const capMb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_STORAGE_CAP_MB;
  return capMb * 1024 * 1024;
}

/**
 * Daily pageview+event counts for the last `days` days (UTC buckets),
 * across every project — used both to render a growth sparkline and to
 * estimate how many days remain before hitting the storage cap.
 */
export async function getGrowthTrend(days = 14): Promise<GrowthTrendPoint[]> {
  await connectToDatabase();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const dayFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'UTC' } };
  const [pageviewRows, eventRows] = await Promise.all([
    PageView.aggregate<{ _id: string; count: number }>([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: dayFormat, count: { $sum: 1 } } },
    ]),
    Event.aggregate<{ _id: string; count: number }>([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: dayFormat, count: { $sum: 1 } } },
    ]),
  ]);

  const byDate = new Map<string, number>();
  for (const row of [...pageviewRows, ...eventRows]) {
    byDate.set(row._id, (byDate.get(row._id) ?? 0) + row.count);
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
 * the compact workspace-home widget. `db.stats()` reports the same
 * dataSize/indexSize figures Atlas's own UI shows, so this stays accurate
 * without needing a separate Atlas API integration.
 */
export async function getStorageStats(): Promise<StorageStats> {
  const start = Date.now();
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
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

  const [dbStats, pageviewCount, eventCount, trend] = await Promise.all([
    db.stats(),
    PageView.estimatedDocumentCount(),
    Event.estimatedDocumentCount(),
    getGrowthTrend(7),
  ]);
  const latencyMs = Date.now() - start;

  const dataSizeBytes = dbStats.dataSize ?? 0;
  const indexSizeBytes = dbStats.indexSize ?? 0;
  const usedBytes = dataSizeBytes + indexSizeBytes;
  const capBytes = resolveCapBytes();
  const usedPct = capBytes > 0 ? Math.min(100, (usedBytes / capBytes) * 100) : 0;

  const totalDocs = pageviewCount + eventCount;
  const avgBytesPerDoc = totalDocs > 0 ? usedBytes / totalDocs : 0;
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
}
