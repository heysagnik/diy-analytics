import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "../../../../../../lib/mongodb";
import Funnel from "../../../../../../models/Funnel";
import { requireProjectAccess } from "@/lib/serverAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; funnelId: string }> }
) {
  const { id, funnelId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(funnelId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, "member");
  if (access instanceof NextResponse) return access;

  try {
    await connectToDatabase();
    const funnel = await Funnel.findOneAndDelete({ _id: funnelId, projectId: id });
    if (!funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Funnel deleted successfully" });
  } catch (err) {
    console.error("Error deleting funnel:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
