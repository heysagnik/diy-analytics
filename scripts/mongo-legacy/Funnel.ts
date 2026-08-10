import mongoose, { Schema } from 'mongoose';

const MAX_FUNNEL_STEPS = 10;

const FunnelStepSchema = new Schema(
  {
    type: { type: String, enum: ['page', 'event'], required: true },
    matchValue: { type: String, required: true, trim: true, maxlength: 1024 },
    label: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const FunnelSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, required: true, ref: 'Project', index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  // Ordered — index in the array is the funnel step order.
  steps: {
    type: [FunnelStepSchema],
    required: true,
    validate: (v: unknown[]) => v.length >= 2 && v.length <= MAX_FUNNEL_STEPS,
  },
  createdAt: { type: Date, default: Date.now },
});

FunnelSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.Funnel || mongoose.model('Funnel', FunnelSchema);
