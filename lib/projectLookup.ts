import mongoose from 'mongoose';
import Project from '@/models/Project';

/**
 * Verifies a project exists before a child resource (goal/funnel/alert) is
 * created under it. Without this, POSTing to
 * /api/projects/<any-valid-objectid>/goals silently creates an orphaned
 * record for a project that doesn't exist — the ObjectId format check alone
 * doesn't catch that.
 */
export async function projectExists(projectId: string): Promise<boolean> {
  const project = await Project.exists({ _id: new mongoose.Types.ObjectId(projectId) });
  return project !== null;
}
