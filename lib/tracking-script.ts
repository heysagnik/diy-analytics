export const getTrackingScript = () => {
  const endpoint = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/track`;
  
  return `
<script>
(function() {
  const SV = "1.3.0";
  const DBG = false;
  const EP = "${endpoint}";
  const TIMEOUT = 20 * 60 * 1000;
  const OPT_KEY = '_ia_optout';
  const SID_KEY = '_ia_sid';
  const UID_KEY = '_ia_uid';

  const log = (...a) => DBG && console.log('[A]', ...a);
  const err = (...a) => DBG && console.error('[A]', ...a);

  log('Init', SV, EP);
  
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
    
    // Browser detection
    if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Chrome/i.test(ua) && !/Edg|Edge/i.test(ua)) browser = 'Chrome';
    else if (/Edg|Edge/i.test(ua)) browser = 'Edge';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/MSIE|Trident/i.test(ua)) browser = 'IE';
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
    
    // OS detection
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    
    // Device detection
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
  
  // Opt-out functionality
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
  
  log('Ready');
})();
</script>`;
}; 