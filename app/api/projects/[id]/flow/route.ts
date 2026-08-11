import { type NextRequest, NextResponse } from 'next/server';
import { FlowService } from '@/app/api/analytics/services/flowService';
import { DATE_RANGES } from '@/app/api/analytics/types';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const dateRange = request.nextUrl.searchParams.get('dateRange') || 'LAST_30_DAYS';
  if (!DATE_RANGES[dateRange]) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  try {
    const service = new FlowService();
    const edges = await service.getPageFlow(id, dateRange);
    return NextResponse.json({ success: true, data: { edges } });
  } catch (error) {
    console.error('Flow analysis error:', error);
    return NextResponse.json({ error: 'Failed to compute page flow' }, { status: 500 });
  }
}
