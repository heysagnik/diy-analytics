# Database setup

diy-analytics stores everything in PostgreSQL via [Drizzle ORM](https://orm.drizzle.team),
accessed with the `postgres-js` driver (`lib/db.ts`). Any Postgres 14+
works — there's no provider-specific SDK or client involved, just a
`DATABASE_URL` connection string.

## Connecting a provider

Set `DATABASE_URL` in `.env.local` (or your hosting platform's environment
variables), then apply the schema:

```bash
npm run db:migrate
```

### Neon

Use the **pooled** connection string (the one with `-pooler` in the
hostname), not the direct one:

```
DATABASE_URL=postgres://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require
```

The pooled endpoint fronts Neon with PgBouncer in transaction mode, which
is why `lib/db.ts` sets `prepare: false` on the client — prepared
statements aren't supported across pooled/transaction-mode connections.

Neon's compute autosuspends after a period of inactivity by default; the
first query after a suspend pays a cold-start latency hit. If that's
noticeable for your traffic pattern, raise (or disable, on paid plans) the
autosuspend delay in the Neon console — this is a project setting, not
something the app can configure.

### Supabase

Grab the connection string from **Settings → Database → Connection
string**, and use the **Transaction pooler** mode (port `6543`), not
Session mode (port `5432`):

```
DATABASE_URL=postgres://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

Same reasoning as Neon: transaction-mode pooling requires
`prepare: false`, which is already set. No other Supabase env vars
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) are needed — the app never
talks to Supabase's client library or REST/Auth layer, only raw Postgres.

### Vercel Postgres

Use the connection string Vercel provisions for you (available in the
project's Storage tab) as-is:

```
DATABASE_URL=postgres://user:password@host.postgres.vercel-storage.com/dbname?sslmode=require
```

### Railway / self-hosted / other Postgres

Any standard connection string works:

```
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
```

If you're fronting your own Postgres with PgBouncer in transaction mode,
the same `prepare: false` note above applies (already handled — no
per-provider code changes needed).

## Ingestion path requires Vercel

The database can be any provider above, but **`/api/track` (the public
tracking endpoint) requires the app itself to be deployed on Vercel**,
regardless of which Postgres you use. Incoming events are published to
[Vercel Queues](https://vercel.com/docs/queues) and processed by a
consumer function (`app/api/queues/track-write/route.ts`) — this only
runs on Vercel's infrastructure and has no public URL. Self-hosting the
app on Docker, Railway, or a bare Node server means ingestion won't work,
even if `DATABASE_URL` points at a fully supported provider.

Everything else (dashboard, API routes other than `/api/track`, cron
rollups) has no Vercel-specific dependency and works on any Node host.
