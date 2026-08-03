import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { isRateLimited } from "@/lib/rateLimit";
import { PUBLIC_CORS_HEADERS as CORS_HEADERS } from "@/lib/corsHeaders";
import { trackingService, TrackingPayload, TrackingContext } from "../analytics/services/trackingService";

// Public, unauthenticated ingestion endpoint — bound request size before
// parsing (a hostile client could otherwise send an arbitrarily large body
// that gets fully buffered/parsed before validation runs) and rate-limit
// per source-IP+siteId so a single caller can't exhaust DB/CPU. See
// lib/rateLimit.ts for the per-instance caveat.
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT = 60; // requests
const RATE_LIMIT_WINDOW_MS = 10 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
}

async function trackHandler(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({
        success: false,
        error: 'Payload too large'
      }, { status: 413, headers: CORS_HEADERS });
    }

    await connectToDatabase();

    let payload: TrackingPayload;
    let rawBody: string;

    if (req.method === 'POST') {
      rawBody = await req.text();
      if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
        return NextResponse.json({
          success: false,
          error: 'Payload too large'
        }, { status: 413, headers: CORS_HEADERS });
      }
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON payload'
        }, { status: 400, headers: CORS_HEADERS });
      }
    } else if (req.method === 'GET') {
      const dataParam = req.nextUrl.searchParams.get('d');
      if (!dataParam) {
        return NextResponse.json({
          success: false,
          error: 'Data parameter is missing'
        }, { status: 400, headers: CORS_HEADERS });
      }
      if (Buffer.byteLength(dataParam) > MAX_BODY_BYTES) {
        return NextResponse.json({
          success: false,
          error: 'Payload too large'
        }, { status: 413, headers: CORS_HEADERS });
      }

      try {
        payload = JSON.parse(decodeURIComponent(dataParam));
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid data parameter encoding'
        }, { status: 400, headers: CORS_HEADERS });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Method not allowed'
      }, { status: 405, headers: CORS_HEADERS });
    }

    if (!payload || typeof payload !== 'object' || !payload.siteId || typeof payload.siteId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Site ID is required'
      }, { status: 400, headers: CORS_HEADERS });
    }

    if (isRateLimited(`${payload.siteId}:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({
        success: false,
        error: 'Too many requests'
      }, { status: 429, headers: CORS_HEADERS });
    }

    const context: TrackingContext = {
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
          req.headers.get('x-real-ip') || 
          'unknown',
      userAgent: req.headers.get('user-agent') || '',
      country: req.headers.get('x-vercel-ip-country') || 
               req.headers.get('cf-ipcountry') || 
               undefined,
      language: req.headers.get('accept-language')?.split(',')[0]?.trim() || undefined,
      headers: Object.fromEntries(req.headers.entries())
    };

    const result = await trackingService.processTracking(payload, context);

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionId: result.sessionId,
        details: result.details
      }, { headers: CORS_HEADERS });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        details: result.details
      }, { 
        status: 400, 
        headers: CORS_HEADERS 
      });
    }

  } catch (error: unknown) {
    console.error('Tracking API Error:', error);
    
    if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid JSON payload' 
      }, { status: 400, headers: CORS_HEADERS });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500, headers: CORS_HEADERS });
  }
}

export { trackHandler as GET, trackHandler as POST };
