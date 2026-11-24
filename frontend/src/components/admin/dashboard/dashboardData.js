// Pure helpers for the admin dashboard. No React, no network — safe to unit test with node:test.

const DAY = 24 * 60 * 60 * 1000;

export const dayKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const startOfDay = value => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Counts per local calendar day for the last `days` days (oldest first, today last).
export function dailySeries(items = [], days = 30, now = new Date(), predicate = () => true) {
  const today = startOfDay(now);
  const buckets = new Map();
  const dates = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY);
    const key = dayKey(date);
    buckets.set(key, 0);
    dates.push(date);
  }
  (Array.isArray(items) ? items : []).forEach(item => {
    if (!item || !predicate(item)) return;
    const key = dayKey(item.createdAt);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });
  return dates.map(date => ({ date, value: buckets.get(dayKey(date)) || 0 }));
}

// Items created in the last 7 days vs the 7 days before.
export function weekDelta(items = [], now = new Date(), predicate = () => true) {
  const end = startOfDay(now).getTime() + DAY;
  let current = 0;
  let previous = 0;
  (Array.isArray(items) ? items : []).forEach(item => {
    if (!item || !predicate(item)) return;
    const time = new Date(item.createdAt).getTime();
    if (!Number.isFinite(time)) return;
    if (time >= end - 7 * DAY && time < end) current += 1;
    else if (time >= end - 14 * DAY && time < end - 7 * DAY) previous += 1;
  });
  return { current, previous, diff: current - previous };
}

export const isResolved = item => item?.status === 'resolved';
export const isPending = item => item?.status !== 'resolved';

// Product share. Unknown keys are folded into "other"; result is sorted by count desc.
export function productMix(requests = [], names = {}) {
  const counts = new Map();
  (Array.isArray(requests) ? requests : []).forEach(item => {
    const key = names[item?.selectedProduct] ? item.selectedProduct : 'other';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key === 'other' ? 'Бусад' : names[key], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function resolutionRate(requests = []) {
  const list = Array.isArray(requests) ? requests : [];
  if (!list.length) return 0;
  return Math.round((list.filter(isResolved).length / list.length) * 100);
}

// Merged, newest-first activity feed of loan and trust requests.
export function recentActivity(requests = [], trusts = [], limit = 6) {
  const rows = [
    ...(Array.isArray(requests) ? requests : []).map(item => ({ kind: 'loan', item })),
    ...(Array.isArray(trusts) ? trusts : []).map(item => ({ kind: 'trust', item })),
  ];
  return rows
    .filter(row => Number.isFinite(new Date(row.item?.createdAt).getTime()))
    .sort((a, b) => new Date(b.item.createdAt) - new Date(a.item.createdAt))
    .slice(0, limit);
}

// Rounds an axis maximum up to a friendly number.
export function niceMax(value) {
  if (!(value > 0)) return 4;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return Math.max(4, nice * exponent);
}

// Monotone cubic (Fritsch–Carlson) SVG path through points — smooth without overshooting below 0.
export function monotonePath(points) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push((points[i + 1][1] - points[i][1]) / (dx[i] || 1));
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue; }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) { tangent[i] = (3 * a * slope[i]) / h; tangent[i + 1] = (3 * b * slope[i]) / h; }
  }
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = dx[i] / 3;
    d += `C${x0 + third},${y0 + tangent[i] * third} ${x1 - third},${y1 - tangent[i + 1] * third} ${x1},${y1}`;
  }
  return d;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return 'Оройн мэнд';
  if (hour < 12) return 'Өглөөний мэнд';
  if (hour < 18) return 'Өдрийн мэнд';
  return 'Оройн мэнд';
}
