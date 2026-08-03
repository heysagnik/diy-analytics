import mongoose, { Schema } from 'mongoose';

const WorkspaceMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], required: true, default: 'member' },
  },
  { timestamps: true }
);

WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.WorkspaceMember || mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
