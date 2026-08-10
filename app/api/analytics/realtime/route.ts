import { type NextRequest, NextResponse } from 'next/server';
import { analyticsController } from '../controllers/analyticsController';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
} as const;

function withCors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    return withCors(await analyticsController.handleGetRealtime(request));
  } catch (error) {
    console.error('Realtime route error:', error);
    return withCors(
      NextResponse.json(
        { success: false, error: 'Internal server error', timestamp: new Date().toISOString() },
        { status: 500 },
      ),
    );
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
