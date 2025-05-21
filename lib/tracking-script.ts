export const getTrackingScript = () => {
  return `
<script>
(function() {
  console.log('[Analytics] Script Initializing (Ignoring DNT)...');
  const config = {
    endpoint: "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/track",
    sessionTimeout: 20 * 60 * 1000
  };
  console.log('[Analytics] Config:', config);
  
  let currentUrl = location.href;
  let sessionId = getSessionId();
  let lastActivityTime = Date.now();
  
  function getSessionId() {
    if (localStorage.getItem('_ia_optout')) {
      console.log('[Analytics] Opt-out flag is set. No session ID.');
      return null;
    }
    let id = sessionStorage.getItem('_ia_sid');
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('_ia_sid', id);
      console.log('[Analytics] New session ID created:', id);
    } else {
      console.log('[Analytics] Existing session ID found:', id);
    }
    return id;
  }
  
  function refreshSession() {
    const now = Date.now();
    if (now - lastActivityTime > config.sessionTimeout) {
      console.log('[Analytics] Session timeout. Refreshing session ID.');
      sessionId = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('_ia_sid', sessionId);
    }
    lastActivityTime = now;
  }
  
  ["mousedown", "keydown", "touchstart", "scroll"].forEach(eventType => {
    window.addEventListener(eventType, refreshSession, { passive: true });
  });
  
  function trackPageView() {
    // Removed navigator.doNotTrack check here
    console.log('[Analytics] trackPageView called. SessionID:', sessionId);
    if (!sessionId) { // Still check for sessionId and opt-out
      console.log('[Analytics] Tracking conditions (no sessionID or opt-out) not met. Exiting trackPageView.');
      return;
    }
    
    refreshSession();
    
    const payload = {
      type: "pageview",
      domain: location.hostname,
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || null,
      utmSource: new URLSearchParams(window.location.search).get('utm_source'),
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      utmTerm: new URLSearchParams(window.location.search).get('utm_term'),
      utmContent: new URLSearchParams(window.location.search).get('utm_content'),
      sessionId: sessionId,
      timestamp: Date.now()
    };
    console.log('[Analytics] Payload to send:', payload);
    sendPayload(payload);
  }
  
  function sendPayload(data) {
    const jsonData = JSON.stringify(data);
    console.log('[Analytics] Attempting to send payload. Endpoint:', config.endpoint);
    
    // Add this line to show the exact request format
    console.log('[Analytics] Full request URL:', config.endpoint);
    
    // Try fetch API for more reliable error reporting
    fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonData,
    })
    .then(response => {
      if (!response.ok) throw new Error(\`\`HTTP error \${response.status}\`\`);
      return response.json();
    })
    .then(data => console.log('[Analytics] Fetch response:', data))
    .catch(error => {
      console.error('[Analytics] Fetch error:', error);
      // Fall back to original methods
      if (navigator.sendBeacon) {
        try {
          console.log('[Analytics] Using navigator.sendBeacon.');
          if (navigator.sendBeacon(config.endpoint, jsonData)) {
            console.log('[Analytics] sendBeacon call successful (queued).');
            return;
          } else {
            console.warn('[Analytics] sendBeacon call returned false (not queued). Falling back.');
          }
        } catch (error) {
          console.error('[Analytics] sendBeacon error. Falling back.', error);
        }
      } else {
        console.log('[Analytics] navigator.sendBeacon not available. Using image fallback.');
      }
      
      const img = new Image();
      img.onload = () => console.log('[Analytics] Image fallback: request likely sent (onload).');
      img.onerror = () => console.error('[Analytics] Image fallback: request error (onerror).');
      img.src = config.endpoint + "?d=" + encodeURIComponent(jsonData);
      console.log('[Analytics] Image fallback src:', img.src);
    });
  }
  
  function handleNavigationChange() {
    if (currentUrl !== location.href) {
      console.log('[Analytics] Navigation detected. Old URL:', currentUrl, 'New URL:', location.href);
      currentUrl = location.href;
      setTimeout(trackPageView, 100);
    }
  }
  
  function initializeAnalytics() {
    console.log('[Analytics] Initializing analytics interface...');
    window.insightAnalytics = {
      optOut: function() {
        localStorage.setItem('_ia_optout', '1');
        sessionStorage.removeItem('_ia_sid');
        sessionId = null;
        console.log('[Analytics] Opted out.');
        return "Analytics tracking disabled.";
      },
      optIn: function() {
        localStorage.removeItem('_ia_optout');
        console.log('[Analytics] Opted in.');
        sessionId = getSessionId(); 
        if (!sessionId) { 
          sessionId = Math.random().toString(36).substring(2, 10);
          sessionStorage.setItem('_ia_sid', sessionId);
        }
        trackPageView();
        return "Analytics tracking enabled.";
      },
      isOptedOut: function() {
        return !!localStorage.getItem('_ia_optout');
      }
    };
    
    // Removed navigator.doNotTrack check here
    console.log('[Analytics] Checking initial tracking conditions. OptOutFlag:', localStorage.getItem('_ia_optout'));
    if (!localStorage.getItem('_ia_optout')) { // Only check for opt-out
      console.log('[Analytics] Initial trackPageView call (DNT Ignored).');
      trackPageView();
      
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function() {
        originalPushState.apply(this, arguments);
        handleNavigationChange();
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        handleNavigationChange();
      };
      
      window.addEventListener('popstate', handleNavigationChange);
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          refreshSession();
        }
      });
    } else {
      console.log('[Analytics] Initial tracking conditions (opt-out) not met. No initial pageview track.');
    }
  }
  
  initializeAnalytics();
  console.log('[Analytics] Script Fully Initialized.');
})();
</script>
`;
};