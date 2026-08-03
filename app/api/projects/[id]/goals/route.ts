import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../lib/mongodb";
import Goal from "../../../../../models/Goal";
import { projectExists } from "../../../../../lib/projectLookup";
import { requireProjectAccess } from "@/lib/serverAuth";

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
    const goals = await Goal.find({ projectId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(goals);
  } catch (err) {
    console.error("Error fetching goals:", err);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, "member");
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const { name, type, matchValue } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
    }
    if (type !== "page" && type !== "event") {
      return NextResponse.json({ error: "Goal type must be 'page' or 'event'" }, { status: 400 });
    }
    if (typeof matchValue !== "string" || !matchValue.trim()) {
      return NextResponse.json({ error: "Match value is required" }, { status: 400 });
    }

    await connectToDatabase();
    if (!(await projectExists(id))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const goal = await Goal.create({
      projectId: id,
      name: name.trim(),
      type,
      matchValue: matchValue.trim(),
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error("Error creating goal:", err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? "Invalid JSON" : "Server error" },
      { status: err instanceof SyntaxError ? 400 : 500 }
    );
  }
}
