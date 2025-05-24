import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { trackingService, TrackingPayload, TrackingContext } from "../analytics/services/trackingService";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function trackHandler(req: NextRequest) {
  try {
    await connectToDatabase();

    let payload: TrackingPayload;
    
    if (req.method === 'POST') {
      payload = await req.json();
    } else if (req.method === 'GET') {
      const dataParam = req.nextUrl.searchParams.get('d');
      if (!dataParam) {
        return NextResponse.json({ 
          success: false,
          error: 'Data parameter is missing' 
        }, { status: 400, headers: CORS_HEADERS });
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

    // Extract tracking context from request
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

    // Process tracking request
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