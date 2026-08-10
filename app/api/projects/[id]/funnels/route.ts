import { desc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { type FunnelStep, funnels, MAX_FUNNEL_STEPS, MIN_FUNNEL_STEPS } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { projectExists } from '@/lib/projectLookup';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

function validateSteps(steps: unknown): steps is FunnelStep[] {
  return (
    Array.isArray(steps) &&
    steps.length >= MIN_FUNNEL_STEPS &&
    steps.length <= MAX_FUNNEL_STEPS &&
    steps.every(
      (s) =>
        s &&
        (s.type === 'page' || s.type === 'event') &&
        typeof s.matchValue === 'string' &&
        s.matchValue.trim() &&
        typeof s.label === 'string' &&
        s.label.trim(),
    )
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const rows = await db.select().from(funnels).where(eq(funnels.projectId, id)).orderBy(desc(funnels.createdAt));
    return NextResponse.json(rows.map(withMongoId));
  } catch (err) {
    console.error('Error fetching funnels:', err);
    return NextResponse.json({ error: 'Failed to fetch funnels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'member');
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const { name, steps } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Funnel name is required' }, { status: 400 });
    }
    if (!validateSteps(steps)) {
      return NextResponse.json(
        {
          error: `A funnel needs ${MIN_FUNNEL_STEPS} to ${MAX_FUNNEL_STEPS} steps, each with a type, matchValue, and label`,
        },
        { status: 400 },
      );
    }

    if (!(await projectExists(id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const [funnel] = await db
      .insert(funnels)
      .values({
        projectId: id,
        name: name.trim(),
        steps: steps.map((s) => ({ type: s.type, matchValue: s.matchValue.trim(), label: s.label.trim() })),
      })
      .returning();

    return NextResponse.json(withMongoId(funnel), { status: 201 });
  } catch (err) {
    console.error('Error creating funnel:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}
