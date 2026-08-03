import mongoose, { Schema } from 'mongoose';

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
