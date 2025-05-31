import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PageView from '@/models/PageView';
import mongoose, { isValidObjectId, PipelineStage } from 'mongoose';

interface PageViewFilter {
  projectId: mongoose.Types.ObjectId;
  country?: string;
  timestamp?: { $gte: Date };
}

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface QueryFilters {
  country?: string;
  lastSeen?: string;
  activity?: string;
}

class UserAnalyticsHandler {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly MAX_LIMIT = 100;
  private static readonly RECENT_EVENTS_LIMIT = 3;

  private static readonly TIME_RANGES = {
    lastHour: () => new Date(Date.now() - 60 * 60 * 1000),
    today: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    },
    yesterday: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 1);
      return date;
    },
    lastWeek: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 7);
      return date;
    }
  } as const;

  private static readonly ACTIVITY_LEVELS = {
    low: { $gte: 1, $lte: 5 },
    medium: { $gt: 5, $lte: 15 },
    high: { $gt: 15 }
  } as const;

  private validateProjectId(projectId: string): mongoose.Types.ObjectId {
    if (!isValidObjectId(projectId)) {
      throw new Error('Invalid project ID format');
    }
    return new mongoose.Types.ObjectId(projectId);
  }

  private extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
    const page = Math.max(1, parseInt(searchParams.get('page') || String(UserAnalyticsHandler.DEFAULT_PAGE)));
    const limit = Math.min(
      UserAnalyticsHandler.MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(UserAnalyticsHandler.DEFAULT_LIMIT)))
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  private extractQueryFilters(searchParams: URLSearchParams): QueryFilters {
    return {
      country: searchParams.get('country') || undefined,
      lastSeen: searchParams.get('lastSeen') || undefined,
      activity: searchParams.get('activity') || undefined
    };
  }

  private buildBaseFilter(projectId: mongoose.Types.ObjectId, filters: QueryFilters): PageViewFilter {
    const baseFilter: PageViewFilter = { projectId };

    if (filters.country) {
      baseFilter.country = filters.country;
    }

    if (filters.lastSeen && filters.lastSeen in UserAnalyticsHandler.TIME_RANGES) {
      const timeCalculator = UserAnalyticsHandler.TIME_RANGES[filters.lastSeen as keyof typeof UserAnalyticsHandler.TIME_RANGES];
      baseFilter.timestamp = { $gte: timeCalculator() };
    }

    return baseFilter;
  }

  private buildActivityFilter(activity?: string): PipelineStage[] {
    if (!activity || !(activity.toLowerCase() in UserAnalyticsHandler.ACTIVITY_LEVELS)) {
      return [];
    }

    const activityLevel = activity.toLowerCase() as keyof typeof UserAnalyticsHandler.ACTIVITY_LEVELS;
    const condition = UserAnalyticsHandler.ACTIVITY_LEVELS[activityLevel];

    return [{ $match: { activityCount: condition } }];
  }

  private createBasePipeline(filter: PageViewFilter): PipelineStage[] {
    return [
      { $match: filter },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$sessionId',
          userId: { $first: '$sessionId' },
          country: { $first: '$country' },
          lastSeen: { $max: '$timestamp' },
          firstSeen: { $min: '$timestamp' },
          browser: { $first: '$browser' },
          device: { $first: '$device' },
          os: { $first: '$os' },
          paths: { $addToSet: '$path' },
          activityCount: { $sum: 1 }
        }
      }
    ];
  }

  private createRecentEventsLookup(projectId: mongoose.Types.ObjectId): PipelineStage {
    return {
      $lookup: {
        from: 'events',
        let: { userSessionId: '$_id', pId: projectId },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$sessionId', '$$userSessionId'] },
                  { $eq: ['$projectId', '$$pId'] }
                ]
              }
            }
          },
          { $sort: { timestamp: -1 } },
          { $limit: UserAnalyticsHandler.RECENT_EVENTS_LIMIT },
          { $project: { _id: 0, name: 1, timestamp: 1 } }
        ],
        as: 'recentEvents'
      }
    };
  }

  private createUsersPipeline(
    baseFilter: PageViewFilter,
    projectId: mongoose.Types.ObjectId,
    activityFilter: PipelineStage[],
    pagination: PaginationParams
  ): PipelineStage[] {
    return [
      ...this.createBasePipeline(baseFilter),
      ...activityFilter,
      this.createRecentEventsLookup(projectId),
      {
        $project: {
          _id: 0,
          userId: 1,
          country: 1,
          lastSeen: 1,
          firstSeen: 1,
          browser: 1,
          device: 1,
          os: 1,
          pathCount: { $size: '$paths' },
          activityCount: 1,
          recentEvents: 1
        }
      },
      { $sort: { lastSeen: -1 } },
      { $skip: pagination.skip },
      { $limit: pagination.limit }
    ];
  }

  private createCountPipeline(baseFilter: PageViewFilter, activityFilter: PipelineStage[]): PipelineStage[] {
    return [
      ...this.createBasePipeline(baseFilter),
      ...activityFilter,
      { $count: 'total' }
    ];
  }

  private async fetchCountries(projectId: mongoose.Types.ObjectId): Promise<string[]> {
    const countries = await PageView.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$country' } },
      { $project: { country: '$_id', _id: 0 } },
      { $sort: { country: 1 } }
    ]);

    return countries.map(c => c.country).filter(Boolean);
  }

  async handleRequest(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const { id: projectIdString } = await context.params;
      const projectId = this.validateProjectId(projectIdString);

      const searchParams = request.nextUrl.searchParams;
      const pagination = this.extractPaginationParams(searchParams);
      const queryFilters = this.extractQueryFilters(searchParams);

      const baseFilter = this.buildBaseFilter(projectId, queryFilters);
      const activityFilter = this.buildActivityFilter(queryFilters.activity);

      const usersPipeline = this.createUsersPipeline(baseFilter, projectId, activityFilter, pagination);
      const countPipeline = this.createCountPipeline(baseFilter, activityFilter);

      const [users, totalResult, countries] = await Promise.all([
        PageView.aggregate(usersPipeline),
        PageView.aggregate(countPipeline),
        this.fetchCountries(projectId)
      ]);

      const total = totalResult.length > 0 ? totalResult[0].total : 0;
      const totalPages = Math.ceil(total / pagination.limit);

      return NextResponse.json({
        users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages
        },
        filters: {
          countries
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      const status = error instanceof Error && error.message.includes('Invalid') ? 400 : 500;

      return NextResponse.json({ error: message }, { status });
    }
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const handler = new UserAnalyticsHandler();
  return handler.handleRequest(request, context);
}