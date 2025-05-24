import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../../../lib/mongodb";
import PageView from "../../../../../models/PageView";
import Event from "../../../../../models/Event";
import mongoose, { Types } from "mongoose";

const DEFAULT_DATE_RANGE = "Last 30 days";
const MAX_DATA_POINTS_DEFAULT = 30; // For daily views like "Last 30 days"
const MAX_DATA_POINTS_HOURLY = 24; // For "Last 24 hours"

interface DateRangeDetails {
  startDate: Date;
  endDate: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
  labels: string[];
  dataPoints: number;
  previousPeriodStartDate: Date;
  previousPeriodEndDate: Date;
}

interface MetricData {
  total: number;
  change: number;
  data: number[];
  hourly: number[];
  daily: number[];
  weekly: number[];
  monthly: number[];
}

interface PageData {
  path: string;
  users: number;
  views: number;
}

interface SourceData {
  name: string;
  users: number;
}

interface CountryData {
  country: string;
  users: number;
}

interface BrowserData {
  browser: string;
  users: number;
}

interface DeviceData {
  device: string;
  users: number;
}

interface EventData {
  name: string;
  count: number;
}

interface RecentEvent {
  _id: string;
  name: string;
  timestamp: Date;
  [key: string]: unknown;
}

interface AnalyticsResponse {
  uniqueUsers: MetricData;
  pageViews: MetricData;
  labels: string[];
  pages: PageData[];
  sources: SourceData[];
  usersByCountry: CountryData[];
  usersByBrowser: BrowserData[];
  usersByDevice: DeviceData[];
  eventAnalytics: {
    topEvents: EventData[];
    recentEvents: RecentEvent[];
  };
}

function getShortMonthName(date: Date): string {
  return date.toLocaleString('default', { month: 'short' });
}

function getHourLabel(date: Date): string {
  return date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDayLabel(date: Date): string {
  return `${getShortMonthName(date)} ${date.getDate()}`;
}

function getWeekLabel(date: Date): string {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return `${getShortMonthName(startOfWeek)} ${startOfWeek.getDate()} - ${getShortMonthName(endOfWeek)} ${endOfWeek.getDate()}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateRangeDetails(dateRange: string, now: Date = new Date()): DateRangeDetails {
  const endDate = new Date(now);
  const startDate = new Date(now);
  let granularity: 'hour' | 'day' | 'week' | 'month' = 'day';
  const labels: string[] = [];
  let dataPoints = MAX_DATA_POINTS_DEFAULT;
  
  const previousPeriodStartDate = new Date(now);
  const previousPeriodEndDate = new Date(now);

  switch (dateRange) {
    case 'Last hour':
    case 'Last 24 hours':
      startDate.setHours(now.getHours() - 23, 0, 0, 0);
      granularity = 'hour';
      dataPoints = MAX_DATA_POINTS_HOURLY;
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setHours(startDate.getHours() + i);
        labels.push(getHourLabel(d));
      }
      previousPeriodStartDate.setDate(startDate.getDate() - 1);
      previousPeriodEndDate.setDate(endDate.getDate() - 1);
      break;
      
    case 'Last 7 days':
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      granularity = 'day';
      dataPoints = 7;
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        labels.push(getDayLabel(d));
      }
      previousPeriodStartDate.setDate(startDate.getDate() - dataPoints);
      previousPeriodEndDate.setDate(startDate.getDate() - 1);
      previousPeriodEndDate.setHours(23, 59, 59, 999);
      break;
      
    case 'Last 30 days':
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      granularity = 'day';
      dataPoints = MAX_DATA_POINTS_DEFAULT;
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        labels.push(getDayLabel(d));
      }
      previousPeriodStartDate.setDate(startDate.getDate() - dataPoints);
      previousPeriodEndDate.setDate(startDate.getDate() - 1);
      previousPeriodEndDate.setHours(23, 59, 59, 999);
      break;
      
    case 'Last 3 months':
      startDate.setMonth(now.getMonth() - 2);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      granularity = 'week';
      
      // Use weekly granularity for 3 months to reduce data points
      const startWeek = getWeekStart(startDate);
      const endWeek = getWeekStart(endDate);
      const currentWeek = new Date(startWeek);
      
      while (currentWeek <= endWeek) {
        labels.push(getWeekLabel(currentWeek));
        currentWeek.setDate(currentWeek.getDate() + 7);
      }
      
      dataPoints = labels.length;
      previousPeriodStartDate.setMonth(startDate.getMonth() - 3);
      previousPeriodEndDate.setDate(0);
      break;
      
    case 'Last 6 months':
      startDate.setMonth(now.getMonth() - 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      granularity = 'month';
      
      // Use monthly granularity for 6 months
      for (let i = 0; i < 6; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        labels.push(getMonthLabel(d));
      }
      
      dataPoints = labels.length;
      previousPeriodStartDate.setMonth(startDate.getMonth() - 6);
      previousPeriodEndDate.setDate(0);
      break;
      
    default: // Fallback to Last 30 days
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      granularity = 'day';
      dataPoints = MAX_DATA_POINTS_DEFAULT;
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        labels.push(getDayLabel(d));
      }
      previousPeriodStartDate.setDate(startDate.getDate() - dataPoints);
      previousPeriodEndDate.setDate(startDate.getDate() - 1);
      previousPeriodEndDate.setHours(23, 59, 59, 999);
  }
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate, granularity, labels, dataPoints, previousPeriodStartDate, previousPeriodEndDate };
}

async function getAggregatedTimeSeries(
  projectId: Types.ObjectId,
  dateDetails: DateRangeDetails,
  metric: 'pageviews' | 'uniqueUsers'
) {
  const { startDate, endDate, granularity, dataPoints } = dateDetails;
  let groupByFormat: string;
  const dateField = '$timestamp';

  switch (granularity) {
    case 'hour':
      groupByFormat = '%Y-%m-%dT%H:00:00.000Z';
      break;
    case 'week':
      groupByFormat = '%G-%V'; // ISO week year and week number
      break;
    case 'month':
      groupByFormat = '%Y-%m';
      break;
    case 'day':
    default:
      groupByFormat = '%Y-%m-%d';
      break;
  }

  const aggregationPipeline: mongoose.PipelineStage[] = [
    { $match: { projectId, timestamp: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: groupByFormat, date: dateField, timezone: "UTC" } },
        ...(metric === 'pageviews' ? { count: { $sum: 1 } } : { uniqueSessions: { $addToSet: '$sessionId' } })
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: metric === 'pageviews' ? '$count' : { $size: '$uniqueSessions' }
      }
    },
    { $sort: { date: 1 } }
  ];

  const results = await PageView.aggregate(aggregationPipeline);
  const dataMap = new Map(results.map(item => [item.date, item.count]));
  const filledData = new Array(dataPoints).fill(0);

  // Generate date keys based on granularity
  for (let i = 0; i < dataPoints; i++) {
    let dateKey: string;
    let tempDate: Date;
    
    switch (granularity) {
      case 'hour':
        tempDate = new Date(startDate);
        tempDate.setHours(startDate.getHours() + i);
        dateKey = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}T${String(tempDate.getHours()).padStart(2, '0')}:00:00.000Z`;
        break;
      case 'week':
        tempDate = new Date(startDate);
        tempDate.setDate(startDate.getDate() + (i * 7));
        const weekNumber = getISOWeek(tempDate);
        const weekYear = tempDate.getFullYear();
        dateKey = `${weekYear}-${String(weekNumber).padStart(2, '0')}`;
        break;
      case 'month':
        tempDate = new Date(startDate);
        tempDate.setMonth(startDate.getMonth() + i);
        dateKey = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'day':
      default:
        tempDate = new Date(startDate);
        tempDate.setDate(startDate.getDate() + i);
        dateKey = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
        break;
    }
    
    filledData[i] = dataMap.get(dateKey) || 0;
  }
  
  return filledData;
}

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function getTotalCount(
    projectId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    metric: 'pageviews' | 'uniqueUsers'
) {
    if (metric === 'pageviews') {
        return PageView.countDocuments({ projectId, timestamp: { $gte: startDate, $lte: endDate } });
    } else {
        const distinctSessions = await PageView.distinct('sessionId', { projectId, timestamp: { $gte: startDate, $lte: endDate } });
        return distinctSessions.length;
    }
}

// Cache connection to avoid connecting on every request
let cachedDb: mongoose.Connection | null = null;
async function getDbConnection() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await connectToDatabase();
  cachedDb = mongoose.connection;
  return mongoose.connection;
}

export async function GET(
  request: NextRequest
) {
  // manually extract “id” from the path `/api/projects/[id]/analytics`
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const projectIdx = parts.indexOf('projects');
  const projectIdString = parts[projectIdx + 1];

  if (!mongoose.Types.ObjectId.isValid(projectIdString)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const projectId = new mongoose.Types.ObjectId(projectIdString);

  try {
    const { searchParams } = new URL(request.url);
    const dateRangeParam = searchParams.get('dateRange') || DEFAULT_DATE_RANGE;
    
    await getDbConnection();
    const now = new Date();
    const dateDetails = getDateRangeDetails(dateRangeParam, now);

    const [
      pageViewsData,
      uniqueUsersData,
      totalPageViewsCurrent,
      totalUniqueUsersCurrent,
      totalPageViewsPrevious,
      totalUniqueUsersPrevious,
      pagesByViews,
      sources,
      usersByCountry,
      usersByBrowser,
      usersByDevice,
      topEvents,
      recentEvents,
    ] = await Promise.all([
      getAggregatedTimeSeries(projectId, dateDetails, 'pageviews'),
      getAggregatedTimeSeries(projectId, dateDetails, 'uniqueUsers'),
      getTotalCount(projectId, dateDetails.startDate, dateDetails.endDate, 'pageviews'),
      getTotalCount(projectId, dateDetails.startDate, dateDetails.endDate, 'uniqueUsers'),
      getTotalCount(projectId, dateDetails.previousPeriodStartDate, dateDetails.previousPeriodEndDate, 'pageviews'),
      getTotalCount(projectId, dateDetails.previousPeriodStartDate, dateDetails.previousPeriodEndDate, 'uniqueUsers'),
      PageView.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } } },
        { $group: { _id: '$path', users: { $addToSet: '$sessionId' }, views: { $sum: 1 } } },
        { $project: { path: '$_id', users: { $size: '$users' }, views: '$views', _id: 0 } },
        { $sort: { views: -1 } },
        { $limit: 10 }
      ]) as Promise<PageData[]>,
      PageView.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate }, referrer: { $nin: [null, ''] } } },
        { $group: { _id: '$referrer', users: { $addToSet: '$sessionId' } } },
        { $project: { name: '$_id', users: { $size: '$users' }, _id: 0 } },
        { $sort: { users: -1 } },
        { $limit: 10 }
      ]) as Promise<SourceData[]>,
      PageView.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } } },
        { $group: { _id: '$country', users: { $addToSet: '$sessionId' } } },
        { $project: { country: '$_id', users: { $size: '$users' }, _id: 0 } },
        { $sort: { users: -1 } },
        { $limit: 10 }
      ]) as Promise<CountryData[]>,
      PageView.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } } },
        { $group: { _id: '$browser', users: { $addToSet: '$sessionId' } } },
        { $project: { browser: '$_id', users: { $size: '$users' }, _id: 0 } },
        { $sort: { users: -1 } },
        { $limit: 10 }
      ]) as Promise<BrowserData[]>,
      PageView.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } } },
        { $group: { _id: '$device', users: { $addToSet: '$sessionId' } } },
        { $project: { device: '$_id', users: { $size: '$users' }, _id: 0 } },
        { $sort: { users: -1 } },
        { $limit: 5 }
      ]) as Promise<DeviceData[]>,
      Event.aggregate([
        { $match: { projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } } },
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $project: { name: '$_id', count: '$count', _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]) as Promise<EventData[]>,
      Event.find({ projectId, timestamp: { $gte: dateDetails.startDate, $lte: dateDetails.endDate } })
           .sort({ timestamp: -1 })
           .limit(10)
           .lean<RecentEvent[]>()
           .exec(),
    ]);
    
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const pageViewsChange = calculateChange(totalPageViewsCurrent, totalPageViewsPrevious);
    const uniqueUsersChange = calculateChange(totalUniqueUsersCurrent, totalUniqueUsersPrevious);

    const responseData: AnalyticsResponse = {
      uniqueUsers: {
        total: totalUniqueUsersCurrent,
        change: uniqueUsersChange,
        data: uniqueUsersData,
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      },
      pageViews: {
        total: totalPageViewsCurrent,
        change: pageViewsChange,
        data: pageViewsData,
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      },
      labels: dateDetails.labels,
      pages: pagesByViews,
      sources,
      usersByCountry,
      usersByBrowser,
      usersByDevice,
      eventAnalytics: {
        topEvents,
        recentEvents
      }
    };
    
    // Populate specific granularity arrays based on the selected dateRange
    switch (dateDetails.granularity) {
      case 'hour':
        responseData.uniqueUsers.hourly = uniqueUsersData;
        responseData.pageViews.hourly = pageViewsData;
        break;
      case 'day':
        responseData.uniqueUsers.daily = uniqueUsersData;
        responseData.pageViews.daily = pageViewsData;
        break;
      case 'week':
        responseData.uniqueUsers.weekly = uniqueUsersData;
        responseData.pageViews.weekly = pageViewsData;
        break;
      case 'month':
        responseData.uniqueUsers.monthly = uniqueUsersData;
        responseData.pageViews.monthly = pageViewsData;
        break;
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Analytics API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}