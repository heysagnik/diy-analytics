import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Project from '@/models/Project';
import { AnalyticsService } from '@/app/api/analytics/services/analyticsService';
import { normalizeTimezone } from '@/app/api/analytics/utils/dateUtils';
import { DATE_RANGES } from '@/app/api/analytics/types';

export const runtime = 'nodejs';

// Public, read-only analytics. Only projects with publicMode === true
// expose anything here; otherwise the route returns 403.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const dateRange = searchParams.get('dateRange') || 'LAST_30_DAYS';
  const timezone = searchParams.get('timezone');

  if (!projectId || !Types.ObjectId.isValid(projectId)) {
    return NextResponse.json({ success: false, error: 'Invalid projectId' }, { status: 400 });
  }
  if (!DATE_RANGES[dateRange]) {
    return NextResponse.json({ success: false, error: 'Invalid dateRange' }, { status: 400 });
  }

  await connectToDatabase();
  const project = (await Project.findById(projectId).lean<{ publicMode?: boolean; _id: unknown }>());
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  if (project.publicMode !== true) {
    return NextResponse.json({ success: false, error: 'Public dashboard is disabled for this project' }, { status: 403 });
  }

  const filters: Record<string, string[]> = {};
  (['country', 'browser', 'device', 'source', 'page', 'utmSource', 'utmMedium', 'utmCampaign'] as const).forEach((key) => {
    const raw = searchParams.get(key);
    if (raw) filters[key] = raw.split(',').map((v) => v.trim()).filter(Boolean);
  });

  try {
    const service = new AnalyticsService();
    const data = await service.getAnalytics({
      projectId,
      dateRange,
      timezone: normalizeTimezone(timezone || undefined),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Public analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load analytics data' },
      { status: 500 }
    );
  }
}
