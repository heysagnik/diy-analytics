import { asc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    if (!isValidUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const [allPageViews, allEvents] = await Promise.all([
      db
        .select({
          id: pageViews.id,
          timestamp: pageViews.timestamp,
          sessionId: pageViews.sessionId,
          userId: pageViews.userId,
          url: pageViews.url,
          path: pageViews.path,
          referrer: pageViews.referrer,
          source: pageViews.source,
          browser: pageViews.browser,
          browserVersion: pageViews.browserVersion,
          os: pageViews.os,
          osVersion: pageViews.osVersion,
          device: pageViews.device,
          deviceVendor: pageViews.deviceVendor,
          deviceModel: pageViews.deviceModel,
          country: pageViews.country,
          region: pageViews.region,
          city: pageViews.city,
          utmSource: pageViews.utmSource,
          utmMedium: pageViews.utmMedium,
          utmCampaign: pageViews.utmCampaign,
          utmTerm: pageViews.utmTerm,
          utmContent: pageViews.utmContent,
        })
        .from(pageViews)
        .where(eq(pageViews.projectId, projectId))
        .orderBy(asc(pageViews.timestamp)),
      db
        .select({
          id: events.id,
          timestamp: events.timestamp,
          name: events.name,
          sessionId: events.sessionId,
          userId: events.userId,
          url: events.url,
          path: events.path,
          referrer: events.referrer,
          source: events.source,
          browser: events.browser,
          browserVersion: events.browserVersion,
          os: events.os,
          osVersion: events.osVersion,
          device: events.device,
          deviceVendor: events.deviceVendor,
          deviceModel: events.deviceModel,
          country: events.country,
          region: events.region,
          city: events.city,
          utmSource: events.utmSource,
          utmMedium: events.utmMedium,
          utmCampaign: events.utmCampaign,
          utmTerm: events.utmTerm,
          utmContent: events.utmContent,
          data: events.data,
        })
        .from(events)
        .where(eq(events.projectId, projectId))
        .orderBy(asc(events.timestamp)),
    ]);

    return NextResponse.json({
      pageViews: allPageViews,
      events: allEvents,
    });
  } catch (error) {
    console.error('Error fetching raw data:', error);
    return NextResponse.json({ error: 'Failed to fetch raw data' }, { status: 500 });
  }
}
