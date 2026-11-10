const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const ENABLED = import.meta.env.VITE_ERROR_TRACKING !== 'false';
const MAX_PER_SESSION = 10;

let sent = 0;
let lastSentAt = 0;

function report(payload) {
  if (!ENABLED || sent >= MAX_PER_SESSION) return;
  const now = Date.now();
  if (now - lastSentAt < 5000) return;
  lastSentAt = now;
  sent += 1;
  try {
    const body = JSON.stringify({
      message: String(payload.message || 'Unknown client error').slice(0, 500),
      stack: String(payload.stack || '').slice(0, 4000),
      source: payload.source || 'window.onerror',
      path: window.location.pathname + window.location.hash,
      userAgent: navigator.userAgent.slice(0, 300)
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/client-errors`, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(`${API_BASE}/client-errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    }
  } catch {
    // error reporting must never break the app
  }
}

export function initErrorTracking() {
  if (!ENABLED || typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    report({
      message: event.message || 'Script error',
      stack: event.error?.stack || '',
      source: 'window.onerror'
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    report({
      message: reason?.message || String(reason || 'Unhandled promise rejection'),
      stack: reason?.stack || '',
      source: 'unhandledrejection'
    });
  });
}
