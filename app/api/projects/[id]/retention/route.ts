import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../lib/mongodb";
import { RetentionService } from "../../../../../app/api/analytics/services/retentionService";
import { requireProjectAccess } from "@/lib/serverAuth";

// GET /api/projects/:id/retention?weeks=8
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  const weeksParam = request.nextUrl.searchParams.get("weeks");
  const weeks = weeksParam ? Number(weeksParam) : 8;
  if (!Number.isInteger(weeks) || weeks < 2 || weeks > 26) {
    return NextResponse.json({ error: "Weeks must be an integer between 2 and 26" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const service = new RetentionService();
    const cohorts = await service.getRetentionMatrix(id, weeks);
    return NextResponse.json({ success: true, data: { weeks, cohorts } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error("Retention analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
