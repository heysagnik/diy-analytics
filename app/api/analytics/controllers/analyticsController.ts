import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '../services/analyticsService';
import { QueryOptions, ErrorResponse, DATE_RANGES } from '../types';
import { normalizeTimezone } from '../utils/dateUtils';
import connectToDatabase from '../../../../lib/mongodb';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Handle analytics GET requests
   */
  async handleGetAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      // Ensure database connection
      await connectToDatabase();

      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const dateRange = searchParams.get('dateRange') || 'LAST_7_DAYS';
      const timezone = searchParams.get('timezone');
      
      // Parse filters if provided
      const filters = this.parseFilters(searchParams);

      // Validate required parameters
      const validationError = this.validateAnalyticsRequest({
        projectId,
        dateRange,
        timezone,
        filters
      });

      if (validationError) {
        return this.createErrorResponse(validationError, 400);
      }

      const options: QueryOptions = {
        projectId: projectId!,
        dateRange,
        timezone: normalizeTimezone(timezone || undefined),
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

  /**
   * Handle analytics POST requests (for complex queries)
   */
  async handlePostAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const body = await request.json();
      const { projectId, dateRange, timezone, filters } = body;

      const validationError = this.validateAnalyticsRequest({
        projectId,
        dateRange,
        timezone,
        filters
      });

      if (validationError) {
        return this.createErrorResponse(validationError, 400);
      }

      const options: QueryOptions = {
        projectId,
        dateRange: dateRange || 'LAST_7_DAYS',
        timezone: normalizeTimezone(timezone),
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

  /**
   * Handle date ranges endpoint
   */
  async handleGetDateRanges(): Promise<NextResponse> {
    try {
      const dateRanges = Object.values(DATE_RANGES).map(range => ({
        key: range.key,
        label: range.label,
        granularity: range.granularity,
        dataPoints: range.dataPoints
      }));

      return NextResponse.json({
        success: true,
        data: dateRanges,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Date Ranges Controller Error:', error);
      return this.createErrorResponse(
        'Failed to fetch date ranges',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle real-time analytics endpoint
   */
  async handleGetRealtimeAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      await connectToDatabase();

      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');

      if (!projectId) {
        return this.createErrorResponse('Project ID is required', 400);
      }

      // Get last hour data for real-time analytics
      const options: QueryOptions = {
        projectId,
        dateRange: 'LAST_HOUR',
        timezone: 'UTC'
      };

      const analyticsData = await this.analyticsService.getAnalytics(options);

      return NextResponse.json({
        success: true,
        data: {
          activeUsers: analyticsData.uniqueUsers.total,
          pageViews: analyticsData.pageViews.total,
          sessions: analyticsData.sessions.total,
          topPages: analyticsData.pages.slice(0, 5),
          recentEvents: analyticsData.recentEvents.slice(0, 10)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Realtime Analytics Controller Error:', error);
      return this.createErrorResponse(
        'Failed to fetch real-time analytics',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Validate analytics request parameters
   */
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
      const { country, browser, device, source } = params.filters;
      
      if (country && (!Array.isArray(country) || country.some(c => typeof c !== 'string'))) {
        return 'Country filter must be an array of strings';
      }
      
      if (browser && (!Array.isArray(browser) || browser.some(b => typeof b !== 'string'))) {
        return 'Browser filter must be an array of strings';
      }
      
      if (device && (!Array.isArray(device) || device.some(d => typeof d !== 'string'))) {
        return 'Device filter must be an array of strings';
      }
      
      if (source && (!Array.isArray(source) || source.some(s => typeof s !== 'string'))) {
        return 'Source filter must be an array of strings';
      }
    }

    return null;
  }

  /**
   * Parse filters from URL search parameters
   */
  private parseFilters(searchParams: URLSearchParams): QueryOptions['filters'] | undefined {
    const filters: QueryOptions['filters'] = {};
    let hasFilters = false;

    const country = searchParams.get('country');
    if (country) {
      filters.country = country.split(',').map(c => c.trim());
      hasFilters = true;
    }

    const browser = searchParams.get('browser');
    if (browser) {
      filters.browser = browser.split(',').map(b => b.trim());
      hasFilters = true;
    }

    const device = searchParams.get('device');
    if (device) {
      filters.device = device.split(',').map(d => d.trim());
      hasFilters = true;
    }

    const source = searchParams.get('source');
    if (source) {
      filters.source = source.split(',').map(s => s.trim());
      hasFilters = true;
    }

    return hasFilters ? filters : undefined;
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    message: string,
    status: number,
    details?: string | Error
  ): NextResponse {
    const formattedDetails: Record<string, unknown> | undefined =
      details instanceof Error
        ? { message: details.message, name: details.name, stack: details.stack }
        : typeof details === 'string'
          ? { message: details }
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

  /**
   * Get error code based on HTTP status
   */
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

  /**
   * Add CORS headers to response
   */
  static addCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
}

// Export singleton instance
export const analyticsController = new AnalyticsController(); 