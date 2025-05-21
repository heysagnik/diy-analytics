import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../../../lib/mongodb";
import Project from "../../../models/Project";
import PageView from "../../../models/PageView";
import Event from "../../../models/Event";
import { UAParser } from 'ua-parser-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

async function handler(req: NextRequest) {
  try {
    let body;
    if (req.method === 'POST') {
      body = await req.json();
    } else if (req.method === 'GET') {
      const dataParam = req.nextUrl.searchParams.get('d');
      if (dataParam) {
        body = JSON.parse(decodeURIComponent(dataParam));
      } else {
        return NextResponse.json({ error: 'Data parameter is missing for GET request' }, { status: 400, headers: corsHeaders });
      }
    } else {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    const { domain, type, url, referrer, eventName, eventData, sessionId } = body;
    
    if (!domain || !type || !url) {
      return NextResponse.json(
        { error: 'Domain, type, and URL are required' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    await connectToDatabase();
    
    const normalizedDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    
    const project = await Project.findOne({
      $or: [
        { domain: normalizedDomain },
        { url: normalizedDomain }, // Match directly if URL equals domain
        { url: { $regex: normalizedDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } // Match if URL contains domain
      ]
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'No project found for this domain' }, 
        { status: 404, headers: corsHeaders }
      );
    }
    
    const projectId = project._id;
    const userAgentString = req.headers.get('user-agent') || '';
    const parser = new UAParser(userAgentString);
    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();
    const deviceInfo = parser.getDevice();
    const visitorSessionId = sessionId || Math.random().toString(36).substring(2, 15);
    
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        // Actually using the error variable
        const message = error instanceof Error ? error.message : 'Unknown parsing error';
        return NextResponse.json({ 
            error: 'Invalid URL format', 
            details: message 
        }, { status: 400, headers: corsHeaders });
    }

    // Extract UTM parameters
    const utmSource = parsedUrl.searchParams.get('utm_source') || null;
    const utmMedium = parsedUrl.searchParams.get('utm_medium') || null;
    const utmCampaign = parsedUrl.searchParams.get('utm_campaign') || null;
    const utmTerm = parsedUrl.searchParams.get('utm_term') || null;
    const utmContent = parsedUrl.searchParams.get('utm_content') || null;

    // Try to get country using a more reliable method
    const country = req.headers.get('x-vercel-ip-country') || 
                    req.headers.get('cf-ipcountry') || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    'unknown';

    if (type === 'pageview') {
      const pageView = new PageView({
        projectId,
        url,
        path: parsedUrl.pathname,
        referrer,
        userAgent: userAgentString,
        browser: browserInfo.name || 'unknown',
        os: osInfo.name || 'unknown',
        device: deviceInfo.type || 'desktop',
        country,
        language: req.headers.get('accept-language')?.split(',')[0]?.trim() || 'en',
        sessionId: visitorSessionId,
        // Add UTM parameters
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent
      });
      await pageView.save();
      return NextResponse.json({ success: true, sessionId: visitorSessionId }, { headers: corsHeaders });
    } else if (type === 'event') {
      if (!eventName) {
        return NextResponse.json({ error: 'Event name is required' }, { status: 400, headers: corsHeaders });
      }
      const event = new Event({
        projectId,
        name: eventName,
        url,
        path: parsedUrl.pathname,
        data: eventData || {},
        sessionId: visitorSessionId
      });
      await event.save();
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }
    
    return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Tracking API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    if (error instanceof SyntaxError && errorMessage.includes("JSON")) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}

export { handler as GET, handler as POST };