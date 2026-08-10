# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, breaking changes may ship in a minor release.

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

[0.1.1]: https://github.com/heysagnik/diy-analytics/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/heysagnik/diy-analytics/releases/tag/v0.1.0
