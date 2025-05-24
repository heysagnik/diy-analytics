import { UAParser } from 'ua-parser-js';
import { Types } from 'mongoose';
import Project from '../../../../models/Project';
import PageView from '../../../../models/PageView';
import Event from '../../../../models/Event';

export interface TrackingPayload {
  domain: string;
  type: 'pageview' | 'event';
  url: string;
  referrer?: string;
  eventName?: string;
  eventData?: Record<string, unknown> | string;
  sessionId?: string;
  uid?: string;
  timestamp?: string | number | Date;
}

export interface TrackingContext {
  ip: string;
  userAgent: string;
  country?: string;
  language?: string;
  headers: Record<string, string>;
}

export interface TrackingResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: 'desktop' | 'mobile' | 'tablet';
  deviceVendor: string;
  deviceModel: string;
}

interface GeoData {
  country: string;
  language: string;
}

interface UrlData {
  href: string;
  pathname: string;
  search: string;
  hash: string;
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
}

interface ProjectDocument {
  _id: Types.ObjectId;
  domain?: string;
  url?: string;
}

interface SessionInfo {
  lastSeen: Date;
  sessionId: string;
}

export class TrackingService {
  private uaParser: UAParser;
  private sessionCache = new Map<string, SessionInfo>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.uaParser = new UAParser();
    
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Process incoming tracking request
   */
  async processTracking(
    payload: TrackingPayload,
    context: TrackingContext
  ): Promise<TrackingResult> {
    try {
      // Validate payload
      const validationError = this.validatePayload(payload);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Find project
      const project = await this.findProject(payload.domain);
      if (!project) {
        return { 
          success: false, 
          error: 'Project not found for this domain',
          details: { domain: payload.domain }
        };
      }

      // Process user agent and generate session
      const deviceInfo = this.parseUserAgent(context.userAgent);
      const sessionId = this.getOrCreateSession(payload, context);
      const geoData = this.extractGeoData(context);
      const urlData = this.parseUrl(payload.url);

      if (payload.type === 'pageview') {
        await this.trackPageView(project._id, payload, context, deviceInfo, sessionId, geoData, urlData);
      } else if (payload.type === 'event') {
        await this.trackEvent(project._id, payload, context, deviceInfo, sessionId, geoData);
      }

      return { 
        success: true, 
        sessionId,
        details: {
          type: payload.type,
          projectId: project._id.toString()
        }
      };

    } catch (error) {
      console.error('Tracking Service Error:', error);
      return { 
        success: false, 
        error: 'Internal tracking error',
        details: { message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Validate tracking payload
   */
  private validatePayload(payload: TrackingPayload): string | null {
    if (!payload.domain || typeof payload.domain !== 'string') {
      return 'Domain is required and must be a string';
    }

    if (!payload.type || !['pageview', 'event'].includes(payload.type)) {
      return 'Type must be either "pageview" or "event"';
    }

    if (!payload.url || typeof payload.url !== 'string') {
      return 'URL is required and must be a string';
    }

    try {
      new URL(payload.url);
    } catch {
      return 'Invalid URL format';
    }

    if (payload.type === 'event' && !payload.eventName) {
      return 'Event name is required for event tracking';
    }

    if (payload.eventData && typeof payload.eventData === 'object') {
      try {
        JSON.stringify(payload.eventData);
      } catch {
        return 'Event data must be JSON serializable';
      }
    }

    return null;
  }

  /**
   * Find project by domain
   */
  private async findProject(domain: string): Promise<ProjectDocument | null> {
    const normalizedDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    
    // Try exact domain match first
    let project = await Project.findOne({
      $or: [
        { domain: normalizedDomain },
        { url: normalizedDomain },
      ]
    }).lean() as ProjectDocument | null;

    // Fallback to regex match for projects with URL paths
    if (!project) {
      project = await Project.findOne({ 
        url: { 
          $regex: `^https?:\/\/(www\.)?${normalizedDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 
          $options: 'i' 
        } 
      }).lean() as ProjectDocument | null;
    }

    return project;
  }

  /**
   * Parse user agent and extract device information
   */
  private parseUserAgent(userAgent: string): DeviceInfo {
    this.uaParser.setUA(userAgent);
    const browser = this.uaParser.getBrowser();
    const os = this.uaParser.getOS();
    const device = this.uaParser.getDevice();

    return {
      browser: browser.name || 'Unknown',
      browserVersion: browser.version || '',
      os: os.name || 'Unknown',
      osVersion: os.version || '',
      device: this.categorizeDevice(device.type),
      deviceVendor: device.vendor || '',
      deviceModel: device.model || ''
    };
  }

  /**
   * Categorize device type
   */
  private categorizeDevice(deviceType?: string): 'desktop' | 'mobile' | 'tablet' {
    if (!deviceType) return 'desktop';
    
    const type = deviceType.toLowerCase();
    if (type.includes('mobile') || type.includes('smartphone')) return 'mobile';
    if (type.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSession(payload: TrackingPayload, context: TrackingContext): string {
    // Use provided session ID if valid
    if (payload.sessionId && this.isValidSessionId(payload.sessionId)) {
      this.updateSessionActivity(payload.sessionId);
      return payload.sessionId;
    }

    // Check for existing session based on user ID or IP
    const cacheKey = payload.uid || context.ip;
    const existingSession = this.sessionCache.get(cacheKey);
    
    if (existingSession && this.isSessionActive(existingSession.lastSeen)) {
      this.updateSessionActivity(existingSession.sessionId);
      return existingSession.sessionId;
    }

    // Generate new session ID
    const newSessionId = this.generateSessionId();
    this.sessionCache.set(cacheKey, {
      sessionId: newSessionId,
      lastSeen: new Date()
    });

    return newSessionId;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate session ID format
   */
  private isValidSessionId(sessionId: string): boolean {
    return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 100;
  }

  /**
   * Check if session is still active
   */
  private isSessionActive(lastSeen: Date): boolean {
    return Date.now() - lastSeen.getTime() < this.SESSION_TIMEOUT;
  }

  /**
   * Update session activity
   */
  private updateSessionActivity(sessionId: string): void {
    for (const [, session] of this.sessionCache.entries()) {
      if (session.sessionId === sessionId) {
        session.lastSeen = new Date();
        break;
      }
    }
  }

  /**
   * Clean up expired sessions from cache
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessionCache.entries()) {
      if (now - session.lastSeen.getTime() > this.SESSION_TIMEOUT) {
        this.sessionCache.delete(key);
      }
    }
  }

  /**
   * Extract geo data from request context
   */
  private extractGeoData(context: TrackingContext): GeoData {
    return {
      country: context.country || 
               context.headers['x-vercel-ip-country'] || 
               context.headers['cf-ipcountry'] || 
               'Unknown',
      language: context.language || 
                context.headers['accept-language']?.split(',')[0]?.trim() || 
                'en'
    };
  }

  /**
   * Parse URL and extract UTM parameters
   */
  private parseUrl(urlString: string): UrlData {
    const url = new URL(urlString);
    
    return {
      href: url.href,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      utm: {
        source: url.searchParams.get('utm_source'),
        medium: url.searchParams.get('utm_medium'),
        campaign: url.searchParams.get('utm_campaign'),
        term: url.searchParams.get('utm_term'),
        content: url.searchParams.get('utm_content')
      }
    };
  }

  /**
   * Track page view
   */
  private async trackPageView(
    projectId: Types.ObjectId,
    payload: TrackingPayload,
    context: TrackingContext,
    deviceInfo: DeviceInfo,
    sessionId: string,
    geoData: GeoData,
    urlData: UrlData
  ): Promise<void> {
    const pageViewData = {
      projectId,
      url: urlData.href,
      path: urlData.pathname,
      referrer: payload.referrer || null,
      userAgent: context.userAgent,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device: deviceInfo.device,
      country: geoData.country,
      language: geoData.language,
      sessionId,
      userId: payload.uid || sessionId,
      utmSource: urlData.utm.source,
      utmMedium: urlData.utm.medium,
      utmCampaign: urlData.utm.campaign,
      utmTerm: urlData.utm.term,
      utmContent: urlData.utm.content,
      timestamp: this.parseTimestamp(payload.timestamp)
    };

    const pageView = new PageView(pageViewData);
    await pageView.save();
  }

  /**
   * Track event
   */
  private async trackEvent(
    projectId: Types.ObjectId,
    payload: TrackingPayload,
    context: TrackingContext,
    deviceInfo: DeviceInfo,
    sessionId: string,
    geoData: GeoData
  ): Promise<void> {
    const urlData = this.parseUrl(payload.url);
    
    const eventData = {
      projectId,
      name: payload.eventName!,
      url: urlData.href,
      path: urlData.pathname,
      data: this.serializeEventData(payload.eventData),
      sessionId,
      userId: payload.uid || sessionId,
      country: geoData.country,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device: deviceInfo.device,
      timestamp: this.parseTimestamp(payload.timestamp)
    };

    const event = new Event(eventData);
    await event.save();
  }

  /**
   * Serialize event data
   */
  private serializeEventData(data?: Record<string, unknown> | string): string | undefined {
    if (!data) return undefined;
    
    if (typeof data === 'string') {
      try {
        // Validate that it's valid JSON
        JSON.parse(data);
        return data;
      } catch {
        // If not valid JSON, wrap it as a string value
        return JSON.stringify({ value: data });
      }
    }
    
    return JSON.stringify(data);
  }

  /**
   * Parse timestamp from various formats
   */
  private parseTimestamp(timestamp?: string | number | Date): Date {
    if (!timestamp) return new Date();
    
    if (timestamp instanceof Date) return timestamp;
    
    if (typeof timestamp === 'number') {
      // Handle both milliseconds and seconds
      const ts = timestamp > 1e10 ? timestamp : timestamp * 1000;
      return new Date(ts);
    }
    
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    return new Date();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { activeSessions: number; oldestSession: number; newestSession: number } {
    const sessions = Array.from(this.sessionCache.values());
    if (sessions.length === 0) {
      return {
        activeSessions: 0,
        oldestSession: 0,
        newestSession: 0
      };
    }

    return {
      activeSessions: this.sessionCache.size,
      oldestSession: Math.min(...sessions.map(s => s.lastSeen.getTime())),
      newestSession: Math.max(...sessions.map(s => s.lastSeen.getTime()))
    };
  }
}

// Export singleton instance
export const trackingService = new TrackingService();