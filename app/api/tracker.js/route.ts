import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { projects } from '@/db/schema';
import { PUBLIC_CORS_HEADERS as CORS_HEADERS } from '@/lib/corsHeaders';
import { db } from '@/lib/db';

interface ProjectForScript {
  trackingCode: string;
  domain?: string | null;
  url: string;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site-id');

    if (!siteId) {
      const errorMessage =
        'DIY Analytics Error: Missing site-id parameter. Usage: /api/tracker.js?site-id=your-site-id';
      return new NextResponse(`console.error("${errorMessage}");`, {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/javascript',
        },
      });
    }

    const [project] = await db.select().from(projects).where(eq(projects.trackingCode, siteId)).limit(1);

    if (!project) {
      const errorMessage = 'DIY Analytics Error: Invalid site-id. Please check your tracking code.';
      return new NextResponse(`console.error("${errorMessage}");`, {
        status: 404,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/javascript',
        },
      });
    }

    // Generate the tracking script with project-specific configuration.
    // The script body is a template literal containing its own backtick /
    // ${...} sequences (escaped here as \` and \${) so the in-browser
    // payload keeps readable template-literal syntax.
    const projectForScript: ProjectForScript = {
      trackingCode: project.trackingCode,
      domain: project.domain,
      url: project.url || '',
    };
    const trackingScript = generateTrackingScript(projectForScript);

    return new NextResponse(trackingScript, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Tracker.js Error:', error);
    const errorMessage = 'DIY Analytics Error: Internal server error.';
    return new NextResponse(`console.error("${errorMessage}");`, {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/javascript',
      },
    });
  }
}

function generateTrackingScript(project: ProjectForScript) {
  if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
    console.warn(
      '[tracker.js] NEXT_PUBLIC_SITE_URL is not set — generated scripts will point at http://localhost:3000/api/track, which will fail for real visitors.',
    );
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const endpoint = `${siteUrl}/api/track`;
  const siteId = project.trackingCode;
  const allowedDomains = [project.domain, project.url].filter(Boolean);

  // Every injected value goes through JSON.stringify rather than raw
  // template interpolation, so a value containing a quote/backslash can't
  // break out of the string literal and inject script into every page
  // that loads this tracker.
  return `
(function() {
  const SV = "2.0.0";
  const DBG = false;
  const EP = ${JSON.stringify(endpoint)};
  const SITE_ID = ${JSON.stringify(siteId)};
  const ALLOWED_DOMAINS = ${JSON.stringify(allowedDomains)};
  const TIMEOUT = 20 * 60 * 1000;
  const OPT_KEY = '_ia_optout';
  const SID_KEY = '_ia_sid';
  const UID_KEY = '_ia_uid';

  const log = (...a) => DBG && console.log('[A]', ...a);
  const err = (...a) => DBG && console.error('[A]', ...a);

   log('Init', SV, EP, SITE_ID);

   function isAuthorizedDomain() {
    const currentDomain = location.hostname;
    return ALLOWED_DOMAINS.some(domain => {
      if (!domain) return false;
      const normalizedDomain = domain.replace(/^(?:www.)?/i, "").split('/')[0];
      return currentDomain === normalizedDomain || currentDomain.endsWith('.' + normalizedDomain);
    });
  }

  if (!isAuthorizedDomain()) {
    err('Domain not authorized for tracking:', location.hostname);
    return;
  }
  
  let url = location.href;
  let sid = getSID();
  let lastActivity = Date.now();
  
  function genID() { return Math.random().toString(36).substring(2, 10); }

  function getSID() {
    if (localStorage.getItem(OPT_KEY)) return null;
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = genID();
      sessionStorage.setItem(SID_KEY, id);
      log('New sid:', id);
    }
    return id;
  }
  
  function getUID() {
    if (localStorage.getItem(OPT_KEY)) return null;
    let id = localStorage.getItem(UID_KEY);
    if (!id) {
      id = genID();
      localStorage.setItem(UID_KEY, id);
    }
    return id;
  }
  
  function refresh() {
    const now = Date.now();
    if (now - lastActivity > TIMEOUT) {
      if (!localStorage.getItem(OPT_KEY)) {
        sid = genID();
        sessionStorage.setItem(SID_KEY, sid);
      } else {
        sid = null;
      }
    }
    lastActivity = now;
  }
  
  function getBrowserInfo() {
    const ua = navigator.userAgent;
     let browser = 'Unknown';
     let os = 'Unknown';
     let device = 'desktop';
     
     if (/Firefox/i.test(ua)) browser = 'Firefox';
     else if (/Chrome/i.test(ua) && !/Edg|Edge/i.test(ua)) browser = 'Chrome';
     else if (/Edg|Edge/i.test(ua)) browser = 'Edge';
     else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
     else if (/MSIE|Trident/i.test(ua)) browser = 'IE';
     else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
     
     if (/Windows/i.test(ua)) os = 'Windows';
     else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
     else if (/Linux/i.test(ua)) os = 'Linux';
     else if (/Android/i.test(ua)) os = 'Android';
     else if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
     
     if (/Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
       device = /iPad|tablet|Tablet/i.test(ua) ? 'tablet' : 'mobile';
     }
    
    return { browser, os, device };
  }
  
   ["mousedown", "keydown", "touchstart", "scroll"].forEach(e => 
     window.addEventListener(e, refresh, { passive: true }));
   
   function pageview() {
     if (!sid) return;
     refresh();
     if (!sid) return;
     
     const params = new URLSearchParams(window.location.search);
     const { browser, os, device } = getBrowserInfo();
    
    const payload = {
      siteId: SITE_ID,
      domain: location.hostname,
      type: "pageview",
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || null,
      sessionId: sid,
      uid: getUID(),
      browser: browser,
      os: os,
      device: device,
      userAgent: navigator.userAgent,
      v: SV,
      us: params.get('utm_source'),
      um: params.get('utm_medium'),
      uc: params.get('utm_campaign'),
      ut: params.get('utm_term'),
      ue: params.get('utm_content'),
      ts: Date.now()
    };
    
    send(payload);
  }
  
  window.trackEvent = function(name, data) {
    if (!sid) return;
    refresh();
    if (!sid) return;
    
    const { browser, os, device } = getBrowserInfo();
    
    const payload = {
      siteId: SITE_ID,
      domain: location.hostname,
      type: "event",
      url: location.href,
      eventName: name,
      eventData: typeof data === 'object' ? JSON.stringify(data) : String(data),
      sessionId: sid,
      uid: getUID(),
      browser: browser,
      os: os,
      device: device,
      userAgent: navigator.userAgent,
      referrer: document.referrer || null,
      v: SV,
      ts: Date.now()
    };
    
    send(payload);
  };
  
  function send(data) {
    const json = JSON.stringify(data);
    
    fetch(EP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true
    })
    .then(r => {
      if (!r.ok) {
        r.text().then(t => err(\`HTTP \${r.status}: \${t}\`)).catch(() => {});
        throw new Error(\`HTTP \${r.status}\`);
      }
      return r.json().catch(() => ({}));
    })
    .then(r => {
      log('Sent:', data.type, r);
    })
    .catch(e => {
      err('Send failed:', e.message);
    });
  }
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      refresh();
      if (location.href !== url) {
        url = location.href;
        pageview();
      }
    }
  }
  
  function handlePopState() {
    if (location.href !== url) {
      url = location.href;
      pageview();
    }
  }
  
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(() => {
      if (location.href !== url) {
        url = location.href;
        pageview();
      }
    }, 0);
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setTimeout(() => {
      if (location.href !== url) {
        url = location.href;
        pageview();
      }
    }, 0);
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('popstate', handlePopState);
  
   // Initial pageview
   pageview();

   // LCP/CLS/INP via native PerformanceObserver — no external web-vitals
   // dependency. Reported through trackEvent with a reserved __web_vital
   // name so the dashboard can distinguish them from user-defined events.
   (function initWebVitals() {
    if (typeof PerformanceObserver === 'undefined') return;

    let lcpValue = null;
    let clsValue = 0;
    let inpValue = null;
    let reported = false;

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcpValue = last.renderTime || last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* unsupported */ }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* unsupported */ }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          if (inpValue === null || duration > inpValue) inpValue = duration;
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (e) { /* unsupported */ }

    function report() {
      if (reported || !sid) return;
      reported = true;
      if (lcpValue !== null) window.trackEvent('__web_vital', { metric: 'LCP', value: Math.round(lcpValue), path: location.pathname });
      if (clsValue > 0) window.trackEvent('__web_vital', { metric: 'CLS', value: Math.round(clsValue * 1000) / 1000, path: location.pathname });
      if (inpValue !== null) window.trackEvent('__web_vital', { metric: 'INP', value: Math.round(inpValue), path: location.pathname });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') report();
    });
    window.addEventListener('pagehide', report);
  })();

   // Resource timing for the slowest assets per page load — sampled at
   // 20% of pageviews to bound event volume, and capped to the 5 slowest
   // entries over 200ms so one heavy page can't flood storage.
   (function initResourceTiming() {
    if (typeof PerformanceObserver === 'undefined' || Math.random() > 0.2) return;

    const SLOW_THRESHOLD_MS = 200;
    const MAX_RESOURCES = 5;
    let resources = [];
    let reported = false;

    function resourceLabel(url) {
      try {
        const parsed = new URL(url, location.href);
        return parsed.origin === location.origin ? parsed.pathname : parsed.hostname + parsed.pathname;
      } catch (e) {
        return url;
      }
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration < SLOW_THRESHOLD_MS) continue;
          resources.push({
            name: resourceLabel(entry.name),
            type: entry.initiatorType || 'other',
            duration: Math.round(entry.duration),
            size: entry.transferSize || 0,
          });
        }
      }).observe({ type: 'resource', buffered: true });
    } catch (e) { /* unsupported */ }

    function report() {
      if (reported || !sid || resources.length === 0) return;
      reported = true;
      const slowest = resources.sort((a, b) => b.duration - a.duration).slice(0, MAX_RESOURCES);
      window.trackEvent('__resource_timing', { path: location.pathname, resources: slowest });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') report();
    });
    window.addEventListener('pagehide', report);
  })();

   // Uncaught exceptions and unhandled promise rejections. Capped per page
   // load so a throw-in-a-loop bug can't flood the ingestion endpoint.
   (function initErrorTracking() {
    const MAX_ERRORS_PER_LOAD = 10;
    let reported = 0;

    function sendError(payload) {
      if (!sid || reported >= MAX_ERRORS_PER_LOAD) return;
      reported++;
      const { browser, os, device } = getBrowserInfo();
      send(Object.assign({
        siteId: SITE_ID,
        domain: location.hostname,
        type: 'error',
        url: location.href,
        sessionId: sid,
        uid: getUID(),
        browser: browser,
        os: os,
        device: device,
        userAgent: navigator.userAgent,
        v: SV,
        ts: Date.now(),
        release: window.__DIY_RELEASE__ || undefined,
      }, payload));
    }

    window.addEventListener('error', function(event) {
      if (!event.error && !event.message) return;
      sendError({
        errorMessage: String(event.message || (event.error && event.error.message) || 'Unknown error').slice(0, 500),
        errorStack: event.error && event.error.stack ? String(event.error.stack).slice(0, 4000) : undefined,
        errorSourceUrl: event.filename || undefined,
        errorLine: typeof event.lineno === 'number' ? event.lineno : undefined,
        errorCol: typeof event.colno === 'number' ? event.colno : undefined,
        errorSeverity: 'error',
      });
    });

    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason;
      const message = reason && reason.message ? reason.message : String(reason);
      sendError({
        errorMessage: String(message || 'Unhandled rejection').slice(0, 500),
        errorStack: reason && reason.stack ? String(reason.stack).slice(0, 4000) : undefined,
        errorSeverity: 'warning',
      });
    });

    // Resource load failures (script/img/link) only fire in the capture
    // phase, not bubble — a separate capture-phase listener is required to
    // see them at all. event.target === window still means "real JS
    // exception", already handled above; skip it here to avoid double-report.
    window.addEventListener('error', function(event) {
      const target = event.target;
      if (!target || target === window || !target.tagName) return;
      const src = target.src || target.href || '';
      sendError({
        errorMessage: ('Failed to load ' + target.tagName.toLowerCase() + (src ? ': ' + src : '')).slice(0, 500),
        errorSourceUrl: src ? src.slice(0, 2048) : undefined,
        errorSeverity: 'warning',
      });
    }, true);
  })();

   // Public opt-out / opt-in hooks — used by the dashboard's "don't track
   // my visits" toggle.
   window.optOutAnalytics = function() {
    localStorage.setItem(OPT_KEY, '1');
    sessionStorage.removeItem(SID_KEY);
    localStorage.removeItem(UID_KEY);
    sid = null;
    log('Opted out');
  };
  
  window.optInAnalytics = function() {
    localStorage.removeItem(OPT_KEY);
    sid = getSID();
    log('Opted in');
  };
  
  window.isOptedOut = function() {
    return !!localStorage.getItem(OPT_KEY);
  };

  // Overrides the random anonymous uid with a stable id from the host
  // site's own auth (e.g. window.identify(currentUser.id)). Without this,
  // "frequency" only ever measures distinct browsers, not distinct people —
  // logged-out visits and cross-device visits from the same person can't be
  // tied together.
  window.identify = function(uid) {
    if (!uid || localStorage.getItem(OPT_KEY)) return;
    localStorage.setItem(UID_KEY, String(uid));
    log('Identified as', uid);
  };

  log('Ready');
})();
`;
}
