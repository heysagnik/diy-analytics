import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
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
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  sessionId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);