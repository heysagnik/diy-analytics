import { and, desc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { ALERT_CHANNELS, ALERT_METRICS, ALERT_THRESHOLD_TYPES, alerts, funnels, goals } from '@/db/schema';
import { withMongoId } from '@/lib/api/serialize';
import { db } from '@/lib/db';
import { projectExists } from '@/lib/projectLookup';
import { requireProjectAccess } from '@/lib/serverAuth';
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from '@/lib/ssrfGuard';
import { isValidUuid } from '@/lib/uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const rows = await db.select().from(alerts).where(eq(alerts.projectId, id)).orderBy(desc(alerts.createdAt));
    return NextResponse.json(rows.map(withMongoId));
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
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
    const { name, metric, thresholdType, thresholdValue, webhookUrl, channel = 'generic', goalId, funnelId } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Alert name is required' }, { status: 400 });
    }
    if (!ALERT_METRICS.includes(metric)) {
      return NextResponse.json({ error: `Metric must be one of: ${ALERT_METRICS.join(', ')}` }, { status: 400 });
    }
    if (!ALERT_THRESHOLD_TYPES.includes(thresholdType)) {
      return NextResponse.json(
        { error: `Threshold type must be one of: ${ALERT_THRESHOLD_TYPES.join(', ')}` },
        { status: 400 },
      );
    }
    if (typeof thresholdValue !== 'number' || !Number.isFinite(thresholdValue) || thresholdValue < 0) {
      return NextResponse.json({ error: 'Threshold value must be a non-negative number' }, { status: 400 });
    }
    if (!ALERT_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `Channel must be one of: ${ALERT_CHANNELS.join(', ')}` }, { status: 400 });
    }
    if (goalId !== undefined && goalId !== null && typeof goalId !== 'string') {
      return NextResponse.json({ error: 'goalId must be a string' }, { status: 400 });
    }
    if (funnelId !== undefined && funnelId !== null && typeof funnelId !== 'string') {
      return NextResponse.json({ error: 'funnelId must be a string' }, { status: 400 });
    }
    if (goalId && funnelId) {
      return NextResponse.json({ error: 'An alert can target a goal or a funnel, not both' }, { status: 400 });
    }
    if ((goalId || funnelId) && thresholdType !== 'value_below') {
      return NextResponse.json(
        { error: 'Goal/funnel alerts only support the "falls below" threshold type' },
        { status: 400 },
      );
    }
    if (goalId) {
      if (!isValidUuid(goalId)) return NextResponse.json({ error: 'Invalid goalId' }, { status: 400 });
      const [goal] = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, goalId), eq(goals.projectId, id)))
        .limit(1);
      if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    if (funnelId) {
      if (!isValidUuid(funnelId)) return NextResponse.json({ error: 'Invalid funnelId' }, { status: 400 });
      const [funnel] = await db
        .select({ id: funnels.id })
        .from(funnels)
        .where(and(eq(funnels.id, funnelId), eq(funnels.projectId, id)))
        .limit(1);
      if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }
    if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      return NextResponse.json(
        {
          error:
            channel === 'pagerduty' ? 'PagerDuty routing key is required' : 'Webhook URL must be a valid http(s) URL',
        },
        { status: 400 },
      );
    }
    // PagerDuty's field holds an Events API routing key, not a URL — the
    // SSRF check (which resolves DNS and validates URL shape) doesn't apply.
    if (channel !== 'pagerduty') {
      try {
        await assertSafeWebhookUrl(webhookUrl);
      } catch (e) {
        const message = e instanceof UnsafeWebhookUrlError ? e.message : 'Webhook URL must be a valid http(s) URL';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (!(await projectExists(id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const [alert] = await db
      .insert(alerts)
      .values({
        projectId: id,
        name: name.trim(),
        metric,
        thresholdType,
        thresholdValue,
        webhookUrl: webhookUrl.trim(),
        channel,
        goalId: goalId || null,
        funnelId: funnelId || null,
      })
      .returning();

    return NextResponse.json(withMongoId(alert), { status: 201 });
  } catch (err) {
    console.error('Error creating alert:', err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? 'Invalid JSON' : 'Server error' },
      { status: err instanceof SyntaxError ? 400 : 500 },
    );
  }
}
