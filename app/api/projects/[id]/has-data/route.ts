import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

// GET /api/projects/:id/has-data
// Cheap indexed existence check — used to distinguish "never integrated"
// (show the setup snippet) from "integrated, but nothing in the selected
// date range" (show a plain empty state instead), which the dashboard's
// per-range totals alone can't tell apart.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const [row] = await db.select({ id: pageViews.id }).from(pageViews).where(eq(pageViews.projectId, id)).limit(1);
    return NextResponse.json({ success: true, data: { hasData: !!row } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Error checking project data:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
