import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PageView from '@/models/PageView';
import mongoose, { isValidObjectId, PipelineStage } from 'mongoose'; // Import mongoose and PipelineStage

// Define an interface for the filter
interface PageViewFilter {
  projectId: mongoose.Types.ObjectId;
  country?: string;
  timestamp?: { $gte: Date };
  // Add other potential filter properties here if needed
}

// Define an interface for activity conditions
interface ActivityCondition {
  activityCount?: { $gte?: number; $lte?: number; $gt?: number };
}


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Access id from params - correctly await the promise
    const { id: projectIdString } = await context.params; // Renamed for clarity
    
    // Validate project ID
    if (!isValidObjectId(projectIdString)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }
    
    const projectId = new mongoose.Types.ObjectId(projectIdString); // Convert to ObjectId

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const country = searchParams.get('country');
    const lastSeen = searchParams.get('lastSeen');
    const activity = searchParams.get('activity'); 
    
    // Build initial filter query based on projectId, country, and lastSeen
    const initialFilter: PageViewFilter = { projectId: projectId }; // Use ObjectId and the defined interface
    
    if (country) {
      initialFilter.country = country;
    }
    
    if (lastSeen) {
      const now = new Date();
      let timeAgo;
      
      switch (lastSeen) {
        case 'lastHour':
          timeAgo = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'today':
          timeAgo = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'yesterday':
          timeAgo = new Date(now.setHours(0, 0, 0, 0));
          timeAgo.setDate(timeAgo.getDate() - 1);
          break;
        case 'lastWeek':
          timeAgo = new Date(now.setHours(0, 0, 0, 0));
          timeAgo.setDate(timeAgo.getDate() - 7);
          break;
        default:
          timeAgo = null;
      }
      
      if (timeAgo) {
        initialFilter.timestamp = { $gte: timeAgo };
      }
    }

    // Add this log to inspect the filter being applied
    console.log('Applying initial filter:', JSON.stringify(initialFilter));
    
    // Pagination calculation
    const skip = (page - 1) * limit;

    // Define common aggregation stages used for both fetching users and counting total
    const commonPipelineStages: PipelineStage[] = [ // Use PipelineStage[]
      { $match: initialFilter }, // Match documents first
      { 
        $sort: { timestamp: -1 } // Sort by timestamp to get the $first correct fields in $group
      },
      {
        $group: { // Group by session to identify unique users and their aggregate data
          _id: '$sessionId',
          userId: { $first: '$sessionId' },
          country: { $first: '$country' },
          lastSeen: { $first: '$timestamp' },
          browser: { $first: '$browser' },
          device: { $first: '$device' },
          os: { $first: '$os' },
          paths: { $addToSet: '$path' },
          activityCount: { $sum: 1 }, // Calculate activity count for each user session
        }
      },
    ];

    // Dynamically add activity filter stage if 'activity' param is present
    const activityFilterStages: PipelineStage[] = []; // Use PipelineStage[]
    if (activity) {
      let activityCondition: ActivityCondition = {}; // Use the defined interface
      // Define activity levels based on activityCount. Adjust ranges as needed.
      switch (activity.toLowerCase()) {
        case 'low': // Example: 1-5 activities
          activityCondition = { activityCount: { $gte: 1, $lte: 5 } };
          break;
        case 'medium': // Example: 6-15 activities
          activityCondition = { activityCount: { $gt: 5, $lte: 15 } };
          break;
        case 'high': // Example: >15 activities
          activityCondition = { activityCount: { $gt: 15 } };
          break;
        // If activity param is unrecognized, no activity filter is applied.
      }
      if (Object.keys(activityCondition).length > 0) {
        activityFilterStages.push({ $match: activityCondition });
        console.log('Applying activity filter:', JSON.stringify(activityCondition));
      }
    }
    
    // Aggregate to get unique users with their last activity, including activity filter
    const usersAggregationPipeline = [
      ...commonPipelineStages,
      ...activityFilterStages, // Apply activity filter here
      {
        $project: { // Project the desired fields for the response
          _id: 0,
          userId: 1,
          country: 1,
          lastSeen: 1,
          browser: 1,
          device: 1,
          os: 1,
          pathCount: { $size: '$paths' },
          activityCount: 1
        }
      },
      {
        $sort: { lastSeen: -1 as -1 } // Sort the final user list
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];

    const users = await PageView.aggregate(usersAggregationPipeline);

    // Add this log to see the direct result of the aggregation
    console.log(`Found ${users.length} users after all filters and pagination.`);

    // Get total count for pagination, applying all relevant filters including activity
    const totalUsersAggregationPipeline = [
      ...commonPipelineStages,
      ...activityFilterStages, // Ensure activity filter is applied for total count
      { $count: 'total' }
    ];
    
    const totalUsersResult = await PageView.aggregate(totalUsersAggregationPipeline);

    const total = totalUsersResult.length > 0 ? totalUsersResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);
    
    // Get list of all countries for filters
    const countries = await PageView.aggregate([
      { $match: { projectId: projectId } }, // Use ObjectId
      { $group: { _id: '$country' } },
      { $project: { country: '$_id', _id: 0 } },
      { $sort: { country: 1 } }
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      filters: {
        countries: countries.map(c => c.country).filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}