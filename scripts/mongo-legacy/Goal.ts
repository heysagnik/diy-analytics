import mongoose, { Schema } from 'mongoose';

const GoalSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, required: true, ref: 'Project', index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  // 'page': matchValue is an exact path (e.g. "/thank-you").
  // 'event': matchValue is a custom event name tracked via window.trackEvent.
  type: { type: String, enum: ['page', 'event'], required: true },
  matchValue: { type: String, required: true, trim: true, maxlength: 1024 },
  createdAt: { type: Date, default: Date.now },
});

GoalSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
