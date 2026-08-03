import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../../lib/mongodb";
import Alert from "../../../../../../models/Alert";
import { requireProjectAccess } from "@/lib/serverAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; alertId: string }> }
) {
  const { id, alertId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(alertId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, "member");
  if (access instanceof NextResponse) return access;

  try {
    await connectToDatabase();
    const alert = await Alert.findOneAndDelete({ _id: alertId, projectId: id });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (err) {
    console.error("Error deleting alert:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
