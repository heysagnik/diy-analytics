import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import { requireUser } from '@/lib/serverAuth';
import Project from '@/models/Project';
import WorkspaceMember from '@/models/WorkspaceMember';
import PageView from '@/models/PageView';
import Event from '@/models/Event';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  await connectToDatabase();
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const { workspaceId } = await params;
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
  }

  const membership = await WorkspaceMember.exists({ userId: user.id, workspaceId });
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const projectIds = await Project.find({ workspaceId }).distinct('_id');

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const [pageViews, events] = await Promise.all([
    PageView.countDocuments({ projectId: { $in: projectIds }, timestamp: { $gte: since } }),
    Event.countDocuments({ projectId: { $in: projectIds }, timestamp: { $gte: since } }),
  ]);

  return NextResponse.json(
    {
      success: true,
      data: {
        projectCount: projectIds.length,
        pageViews,
        events,
        since: since.toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
