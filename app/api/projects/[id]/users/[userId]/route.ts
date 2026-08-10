import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

interface SessionRow extends Record<string, unknown> {
  session_id: string;
  first_seen: Date;
  last_seen: Date;
  page_count: number;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  paths: string[];
}

// Full profile for a single visitor: every session (not just the most
// recent one), each with its own device/location snapshot and the pages
// visited — the "every detail" view a summary row can't show.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    // Per session: `latest` picks the most recent pageview's dimension
    // snapshot (DISTINCT ON), `agg` computes first/last seen, page count,
    // and the visited paths via a plain GROUP BY — mirrors the two-pass
    // approach in /api/projects/:id/users for the same reason (Postgres
    // window aggregates don't support DISTINCT).
    const sessions = await db.execute<SessionRow>(sql`
      WITH base AS (
        SELECT ${pageViews.sessionId} AS session_id, ${pageViews.timestamp} AS timestamp, ${pageViews.path} AS path,
               ${pageViews.browser} AS browser, ${pageViews.os} AS os, ${pageViews.device} AS device,
               ${pageViews.country} AS country, ${pageViews.region} AS region, ${pageViews.city} AS city
        FROM ${pageViews}
        WHERE ${pageViews.projectId} = ${id} AND (${pageViews.userId} = ${userId} OR ${pageViews.sessionId} = ${userId})
      ),
      latest AS (
        SELECT DISTINCT ON (session_id) session_id, browser, os, device, country, region, city
        FROM base ORDER BY session_id, timestamp DESC
      ),
      agg AS (
        SELECT session_id, MIN(timestamp) AS first_seen, MAX(timestamp) AS last_seen, COUNT(*)::int AS page_count, array_agg(path) AS paths
        FROM base GROUP BY session_id
      )
      SELECT latest.session_id, agg.first_seen, agg.last_seen, agg.page_count,
             latest.browser, latest.os, latest.device, latest.country, latest.region, latest.city, agg.paths
      FROM latest JOIN agg ON latest.session_id = agg.session_id
      ORDER BY agg.last_seen DESC
    `);

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    const deviceCounts = new Map<string, number>();
    const browserCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();
    let totalPageviews = 0;

    for (const s of sessions) {
      totalPageviews += s.page_count;
      if (s.device) deviceCounts.set(s.device, (deviceCounts.get(s.device) || 0) + 1);
      if (s.browser) browserCounts.set(s.browser, (browserCounts.get(s.browser) || 0) + 1);
      if (s.os) osCounts.set(s.os, (osCounts.get(s.os) || 0) + 1);
    }

    const toSortedEntries = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    const latest = sessions[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          userId,
          firstSeen: sessions[sessions.length - 1].first_seen,
          lastSeen: latest.last_seen,
          totalSessions: sessions.length,
          totalPageviews,
          location: {
            country: latest.country || null,
            region: latest.region || null,
            city: latest.city || null,
          },
          devices: toSortedEntries(deviceCounts),
          browsers: toSortedEntries(browserCounts),
          operatingSystems: toSortedEntries(osCounts),
          sessions: sessions.map((s) => ({
            sessionId: s.session_id,
            firstSeen: s.first_seen,
            lastSeen: s.last_seen,
            pageCount: s.page_count,
            browser: s.browser,
            os: s.os,
            device: s.device,
            location: [s.city, s.region, s.country].filter(Boolean).join(', ') || null,
            paths: Array.from(new Set(s.paths)).slice(0, 20),
          })),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('User detail error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
