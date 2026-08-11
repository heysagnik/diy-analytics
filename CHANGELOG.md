# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, breaking changes may ship in a minor release.

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
