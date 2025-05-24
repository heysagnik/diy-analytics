import { NextRequest } from 'next/server';
import { analyticsController } from './controllers/analyticsController';

/**
 * GET /api/analytics
 * Fetch analytics data for a project
 * 
 * Query Parameters:
 * - projectId: string (required) - The project ID
 * - dateRange: string (optional) - Date range key (default: LAST_7_DAYS)
 * - timezone: string (optional) - Timezone for calculations (default: UTC)
 * - country: string (optional) - Comma-separated country filters
 * - browser: string (optional) - Comma-separated browser filters
 * - device: string (optional) - Comma-separated device filters
 * - source: string (optional) - Comma-separated source filters
 */
export async function GET(request: NextRequest) {
  return await analyticsController.handleGetAnalytics(request);
}

/**
 * POST /api/analytics
 * Fetch analytics data with complex filters
 * 
 * Body:
 * {
 *   projectId: string,
 *   dateRange?: string,
 *   timezone?: string,
 *   filters?: {
 *     country?: string[],
 *     browser?: string[],
 *     device?: string[],
 *     source?: string[]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  return await analyticsController.handlePostAnalytics(request);
}

/**
 * OPTIONS /api/analytics
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 