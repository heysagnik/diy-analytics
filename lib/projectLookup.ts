import { eq } from 'drizzle-orm';
import { projects } from '@/db/schema';
import { db } from '@/lib/db';

/**
 * Verifies a project exists before a child resource (goal/funnel/alert) is
 * created under it. Without this, POSTing to
 * /api/projects/<any-valid-uuid>/goals silently creates an orphaned record
 * for a project that doesn't exist — the UUID format check alone doesn't
 * catch that.
 */
export async function projectExists(projectId: string): Promise<boolean> {
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return row !== undefined;
}
