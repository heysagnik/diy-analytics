import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../../lib/mongodb";
import Project from "../../../../models/Project";
import mongoose from "mongoose";

// GET /api/projects/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectToDatabase();
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PATCH /api/projects/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const { name, url, excludedIPs, excludedPaths } = await request.json();
    await connectToDatabase();

    const updateData: {
      name?: string;
      url?: string;
      excludedIPs?: string[];
      excludedPaths?: string[];
    } = {};

    if (name !== undefined) updateData.name = name;
    if (typeof url === "string") {
      updateData.url = url.replace(/^(https?:\/\/)?(www\.)?/, "");
    }
    if (excludedIPs) updateData.excludedIPs = excludedIPs;
    if (excludedPaths) updateData.excludedPaths = excludedPaths;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 }
      );
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
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

// DELETE /api/projects/:id
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
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Error deleting project:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}