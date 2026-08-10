import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { FunnelService } from '@/app/api/analytics/services/funnelService';
import { DATE_RANGES } from '@/app/api/analytics/types';
import { funnels } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

// GET /api/projects/:id/funnels/:funnelId/analysis?dateRange=LAST_30_DAYS
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; funnelId: string }> }) {
  const { id, funnelId } = await params;
  if (!isValidUuid(id) || !isValidUuid(funnelId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const dateRange = request.nextUrl.searchParams.get('dateRange') || 'LAST_30_DAYS';
  if (!DATE_RANGES[dateRange]) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  try {
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(and(eq(funnels.id, funnelId), eq(funnels.projectId, id)))
      .limit(1);
    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }

    const service = new FunnelService();
    const result = await service.getFunnelAnalysis(id, funnel.steps, dateRange);

    return NextResponse.json({
      success: true,
      data: { funnelId: funnel.id, name: funnel.name, steps: result },
    });
  } catch (error) {
    console.error('Funnel analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const tooLarge = message.includes('too large');
    return NextResponse.json(
      { error: tooLarge ? message : 'Failed to compute funnel analysis' },
      { status: tooLarge ? 413 : 500 },
    );
  }
}
