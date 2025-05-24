import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Project',
    index: true
  },
  url: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  referrer: {
    type: String
  },
  browser: {
    type: String,
    index: true
  },
  os: {
    type: String,
    index: true
  },
  device: {
    type: String,
    index: true
  },
  country: {
    type: String,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String
  },
  userAgent: {
    type: String
  },
  utmSource: {
    type: String
  },
  utmMedium: {
    type: String
  },
  utmCampaign: {
    type: String
  },
  utmTerm: {
    type: String
  },
  utmContent: {
    type: String
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

// Use this index for frequent queries
pageViewSchema.index({ projectId: 1, timestamp: -1 });
pageViewSchema.index({ projectId: 1, sessionId: 1 });
pageViewSchema.index({ projectId: 1, path: 1 });
pageViewSchema.index({ projectId: 1, referrer: 1 });
pageViewSchema.index({ projectId: 1, country: 1 });
pageViewSchema.index({ projectId: 1, browser: 1 });
pageViewSchema.index({ projectId: 1, device: 1 });
pageViewSchema.index({ projectId: 1, timestamp: -1, sessionId: 1 });

export default mongoose.models.PageView || mongoose.model('PageView', pageViewSchema);