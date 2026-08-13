# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, breaking changes may ship in a minor release.

## [0.1.5] - 2026-08-13

### Changed

- **Analytics dashboard read performance** — the Overview dashboard is
  substantially faster, especially on projects with large event/pageview
  volumes. Verified against a seeded 200K-pageview dataset: full-payload
  response time dropped from ~16.5s to ~1.95s, and the slowest single
  panel query from ~21.7s to ~1.6s. On typical project sizes, time to first
  meaningful paint dropped from ~4.6s to under 400ms.
  - Fixed a chart-bucketing routine that was doing redundant timezone
    conversions per pageview per bucket instead of once per request.
  - Batched several breakdown queries (country/browser/os/device/source/
    campaign, and web vitals per-dimension) into single grouped queries
    instead of scanning the same window separately for each.
  - Moved session/bounce-rate/duration and top-pages engagement metrics
    from in-app JavaScript aggregation to SQL, so the response no longer
    grows with pageview volume.
  - The dashboard now fetches in three parallel segments (core metrics,
    breakdowns, insights) instead of one blocking request, so metric tiles
    and the main chart can render before slower panels finish loading.

### Fixed

- The Profile "System" storage card could report a wildly inflated
  "days until storage is full" estimate after a large delete (e.g. data
  retention cleanup), because it derived average row size from total
  table size including reclaimable space rather than from actual row
  content. It now uses Postgres's column-width statistics, which aren't
  affected by table bloat.

## [0.1.4] - 2026-08-13

### Added

- **MCP server** — every deployment now serves an [MCP](https://modelcontextprotocol.io)
  endpoint at `/api/mcp`, so an AI assistant (Claude Desktop, Cursor, or any
  other MCP-compatible client) can query analytics, funnels, retention,
  errors, and more directly. Ships with 14 read-only tools; nothing can be
  created, edited, or deleted through MCP yet.
- **API keys** — a new **Profile → API Keys** page for creating/revoking
  personal bearer tokens used to authenticate MCP clients. Keys are
  user-scoped (not project-scoped); every project-scoped tool call
  re-checks access on every invocation, so a revoked workspace membership
  takes effect immediately.
- **Multiple domains per project** — projects can now authorize one or more
  additional domains (e.g. a `*.vercel.app` preview kept alongside a custom
  domain) from **Settings → Tracking**, on top of the existing primary URL.
  Authorizing a domain also authorizes its subdomains, one-directionally.

### Changed

- The Profile page is now a sidebar layout (Account / Workspaces / API Keys
  / Storage) instead of a single scrolling column of cards.
- Renamed the **Page Flow** tab to **Journeys** throughout the app and docs.
- `docs/features.md` and `docs/integration.md` were substantially rewritten:
  reorganized to match the app's actual sidebar order, and filled in
  previously-undocumented features (Explore, Journeys, Error tracking,
  Segments, multi-domain authorization, MCP server).

## [0.1.3] - 2026-08-12

### Added

- **Explore** — an ad-hoc session query builder: combine attribute (country,
  browser, device, source, page, UTM, OS, city), "visited page", and "fired
  event" conditions with AND/OR to find matching sessions without a
  predefined funnel or goal.
- **Errors**: a "new" badge for errors first seen within the last 24h, and a
  release filter/breakdown (grouped counts per `release` tag) on the Errors
  page.
- Resource-load failures (blocked/failed script, image, and link loads) are
  now captured alongside JS exceptions and unhandled rejections, via a
  capture-phase listener — previously only thrown errors were tracked.

### Fixed

- Explore queries failed with a driver-level type error because date-range
  bounds were interpolated as raw `Date` objects into hand-written SQL
  instead of going through drizzle's typed comparison operators.

## [0.1.2] - 2026-08-11

### Added

- **Error tracking** — uncaught exceptions and unhandled promise rejections are
  now captured client-side (sampled, capped per page load), grouped by a
  message+stack fingerprint, and shown on a new Errors tab with severity,
  regression detection (a resolved error reoccurring reopens it), and a
  resolve/reopen workflow. Stack frames can be resolved to original source
  via an on-demand source map fetch (no server-side map storage required).
- **Page Flow** — a page-to-page transition diagram (top sources → top
  destinations) computed from session-ordered pageviews.
- **Segments** — visitors grouped into four recency/frequency segments
  (Active & frequent, Active & occasional, Lapsing, Dormant). Anonymous by
  default; call the new `window.identify(uid)` tracker API to segment real
  people instead of browsers.
- **Anomaly alerts** — a new "Anomalous vs. trailing average" alert threshold
  compares the live value against a 14-day rolling mean/stddev from daily
  rollups, instead of a fixed number.
- **Goal- and funnel-based alerts** — alerts can now target a goal's or a
  funnel's conversion rate, not just a site-wide metric.
- **Slack, Discord, and PagerDuty alert channels**, alongside the existing
  generic webhook.
- **Web Vitals**: p50 shown alongside p75, plus a breakdown by page, country,
  device, and browser (previously site-wide only).
- **Resource timing** — the slowest page assets (script/image/fetch/etc.) are
  now sampled and surfaced as a waterfall-style panel.

## [0.1.1] - 2026-08-11

### Changed

- **Breaking:** migrated the persistence layer from MongoDB/Mongoose to
  PostgreSQL via Drizzle ORM. `MONGODB_URI`/`MONGODB_DATABASE` are replaced
  by `DATABASE_URL`. Existing self-hosted deployments must provision a
  Postgres database, run `npm run db:migrate`, and optionally
  `npm run db:migrate-from-mongo` to import existing data — see
  [docs/migrating-from-mongodb.md](docs/migrating-from-mongodb.md).
- `MONGODB_STORAGE_CAP_MB` is renamed `DATABASE_STORAGE_CAP_MB`.
- App version is now shown in the sidebar footer, sourced from
  `NEXT_PUBLIC_APP_VERSION`.

## [0.1.0] - 2026-08-06

### Added

- Core analytics dashboard: traffic, top pages, sources, campaigns, countries,
  devices, browsers, and a live visitor count.
- Real-time and historical views with per-project timezone support.
- Goals and multi-step funnels.
- Retention cohorts.
- Threshold-based alerts via webhook.
- Public, read-only dashboards with a shareable link.
- Workspaces with role-based member access (viewer / member / admin / owner).
- Self-hosted tracking script (`/api/tracker.js`) with automatic SPA pageview
  tracking, custom events, Core Web Vitals, and a visitor opt-out API.

[0.1.3]: https://github.com/heysagnik/diy-analytics/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/heysagnik/diy-analytics/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/heysagnik/diy-analytics/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/heysagnik/diy-analytics/releases/tag/v0.1.0
