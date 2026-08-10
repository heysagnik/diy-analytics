# Migrating from MongoDB to PostgreSQL

diy-analytics now stores all data in PostgreSQL via [Drizzle ORM](https://orm.drizzle.team)
instead of MongoDB. This is a breaking change for any existing self-hosted
deployment — the app no longer reads from or writes to MongoDB at all.

This guide walks through moving an existing deployment over, including a
one-time script to carry over existing data (workspaces, projects, goals,
alerts, funnels, pageviews, events, and daily rollups).

## Before you start

- **Back up your MongoDB database** (`mongodump`) before running anything
  below. The migration script only reads from Mongo, but it's good practice
  regardless.
- Sessions are **not** migrated — every user will need to log in again once
  after cutover. Session tokens are short-lived (30 days) and don't carry
  meaningful continuity across an infrastructure change.
- The migration script is a one-time, non-idempotent tool. If it fails
  partway or you need to rerun it, truncate the target Postgres tables
  first (or pass `--force` to bypass the "target already has data" guard —
  only do this if you understand the duplication risk).

## Steps

1. **Provision a PostgreSQL database.** Any Postgres 14+ works — Vercel
   Postgres, [Neon](https://neon.tech), [Supabase](https://supabase.com),
   Railway, or a self-hosted instance are all fine.

2. **Set `DATABASE_URL`** in your `.env.local` (or your hosting platform's
   environment variables) to the new database's connection string:

   ```
   DATABASE_URL=postgres://user:password@host:5432/diy-analytics?sslmode=require
   ```

3. **Keep your existing `MONGODB_URI`/`MONGODB_DATABASE`** set for now — the
   migration script (step 5) needs them to read your existing data. They're
   not used by anything else anymore.

4. **Apply the Postgres schema:**

   ```bash
   npm run db:migrate
   ```

5. **Run the one-time migration script:**

   ```bash
   npm run db:migrate-from-mongo
   ```

   This reads every collection from MongoDB and inserts the equivalent rows
   into Postgres, remapping Mongo ObjectIds to new Postgres UUIDs and
   rewriting all foreign keys (project → workspace, pageview → project,
   etc.) consistently. Progress and a final row-count comparison
   (Mongo vs. Postgres, per table) are printed to the console. Any row that
   fails to migrate is logged to `migration-errors.log` in the project root
   rather than aborting the whole run — check that file afterward.

   Large `pageviews`/`events` collections are streamed and inserted in
   batches, so this is safe to run against a production-sized dataset, but
   it may take a while depending on volume.

6. **Verify the row counts** printed at the end of the script match your
   expectations (they're compared automatically and flagged `MISMATCH` if
   not — a mismatch usually means some rows failed and were logged to
   `migration-errors.log`).

7. **Remove the legacy MongoDB env vars** (`MONGODB_URI`, `MONGODB_DATABASE`)
   once you've confirmed the new database looks correct, and redeploy.

8. **Ask your users to log in again** — existing sessions don't carry over.

## Rolling back

Your MongoDB database is untouched by this process — the migration script
only reads from it. If something goes wrong, you can revert `DATABASE_URL`/
`MONGODB_URI` to point the app back at a previous release that still speaks
MongoDB, with no data loss on the Mongo side.

## Renamed environment variables

| Old (MongoDB) | New (Postgres) |
|---|---|
| `MONGODB_URI` | `DATABASE_URL` |
| `MONGODB_DATABASE` | *(part of `DATABASE_URL`)* |
| `MONGODB_STORAGE_CAP_MB` | `DATABASE_STORAGE_CAP_MB` |

`PAGEVIEW_RETENTION_DAYS` and `EVENT_RETENTION_DAYS` are unchanged — they
still control opt-in automatic pruning of old data, now run as a batched
delete from the daily rollup cron instead of a MongoDB TTL index.
