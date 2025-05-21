import mongoose, { Schema } from 'mongoose';

const PageViewSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  referrer: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    required: true
  },
  os: {
    type: String,
    required: true
  },
  device: {
    type: String,
    default: 'desktop'
  },
  country: {
    type: String,
    default: 'unknown'
  },
  language: {
    type: String,
    default: 'en'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: true
  }
});

export default mongoose.models.PageView || mongoose.model('PageView', PageViewSchema);