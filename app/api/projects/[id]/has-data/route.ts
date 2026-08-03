import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../lib/mongodb";
import PageView from "../../../../../models/PageView";
import { requireProjectAccess } from "@/lib/serverAuth";

// GET /api/projects/:id/has-data
// Cheap indexed existence check — used to distinguish "never integrated"
// (show the setup snippet) from "integrated, but nothing in the selected
// date range" (show a plain empty state instead), which the dashboard's
// per-range totals alone can't tell apart.
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

  try {
    await connectToDatabase();
    const exists = await PageView.exists({ projectId: id });
    return NextResponse.json(
      { success: true, data: { hasData: !!exists } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error("Error checking project data:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
