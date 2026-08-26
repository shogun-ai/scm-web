export const MARKETING_CONSENT_KEY = 'zentro_marketing_consent';

const initializedPixels = new Set();
const pageViewPixels = new Set();

function validPixelId(value) {
  const id = String(value || '').trim();
  return /^\d{5,30}$/.test(id) ? id : '';
}

export function hasMarketingConsent() {
  try {
    return window.localStorage.getItem(MARKETING_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function grantMarketingConsent() {
  try { window.localStorage.setItem(MARKETING_CONSENT_KEY, 'granted'); } catch { /* optional storage */ }
}

export function initializeMetaPixel(value) {
  const pixelId = validPixelId(value);
  if (!pixelId || typeof window === 'undefined' || typeof document === 'undefined') return false;

  if (!window.fbq) {
    const fbq = function (...args) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    if (!document.getElementById('meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-script';
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
  }

  if (!initializedPixels.has(pixelId)) {
    window.fbq('init', pixelId);
    initializedPixels.add(pixelId);
  }
  return true;
}

export function trackMetaPageView(pixelId) {
  const id = validPixelId(pixelId);
  if (!id || pageViewPixels.has(id) || !initializeMetaPixel(id)) return;
  window.fbq('track', 'PageView');
  pageViewPixels.add(id);
}

export function trackMetaLead(pixelId, parameters = {}) {
  if (!initializeMetaPixel(pixelId)) return;
  window.fbq('track', 'Lead', parameters);
}
