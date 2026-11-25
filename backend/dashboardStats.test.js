import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLoanStats, computeTrustStats, lastDayKeys, ubDayKey, registerDashboardStatsRoute, CACHE_MS } from './dashboardStats.js';

const NOW = new Date('2026-11-25T02:00:00Z'); // 10:00 in Ulaanbaatar
const ago = (days, hours = 0) => new Date(NOW.getTime() - days * 86400000 - hours * 3600000).toISOString();
const A = { userId: 'u1' };

test('ubDayKey uses Asia/Ulaanbaatar dates and lastDayKeys spans 30 days', () => {
  assert.equal(ubDayKey('2026-11-24T17:00:00Z'), '2026-11-25');
  assert.equal(ubDayKey('2026-11-24T15:59:00Z'), '2026-11-24');
  assert.equal(ubDayKey('bad'), '');
  const keys = lastDayKeys(NOW);
  assert.equal(keys.length, 30);
  assert.equal(keys[29], '2026-11-25');
  assert.equal(keys[0], '2026-10-27');
});

test('computeLoanStats derives status, channel, product, unassigned and overdue', () => {
  const rows = [
    { createdAt: ago(0, 1), status: 'pending', channel: 'web', selectedProduct: 'cons_loan' },
    { createdAt: ago(10), status: 'pending', assignee: A, selectedProduct: 'cons_loan', channel: 'messenger' }, // legacy assigned, overdue by createdAt
    { createdAt: ago(10), taskStatus: 'in_review', assignee: A, taskUpdatedAt: ago(1), channel: 'webchat', selectedProduct: 'biz_loan' },
    { createdAt: ago(10), taskStatus: 'in_review', assignee: A, taskUpdatedAt: ago(5), selectedProduct: '' },
    { createdAt: ago(8), status: 'approved', taskUpdatedAt: ago(2), selectedProduct: 'cons_loan', firstTouchAt: ago(8, -5) },
    { createdAt: ago(40), taskStatus: 'resolved', taskUpdatedAt: ago(35), selectedProduct: 'cons_loan' },
    { createdAt: ago(2), taskStatus: 'rejected', selectedProduct: 'cons_loan', taskUpdatedAt: ago(1) },
  ];
  const stats = computeLoanStats(rows, NOW, { productNames: { cons_loan: 'Хэрэглээний' } });
  assert.equal(stats.total, 7);
  assert.deepEqual(stats.byTaskStatus, { new: 1, assigned: 1, additional_docs: 0, in_review: 2, rejected: 1, resolved: 2 });
  assert.deepEqual(stats.byChannel, { web: 5, messenger: 1, webchat: 1 });
  assert.equal(stats.byProduct[0].productKey, 'cons_loan');
  assert.equal(stats.byProduct[0].name, 'Хэрэглээний');
  assert.equal(stats.byProduct[0].count, 5);
  assert.equal(stats.byProduct.find(p => p.productKey === 'other').name, 'Бусад');
  assert.equal(stats.unassignedCount, 1);
  assert.equal(stats.overdueAssigned, 2);
  assert.equal(stats.createdPerDay.length, 30);
  assert.equal(stats.createdPerDay[29].count, 1);
  assert.equal(stats.createdPerDay.reduce((s, d) => s + d.count, 0), 6);
  assert.equal(stats.resolvedPerDay.reduce((s, d) => s + d.count, 0), 1);
  assert.equal(stats.avgFirstResponseHours, 5);
});

test('computeLoanStats handles empty input and null response time', () => {
  const stats = computeLoanStats(null, NOW);
  assert.equal(stats.total, 0);
  assert.equal(stats.avgFirstResponseHours, null);
  assert.equal(stats.overdueAssigned, 0);
  assert.equal(stats.resolvedPerDay.length, 30);
});

test('computeTrustStats counts open/resolved/unassigned', () => {
  const stats = computeTrustStats([
    { createdAt: ago(0), status: 'pending' },
    { createdAt: ago(1), status: 'pending', assignee: A },
    { createdAt: ago(2), status: 'Resolved' },
    { createdAt: ago(60), status: 'closed' },
  ], NOW);
  assert.equal(stats.total, 4); assert.equal(stats.open, 2); assert.equal(stats.resolved, 2); assert.equal(stats.unassigned, 1);
  assert.equal(stats.createdPerDay.reduce((s, d) => s + d.count, 0), 3);
});

function harness(perms, { user = { _id: 'u1' } } = {}) {
  const routes = new Map();
  const calls = [];
  let clock = NOW;
  const model = rows => ({ aggregate: async pipeline => { calls.push(pipeline[0].$match); return rows; } });
  registerDashboardStatsRoute({
    app: { get: (path, ...h) => routes.set(path, h) },
    LoanRequest: model([{ createdAt: ago(0), status: 'pending' }]), TrustRequest: model([{ createdAt: ago(0), status: 'pending' }]),
    authenticateUser: (_r, _s, next) => next(), getPermissions: async () => ({ has: key => perms.includes(key) }), now: () => clock, logger: {},
  });
  const invoke = async (req = { user }) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { this.data = d; return this; } };
    const handlers = routes.get('/api/admin/dashboard-stats');
    await handlers[1](req, res);
    return res;
  };
  return { invoke, calls, setNow: d => { clock = d; } };
}

test('route: 403 without any relevant permission', async () => {
  const res = await harness([]).invoke();
  assert.equal(res.code, 403);
});

test('route: manager sees all, staff scoped to assigned, trusts only with trusts.view', async () => {
  const manager = harness(['loan_requests.view_all', 'trusts.view']);
  const r1 = await manager.invoke();
  assert.deepEqual(manager.calls, [{}, {}]);
  assert.equal(r1.data.loans.total, 1); assert.equal(r1.data.trusts.total, 1);
  assert.ok(r1.data.generatedAt);
  const staff = harness(['loan_requests.view_assigned']);
  const r2 = await staff.invoke();
  assert.deepEqual(staff.calls, [{ 'assignee.userId': 'u1' }]);
  assert.equal(r2.data.trusts, null);
  const trustOnly = harness(['trusts.view']);
  const r3 = await trustOnly.invoke();
  assert.equal(r3.data.loans, null); assert.equal(r3.data.trusts.total, 1);
});

test('route: response contains no PII fields and is cached 60s per scope', async () => {
  const h = harness(['loan_requests.view_all']);
  const first = await h.invoke();
  assert.ok(!/firstname|lastname|phone|regNo|email/i.test(JSON.stringify(first.data)));
  await h.invoke();
  assert.equal(h.calls.length, 1);
  h.setNow(new Date(NOW.getTime() + CACHE_MS + 1));
  await h.invoke();
  assert.equal(h.calls.length, 2);
});

test('route: permission failure -> 500 safe message', async () => {
  const routes = new Map();
  registerDashboardStatsRoute({ app: { get: (p, ...h) => routes.set(p, h) }, LoanRequest: { aggregate: async () => { throw new Error('db secret'); } }, TrustRequest: {}, authenticateUser: () => {}, getPermissions: async () => ({ has: () => true }), logger: {} });
  const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { this.data = d; return this; } };
  await routes.get('/api/admin/dashboard-stats')[1]({ user: { _id: 'u1' } }, res);
  assert.equal(res.code, 500);
  assert.ok(!/secret/.test(JSON.stringify(res.data)));
});
