import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../../../lib/mongodb";
import PageView from "../../../../../models/PageView";
import Event from "../../../../../models/Event";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Update the type of context.params
) {
  try {
    const routeParams = await context.params; // Await the params
    const id = routeParams.id; // Access id from the resolved params

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get('dateRange') || 'Last 30 days';
    
    await connectToDatabase();
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date(); // Changed let to const
    
    switch (dateRange) {
      case 'Last 7 days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'Last 30 days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'Last 3 months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'Last 6 months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      default:
        startDate.setDate(now.getDate() - 30); // Default to last 30 days
    }
    
    // Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    const projectId = new mongoose.Types.ObjectId(id);
    
    // Get total page views and unique visitors (by sessionId)
    const totalPageViews = await PageView.countDocuments({
      projectId,
      timestamp: { $gte: startDate }
    });
    
    const uniqueVisitors = await PageView.distinct('sessionId', {
      projectId,
      timestamp: { $gte: startDate }
    });
    
    // Get page views by path
    const pagesByViews = await PageView.aggregate([
      { $match: { projectId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$path', users: { $addToSet: '$sessionId' }, count: { $sum: 1 } } },
      { $project: { path: '$_id', users: { $size: '$users' }, views: '$count', _id: 0 } },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);
    
    // Get referrers
    const sources = await PageView.aggregate([
      { $match: { projectId, timestamp: { $gte: startDate }, referrer: { $ne: '' } } },
      { $group: { _id: '$referrer', users: { $addToSet: '$sessionId' } } },
      { $project: { name: '$_id', users: { $size: '$users' }, _id: 0 } },
      { $sort: { users: -1 } },
      { $limit: 15 }
    ]);
    
    // Get users by country
    const usersByCountry = await PageView.aggregate([
      { $match: { projectId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$country', users: { $addToSet: '$sessionId' } } },
      { $project: { country: '$_id', users: { $size: '$users' }, _id: 0 } },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);
    
    // Get users by browser
    const usersByBrowser = await PageView.aggregate([
      { $match: { projectId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$browser', users: { $addToSet: '$sessionId' } } },
      { $project: { browser: '$_id', users: { $size: '$users' }, _id: 0 } },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);
    
    // Get users by device
    const usersByDevice = await PageView.aggregate([
      { $match: { projectId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$device', users: { $addToSet: '$sessionId' } } },
      { $project: { device: '$_id', users: { $size: '$users' }, _id: 0 } },
      { $sort: { users: -1 } },
      { $limit: 3 }
    ]);
    
    // Get monthly data for charts
    const months = [];
    const monthlyPageViews = [];
    const monthlyUniqueUsers = [];
    
    // Create data for last 6 months
    for (let i = 5; i >= 0; i--) {
      const currentStartDate = new Date();
      currentStartDate.setMonth(now.getMonth() - i);
      currentStartDate.setDate(1);
      
      const currentEndDate = new Date();
      currentEndDate.setMonth(now.getMonth() - i + 1);
      currentEndDate.setDate(0);
      
      // Month name (short)
      const monthName = currentStartDate.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      // Count page views for this month
      const monthPageViewsCount = await PageView.countDocuments({ // Renamed to avoid conflict
        projectId,
        timestamp: { $gte: currentStartDate, $lte: currentEndDate }
      });
      monthlyPageViews.push(monthPageViewsCount);
      
      // Count unique users for this month
      const monthUniqueUsersList = await PageView.distinct('sessionId', { // Renamed to avoid conflict
        projectId,
        timestamp: { $gte: currentStartDate, $lte: currentEndDate }
      });
      monthlyUniqueUsers.push(monthUniqueUsersList.length);
    }
    
    // Calculate growth percentage (compare current month with previous month)
    const currentMonthUsers = monthlyUniqueUsers[5] || 0;
    const previousMonthUsers = monthlyUniqueUsers[4] || 1; // Avoid division by zero
    const usersChange = previousMonthUsers === 0 ? (currentMonthUsers > 0 ? 100 : 0) : Math.round(((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100);
    
    const currentMonthViews = monthlyPageViews[5] || 0;
    const previousMonthViews = monthlyPageViews[4] || 1; // Avoid division by zero
    const viewsChange = previousMonthViews === 0 ? (currentMonthViews > 0 ? 100 : 0) : Math.round(((currentMonthViews - previousMonthViews) / previousMonthViews) * 100);
    
    // Get recent events
    const recentEvents = await Event.find({ projectId })
      .sort({ timestamp: -1 })
      .limit(10);
    
    return NextResponse.json({
      uniqueUsers: {
        total: uniqueVisitors.length,
        change: usersChange,
        monthly: monthlyUniqueUsers
      },
      pageViews: {
        total: totalPageViews,
        change: viewsChange,
        monthly: monthlyPageViews
      },
      pages: pagesByViews,
      sources,
      usersByCountry,
      usersByBrowser,
      usersByDevice,
      months,
      events: recentEvents
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}