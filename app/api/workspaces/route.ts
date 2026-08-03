import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';
import { requireUser } from '@/lib/serverAuth';

function workspaceSlug(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'workspace';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: NextRequest) {
  await connectToDatabase();
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  let body: { name?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

  const workspace = await Workspace.create({ name, slug: workspaceSlug(name) });
  const workspaceId = String(workspace._id);
  await WorkspaceMember.create({ workspaceId, userId: user.id, role: 'owner' });

  return NextResponse.json({ success: true, workspaceId, workspaceSlug: workspace.slug }, { status: 201 });
}
