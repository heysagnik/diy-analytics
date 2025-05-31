import { NextRequest, NextResponse } from 'next/server';
import { analyticsController } from './controllers/analyticsController';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
} as const;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  'ETag': `"analytics-${Date.now()}"`,
  'Content-Type': 'application/json'
} as const;

class AnalyticsRouteHandler {
  private readonly controller = analyticsController;

  private addCorsHeaders(response: NextResponse): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  private addCacheHeaders(response: NextResponse): NextResponse {
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  private createOptionsResponse(): NextResponse {
    const response = new NextResponse(null, { status: 204 });
    return this.addCorsHeaders(response);
  }

  private async handleWithErrorBoundary(
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      const response = await handler();
      return this.addCorsHeaders(this.addCacheHeaders(response));
    } catch (error) {
      console.error('Analytics route error:', error);
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
      return this.addCorsHeaders(errorResponse);
    }
  }

  async handleGet(request: NextRequest): Promise<NextResponse> {
    return this.handleWithErrorBoundary(async () => {
      return await this.controller.handleGetAnalytics(request);
    });
  }

  async handlePost(request: NextRequest): Promise<NextResponse> {
    return this.handleWithErrorBoundary(async () => {
      return await this.controller.handlePostAnalytics(request);
    });
  }

  async handleOptions(): Promise<NextResponse> {
    return this.createOptionsResponse();
  }
}

const routeHandler = new AnalyticsRouteHandler();

export const GET = (request: NextRequest) => routeHandler.handleGet(request);
export const POST = (request: NextRequest) => routeHandler.handlePost(request);
export const OPTIONS = () => routeHandler.handleOptions();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;