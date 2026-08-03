import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { __mongoose?: MongooseCache };

const cached: MongooseCache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
if (!globalForMongoose.__mongoose) globalForMongoose.__mongoose = cached;

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/diy-analytics';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'diy-analytics';

if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  console.warn('[mongodb] MONGODB_URI is not set — using local fallback, which will fail in production.');
}

async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DATABASE,
      bufferCommands: false,
      // Serverless (Vercel/Lambda) spins up many short-lived function
      // instances that each hold their own pool — Mongoose's 100-connection
      // default per instance can exhaust Atlas's connection limit under
      // concurrent load. A small pool per instance plus a short idle
      // timeout keeps total connections bounded while still reusing the
      // cached client across warm invocations (see `cached` above).
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
    }).catch((error) => {
      // Without this, a failed initial connection permanently caches a
      // rejected promise — every subsequent request reuses it and fails
      // immediately, with no retry until the process restarts.
      cached.promise = null;
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;
