import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../../lib/mongodb";
import Project from "../../../../models/Project";
import PageView from "../../../../models/PageView";
import Event from "../../../../models/Event";
import Goal from "../../../../models/Goal";
import Funnel from "../../../../models/Funnel";
import Alert from "../../../../models/Alert";
import mongoose from "mongoose";
import net from "node:net";
import { normalizeProjectUrl } from "@/utils/url";
import { requireProjectAccess } from '@/lib/serverAuth';

async function deleteProjectData(projectId: string, session?: mongoose.ClientSession) {
  const opts = session ? { session } : undefined;
  await Promise.all([
    PageView.deleteMany({ projectId }, opts),
    Event.deleteMany({ projectId }, opts),
    Goal.deleteMany({ projectId }, opts),
    Funnel.deleteMany({ projectId }, opts),
    Alert.deleteMany({ projectId }, opts)
  ]);
}

function isTransactionsUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Transaction numbers are only allowed on a replica set member or mongos|IllegalOperation.*transaction/i.test(message);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectToDatabase();
    const access = await requireProjectAccess(request, id);
    if (access instanceof NextResponse) return access;
    const project = await Project.findOne({ _id: id, workspaceId: access.project.workspaceId });
    return NextResponse.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    await connectToDatabase();
    const access = await requireProjectAccess(request, id, 'member');
    if (access instanceof NextResponse) return access;

    const updateData: {
      name?: string;
      url?: string;
      publicMode?: boolean;
      excludedIPs?: string[];
      excludedPaths?: string[];
    } = {};

    if (typeof body.name === "string") updateData.name = body.name.trim();
    if (typeof body.url === "string") {
      const normalized = normalizeProjectUrl(body.url);
      if (!normalized) {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      updateData.url = normalized.hostname;
    }
    if (typeof body.publicMode === "boolean") updateData.publicMode = body.publicMode;
    if (Array.isArray(body.excludedIPs)) {
      const ips = body.excludedIPs
        .map((v: unknown) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      const invalid = ips.filter((ip: string) => net.isIP(ip) === 0);
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid IP address: ${invalid[0]}` }, { status: 400 });
      }
      updateData.excludedIPs = ips;
    }
    if (Array.isArray(body.excludedPaths)) {
      // Normalize to a leading-slash form so wildcard prefix matching in
      // trackingService.isExcludedPath (which compares against
      // `new URL(url).pathname`, always leading-slash) behaves predictably
      // regardless of how the path was typed in Settings.
      updateData.excludedPaths = body.excludedPaths
        .map((v: unknown) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
        .map((p: string) => (p.startsWith("/") || p === "*" ? p : `/${p}`));
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 }
      );
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, workspaceId: access.project.workspaceId },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error("Error updating project:", err);
    return NextResponse.json(
      { error: err instanceof SyntaxError ? "Invalid JSON" : "Server error" },
      { status: err instanceof SyntaxError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const access = await requireProjectAccess(request, id, 'admin');
    if (access instanceof NextResponse) return access;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const project = await Project.findOneAndDelete({ _id: id, workspaceId: access.project.workspaceId }, { session });

      if (!project) {
        await session.abortTransaction();
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      await deleteProjectData(id, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction().catch(() => {});

      if (!isTransactionsUnsupportedError(error)) {
        throw error;
      }

      const project = await Project.findOne({ _id: id, workspaceId: access.project.workspaceId });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      await deleteProjectData(id);
      await Project.deleteOne({ _id: id, workspaceId: access.project.workspaceId });
    } finally {
      session.endSession();
    }

    return NextResponse.json({
      message: "Project and all associated data deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting project:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
