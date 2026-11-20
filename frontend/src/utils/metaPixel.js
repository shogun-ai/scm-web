// Meta Pixel (Solongo Capital). Ачаалагдах нөхцөл: public config-оос metaPixelId (зөвхөн тоо) ирсэн үед.
// Хувийн мэдээлэл ХЭЗЭЭ Ч дамжуулахгүй (Lead-д зөвхөн content_name).
const PIXEL_RE = /^\d{10,20}$/;

let pixelId = '';
let started = false;
let lastTracked = '';

export const validPixelId = value => {
  const id = String(value ?? '').trim();
  return PIXEL_RE.test(id) ? id : '';
};

function ensureFbq(id) {
  if (!id || typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!window.fbq) {
    const fbq = function (...args) { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args); };
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
  if (!window.__scmPixelInit) { window.__scmPixelInit = new Set(); }
  if (!window.__scmPixelInit.has(id)) { window.fbq('init', id); window.__scmPixelInit.add(id); }
  return true;
}

export function trackPageView() {
  if (!pixelId || !ensureFbq(pixelId)) return;
  const key = `${window.location.pathname}${window.location.search}`;
  if (key === lastTracked) return;
  lastTracked = key;
  window.fbq('track', 'PageView');
}

export function trackLead(contentName) {
  try {
    if (!pixelId || !ensureFbq(pixelId)) return;
    const name = String(contentName || '').slice(0, 80);
    window.fbq('track', 'Lead', name ? { content_name: name } : {});
  } catch { /* tracking хэзээ ч хэрэглэгчийн урсгалыг эвдэхгүй */ }
}

function hookNavigation() {
  const wrap = method => {
    const original = window.history[method];
    window.history[method] = function patched(...args) {
      const result = original.apply(this, args);
      if (method === 'pushState') setTimeout(trackPageView, 0);
      return result;
    };
  };
  wrap('pushState');
  window.addEventListener('popstate', () => setTimeout(trackPageView, 0));
}

const fetchJson = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

// Нэг удаа дуудна (useCmsData-аас). Тохиргоо алга/буруу бол юу ч хийхгүй.
export async function startMetaPixel(apiUrl) {
  if (started || typeof window === 'undefined') return;
  started = true;
  let id = '';
  try {
    const cfg = await fetchJson(`${apiUrl}/api/site/public-config`);
    id = validPixelId(cfg?.metaPixelId);
  } catch {
    try {
      const flat = await fetchJson(`${apiUrl}/api/config/flat`);
      id = validPixelId(flat?.metaPixelId ?? flat?.meta_pixel_id);
    } catch { /* optional */ }
  }
  if (!id) return;
  pixelId = id;
  hookNavigation();
  trackPageView();
}
