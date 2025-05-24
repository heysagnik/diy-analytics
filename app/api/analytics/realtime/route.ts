import { NextRequest } from 'next/server';
import { analyticsController } from '../controllers/analyticsController';

/**
 * GET /api/analytics/realtime
 * Get real-time analytics data (last hour)
 * 
 * Query Parameters:
 * - projectId: string (required) - The project ID
 */
export async function GET(request: NextRequest) {
  return await analyticsController.handleGetRealtimeAnalytics(request);
}

/**
 * OPTIONS /api/analytics/realtime
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