import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REJECTION_REASONS, MAX_REASONS, REJECTION_REASONS_KEY, normalizeStoredReasons, readRejectionReasons, registerRejectionReasonRoutes, validateRejectionReasons,
} from './rejectionReasons.js';

const item = (id = 'a', extra = {}) => ({ id, title: 'Гарчиг', text: 'Текст', ...extra });

test('defaults are valid and unique', () => {
  const checked = validateRejectionReasons(DEFAULT_REJECTION_REASONS.map(x => ({ ...x })));
  assert.equal(checked.error, undefined);
  assert.equal(checked.value.length, 6);
});

test('validate trims and accepts a good list (and empty list)', () => {
  assert.deepEqual(validateRejectionReasons([{ id: ' a ', title: ' T ', text: ' X ' }]).value, [{ id: 'a', title: 'T', text: 'X' }]);
  assert.deepEqual(validateRejectionReasons([]).value, []);
});

test('validate rejects bad shapes', () => {
  const bad = [
    null, {}, 'x', [null], [[]], [item('a', { extra: 1 })], [item('a', { title: '  ' })], [item('a', { text: '' })],
    [item('a', { title: 5 })], [item('bad id')], [item('')], [item('a'), item('a')],
    [item('a', { title: 'x'.repeat(61) })], [item('a', { text: 'x'.repeat(1001) })],
    Array.from({ length: MAX_REASONS + 1 }, (_, i) => item(`i${i}`)),
  ];
  for (const input of bad) assert.ok(validateRejectionReasons(input).error, JSON.stringify(input)?.slice(0, 60));
  assert.equal(validateRejectionReasons([item('a', { title: 'x'.repeat(60), text: 'y'.repeat(1000) })]).error, undefined);
  assert.equal(validateRejectionReasons(Array.from({ length: MAX_REASONS }, (_, i) => item(`i${i}`))).error, undefined);
});

test('normalizeStoredReasons falls back to defaults and drops invalid entries', () => {
  assert.equal(normalizeStoredReasons(undefined).length, 6);
  assert.equal(normalizeStoredReasons('x').length, 6);
  assert.deepEqual(normalizeStoredReasons([]), []);
  assert.deepEqual(normalizeStoredReasons([item('a'), { id: 'bad id' }, item('a'), item('b')]).map(x => x.id), ['a', 'b']);
});

const harness = ({ stored, perms = ['loan_requests.change_status'] } = {}) => {
  const routes = {};
  const logs = [];
  let value = stored;
  const SiteConfig = {
    findOne: key => { assert.equal(key.key, REJECTION_REASONS_KEY); return { lean: async () => (value === undefined ? null : { value }) }; },
    findOneAndUpdate: async (_f, update) => { value = update.$set.value; },
  };
  const app = { get: (p, ...h) => { routes[`GET ${p}`] = h; }, put: (p, ...h) => { routes[`PUT ${p}`] = h; } };
  registerRejectionReasonRoutes({ app, SiteConfig, authenticateUser: 'auth', requireAdmin: 'admin', getPermissions: async () => new Set(perms), createLog: async (...a) => { logs.push(a); } });
  const call = async (name, req) => {
    const handlers = routes[name];
    const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await handlers[handlers.length - 1]({ user: { _id: 'u' }, ...req }, res);
    return res;
  };
  return { routes, call, logs, get value() { return value; } };
};

test('GET returns defaults when unset, stored list otherwise, 403 without permission', async () => {
  const h = harness();
  assert.equal((await h.call('GET /api/loan-rejection-reasons', {})).body.reasons.length, 6);
  const stored = harness({ stored: [item('z')] });
  assert.deepEqual((await stored.call('GET /api/loan-rejection-reasons', {})).body.reasons, [item('z')]);
  const denied = harness({ perms: [] });
  assert.equal((await denied.call('GET /api/loan-rejection-reasons', {})).code, 403);
  assert.deepEqual(h.routes['PUT /api/loan-rejection-reasons'].slice(0, 2), ['auth', 'admin']);
});

test('PUT validates, saves and logs', async () => {
  const h = harness();
  const bad = await h.call('PUT /api/loan-rejection-reasons', { body: { reasons: [item('a', { x: 1 })] } });
  assert.equal(bad.code, 400);
  assert.equal((await h.call('PUT /api/loan-rejection-reasons', { body: { reasons: [], other: 1 } })).code, 400);
  assert.equal(h.value, undefined);
  const ok = await h.call('PUT /api/loan-rejection-reasons', { body: { reasons: [item('a')] } });
  assert.equal(ok.code, 200);
  assert.deepEqual(h.value, [item('a')]);
  assert.equal(h.logs.length, 1);
  assert.deepEqual((await readRejectionReasons({ findOne: () => ({ lean: async () => ({ value: h.value }) }) })), [item('a')]);
});
