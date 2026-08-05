import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Project',
    index: true
  },
  // maxlength bounds every free-text field below — without them, a
  // malformed client (or a hostile one hitting the public /api/track
  // endpoint directly) can write arbitrarily large strings on every
  // pageview and inflate storage/index size without limit. Limits are
  // generous relative to real-world values (browsers truncate URLs well
  // under 2048 chars in practice) so legitimate data is never clipped.
  url: {
    type: String,
    required: true,
    maxlength: 2048
  },
  // path/source/browser/os/device/country are not individually indexed —
  // every query in this app filters by projectId first (there is no
  // cross-project query), so the `projectId + field` compound indexes
  // below already cover these lookups via their prefix; a bare field-level
  // index here would never be chosen by the planner over the compound one
  // and would only add write overhead.
  path: {
    type: String,
    required: true,
    maxlength: 1024
  },
  referrer: {
    type: String,
    maxlength: 2048
  },
  // Derived at write time from `referrer` (hostname, or 'Direct' when
  // absent) so it can be filtered/grouped on directly instead of
  // regex-parsing the raw referrer URL on every analytics query.
  source: {
    type: String,
    default: 'Direct',
    maxlength: 255
  },
  browser: {
    type: String,
    maxlength: 64
  },
  // Display detail alongside browser/os/device — not individually indexed
  // (same rationale as path/source/browser/os/device above) and only
  // populated for pageviews ingested after this field was added; older
  // documents leave these unset rather than backfilled.
  browserVersion: {
    type: String,
    maxlength: 32
  },
  os: {
    type: String,
    maxlength: 64
  },
  osVersion: {
    type: String,
    maxlength: 32
  },
  device: {
    type: String,
    maxlength: 32
  },
  deviceVendor: {
    type: String,
    maxlength: 64
  },
  deviceModel: {
    type: String,
    maxlength: 128
  },
  country: {
    type: String,
    maxlength: 64
  },
  // Best-effort: populated only when the hosting edge or proxy supplies city
  // and region headers.
  region: {
    type: String,
    maxlength: 128
  },
  city: {
    type: String,
    maxlength: 128
  },
  sessionId: {
    type: String,
    required: true,
    maxlength: 100
  },
  userId: {
    type: String,
    maxlength: 100
  },
  userAgent: {
    type: String,
    maxlength: 512
  },
  utmSource: {
    type: String,
    maxlength: 255
  },
  utmMedium: {
    type: String,
    maxlength: 255
  },
  utmCampaign: {
    type: String,
    maxlength: 255
  },
  utmTerm: {
    type: String,
    maxlength: 255
  },
  utmContent: {
    type: String,
    maxlength: 255
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'pageviews'
});

// Opt-in retention: unset by default (no behavior change), so raw
// pageviews accumulate indefinitely unless the deployer explicitly opts
// into automatic expiry. Set PAGEVIEW_RETENTION_DAYS to enable — MongoDB's
// TTL monitor then reaps documents older than the window in the background.
const pageViewRetentionDays = Number(process.env.PAGEVIEW_RETENTION_DAYS);
if (Number.isFinite(pageViewRetentionDays) && pageViewRetentionDays > 0) {
  pageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: pageViewRetentionDays * 24 * 60 * 60 });
}

// Compound indexes matching this app's actual query shapes (always
// projectId-scoped, usually combined with a dimension filter or a
// timestamp range). `referrer` itself is never queried/filtered — only
// the derived `source` field is — so no index is kept for it.
pageViewSchema.index({ projectId: 1, timestamp: -1 });
pageViewSchema.index({ projectId: 1, sessionId: 1 });
pageViewSchema.index({ projectId: 1, path: 1 });
pageViewSchema.index({ projectId: 1, source: 1 });
pageViewSchema.index({ projectId: 1, country: 1 });
pageViewSchema.index({ projectId: 1, browser: 1 });
pageViewSchema.index({ projectId: 1, device: 1 });
pageViewSchema.index({ projectId: 1, timestamp: -1, sessionId: 1 });
pageViewSchema.index({ projectId: 1, utmSource: 1 });
pageViewSchema.index({ projectId: 1, utmCampaign: 1 });

export default mongoose.models.PageView || mongoose.model('PageView', pageViewSchema);
