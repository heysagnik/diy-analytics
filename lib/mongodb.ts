import mongoose from 'mongoose';

declare global {
  interface GlobalThis {
    mongoose: {
      conn: import('mongoose').Mongoose | null;
      promise: Promise<import('mongoose').Mongoose> | null;
    };
  }
}

async function connectToDatabase() {
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics';

let cached = ('mongoose' in globalThis) ? (globalThis as unknown as GlobalThis).mongoose : undefined;

if (!cached) {
  cached = (globalThis as unknown as GlobalThis).mongoose = { conn: null, promise: null };
}

  if (!cached) {
    // This block should ideally not be reached if the above logic is correct,
    // but as a fallback, initialize cached if it's still undefined.
    // This indicates a potential logic issue if 'mongoose' was not in globalThis initially.
    cached = (globalThis as unknown as GlobalThis).mongoose = { conn: null, promise: null };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;