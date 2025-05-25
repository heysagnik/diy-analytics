import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../lib/mongodb";
import Project from "../../../models/Project";
import PageView from "../../../models/PageView"; // Added for analytics
import mongoose from "mongoose"; // Added for analytics

// Helper function to get analytics summary for a project
async function getAnalyticsSummary(projectId: mongoose.Types.ObjectId) {
  try {
    const now = new Date();
    const startDate30Days = new Date(now);
    startDate30Days.setDate(now.getDate() - 29);
    startDate30Days.setHours(0, 0, 0, 0);

    const endDate30Days = new Date(now);
    endDate30Days.setHours(23, 59, 59, 999);

    const previousPeriodStartDate = new Date(startDate30Days);
    previousPeriodStartDate.setDate(startDate30Days.getDate() - 30);
    const previousPeriodEndDate = new Date(startDate30Days);
    previousPeriodEndDate.setDate(startDate30Days.getDate() - 1);
    previousPeriodEndDate.setHours(23, 59, 59, 999);

    const [
      totalUniqueUsersCurrent,
      totalPageViewsCurrent,
      totalUniqueUsersPrevious,
    ] = await Promise.all([
      PageView.distinct('sessionId', { projectId, timestamp: { $gte: startDate30Days, $lte: endDate30Days } }).then(sessions => sessions.length),
      PageView.countDocuments({ projectId, timestamp: { $gte: startDate30Days, $lte: endDate30Days } }),
      PageView.distinct('sessionId', { projectId, timestamp: { $gte: previousPeriodStartDate, $lte: previousPeriodEndDate } }).then(sessions => sessions.length),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const uniqueUsersChange = calculateChange(totalUniqueUsersCurrent, totalUniqueUsersPrevious);
    
    return {
      views: totalPageViewsCurrent || 0,
      users: totalUniqueUsersCurrent || 0,
      growth: uniqueUsersChange >= 0 ? `+${uniqueUsersChange}%` : `${uniqueUsersChange}%`,
    };
  } catch (error) {
    console.error(`Error fetching analytics for project ${projectId}:`, error);
    return { views: 0, users: 0, growth: "+0%" }; // Default values on error
  }
}


// Get all projects
export async function GET() {
  try {
    await connectToDatabase();
    const projectsFromDB = await Project.find().sort({ createdAt: -1 }).lean(); // Use .lean() for plain JS objects

    const projectsWithAnalytics = await Promise.all(
      projectsFromDB.map(async (project) => {
        const analyticsSummary = await getAnalyticsSummary(project._id as mongoose.Types.ObjectId);
        return {
          ...project,
          analytics: analyticsSummary,
        };
      })
    );

    return NextResponse.json(projectsWithAnalytics);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NewProjectData } from "../../../lib/api/projects"; // Import NewProjectData

// Create a new project
export async function POST(req: NextRequest) {
  try {
    // Type the request body according to NewProjectData
    const body: NewProjectData = await req.json();
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