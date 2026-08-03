import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../lib/mongodb";
import Funnel from "../../../../../models/Funnel";
import { projectExists } from "../../../../../lib/projectLookup";
import { requireProjectAccess } from "@/lib/serverAuth";

interface FunnelStepInput {
  type: 'page' | 'event';
  matchValue: string;
  label: string;
}

function validateSteps(steps: unknown): steps is FunnelStepInput[] {
  return (
    Array.isArray(steps) &&
    steps.length >= 2 &&
    steps.every(
      (s) =>
        s &&
        (s.type === 'page' || s.type === 'event') &&
        typeof s.matchValue === 'string' &&
        s.matchValue.trim() &&
        typeof s.label === 'string' &&
        s.label.trim()
    )
  );
}

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
    const funnels = await Funnel.find({ projectId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(funnels);
  } catch (err) {
    console.error("Error fetching funnels:", err);
    return NextResponse.json({ error: "Failed to fetch funnels" }, { status: 500 });
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
    const { name, steps } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Funnel name is required" }, { status: 400 });
    }
    if (!validateSteps(steps)) {
      return NextResponse.json(
        { error: "A funnel needs at least 2 steps, each with a type, matchValue, and label" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    if (!(await projectExists(id))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const funnel = await Funnel.create({
      projectId: id,
      name: name.trim(),
      steps: steps.map((s) => ({ type: s.type, matchValue: s.matchValue.trim(), label: s.label.trim() })),
    });

    return NextResponse.json(funnel, { status: 201 });
  } catch (err) {
    console.error("Error creating funnel:", err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? "Invalid JSON" : "Server error" },
      { status: err instanceof SyntaxError ? 400 : 500 }
    );
  }
}
