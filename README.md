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

Set `MONGODB_URI` in `.env.local` to your MongoDB connection string, and
`NEXT_PUBLIC_SITE_URL` to the URL the app will be served from (used when
generating tracking snippets). The app runs at `http://localhost:3000`.

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
