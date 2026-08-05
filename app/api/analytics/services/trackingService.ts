import { UAParser } from 'ua-parser-js';
import { Types } from 'mongoose';
import Project from '../../../../models/Project';
import PageView from '../../../../models/PageView';
import Event from '../../../../models/Event';
import { normalizeProjectUrl } from '../../../../utils/url';

export interface TrackingPayload {
  siteId: string;
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
  region?: string;
  city?: string;
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
  trackingCode: string;
  excludedIPs?: string[];
  excludedPaths?: string[];
}

interface SessionInfo {
  lastSeen: Date;
  sessionId: string;
}

export class TrackingService {
  private uaParser: UAParser;
  private sessionCache = new Map<string, SessionInfo>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private lastCleanupAt = 0;

  constructor() {
    this.uaParser = new UAParser();
    // NOTE: deliberately no setInterval — that pattern leaks in serverless.
    // Stale sessions are pruned lazily on each write (see touchSessionCache).
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

      // Find project by tracking code
      const project = await this.findProjectByTrackingCode(payload.siteId);
      if (!project) {
        return { 
          success: false, 
          error: 'Invalid site ID or project not found',
          details: { siteId: payload.siteId }
        };
      }

      // Validate domain authorization
      const domainValidationError = this.validateDomainAuthorization(project, payload.domain);
      if (domainValidationError) {
        return { 
          success: false, 
          error: domainValidationError,
          details: { 
            siteId: payload.siteId,
            domain: payload.domain,
            allowedDomains: [project.domain, project.url].filter(Boolean)
          }
        };
      }

      // Exclude the project owner's own IPs / paths if configured
      const ip = context.ip?.split(',')[0]?.trim() || context.ip;
      if (this.isExcludedIP(ip, project.excludedIPs)) {
        return { success: true, details: { reason: 'excluded-ip' } };
      }
      const path = (() => { try { return new URL(payload.url).pathname; } catch { return ''; } })();
      if (this.isExcludedPath(path, project.excludedPaths)) {
        return { success: true, details: { reason: 'excluded-path' } };
      }

      // Process user agent and generate session
      const deviceInfo = this.parseUserAgent(context.userAgent);
      const sessionId = this.getOrCreateSession(payload, context);
      const geoData = this.extractGeoData(context);
      const urlData = this.parseUrl(payload.url);

      if (payload.type === 'pageview') {
        await this.trackPageView(project._id, payload, context, deviceInfo, sessionId, geoData, urlData);
      } else if (payload.type === 'event') {
        await this.trackEvent(project._id, payload, deviceInfo, sessionId, geoData);
      }

      return { 
        success: true, 
        sessionId,
        details: {
          type: payload.type,
          projectId: project._id.toString(),
          siteId: payload.siteId
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

  private static readonly MAX_STRING_LENGTHS = {
    siteId: 100,
    domain: 255,
    url: 2048,
    referrer: 2048,
    eventName: 128,
    sessionId: 100,
    uid: 100
  } as const;

  private isBoundedString(value: unknown, maxLength: number): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
  }

  /**
   * Validate tracking payload. This is the boundary for a public,
   * unauthenticated endpoint — every field is treated as attacker-
   * controlled, so types/lengths are checked explicitly rather than
   * trusting the TypeScript type (which only describes the shape of
   * well-formed JSON, not what an arbitrary POST body actually contains).
   */
  private validatePayload(payload: TrackingPayload): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return 'Payload must be a JSON object';
    }

    const { MAX_STRING_LENGTHS: LEN } = TrackingService;

    if (!this.isBoundedString(payload.siteId, LEN.siteId)) {
      return 'Site ID is required and must be a string';
    }

    if (!this.isBoundedString(payload.domain, LEN.domain)) {
      return 'Domain is required and must be a string';
    }

    if (!payload.type || !['pageview', 'event'].includes(payload.type)) {
      return 'Type must be either "pageview" or "event"';
    }

    if (!this.isBoundedString(payload.url, LEN.url)) {
      return 'URL is required and must be a string';
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(payload.url);
    } catch {
      return 'Invalid URL format';
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return 'URL must use http or https';
    }

    if (payload.referrer !== undefined && payload.referrer !== null && !this.isBoundedString(payload.referrer, LEN.referrer)) {
      return 'Referrer must be a string within length limits';
    }

    if (payload.sessionId !== undefined && !this.isBoundedString(payload.sessionId, LEN.sessionId)) {
      return 'Session ID must be a string within length limits';
    }

    if (payload.uid !== undefined && !this.isBoundedString(payload.uid, LEN.uid)) {
      return 'uid must be a string within length limits';
    }

    if (payload.type === 'event') {
      if (!this.isBoundedString(payload.eventName, LEN.eventName)) {
        return 'Event name is required and must be a string within length limits';
      }
    }

    if (payload.eventData !== undefined) {
      if (typeof payload.eventData !== 'object' && typeof payload.eventData !== 'string') {
        return 'Event data must be an object or a JSON string';
      }
      if (typeof payload.eventData === 'object' && payload.eventData !== null) {
        try {
          JSON.stringify(payload.eventData);
        } catch {
          return 'Event data must be JSON serializable';
        }
      }
    }

    if (payload.timestamp !== undefined) {
      const t = payload.timestamp;
      const validType = typeof t === 'string' || typeof t === 'number' || t instanceof Date;
      if (!validType) {
        return 'Timestamp must be a string, number, or Date';
      }
    }

    return null;
  }

  /**
   * Find project by tracking code
   */
  private async findProjectByTrackingCode(trackingCode: string): Promise<ProjectDocument | null> {
    return await Project.findOne({ trackingCode }).lean() as ProjectDocument | null;
  }

  /**
   * Validate domain authorization
   */
  private validateDomainAuthorization(project: ProjectDocument, requestDomain: string): string | null {
    const allowedDomains = [project.domain, project.url].filter(Boolean);

    if (allowedDomains.length === 0) {
      return 'Project has no authorized domains configured';
    }

    // Uses the same hostname-normalization as project creation/update
    // (utils/url.ts) so a domain authorized in Settings and a domain
    // reported by the tracker are compared the same way. Falls back to the
    // simpler strip-only comparison for inputs that don't parse as a URL
    // (e.g. bare "localhost" without a scheme in some edge deployments),
    // preserving prior behavior rather than rejecting them outright.
    const normalizeDomain = (value: string) =>
      normalizeProjectUrl(value)?.hostname ?? value.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

    const normalizedRequestDomain = normalizeDomain(requestDomain);

    const isAuthorized = allowedDomains.some(domain => {
      if (!domain) return false;
      const normalizedDomain = normalizeDomain(domain);
      return normalizedRequestDomain === normalizedDomain ||
             normalizedRequestDomain.endsWith('.' + normalizedDomain);
    });

    if (!isAuthorized) {
      return `Domain '${requestDomain}' is not authorized for this site ID`;
    }

    return null;
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
   * Get or create session ID.
   *
   * NOTE: this.sessionCache is process-local (a plain in-memory Map). The
   * tracker always sends its own sessionId once bootstrapped, so this
   * fallback path only matters for the very first request or a client
   * without sessionStorage — but on a horizontally-scaled deployment,
   * different instances won't see each other's cache, so the fallback
   * degrades to "usually creates a new session per instance" rather than
   * true cross-instance continuity. That's an acceptable degrade for a
   * self-hosted analytics tool (no user-visible correctness issue, just a
   * slight session-count over-count under scale-out), not worth the
   * complexity of a shared store for what's already a best-effort path.
   */
  private getOrCreateSession(payload: TrackingPayload, context: TrackingContext): string {
    this.touchSessionCache();

    // Use provided session ID if valid (tracker-sent sid)
    if (payload.sessionId && this.isValidSessionId(payload.sessionId)) {
      this.updateSessionActivity(payload.sessionId);
      return payload.sessionId;
    }

    // Check for existing session based on user ID or IP, scoped to the
    // site — without the siteId prefix, two different projects sharing an
    // IP (or, less likely, colliding uid) could be handed the same
    // fallback session.
    const cacheKey = `${payload.siteId}:${payload.uid || context.ip}`;
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
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
   * Prune expired sessions lazily (at most once per minute) so we don't
   * need a long-lived interval that leaks in serverless environments.
   */
  private touchSessionCache(): void {
    const now = Date.now();
    if (now - this.lastCleanupAt < 60 * 1000) return;
    this.lastCleanupAt = now;
    this.cleanupExpiredSessions();
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

  /** Extract best-effort geo data from request context and supported edge headers. City and region remain unset when those headers are unavailable. */
  private extractGeoData(context: TrackingContext): GeoData {
    return {
      country: context.country ||
               context.headers['x-vercel-ip-country'] ||
               context.headers['cf-ipcountry'] ||
               'Unknown',
      region: context.headers['x-vercel-ip-country-region'] || undefined,
      city: context.headers['x-vercel-ip-city']
        ? decodeURIComponent(context.headers['x-vercel-ip-city'])
        : undefined,
      language: context.language ||
                context.headers['accept-language']?.split(',')[0]?.trim() ||
                'en'
    };
  }

  /**
   * Derive a stable, groupable traffic source from a raw referrer URL —
   * the hostname, or 'Direct' when there's no referrer. Computed once at
   * write time so queries can $group/$match on an indexed field instead of
   * regex-parsing `referrer` on every analytics request.
   */
  private deriveSource(referrer?: string | null): string {
    if (!referrer) return 'Direct';
    try {
      return new URL(referrer).hostname.replace(/^www\./, '') || 'Direct';
    } catch {
      return 'Direct';
    }
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
      source: urlData.utm.source || this.deriveSource(payload.referrer),
      userAgent: context.userAgent,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion || undefined,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion || undefined,
      device: deviceInfo.device,
      deviceVendor: deviceInfo.deviceVendor || undefined,
      deviceModel: deviceInfo.deviceModel || undefined,
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
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
      data: this.normalizeEventData(payload.eventData),
      sessionId,
      userId: payload.uid || sessionId,
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion || undefined,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion || undefined,
      device: deviceInfo.device,
      deviceVendor: deviceInfo.deviceVendor || undefined,
      deviceModel: deviceInfo.deviceModel || undefined,
      referrer: payload.referrer || null,
      source: urlData.utm.source || this.deriveSource(payload.referrer),
      utmSource: urlData.utm.source,
      utmMedium: urlData.utm.medium,
      utmCampaign: urlData.utm.campaign,
      utmTerm: urlData.utm.term,
      utmContent: urlData.utm.content,
      timestamp: this.parseTimestamp(payload.timestamp)
    };

    const event = new Event(eventData);
    await event.save();
  }

  // Event.data is a Mixed field with no schema-level size limit — cap the
  // serialized payload so a buggy or hostile trackEvent() call can't write
  // an unbounded blob per event.
  private static readonly MAX_EVENT_DATA_BYTES = 8 * 1024;

  /**
   * Serialize event data into a plain object to match the Event schema's
   * Mixed field. Strings are wrapped so they survive the round-trip; invalid
   * strings become { value: <string> }. Oversized payloads are replaced
   * with a marker rather than silently truncated (partial JSON would be
   * misleading to consumers).
   */
  private normalizeEventData(data?: Record<string, unknown> | string): Record<string, unknown> | undefined {
    if (data === undefined || data === null) return undefined;

    let normalized: Record<string, unknown>;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        normalized = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { value: parsed };
      } catch {
        normalized = { value: data };
      }
    } else {
      normalized = data as Record<string, unknown>;
    }

    if (Buffer.byteLength(JSON.stringify(normalized)) > TrackingService.MAX_EVENT_DATA_BYTES) {
      return { _truncated: true, _originalSizeExceeded: true };
    }
    return normalized;
  }

  /**
   * Check exclusion helpers — used by the project owner to drop their own
   * traffic from analytics. Path patterns support a trailing wildcard "*".
   */
  private isExcludedIP(ip: string, excluded?: string[]): boolean {
    if (!excluded || excluded.length === 0 || !ip || ip === 'unknown') return false;
    return excluded.some((entry) => entry.trim() === ip);
  }

  private isExcludedPath(path: string, excluded?: string[]): boolean {
    if (!excluded || excluded.length === 0 || !path) return false;
    return excluded.some((pattern) => {
      const p = pattern.trim();
      if (!p) return false;
      if (p.endsWith('*')) return path.startsWith(p.slice(0, -1));
      return path === p;
    });
  }

  // A client-supplied timestamp is trusted only within this skew window;
  // outside it we fall back to server-receive time. Without this, a buggy
  // or hostile client can backdate/future-date events indefinitely,
  // corrupting historical reports, retention cohorts, and alert windows.
  private static readonly MAX_PAST_SKEW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly MAX_FUTURE_SKEW_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Parse timestamp from various formats, bounded to a plausible window
   * around "now" (see MAX_*_SKEW_MS above).
   */
  private parseTimestamp(timestamp?: string | number | Date): Date {
    const now = new Date();
    if (!timestamp) return now;

    let parsed: Date;
    if (timestamp instanceof Date) {
      parsed = timestamp;
    } else if (typeof timestamp === 'number') {
      // Handle both milliseconds and seconds
      const ts = timestamp > 1e10 ? timestamp : timestamp * 1000;
      parsed = new Date(ts);
    } else if (typeof timestamp === 'string') {
      parsed = new Date(timestamp);
    } else {
      return now;
    }

    if (isNaN(parsed.getTime())) return now;

    const delta = parsed.getTime() - now.getTime();
    if (delta > TrackingService.MAX_FUTURE_SKEW_MS || delta < -TrackingService.MAX_PAST_SKEW_MS) {
      return now;
    }

    return parsed;
  }

}

// Export singleton instance
export const trackingService = new TrackingService();
