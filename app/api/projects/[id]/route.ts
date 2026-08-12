import net from 'node:net';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { projects } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';
import { updateProject } from '../services/projectService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const access = await requireProjectAccess(request, id);
    if (access instanceof NextResponse) return access;
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, access.project.workspaceId)))
      .limit(1);
    return NextResponse.json(project ? withMongoId(project) : null);
  } catch (err) {
    console.error('Error fetching project:', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const access = await requireProjectAccess(request, id, 'member');
    if (access instanceof NextResponse) return access;

    const updateInput: {
      name?: string;
      url?: string;
      publicMode?: boolean;
      excludedIPs?: string[];
      excludedPaths?: string[];
      timezone?: string | null;
      additionalDomains?: string[];
    } = {};

    if (typeof body.name === 'string') updateInput.name = body.name.trim();
    if (body.timezone === null) {
      updateInput.timezone = null;
    } else if (typeof body.timezone === 'string') {
      const tz = body.timezone.trim();
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      } catch {
        return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
      }
      updateInput.timezone = tz;
    }
    if (typeof body.url === 'string') {
      updateInput.url = body.url;
    }
    if (Array.isArray(body.additionalDomains)) {
      const domains = body.additionalDomains
        .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);
      updateInput.additionalDomains = domains;
    }
    if (typeof body.publicMode === 'boolean') updateInput.publicMode = body.publicMode;
    if (Array.isArray(body.excludedIPs)) {
      const ips = body.excludedIPs.map((v: unknown) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
      const invalid = ips.filter((ip: string) => net.isIP(ip) === 0);
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid IP address: ${invalid[0]}` }, { status: 400 });
      }
      updateInput.excludedIPs = ips;
    }
    if (Array.isArray(body.excludedPaths)) {
      // Normalize to a leading-slash form so wildcard prefix matching in
      // trackingService.isExcludedPath (which compares against
      // `new URL(url).pathname`, always leading-slash) behaves predictably
      // regardless of how the path was typed in Settings.
      updateInput.excludedPaths = body.excludedPaths
        .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .map((p: string) => (p.startsWith('/') || p === '*' ? p : `/${p}`));
    }

    const result = await updateProject(id, access.project.workspaceId, updateInput);
    if (result.error === 'invalid_url') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    if (result.error === 'invalid_domain') {
      return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }
    if (result.error === 'no_fields') {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }
    if (!result.project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(withMongoId(result.project));
  } catch (err) {
    console.error('Error updating project:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const access = await requireProjectAccess(request, id, 'admin');
    if (access instanceof NextResponse) return access;

    // ON DELETE CASCADE on pageviews/events/goals/funnels/alerts.projectId
    // (see db/schema/*.ts) means the database guarantees the cascade
    // atomically — no manual transaction-with-fallback needed here, unlike
    // the old Mongo version which had to hand-roll a session transaction
    // plus a non-replica-set fallback.
    const [project] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, access.project.workspaceId)))
      .returning({ id: projects.id });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Project and all associated data deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting project:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
