import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../../lib/mongodb";
import Goal from "../../../../../../models/Goal";
import { requireProjectAccess } from "@/lib/serverAuth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(goalId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, "member");
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const update: { name?: string; type?: string; matchValue?: string } = {};

    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
    if (body.type === "page" || body.type === "event") update.type = body.type;
    if (typeof body.matchValue === "string" && body.matchValue.trim()) update.matchValue = body.matchValue.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    await connectToDatabase();
    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, projectId: id },
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json(goal);
  } catch (err) {
    console.error("Error updating goal:", err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? "Invalid JSON" : "Server error" },
      { status: err instanceof SyntaxError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(goalId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, "member");
  if (access instanceof NextResponse) return access;

  try {
    await connectToDatabase();
    const goal = await Goal.findOneAndDelete({ _id: goalId, projectId: id });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch (err) {
    console.error("Error deleting goal:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
