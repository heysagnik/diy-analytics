import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../lib/mongodb";
import Project from "../../../models/Project";

// Get all projects
export async function GET() {
  try {
    await connectToDatabase();
    const projects = await Project.find().sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url } = body;
    
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Create clean URL without protocol
    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    const project = new Project({
      name,
      url: cleanUrl
    });
    
    await project.save();
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}