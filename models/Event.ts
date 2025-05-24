import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true, index: true },
  url: { type: String, required: true },
  path: { type: String, required: true },
  data: { type: String },
  sessionId: { type: String, required: true, index: true },
  userId: { type: String },
  country: { type: String },
  browser: { type: String },
  os: { type: String },
  device: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { 
  timestamps: true,
  collection: 'events'
});

eventSchema.index({ projectId: 1, timestamp: -1 });
eventSchema.index({ projectId: 1, name: 1 });
eventSchema.index({ projectId: 1, sessionId: 1 });

export default mongoose.models.Event || mongoose.model('Event', eventSchema);