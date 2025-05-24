import { Types } from 'mongoose';
import PageView from '../../../../models/PageView';
import Event from '../../../../models/Event';
import type {
  QueryOptions,
  AnalyticsResponse,
  MetricData,
  PageData,
  SourceData,
  CountryData,
  BrowserData,
  DeviceData,
  EventData,
  RecentEvent,
  TimeRange
} from '../types';
import { 
  getDateRangeDetails, 
  generateTimeLabels, 
  calculatePercentageChange,
  createDateBucketKey,
  generateTimeBuckets
} from '../utils/dateUtils';

// Types for MongoDB aggregation
// interface MongoMatch {
//   projectId: Types.ObjectId;
//   timestamp: {
//     $gte: Date;
//     $lte: Date;
//   };
//   country?: { $in: string[] };
//   browser?: { $in: string[] };
//   device?: { $in: string[] };
//   source?: { $in: string[] };
// }

// interface TimeSeriesDataPoint {
//   _id: {
//     year?: number;
//     month?: number;
//     day?: number;
//     hour?: number;
//     minute?: number;
//     week?: number;
//   };
//   count: number;
// }

interface GranularityType {
  minute: string;
  hour: string;
  day: string;
  week: string;
  month: string;
}

/**
 * Analytics Service
 * Handles all analytics data retrieval and processing
 */
export class AnalyticsService {

  /**
   * Get comprehensive analytics data for a project
   */
  async getAnalytics(options: QueryOptions): Promise<AnalyticsResponse> {
    const { projectId, dateRange, timezone = 'UTC', filters } = options;

    // Validate project ID
    if (!Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }

    const projectObjectId = new Types.ObjectId(projectId);
    const { timeRange, config, previousRange } = getDateRangeDetails(dateRange, timezone);

    // Build base match conditions
    const baseMatch = this.buildBaseMatch(projectObjectId, timeRange, filters);
    const previousMatch = this.buildBaseMatch(projectObjectId, previousRange, filters);

    // Execute all queries in parallel for better performance
    const [
      uniqueUsers,
      pageViews,
      sessions,
      bounceRate,
      avgSessionDuration,
      pages,
      sources,
      countries,
      browsers,
      devices,
      topEvents,
      recentEvents
    ] = await Promise.all([
      this.getUniqueUsers(baseMatch, previousMatch, timeRange, config.granularity),
      this.getPageViews(baseMatch, previousMatch, timeRange, config.granularity),
      this.getSessions(baseMatch, previousMatch, timeRange, config.granularity),
      this.getBounceRate(baseMatch, previousMatch),
      this.getAvgSessionDuration(baseMatch, previousMatch),
      this.getTopPages(baseMatch),
      this.getTopSources(baseMatch),
      this.getUsersByCountry(baseMatch),
      this.getUsersByBrowser(baseMatch),
      this.getUsersByDevice(baseMatch),
      this.getTopEvents(projectObjectId, timeRange),
      this.getRecentEvents()
    ]);

    return {
      timeRange,
      granularity: config.granularity,
      uniqueUsers,
      pageViews,
      sessions,
      bounceRate,
      avgSessionDuration,
      pages,
      sources,
      countries,
      browsers,
      devices,
      topEvents,
      recentEvents
    };
  }

  /**
   * Build base MongoDB match conditions
   */
  private buildBaseMatch(
    projectId: Types.ObjectId,
    timeRange: TimeRange,
    filters?: QueryOptions['filters']
  ): Record<string, unknown> {
    const match: Record<string, unknown> = {
      projectId,
      timestamp: {
        $gte: new Date(timeRange.start),
        $lte: new Date(timeRange.end)
      }
    };

    if (filters) {
      if (filters.country?.length) {
        match.country = { $in: filters.country };
      }
      if (filters.browser?.length) {
        match.browser = { $in: filters.browser };
      }
      if (filters.device?.length) {
        match.device = { $in: filters.device };
      }
      if (filters.source?.length) {
        match.source = { $in: filters.source };
      }
    }

    return match;
  }

  /**
   * Get unique users metric with time series data
   */
  private async getUniqueUsers(
    baseMatch: Record<string, unknown>,
    previousMatch: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<MetricData> {
    const [currentData, previousData, timeSeriesData] = await Promise.all([
      this.getTotalUniqueUsers(baseMatch),
      this.getTotalUniqueUsers(previousMatch),
      this.getUniqueUsersTimeSeries(baseMatch, timeRange, granularity)
    ]);

    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const change = calculatePercentageChange(currentData, previousData);

    return {
      total: currentData,
      previous: previousData,
      change,
      data: timeSeriesData,
      labels
    };
  }

  /**
   * Get page views metric with time series data
   */
  private async getPageViews(
    baseMatch: Record<string, unknown>,
    previousMatch: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<MetricData> {
    const [currentData, previousData, timeSeriesData] = await Promise.all([
      this.getTotalPageViews(baseMatch),
      this.getTotalPageViews(previousMatch),
      this.getPageViewsTimeSeries(baseMatch, timeRange, granularity)
    ]);

    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const change = calculatePercentageChange(currentData, previousData);

    return {
      total: currentData,
      previous: previousData,
      change,
      data: timeSeriesData,
      labels
    };
  }

  /**
   * Get sessions metric with time series data
   */
  private async getSessions(
    baseMatch: Record<string, unknown>,
    previousMatch: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<MetricData> {
    const [currentData, previousData, timeSeriesData] = await Promise.all([
      this.getTotalSessions(baseMatch),
      this.getTotalSessions(previousMatch),
      this.getSessionsTimeSeries(baseMatch, timeRange, granularity)
    ]);

    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const change = calculatePercentageChange(currentData, previousData);

    return {
      total: currentData,
      previous: previousData,
      change,
      data: timeSeriesData,
      labels
    };
  }

  /**
   * Get bounce rate metric
   */
  private async getBounceRate(
    baseMatch: Record<string, unknown>,
    previousMatch: Record<string, unknown>
  ): Promise<MetricData> {
    const [currentBounceRate, previousBounceRate] = await Promise.all([
      this.calculateBounceRate(baseMatch),
      this.calculateBounceRate(previousMatch)
    ]);

    const change = calculatePercentageChange(currentBounceRate, previousBounceRate);

    return {
      total: Math.round(currentBounceRate * 100) / 100,
      previous: Math.round(previousBounceRate * 100) / 100,
      change,
      data: [],
      labels: []
    };
  }

  /**
   * Get average session duration metric
   */
  private async getAvgSessionDuration(
    baseMatch: Record<string, unknown>,
    previousMatch: Record<string, unknown>
  ): Promise<MetricData> {
    const [currentDuration, previousDuration] = await Promise.all([
      this.calculateAvgSessionDuration(baseMatch),
      this.calculateAvgSessionDuration(previousMatch)
    ]);

    const change = calculatePercentageChange(currentDuration, previousDuration);

    return {
      total: Math.round(currentDuration),
      previous: Math.round(previousDuration),
      change,
      data: [],
      labels: []
    };
  }

  /**
   * Get total unique users count
   */
  private async getTotalUniqueUsers(match: Record<string, unknown>): Promise<number> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          count: { $size: '$uniqueUsers' }
        }
      }
    ]);

    return result[0]?.count || 0;
  }

  /**
   * Get total page views count
   */
  private async getTotalPageViews(match: Record<string, unknown>): Promise<number> {
    return await PageView.countDocuments(match);
  }

  /**
   * Get total sessions count
   */
  private async getTotalSessions(match: Record<string, unknown>): Promise<number> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId'
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0]?.count || 0;
  }

  /**
   * Get unique users time series data
   */
  private async getUniqueUsersTimeSeries(
    match: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<number[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            sessionId: '$sessionId',
            timestamp: '$timestamp'
          }
        }
      },
      {
        $group: {
          _id: '$_id.sessionId',
          firstTimestamp: { $min: '$_id.timestamp' }
        }
      }
    ]);

    // Create bucket-to-label mapping
    const buckets = generateTimeBuckets(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    
    // Map each result to the correct time bucket
    const dataMap = new Map<number, Set<string>>();
    
    result.forEach(item => {
      const timestamp = new Date(item.firstTimestamp);
      const bucketIndex = this.findBucketIndex(timestamp, buckets, granularity);
      if (bucketIndex !== -1) {
        if (!dataMap.has(bucketIndex)) {
          dataMap.set(bucketIndex, new Set());
        }
        dataMap.get(bucketIndex)!.add(item._id);
      }
    });

    // Convert to count array matching the labels
    return labels.map((_, index) => {
      return dataMap.get(index)?.size || 0;
    });
  }

  /**
   * Get page views time series data
   */
  private async getPageViewsTimeSeries(
    match: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<number[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $project: {
          timestamp: 1
        }
      }
    ]);

    // Create bucket-to-label mapping
    const buckets = generateTimeBuckets(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    
    // Map each result to the correct time bucket
    const dataMap = new Map<number, number>();
    
    result.forEach(item => {
      const timestamp = new Date(item.timestamp);
      const bucketIndex = this.findBucketIndex(timestamp, buckets, granularity);
      if (bucketIndex !== -1) {
        dataMap.set(bucketIndex, (dataMap.get(bucketIndex) || 0) + 1);
      }
    });

    // Convert to count array matching the labels
    return labels.map((_, index) => {
      return dataMap.get(index) || 0;
    });
  }

  /**
   * Get sessions time series data
   */
  private async getSessionsTimeSeries(
    match: Record<string, unknown>,
    timeRange: TimeRange,
    granularity: keyof GranularityType
  ): Promise<number[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId',
          firstTimestamp: { $min: '$timestamp' }
        }
      }
    ]);

    // Create bucket-to-label mapping
    const buckets = generateTimeBuckets(new Date(timeRange.start), new Date(timeRange.end), granularity);
    const labels = generateTimeLabels(new Date(timeRange.start), new Date(timeRange.end), granularity);
    
    // Map each result to the correct time bucket
    const dataMap = new Map<number, number>();
    
    result.forEach(item => {
      const timestamp = new Date(item.firstTimestamp);
      const bucketIndex = this.findBucketIndex(timestamp, buckets, granularity);
      if (bucketIndex !== -1) {
        dataMap.set(bucketIndex, (dataMap.get(bucketIndex) || 0) + 1);
      }
    });

    // Convert to count array matching the labels
    return labels.map((_, index) => {
      return dataMap.get(index) || 0;
    });
  }

  /**
   * Calculate bounce rate
   */
  private async calculateBounceRate(match: Record<string, unknown>): Promise<number> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId',
          pageCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          bouncedSessions: {
            $sum: {
              $cond: [{ $eq: ['$pageCount', 1] }, 1, 0]
            }
          }
        }
      }
    ]);

    const data = result[0];
    if (!data || data.totalSessions === 0) return 0;
    
    return (data.bouncedSessions / data.totalSessions) * 100;
  }

  /**
   * Calculate average session duration
   */
  private async calculateAvgSessionDuration(match: Record<string, unknown>): Promise<number> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sessionId',
          minTime: { $min: '$timestamp' },
          maxTime: { $max: '$timestamp' },
          pageCount: { $sum: 1 }
        }
      },
      {
        $match: {
          pageCount: { $gt: 1 } // Only consider sessions with multiple pages
        }
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$maxTime', '$minTime'] },
              1000 // Convert to seconds
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    return result[0]?.avgDuration || 0;
  }

  /**
   * Get top pages data
   */
  private async getTopPages(match: Record<string, unknown>): Promise<PageData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$path',
          views: { $sum: 1 },
          users: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          path: '$_id',
          views: 1,
          users: { $size: '$users' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 20 }
    ]);

    return result.map(item => ({
      path: item.path,
      views: item.views,
      users: item.users
    }));
  }

  /**
   * Get top traffic sources
   */
  private async getTopSources(match: Record<string, unknown>): Promise<SourceData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ['$referrer', null] }, { $ne: ['$referrer', ''] }] },
              {
                $let: {
                  vars: {
                    regexResult: { $regexFind: { input: '$referrer', regex: /^https?:\/\/([^\/]+)/ } }
                  },
                  in: { $arrayElemAt: ['$$regexResult.captures', 0] }
                }
              },
              'Direct'
            ]
          },
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          name: { $ifNull: ['$_id', 'Unknown'] },
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      name: item.name,
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get users by country
   */
  private async getUsersByCountry(match: Record<string, unknown>): Promise<CountryData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$country',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          country: '$_id',
          countryCode: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      country: item.country || 'Unknown',
      countryCode: item.countryCode || 'UN',
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get users by browser
   */
  private async getUsersByBrowser(match: Record<string, unknown>): Promise<BrowserData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$browser',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          browser: '$_id',
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      browser: item.browser || 'Unknown',
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get users by device
   */
  private async getUsersByDevice(match: Record<string, unknown>): Promise<DeviceData[]> {
    const result = await PageView.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$device',
          users: { $addToSet: '$sessionId' },
          sessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          device: '$_id',
          category: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'mobile'] }, then: 'mobile' },
                { case: { $eq: ['$_id', 'tablet'] }, then: 'tablet' }
              ],
              default: 'desktop'
            }
          },
          users: { $size: '$users' },
          sessions: { $size: '$sessions' }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      device: item.device || 'desktop',
      category: item.category,
      users: item.users,
      sessions: item.sessions
    }));
  }

  /**
   * Get top events
   */
  private async getTopEvents(
    projectId: Types.ObjectId,
    timeRange: TimeRange
  ): Promise<EventData[]> {
    const result = await Event.aggregate([
      {
        $match: {
          projectId,
          timestamp: {
            $gte: new Date(timeRange.start),
            $lte: new Date(timeRange.end)
          }
        }
      },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      name: item.name,
      count: item.count,
      uniqueUsers: item.uniqueUsers
    }));
  }

  /**
   * Get recent events
   */
  private async getRecentEvents(
    // projectId: Types.ObjectId,
    // timeRange: TimeRange
  ): Promise<RecentEvent[]> {
    // Temporarily return empty array to avoid TypeScript compilation error
    // TODO: Fix Event model typing issue
    return [];
  }

  /**
   * Find the correct bucket index for a given timestamp
   */
  private findBucketIndex(
    timestamp: Date,
    buckets: Date[],
    granularity: keyof GranularityType
  ): number {
    for (let i = 0; i < buckets.length; i++) {
      const bucketStart = buckets[i];
      const bucketEnd = this.getBucketEnd(bucketStart, granularity);
      
      if (timestamp >= bucketStart && timestamp < bucketEnd) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get the end time for a time bucket
   */
  private getBucketEnd(bucketStart: Date, granularity: keyof GranularityType): Date {
    const end = new Date(bucketStart);
    
    switch (granularity) {
      case 'minute':
        end.setMinutes(end.getMinutes() + 1);
        break;
      case 'hour':
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case 'month':
        end.setMonth(end.getMonth() + 1);
        break;
    }
    
    return end;
  }

  /**
   * Convert label back to bucket key for mapping
   */
  private labelToBucketKey(
    label: string, 
    granularity: keyof GranularityType, 
    startDate: Date,
    endDate: Date
  ): string {
    const buckets = generateTimeBuckets(startDate, endDate, granularity);
    const labels = generateTimeLabels(startDate, endDate, granularity);
    
    const index = labels.indexOf(label);
    if (index !== -1 && index < buckets.length) {
      return createDateBucketKey(buckets[index], granularity);
    }
    
    return '';
  }
}