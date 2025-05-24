import { analyticsController } from '../controllers/analyticsController';

/**
 * GET /api/analytics/date-ranges
 * Get available date range options
 */
export async function GET() {
  return await analyticsController.handleGetDateRanges();
}

/**
 * OPTIONS /api/analytics/date-ranges
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 