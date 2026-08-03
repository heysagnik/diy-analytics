import { redirect } from 'next/navigation';
import { getRequestUser } from '@/lib/auth';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const membership = await WorkspaceMember.findOne({ userId: user.id }).sort({ createdAt: 1 }).lean();
  if (!membership) redirect('/register');
  const workspace = await Workspace.findById(membership.workspaceId).select('slug').lean();
  if (!workspace) redirect('/register');
  redirect(`/${workspace.slug}`);
}
