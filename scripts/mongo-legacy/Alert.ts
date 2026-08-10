import mongoose, { Schema } from 'mongoose';

// Shared schema and route-validation values.
export const ALERT_METRICS = ['pageViews', 'uniqueUsers', 'sessions'] as const;
export const ALERT_THRESHOLD_TYPES = ['drop_pct', 'value_below'] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];
export type AlertThresholdType = (typeof ALERT_THRESHOLD_TYPES)[number];

const AlertSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, required: true, ref: 'Project', index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  metric: { type: String, enum: ALERT_METRICS, required: true },
  // 'drop_pct': fire when the metric falls by >= thresholdValue percent vs the prior 24h.
  // 'value_below': fire when the metric's raw total falls below thresholdValue.
  thresholdType: { type: String, enum: ALERT_THRESHOLD_TYPES, required: true },
  thresholdValue: { type: Number, required: true, min: 0, max: 1_000_000_000 },
  webhookUrl: { type: String, required: true, trim: true, maxlength: 2048 },
  lastTriggeredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

AlertSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
