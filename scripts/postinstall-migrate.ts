/**
 * Runs Postgres migrations automatically on a real Vercel production
 * deploy (VERCEL_ENV=production) — not on `npm install`, local dev, CI, or
 * Preview builds, since Preview often shares DATABASE_URL with Production
 * and would otherwise apply schema changes before a PR is even merged.
 *
 * Silently no-ops everywhere else so this is safe as an unconditional
 * postinstall hook.
 */

import { execSync } from 'node:child_process';

const isVercelProduction = process.env.VERCEL_ENV === 'production';

if (!isVercelProduction) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.warn('[postinstall-migrate] VERCEL_ENV=production but DATABASE_URL is not set — skipping migration.');
  process.exit(0);
}

console.log('[postinstall-migrate] VERCEL_ENV=production — applying Postgres migrations...');
execSync('drizzle-kit migrate', { stdio: 'inherit' });
