import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    // name/sessionId are not individually indexed — every query filters by
    // projectId first, so the compound indexes below already cover them.
    name: { type: String, required: true, maxlength: 128 },
    url: { type: String, required: true, maxlength: 2048 },
    path: { type: String, required: true, maxlength: 1024 },
    // Free-form event payload. Stored as a plain object so it can be
    // queried/aggregated on the server and consumed by the frontend
    // without a JSON.parse/stringify round-trip. Unlike the fields above,
    // this can't be maxlength-capped (it's Mixed) — trackingService caps
    // its serialized size instead (see normalizeEventData).
    data: { type: mongoose.Schema.Types.Mixed, default: undefined },
    sessionId: { type: String, required: true, maxlength: 100 },
    userId: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 64 },
    region: { type: String, maxlength: 128 },
    city: { type: String, maxlength: 128 },
    browser: { type: String, maxlength: 64 },
    browserVersion: { type: String, maxlength: 32 },
    os: { type: String, maxlength: 64 },
    osVersion: { type: String, maxlength: 32 },
    device: { type: String, maxlength: 32 },
    deviceVendor: { type: String, maxlength: 64 },
    deviceModel: { type: String, maxlength: 128 },
    // Mirrors PageView's source and UTM fields so event-based panels support
    // the same filtering and grouping dimensions.
    referrer: { type: String, maxlength: 2048 },
    source: { type: String, default: 'Direct', maxlength: 255 },
    utmSource: { type: String, maxlength: 255 },
    utmMedium: { type: String, maxlength: 255 },
    utmCampaign: { type: String, maxlength: 255 },
    utmTerm: { type: String, maxlength: 255 },
    utmContent: { type: String, maxlength: 255 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: 'events',
  }
);

eventSchema.index({ projectId: 1, timestamp: -1 });
eventSchema.index({ projectId: 1, name: 1 });
eventSchema.index({ projectId: 1, sessionId: 1 });
eventSchema.index({ projectId: 1, source: 1 });
eventSchema.index({ projectId: 1, utmCampaign: 1 });

// Opt-in retention — see PageView.ts for rationale. Events (including
// custom event payloads and web-vital samples) can be pruned on the same
// schedule, or independently via EVENT_RETENTION_DAYS.
const eventRetentionDays = Number(process.env.EVENT_RETENTION_DAYS);
if (Number.isFinite(eventRetentionDays) && eventRetentionDays > 0) {
  eventSchema.index({ timestamp: 1 }, { expireAfterSeconds: eventRetentionDays * 24 * 60 * 60 });
}

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
