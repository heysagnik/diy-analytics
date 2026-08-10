<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg">
    <img src="docs/images/logo.svg" height="40" alt="diy-analytics">
  </picture>
</p>

<p align="center">Self-hosted, privacy-friendly website analytics.</p>

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)

> **Status:** alpha. The core dashboard is functional, but expect breaking
> changes before `1.0.0`. See [CHANGELOG.md](CHANGELOG.md).

![Dashboard screenshot](docs/images/overview-chart.jpg)

## Features

- No cookies, no personal data collected — GDPR/CCPA-friendly by design.
- Tracking script under 2 KB, loaded asynchronously.
- Traffic, pages, sources, campaigns, countries, devices, and browsers, with
  click-to-filter breakdowns.
- Live visitor count and historical views with per-project timezone support.
- Goals, multi-step funnels, and retention cohorts.
- Threshold-based alerts delivered via webhook.
- Optional public, read-only dashboards via a shareable link.
- Workspaces with role-based member access.

## Getting started

### Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)

### Run locally

```bash
git clone https://github.com/heysagnik/diy-analytics.git
cd diy-analytics
cp .env.local.example .env.local
npm install
npm run dev
```

Set `DATABASE_URL` in `.env.local` to your PostgreSQL connection string
(the "Deploy with Vercel" button above does not provision a database for
you — bring your own Postgres, e.g. Vercel Postgres, Neon, Supabase, or a
self-hosted instance), and `NEXT_PUBLIC_SITE_URL` to the URL the app will
be served from (used when generating tracking snippets). `DATABASE_STORAGE_CAP_MB`
is optional and defaults to 512MB — it sets the soft cap shown as "storage
used" in the workspace/profile dashboards. Then apply the schema and start
the app:

```bash
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000`.

> **Upgrading from a MongoDB-backed deployment?** This is a breaking
> change — see [docs/migrating-from-mongodb.md](docs/migrating-from-mongodb.md).

### Daily rollup cron

`vercel.json` schedules `GET /api/cron/rollup` once a day (03:00 UTC) to
roll up the prior day's pageviews into `daily_rollups` and prune data past
the configured retention window. On Vercel this is wired up automatically —
set `CRON_SECRET` in your project's environment variables and Vercel Cron
sends it as `Authorization: Bearer $CRON_SECRET` on every invocation. If
`CRON_SECRET` is unset the route accepts unauthenticated requests, so set it
before exposing the app publicly. Self-hosting elsewhere: point your own
scheduler at that route with the same header once a day.

## Adding it to a site

Create a project in the dashboard, then paste its tracking snippet into your
site's `<head>`:

```html
<script async defer src="https://your-instance.example.com/api/tracker.js?site-id=YOUR_SITE_ID"></script>
```

See [docs/integration.md](docs/integration.md) for framework-specific
snippets, the custom-events API, and troubleshooting.

## Documentation

Full documentation lives in [`docs/`](docs/):

- [Features](docs/features.md) — a detailed reference for everything in the dashboard.
- [Integration Guide](docs/integration.md) — installing the tracking script and custom events.

## Contributing

Issues and pull requests are welcome. Open an issue before starting
significant work so the approach can be discussed first.

## License

[MIT](LICENSE)
