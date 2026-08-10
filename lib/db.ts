import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as relations from '@/db/relations';
import * as schema from '@/db/schema';

interface DrizzleCache {
  client: postgres.Sql | null;
  db: ReturnType<typeof drizzle<typeof schema & typeof relations>> | null;
}

const globalForDrizzle = globalThis as unknown as { __drizzle?: DrizzleCache };

const cached: DrizzleCache = globalForDrizzle.__drizzle ?? { client: null, db: null };
if (!globalForDrizzle.__drizzle) globalForDrizzle.__drizzle = cached;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/diy-analytics';

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('[db] DATABASE_URL is not set — using local fallback, which will fail in production.');
}

function createClient() {
  return postgres(DATABASE_URL, {
    // Serverless (Vercel/Lambda) spins up many short-lived function
    // instances that each hold their own pool — a small max per instance
    // keeps total connections bounded while still reusing the cached
    // client across warm invocations (see `cached` above). `prepare: false`
    // is required when a connection pooler (PgBouncer, Neon/Supabase
    // pooled connection strings) sits in front of Postgres in
    // transaction-pooling mode, which many self-hosters will use — plain
    // direct connections tolerate it fine too.
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });
}

if (!cached.client || !cached.db) {
  cached.client = createClient();
  cached.db = drizzle(cached.client, { schema: { ...schema, ...relations } });
}

export const db = cached.db;
export default db;
