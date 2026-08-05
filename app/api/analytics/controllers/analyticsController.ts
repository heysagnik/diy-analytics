import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '../services/analyticsService';
import { QueryOptions, ErrorResponse, DATE_RANGES } from '../types';
import { normalizeTimezone } from '../utils/dateUtils';
import connectToDatabase from '../../../../lib/mongodb';
import { requireProjectAccess } from '../../../../lib/serverAuth';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  async handleGetAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const dateRange = searchParams.get('dateRange') || 'LAST_7_DAYS';
      const timezone = searchParams.get('timezone');
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;

      const filters = this.parseFilters(searchParams);

      if (dateRange === 'CUSTOM' && (!startDate || !endDate)) {
        return this.createErrorResponse('Custom date range requires startDate and endDate', 400);
      }

      const validationError = this.validateAnalyticsRequest({
        projectId,
        dateRange,
        timezone,
        filters
      });

      if (validationError) {
        return this.createErrorResponse(validationError, 400);
      }

      const access = await requireProjectAccess(request, projectId!);
      if (access instanceof NextResponse) {
        return access;
      }

      const options: QueryOptions = {
        projectId: projectId!,
        dateRange,
        timezone: normalizeTimezone(timezone || undefined),
        startDate,
        endDate,
        filters
      };

      const analyticsData = await this.analyticsService.getAnalytics(options);

      return NextResponse.json({
        success: true,
        data: analyticsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analytics Controller Error:', error);
      return this.createErrorResponse(
        'Failed to fetch analytics data',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async handleGetRealtime(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const projectId = request.nextUrl.searchParams.get('projectId');
      if (!projectId) {
        return this.createErrorResponse('Project ID is required', 400);
      }

      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) {
        return access;
      }

      const realtime = await this.analyticsService.getRealtime(projectId);

      return NextResponse.json({
        success: true,
        data: realtime,
        timestamp: new Date().toISOString()
      }, {
        headers: { 'Cache-Control': 'no-store' }
      });
    } catch (error) {
      console.error('Analytics Controller Error (realtime):', error);
      return this.createErrorResponse(
        'Failed to fetch realtime data',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * On-demand event-property endpoint — not part of the main analytics
   * bundle since it only runs when a user drills into a specific event in
   * the UI. Two modes selected by query params:
   *   ?eventName=X            -> which property keys exist on that event
   *   ?eventName=X&propertyKey=Y -> value distribution for that key
   */
  async handleGetEventProperties(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const eventName = searchParams.get('eventName');
      const propertyKey = searchParams.get('propertyKey') || undefined;
      const dateRange = searchParams.get('dateRange') || 'LAST_7_DAYS';
      const timezone = searchParams.get('timezone');
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      const filters = this.parseFilters(searchParams);

      if (!projectId) {
        return this.createErrorResponse('Project ID is required', 400);
      }
      if (!eventName) {
        return this.createErrorResponse('eventName is required', 400);
      }
      if (!DATE_RANGES[dateRange]) {
        return this.createErrorResponse(`Invalid date range. Supported ranges: ${Object.keys(DATE_RANGES).join(', ')}`, 400);
      }

      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) {
        return access;
      }

      const baseOptions = {
        projectId,
        eventName,
        dateRange,
        timezone: normalizeTimezone(timezone || undefined),
        startDate,
        endDate,
        filters
      };

      const data = propertyKey
        ? await this.analyticsService.getEventPropertyBreakdown({ ...baseOptions, propertyKey })
        : await this.analyticsService.getEventPropertyKeys(baseOptions);

      return NextResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics Controller Error (event properties):', error);
      return this.createErrorResponse(
        'Failed to fetch event property data',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async handlePostAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const body = await request.json();
      const { projectId, dateRange, timezone, filters, startDate, endDate } = body;

      if (dateRange === 'CUSTOM' && (!startDate || !endDate)) {
        return this.createErrorResponse('Custom date range requires startDate and endDate', 400);
      }

      const validationError = this.validateAnalyticsRequest({
        projectId,
        dateRange,
        timezone,
        filters
      });

      if (validationError) {
        return this.createErrorResponse(validationError, 400);
      }

      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) {
        return access;
      }

      const options: QueryOptions = {
        projectId,
        dateRange: dateRange || 'LAST_7_DAYS',
        timezone: normalizeTimezone(timezone),
        startDate,
        endDate,
        filters
      };

      const analyticsData = await this.analyticsService.getAnalytics(options);

      return NextResponse.json({
        success: true,
        data: analyticsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analytics Controller Error:', error);
      return this.createErrorResponse(
        'Failed to fetch analytics data',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private validateAnalyticsRequest(params: {
    projectId: string | null;
    dateRange: string;
    timezone?: string | null;
    filters?: QueryOptions['filters'];
  }): string | null {
    const { projectId, dateRange } = params;

    if (!projectId) {
      return 'Project ID is required';
    }

    if (!DATE_RANGES[dateRange]) {
      return `Invalid date range. Supported ranges: ${Object.keys(DATE_RANGES).join(', ')}`;
    }

    // Validate filters if provided
    if (params.filters) {
      const { country, browser, device, source, page, utmSource, utmMedium, utmCampaign, os, city } = params.filters;
      const dimensions = { country, browser, device, source, page, utmSource, utmMedium, utmCampaign, os, city };

      for (const [key, value] of Object.entries(dimensions)) {
        if (value && (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))) {
          return `${key[0].toUpperCase()}${key.slice(1)} filter must be an array of strings`;
        }
      }
    }

    return null;
  }

  private parseFilters(searchParams: URLSearchParams): QueryOptions['filters'] | undefined {
    const filters: QueryOptions['filters'] = {};
    let hasFilters = false;

    (['country', 'browser', 'device', 'source', 'page', 'utmSource', 'utmMedium', 'utmCampaign', 'os', 'city'] as const).forEach((key) => {
      const raw = searchParams.get(key);
      if (raw) {
        filters[key] = raw.split(',').map((v) => v.trim()).filter(Boolean);
        hasFilters = true;
      }
    });

    return hasFilters ? filters : undefined;
  }

  private createErrorResponse(
    message: string,
    status: number,
    details?: string | Error
  ): NextResponse {
    // Only surface raw error internals in development. In production these
    // responses are reachable by anyone who can hit an authenticated route
    // with a malformed request; the underlying message can leak query/DB
    // implementation details.
    const isDev = process.env.NODE_ENV === 'development';
    const formattedDetails: Record<string, unknown> | undefined =
      details instanceof Error
        ? isDev ? { message: details.message, name: details.name, stack: details.stack } : undefined
        : typeof details === 'string'
          ? (isDev ? { message: details } : undefined)
          : details;

    const errorResponse: ErrorResponse = {
      error: message,
      code: this.getErrorCode(status),
      details: formattedDetails,
      timestamp: new Date()
    };

    return NextResponse.json(
      {
        success: false,
        ...errorResponse
      },
      { 
        status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }

}

export const analyticsController = new AnalyticsController();
