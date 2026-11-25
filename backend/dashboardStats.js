// Admin dashboard statistics (no PII). Aggregation logic lives in pure functions over projected rows so it is unit-testable.
import { PRODUCTS_MAP } from '../shared/loanFormConfig.js';
import { TERMINAL_TASK_STATUSES, TASK_STATUSES, deriveTaskState } from '../shared/loanTaskStatus.js';
import { resolvePermissions } from '../shared/permissions.js';
import { TRUST_CLOSED_STATUSES } from './trustDocs.js';

export const DASHBOARD_DAYS = 30;
export const OVERDUE_DAYS = 3;
export const ROW_CAP = 20000;
export const CACHE_MS = 60 * 1000;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const UB_OFFSET = 8 * HOUR; // Asia/Ulaanbaatar is UTC+8 without DST.
const TOUCH_TYPES = ['assigned', 'status', 'docs_requested', 'message', 'note'];

const time = value => {
  const ms = value instanceof Date ? value.getTime() : value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : NaN;
};
export const ubDayKey = value => {
  const ms = time(value);
  return Number.isFinite(ms) ? new Date(ms + UB_OFFSET).toISOString().slice(0, 10) : '';
};
// Oldest first, today (UB) last.
export const lastDayKeys = (now, days = DASHBOARD_DAYS) => Array.from({ length: days }, (_, index) => ubDayKey(time(now) - (days - 1 - index) * DAY));

function perDay(rows, keys, pick) {
  const counts = new Map(keys.map(key => [key, 0]));
  for (const row of rows) {
    const key = ubDayKey(pick(row));
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return keys.map(date => ({ date, count: counts.get(date) }));
}

const hasAssignee = row => { const id = row?.assignee?.userId; return id !== undefined && id !== null && id !== ''; };
const channelOf = row => (row?.channel === 'messenger' || row?.channel === 'webchat' ? row.channel : 'web');

export function computeLoanStats(rows = [], now = new Date(), { productNames = PRODUCTS_MAP } = {}) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const keys = lastDayKeys(now);
  const nowMs = time(now);
  const byTaskStatus = Object.fromEntries(TASK_STATUSES.map(status => [status, 0]));
  const byChannel = { web: 0, messenger: 0, webchat: 0 };
  const products = new Map();
  const resolved = [];
  let unassignedCount = 0;
  let overdueAssigned = 0;
  let responseSum = 0;
  let responseCount = 0;
  for (const row of list) {
    const { taskStatus } = deriveTaskState(row);
    byTaskStatus[taskStatus] += 1;
    byChannel[channelOf(row)] += 1;
    const productKey = typeof row.selectedProduct === 'string' && row.selectedProduct ? row.selectedProduct : 'other';
    products.set(productKey, (products.get(productKey) || 0) + 1);
    const terminal = TERMINAL_TASK_STATUSES.includes(taskStatus);
    if (taskStatus === 'resolved') resolved.push(row);
    if (!terminal) {
      if (!hasAssignee(row)) unassignedCount += 1;
      else {
        const touched = time(row.taskUpdatedAt);
        const since = Number.isFinite(touched) ? touched : time(row.createdAt);
        if (Number.isFinite(since) && nowMs - since > OVERDUE_DAYS * DAY) overdueAssigned += 1;
      }
    }
    const created = time(row.createdAt);
    const touch = time(row.firstTouchAt);
    if (Number.isFinite(created) && Number.isFinite(touch) && touch >= created) { responseSum += touch - created; responseCount += 1; }
  }
  const byProduct = [...products.entries()]
    .map(([productKey, count]) => ({ productKey, name: productKey === 'other' ? 'Бусад' : (productNames?.[productKey] || productKey), count }))
    .sort((a, b) => b.count - a.count || a.productKey.localeCompare(b.productKey));
  return {
    total: list.length,
    byTaskStatus,
    byChannel,
    byProduct,
    createdPerDay: perDay(list, keys, row => row.createdAt),
    resolvedPerDay: perDay(resolved, keys, row => (Number.isFinite(time(row.taskUpdatedAt)) ? row.taskUpdatedAt : row.createdAt)),
    unassignedCount,
    overdueAssigned,
    avgFirstResponseHours: responseCount ? Math.round((responseSum / responseCount / HOUR) * 10) / 10 : null,
  };
}

export function computeTrustStats(rows = [], now = new Date()) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const closed = row => TRUST_CLOSED_STATUSES.includes(String(row.status || '').toLowerCase());
  const open = list.filter(row => !closed(row));
  return {
    total: list.length,
    open: open.length,
    resolved: list.length - open.length,
    createdPerDay: perDay(list, lastDayKeys(now), row => row.createdAt),
    unassigned: open.filter(row => !hasAssignee(row)).length,
  };
}

const LOAN_PROJECT = {
  _id: 0, createdAt: 1, status: 1, taskStatus: 1, taskOutcome: { code: '$taskOutcome.code' }, channel: 1, selectedProduct: 1, taskUpdatedAt: 1,
  assignee: { userId: '$assignee.userId' },
  firstTouchAt: {
    $let: {
      vars: { touches: { $filter: { input: { $ifNull: ['$taskHistory', []] }, as: 'h', cond: { $and: [{ $in: ['$$h.type', TOUCH_TYPES] }, { $ne: ['$$h.actor.system', true] }] } } } },
      in: { $arrayElemAt: ['$$touches.at', 0] },
    },
  },
};
const TRUST_PROJECT = { _id: 0, createdAt: 1, status: 1, assignee: { userId: '$assignee.userId' } };

export function registerDashboardStatsRoute({
  app, LoanRequest, TrustRequest, authenticateUser, getPermissions = async user => resolvePermissions(user), now = () => new Date(), logger = console,
}) {
  const cache = new Map();
  const run = async (Model, scope, project) => Model.aggregate([{ $match: scope }, { $sort: { createdAt: -1 } }, { $limit: ROW_CAP }, { $project: project }]);

  app.get('/api/admin/dashboard-stats', authenticateUser, async (req, res) => {
    try {
      let perms;
      try { perms = await getPermissions(req.user); } catch { perms = resolvePermissions(req.user); }
      const viewAll = perms.has('loan_requests.view_all');
      const loansAllowed = viewAll || perms.has('loan_requests.view_assigned');
      const trustsAllowed = perms.has('trusts.view');
      if (!loansAllowed && !trustsAllowed) return res.status(403).json({ message: 'Статистик харах эрхгүй байна.' });
      const userId = String(req.user?._id || '');
      const scopeKey = `${viewAll ? 'all' : `u:${userId}`}|${loansAllowed ? 'l' : '-'}${trustsAllowed ? 't' : '-'}`;
      const at = now();
      const hit = cache.get(scopeKey);
      if (hit && time(at) - hit.at < CACHE_MS) return res.json(hit.body);
      const scope = viewAll ? {} : { 'assignee.userId': userId };
      const [loanRows, trustRows] = await Promise.all([
        loansAllowed ? run(LoanRequest, scope, LOAN_PROJECT) : null,
        trustsAllowed ? run(TrustRequest, scope, TRUST_PROJECT) : null,
      ]);
      const body = {
        loans: loanRows ? computeLoanStats(loanRows, at) : null,
        trusts: trustRows ? computeTrustStats(trustRows, at) : null,
        truncated: Boolean((loanRows && loanRows.length >= ROW_CAP) || (trustRows && trustRows.length >= ROW_CAP)),
        generatedAt: new Date(time(at)).toISOString(),
      };
      if (cache.size > 200) cache.clear();
      cache.set(scopeKey, { at: time(at), body });
      return res.json(body);
    } catch {
      logger.error?.('[dashboard-stats] failed');
      return res.status(500).json({ message: 'Статистик боловсруулахад алдаа гарлаа.' });
    }
  });
}
