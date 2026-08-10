import { asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { workspaceMembers, workspaces } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .orderBy(asc(workspaceMembers.createdAt))
    .limit(1);
  if (!membership) redirect('/register');
  const [workspace] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, membership.workspaceId))
    .limit(1);
  if (!workspace) redirect('/register');
  redirect(`/${workspace.slug}`);
}
