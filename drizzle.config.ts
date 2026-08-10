import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/diy-analytics',
  },
  strict: true,
  verbose: true,
});
