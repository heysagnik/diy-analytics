import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../../lib/mongodb";
import PageView from "../../../../../../models/PageView";
import { requireProjectAccess } from "@/lib/serverAuth";

interface SessionRow {
  _id: string;
  firstSeen: Date;
  lastSeen: Date;
  pageCount: number;
  browser?: string;
  os?: string;
  device?: string;
  country?: string;
  region?: string;
  city?: string;
  paths: string[];
}

// Full profile for a single visitor: every session (not just the most
// recent one), each with its own device/location snapshot and the pages
// visited — the "every detail" view a summary row can't show.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    await connectToDatabase();
    const projectId = new mongoose.Types.ObjectId(id);

    const sessions = await PageView.aggregate<SessionRow>([
      { $match: { projectId, $or: [{ userId }, { sessionId: userId }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$sessionId',
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          pageCount: { $sum: 1 },
          browser: { $first: '$browser' },
          os: { $first: '$os' },
          device: { $first: '$device' },
          country: { $first: '$country' },
          region: { $first: '$region' },
          city: { $first: '$city' },
          paths: { $push: '$path' }
        }
      },
      { $sort: { lastSeen: -1 } }
    ]);

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    const deviceCounts = new Map<string, number>();
    const browserCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();
    let totalPageviews = 0;

    for (const s of sessions) {
      totalPageviews += s.pageCount;
      if (s.device) deviceCounts.set(s.device, (deviceCounts.get(s.device) || 0) + 1);
      if (s.browser) browserCounts.set(s.browser, (browserCounts.get(s.browser) || 0) + 1);
      if (s.os) osCounts.set(s.os, (osCounts.get(s.os) || 0) + 1);
    }

    const toSortedEntries = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    const latest = sessions[0];

    return NextResponse.json({
      success: true,
      data: {
        userId,
        firstSeen: sessions[sessions.length - 1].firstSeen,
        lastSeen: latest.lastSeen,
        totalSessions: sessions.length,
        totalPageviews,
        location: {
          country: latest.country || null,
          region: latest.region || null,
          city: latest.city || null
        },
        devices: toSortedEntries(deviceCounts),
        browsers: toSortedEntries(browserCounts),
        operatingSystems: toSortedEntries(osCounts),
        sessions: sessions.map((s) => ({
          sessionId: s._id,
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
          pageCount: s.pageCount,
          browser: s.browser,
          os: s.os,
          device: s.device,
          location: [s.city, s.region, s.country].filter(Boolean).join(', ') || null,
          paths: Array.from(new Set(s.paths)).slice(0, 20)
        }))
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error("User detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
