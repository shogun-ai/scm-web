import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { registerAccountRoutes, createInviteToken, hashInviteToken, inviteTokenMatches, passwordPolicyError, validateTrustMessage, validateTrustSubmission, pickTrustUpdate, maskEmail, trustReference, recordLoginEvent, INVITE_TTL_MS, readDeleteFlag, normalizePixelId, readMetaPixelId } from './accountRoutes.js';
import { createPermissionService, registerPermissionRoutes } from './permissions.js';
import * as emails from './accountEmails.js';

const NOW = new Date('2026-11-20T03:00:00Z');
const ADMIN = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Admin', email: 'admin@scm.mn', role: 'admin', roles: [] };
const OFFICER = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Сараа', email: 'saraa@scm.mn', notificationEmail: 'saraa.notify@scm.mn', role: 'employee', roles: ['loan_officer'] };
const NOBODY = { _id: 'cccccccccccccccccccccccc', name: 'Хэн ч', email: 'x@scm.mn', role: 'employee', roles: [] };

const thenable = value => { const chain = { select() { return chain; }, sort() { return chain; }, limit() { return chain; }, lean: async () => structuredClone(value), then: (resolve, reject) => Promise.resolve(structuredClone(value)).then(resolve, reject) }; return chain; };

function harness({ matrix = null, env = { MAIL_REPLY_TO: 'desk@scm.mn' }, users = [], trusts = [], flag } = {}) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const calls = { sent: [], logs: [], tasks: [], siteConfig: [] };
  const userStore = users.map(user => structuredClone(user));
  const trustStore = trusts.map(item => structuredClone(item));
  let seq = 0;
  class User {
    constructor(doc) { Object.assign(this, doc); this._id = `0000000000000000000000${String(++seq).padStart(2, '0')}`; }
    async save() { userStore.push(structuredClone({ ...this })); return this; }
    static findOne(query) { return thenable(userStore.find(user => Object.entries(query).every(([key, value]) => user[key] === value)) || null); }
    static findById(id) { return thenable(userStore.find(user => String(user._id) === String(id)) || null); }
    static find() { return thenable(userStore); }
    static async updateOne(query, update) { const user = userStore.find(item => String(item._id) === String(query._id)); if (user) Object.assign(user, update.$set); return {}; }
    static async findOneAndUpdate(query, update) {
      const user = userStore.find(item => String(item._id) === String(query._id) && item.inviteTokenHash === query.inviteTokenHash && item.inviteExpiresAt && new Date(item.inviteExpiresAt) > query.inviteExpiresAt.$gt);
      if (!user) return null;
      Object.assign(user, update.$set); for (const key of Object.keys(update.$unset || {})) delete user[key];
      return user;
    }
  }
  class TrustRequest {
    constructor(doc) { Object.assign(this, doc); this._id = 'dddddddddddddddddddddd01'; }
    async save() { trustStore.push(structuredClone({ ...this })); return this; }
    static find() { return thenable(trustStore); }
    static findById(id) { return thenable(trustStore.find(item => String(item._id) === String(id)) || null); }
    static async findByIdAndUpdate(id, update) {
      const item = trustStore.find(entry => String(entry._id) === String(id)); if (!item) return null;
      Object.assign(item, update.$set || {}); for (const [key, value] of Object.entries(update.$push || {})) item[key] = [...(item[key] || []), value];
      return structuredClone(item);
    }
    static async updateOne(query, update) { const item = trustStore.find(entry => String(entry._id) === String(query._id)); if (item) for (const [key, value] of Object.entries(update.$push || {})) item[key] = [...(item[key] || []), value]; return {}; }
  }
  const events = [];
  const LoginEvent = { find: query => thenable(events.filter(event => event.userId === query.userId).sort((a, b) => b.at - a.at)), async create(doc) { const event = { _id: `e${events.length + 1}`, ...doc }; events.push(event); return event; } };
  const logs = [{ userName: 'Сараа', action: 'x', details: 'y', date: NOW }];
  const Log = { find: () => thenable(logs) };
  const SiteConfig = { findOne: () => thenable(flag === undefined ? null : { value: flag }), async findOneAndUpdate(query, update) { calls.siteConfig.push({ query, update }); return {}; } };
  const mailer = { enabled: true, send: async message => { calls.sent.push(message); return { result: 'sent' }; } };
  const bcrypt = { hash: async value => `hash:${value}` };
  const requireAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden' }));
  const permissions = createPermissionService({ loadMatrix: async () => matrix });
  registerAccountRoutes({
    app, User, SiteConfig, Log, LoginEvent, TrustRequest, authenticateUser: (_req, _res, next) => next(), requireAdmin, permissions,
    createLog: async (user, action, details) => { calls.logs.push({ action, details }); }, mailer, bcrypt, env, now: () => NOW,
    schedule: fn => calls.tasks.push(fn), logger: { error() {}, info() {} }, getCompanyPhone: async () => '7599-1919',
    randomBytes: size => crypto.randomBytes(size),
  });
  registerPermissionRoutes({ app, authenticateUser: (_req, _res, next) => next(), requireAdmin, service: permissions });
  const invoke = async (method, path, req = {}) => {
    let finish; const done = new Promise(resolve => { finish = resolve; });
    const response = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; finish(this); return this; } };
    const handlers = routes.get(`${method}:${path}`); assert.ok(handlers, `route ${method}:${path}`);
    const request = { user: ADMIN, params: {}, query: {}, body: {}, ip: `ip-${Math.random()}`, headers: {}, ...req };
    const run = index => handlers[index](request, response, () => run(index + 1));
    await run(0);
    return done;
  };
  const flush = async () => { while (calls.tasks.length) await calls.tasks.shift()(); };
  return { invoke, calls, userStore, trustStore, events, flush };
}

// ---------- pure helpers ----------
test('invite token: 32 random bytes, only SHA-256 stored, 48h expiry, timing-safe match, shape check', () => {
  const { token, tokenHash, expiresAt } = createInviteToken({ now: NOW });
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.equal(tokenHash, hashInviteToken(token));
  assert.notEqual(tokenHash, token);
  assert.equal(expiresAt.getTime() - NOW.getTime(), INVITE_TTL_MS);
  assert.equal(INVITE_TTL_MS, 48 * 3600 * 1000);
  const user = { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt };
  assert.equal(inviteTokenMatches(user, token, NOW), true);
  assert.equal(inviteTokenMatches(user, token, new Date(expiresAt.getTime() + 1)), false);
  assert.equal(inviteTokenMatches(user, createInviteToken().token, NOW), false);
  assert.equal(inviteTokenMatches(user, 'short', NOW), false);
  assert.equal(inviteTokenMatches({}, token, NOW), false);
  assert.notEqual(createInviteToken().token, createInviteToken().token);
});

test('password policy: >=10, letter + digit, <=128', () => {
  assert.ok(passwordPolicyError('short1'));
  assert.ok(passwordPolicyError('abcdefghijkl'));
  assert.ok(passwordPolicyError('1234567890123'));
  assert.ok(passwordPolicyError(undefined));
  assert.ok(passwordPolicyError('a1'.repeat(70)));
  assert.equal(passwordPolicyError('abcdefghi1'), null);
  assert.equal(passwordPolicyError('Нууцүг12345'), null);
});

test('trust validation helpers', () => {
  assert.deepEqual(validateTrustMessage({ message: '  Сайн уу  ' }), { message: 'Сайн уу' });
  assert.ok(validateTrustMessage({ message: '' }).error);
  assert.ok(validateTrustMessage({ message: 'x'.repeat(2001) }).error);
  assert.ok(validateTrustMessage({ message: 5 }).error);
  assert.ok(validateTrustMessage({ message: 'ok', messages: [] }).error);
  assert.ok(validateTrustMessage(null).error);
  assert.deepEqual(pickTrustUpdate({ status: 'resolved', contactNote: 'n', messages: [1], reference: 'x', email: 'a@b.mn', adminUser: {} }), { status: 'resolved', contactNote: 'n' });
  assert.deepEqual(pickTrustUpdate('x'), {});
  const bad = validateTrustSubmission({ lastname: 'Б', firstname: '', phone: 'abc', email: 'nope', amount: 5 });
  assert.ok(bad.errors.firstname && bad.errors.phone && bad.errors.email && !bad.errors.amount);
  assert.deepEqual(validateTrustSubmission({ lastname: 'Б', firstname: 'Д', phone: '99001122', amount: '5000000', status: 'resolved', messages: [] }).value, { lastname: 'Б', firstname: 'Д', phone: '99001122', email: '', amount: '5000000', channel: 'web' });
  for (const [input, expected] of [[{ channel: 'messenger' }, 'messenger'], [{ channel: 'webchat' }, 'webchat'], [{ source: 'webchat' }, 'webchat'], [{ source: 'messenger' }, 'messenger'], [{ channel: 'web' }, 'web'], [{ channel: 'telegram' }, 'web'], [{ channel: { $ne: 1 } }, 'web'], [{ channel: 'webchat', source: 'messenger' }, 'webchat'], [{}, 'web']]) {
    assert.equal(validateTrustSubmission({ lastname: 'Б', firstname: 'Д', phone: '99001122', amount: '1', ...input }).value.channel, expected, JSON.stringify(input));
  }
  assert.equal(trustReference('dddddddddddddddddddddd01', 2026), 'TRUST-2026-DDDD01');
  assert.equal(maskEmail('bold@example.mn'), 'b***@example.mn');
});

test('email templates escape user content and carry no extra secrets', () => {
  const evil = '<script>alert(1)</script>"\'&';
  const msg = emails.trustMessage({ reference: evil, message: evil, companyPhone: evil });
  assert.ok(!msg.html.includes('<script>'));
  assert.ok(msg.html.includes('&lt;script&gt;'));
  assert.ok(!/[\r\n]/.test(msg.subject));
  const ack = emails.trustAcknowledgement({ reference: 'TRUST-1\r\nBcc: x@y.z', phone: evil });
  assert.ok(!/[\r\n]/.test(ack.subject)); assert.ok(!ack.html.includes('<script>'));
  const staff = emails.staffTrustNotification({ reference: 'T1', phone: '99001122', adminUrl: 'https://www.scm.mn/admin' });
  assert.ok(staff.text.includes('****1122') && !staff.text.includes('99001122'));
  const invite = emails.userInvite({ name: evil, setPasswordUrl: 'https://www.scm.mn/admin?setPassword=abc"><x', expiresAt: NOW });
  assert.ok(!invite.html.includes('<script>')); assert.ok(!invite.html.includes('"><x'));
  assert.ok(invite.text.includes('setPassword=abc'));
});

test('recordLoginEvent stores ip/userAgent (capped), never throws', async () => {
  const events = [];
  const LoginEvent = { create: async doc => { events.push(doc); return { _id: 'e1' }; } };
  const id = await recordLoginEvent({ LoginEvent, user: ADMIN, req: { ip: '1.2.3.4', headers: { 'user-agent': 'U'.repeat(500) } }, now: NOW });
  assert.equal(id, 'e1'); assert.equal(events[0].userAgent.length, 300); assert.equal(events[0].ip, '1.2.3.4'); assert.equal(events[0].success, true);
  assert.equal(await recordLoginEvent({ LoginEvent: { create: async () => { throw new Error('db'); } }, user: ADMIN, req: {} }), null);
});

// ---------- routes ----------
test('GET /api/me, /api/me/logins (current flag, limit), /api/me/logs (own only)', async () => {
  const h = harness();
  const me = await h.invoke('get', '/api/me', { user: { ...OFFICER, isTwoFAEnabled: true, password: 'secret', createdAt: NOW } });
  assert.deepEqual(Object.keys(me.data).sort(), ['_id', 'createdAt', 'email', 'isTwoFAEnabled', 'name', 'notificationEmail', 'role', 'roles']);
  h.events.push({ _id: 'e1', userId: OFFICER._id, at: new Date(1), ip: '1.1.1.1', userAgent: 'A' }, { _id: 'e2', userId: OFFICER._id, at: new Date(2), ip: '2.2.2.2', userAgent: 'B' }, { _id: 'e3', userId: ADMIN._id, at: new Date(3), ip: '9.9.9.9', userAgent: 'C' });
  const logins = await h.invoke('get', '/api/me/logins', { user: OFFICER, auth: { lid: 'e1' }, query: { limit: '5' } });
  assert.deepEqual(logins.data.map(item => [item.ip, item.current]), [['2.2.2.2', false], ['1.1.1.1', true]]);
  const logs = await h.invoke('get', '/api/me/logs', { user: OFFICER });
  assert.deepEqual(Object.keys(logs.data[0]).sort(), ['action', 'date', 'details']);
});

test('admin settings: admin only, strict boolean, logged', async () => {
  const h = harness({ flag: true });
  assert.equal((await h.invoke('get', '/api/admin/settings', { user: OFFICER })).code, 403);
  assert.equal((await h.invoke('put', '/api/admin/settings', { user: OFFICER, body: { loanRequestDeleteEnabled: true } })).code, 403);
  assert.deepEqual(Object.fromEntries(Object.entries((await h.invoke('get', '/api/admin/settings')).data).filter(([key]) => ['loanRequestDeleteEnabled', 'metaPixelId'].includes(key))), { loanRequestDeleteEnabled: true, metaPixelId: '' });
  for (const body of [{ loanRequestDeleteEnabled: 'true' }, {}, { loanRequestDeleteEnabled: true, extra: 1 }, []]) assert.equal((await h.invoke('put', '/api/admin/settings', { body })).code, 400);
  const ok = await h.invoke('put', '/api/admin/settings', { body: { loanRequestDeleteEnabled: false } });
  assert.deepEqual(ok.data, { loanRequestDeleteEnabled: false });
  assert.equal(h.calls.siteConfig[0].update.$set.value, false);
  assert.equal(h.calls.logs.at(-1).action, 'admin_settings_changed');
  assert.equal(await readDeleteFlag({ findOne: () => thenable(null) }), false);
});

test('public trust submission: validated, whitelisted, ack to customer + staff notification in background', async () => {
  const h = harness({ env: { TRUST_NOTIFY_EMAIL: 'trust-desk@scm.mn', MAIL_REPLY_TO: 'desk@scm.mn' } });
  const bad = await h.invoke('post', '/api/trusts', { user: undefined, body: { lastname: 'Б' } });
  assert.equal(bad.code, 400);
  const ok = await h.invoke('post', '/api/trusts', { user: undefined, body: { lastname: 'Бат', firstname: 'Болд', phone: '99001122', email: 'bold@example.mn', amount: '5000000', status: 'resolved', messages: [{ message: 'x' }], reference: 'FAKE' } });
  assert.equal(ok.code, 201);
  assert.equal(ok.data.reference, 'TRUST-2026-DDDD01');
  assert.equal(h.trustStore[0].status, undefined); assert.equal(h.trustStore[0].messages, undefined);
  assert.equal(h.calls.sent.length, 0);
  await h.flush();
  // D25: an unassigned request also reaches the shared mailbox (MAIL_REPLY_TO).
  assert.deepEqual(h.calls.sent.map(mail => [mail.to, mail.template]).sort(), [['bold@example.mn', 'trust_ack'], ['desk@scm.mn', 'staff_trust_notification'], ['trust-desk@scm.mn', 'staff_trust_notification']]);
  assert.equal(h.trustStore[0].history.find(entry => entry.type === 'email').email.result, 'sent');
});

test('D23 trust submit stores the channel (messenger|webchat|web) from a whitelist; unknown values become web', async () => {
  const h = harness({ env: { MAIL_REPLY_TO: 'desk@scm.mn' } });
  const body = extra => ({ lastname: 'Бат', firstname: 'Болд', phone: '99001122', amount: '5000000', ...extra });
  for (const [extra, expected] of [[{ channel: 'webchat' }, 'webchat'], [{ source: 'messenger' }, 'messenger'], [{}, 'web'], [{ channel: 'evil x' }, 'web'], [{ channel: 'admin' }, 'web']]) {
    h.trustStore.length = 0;
    const ok = await h.invoke('post', '/api/trusts', { user: undefined, body: body(extra) });
    assert.equal(ok.code, 201, JSON.stringify(extra));
    assert.equal(h.trustStore[0].channel, expected, JSON.stringify(extra));
  }
  await h.flush();
});

test('trust submission without email only notifies staff; mail failure never reaches the response', async () => {
  const h = harness();
  const ok = await h.invoke('post', '/api/trusts', { user: undefined, body: { lastname: 'Бат', firstname: 'Болд', phone: '99001122', amount: '1' } });
  assert.equal(ok.code, 201);
  await h.flush();
  assert.deepEqual(h.calls.sent.map(mail => mail.to), ['desk@scm.mn']);
});

test('POST /api/trusts/:id/message: permission, validation, NO_APPLICANT_EMAIL, reply-to, history', async () => {
  const trust = { _id: 'dddddddddddddddddddddd01', reference: 'TRUST-2026-DDDD01', email: 'bold@example.mn', phone: '99001122' };
  const h = harness({ trusts: [trust, { _id: 'dddddddddddddddddddddd02', phone: '1' }] });
  const call = (id, body, user = OFFICER) => h.invoke('post', '/api/trusts/:id/message', { user, params: { id }, body });
  assert.equal((await call(trust._id, { message: 'hi' }, NOBODY)).code, 403);
  assert.equal((await call('zzz', { message: 'hi' })).code, 400);
  assert.equal((await call(trust._id, { message: '' })).code, 400);
  assert.equal((await call(trust._id, { message: 'x'.repeat(2001) })).code, 400);
  assert.equal((await call('dddddddddddddddddddddd02', { message: 'hi' })).data.code, 'NO_APPLICANT_EMAIL');
  assert.equal((await call('eeeeeeeeeeeeeeeeeeeeeeee', { message: 'hi' })).code, 404);
  const ok = await call(trust._id, { message: '<b>Сайн уу</b>' });
  assert.equal(ok.code, 200); assert.equal(ok.data.email.result, 'sent');
  const mail = h.calls.sent.at(-1);
  assert.equal(mail.to, 'bold@example.mn'); assert.equal(mail.replyTo, 'saraa.notify@scm.mn'); assert.ok(!mail.html.includes('<b>'));
  assert.equal(h.trustStore[0].messages[0].message, '<b>Сайн уу</b>');
  assert.equal(h.trustStore[0].messages[0].actor.name, 'Сараа');
});

test('legacy PUT /api/trusts/:id cannot overwrite message/reference/history/applicant fields', async () => {
  const trust = { _id: 'dddddddddddddddddddddd01', reference: 'R', email: 'a@b.mn', messages: [{ message: 'keep' }], history: [] , status: 'pending' };
  const h = harness({ trusts: [trust] });
  const res = await h.invoke('put', '/api/trusts/:id', { user: OFFICER, params: { id: trust._id }, body: { status: 'resolved', messages: [], reference: 'X', history: [1], email: 'evil@x.mn', adminUser: {} } });
  assert.equal(res.code, 200);
  assert.equal(h.trustStore[0].status, 'resolved'); assert.equal(h.trustStore[0].reference, 'R'); assert.equal(h.trustStore[0].messages.length, 1); assert.equal(h.trustStore[0].email, 'a@b.mn');
  assert.equal((await h.invoke('put', '/api/trusts/:id', { user: OFFICER, params: { id: trust._id }, body: { messages: [] } })).code, 400);
  assert.equal((await h.invoke('put', '/api/trusts/:id', { user: NOBODY, params: { id: trust._id }, body: { status: 'x' } })).code, 403);
});

test('GET /api/trusts needs trusts.view; explicit matrix deny removes it', async () => {
  assert.equal((await harness().invoke('get', '/api/trusts', { user: OFFICER })).code, 200);
  assert.equal((await harness().invoke('get', '/api/trusts', { user: NOBODY })).code, 403);
  const denied = harness({ matrix: { loan_officer: { 'perm:trusts.view': 'none', 'perm:trusts.message': 'none' } } });
  assert.equal((await denied.invoke('get', '/api/trusts', { user: OFFICER })).code, 403);
});

test('POST /api/users without password -> invite: unusable password, hash only, email with link, generic response', async () => {
  const h = harness({ users: [{ _id: 'ffffffffffffffffffffffff', email: 'taken@scm.mn' }] });
  assert.equal((await h.invoke('post', '/api/users', { user: OFFICER, body: { name: 'A', email: 'a@scm.mn' } })).code, 403);
  assert.equal((await h.invoke('post', '/api/users', { body: { name: 'A', email: 'not-an-email' } })).code, 400);
  assert.equal((await h.invoke('post', '/api/users', { body: { name: 'A', email: 'taken@scm.mn' } })).code, 400);
  assert.equal((await h.invoke('post', '/api/users', { body: { name: 'A', email: 'n@scm.mn', notificationEmail: 'bad' } })).code, 400);
  const ok = await h.invoke('post', '/api/users', { body: { name: 'Шинэ', email: 'new@scm.mn', roles: ['loan_officer', 'director', 'x'], notificationEmail: 'n@scm.mn' } });
  assert.equal(ok.code, 200); assert.equal(ok.data.invite.email.result, 'queued');
  assert.equal(ok.data.user.password, undefined); assert.equal(JSON.stringify(ok.data).includes('inviteTokenHash'), false);
  const stored = h.userStore.at(-1);
  assert.deepEqual(stored.roles, ['loan_officer', 'director']);
  assert.match(stored.password, /^hash:[0-9a-f]{64}$/);
  assert.match(stored.inviteTokenHash, /^[0-9a-f]{64}$/);
  assert.equal(new Date(stored.inviteExpiresAt).getTime() - NOW.getTime(), INVITE_TTL_MS);
  await h.flush();
  const mail = h.calls.sent.at(-1);
  assert.equal(mail.to, 'new@scm.mn'); assert.equal(mail.template, 'user_invite');
  const token = /setPassword=([A-Za-z0-9_-]{43})/.exec(mail.text)[1];
  assert.equal(hashInviteToken(token), stored.inviteTokenHash);
  assert.ok(!JSON.stringify(h.calls.logs).includes(token));
});

test('POST /api/users with password keeps legacy behaviour (no invite)', async () => {
  const h = harness();
  const ok = await h.invoke('post', '/api/users', { body: { name: 'Хуучин', email: 'old@scm.mn', password: 'pw', role: 'employee', roles: ['director'] } });
  assert.equal(ok.code, 200); assert.equal(ok.data.invite, undefined);
  assert.equal(h.userStore.at(-1).password, 'hash:pw'); assert.equal(h.userStore.at(-1).inviteTokenHash, undefined);
  await h.flush(); assert.equal(h.calls.sent.length, 0);
});

test('invite lookup + set-password: valid, expired, wrong, single-use, weak password, generic errors', async () => {
  const h = harness();
  await h.invoke('post', '/api/users', { body: { name: 'Шинэ', email: 'new@scm.mn' } });
  await h.flush();
  const token = /setPassword=([A-Za-z0-9_-]{43})/.exec(h.calls.sent.at(-1).text)[1];
  const info = await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token } });
  assert.deepEqual([info.data.valid, info.data.email], [true, 'n**@scm.mn']); assert.ok(info.data.expiresAt);
  assert.deepEqual((await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token: 'x' } })).data, { valid: false });
  assert.deepEqual((await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token: createInviteToken().token } })).data, { valid: false });
  const post = body => h.invoke('post', '/api/auth/set-password', { user: undefined, body });
  assert.equal((await post({ token, password: 'short' })).data.code, 'WEAK_PASSWORD');
  assert.equal((await post({ token, password: 'onlyletterspw' })).code, 400);
  const wrong = await post({ token: createInviteToken().token, password: 'validpass123' });
  assert.deepEqual([wrong.code, wrong.data.code], [400, 'INVALID_TOKEN']);
  assert.ok((await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token } })).data.valid);
  assert.equal((await post({ token, password: 'validpass123' })).data.ok, true);
  const stored = h.userStore.at(-1);
  assert.equal(stored.password, 'hash:validpass123'); assert.equal(stored.inviteTokenHash, undefined); assert.equal(stored.inviteExpiresAt, undefined);
  const again = await post({ token, password: 'anotherpass123' });
  assert.deepEqual([again.code, again.data.code], [400, 'INVALID_TOKEN']);
  assert.deepEqual((await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token } })).data, { valid: false });
});

test('expired invite is rejected', async () => {
  const { token, tokenHash } = createInviteToken({ now: NOW });
  const h = harness({ users: [{ _id: 'ffffffffffffffffffffffff', email: 'e@scm.mn', name: 'E', inviteTokenHash: tokenHash, inviteExpiresAt: new Date(NOW.getTime() - 1000) }] });
  const res = await h.invoke('post', '/api/auth/set-password', { user: undefined, body: { token, password: 'validpass123' } });
  assert.equal(res.data.code, 'INVALID_TOKEN');
  assert.deepEqual((await h.invoke('get', '/api/auth/invite/:token', { user: undefined, params: { token } })).data, { valid: false });
});

test('set-password is rate limited per IP', async () => {
  const h = harness();
  let last;
  for (let i = 0; i < 11; i++) last = await h.invoke('post', '/api/auth/set-password', { user: undefined, ip: '7.7.7.7', body: { token: createInviteToken().token, password: 'validpass123' } });
  assert.equal(last.code, 429);
});

test('POST /api/users/:id/invite: admin only, resend rotates token', async () => {
  const h = harness({ users: [{ _id: 'ffffffffffffffffffffffff', email: 'e@scm.mn', name: 'E', isActive: true, inviteTokenHash: 'old' }] });
  assert.equal((await h.invoke('post', '/api/users/:id/invite', { user: OFFICER, params: { id: 'ffffffffffffffffffffffff' } })).code, 403);
  assert.equal((await h.invoke('post', '/api/users/:id/invite', { params: { id: 'nope' } })).code, 400);
  assert.equal((await h.invoke('post', '/api/users/:id/invite', { params: { id: 'eeeeeeeeeeeeeeeeeeeeeeee' } })).code, 404);
  const ok = await h.invoke('post', '/api/users/:id/invite', { params: { id: 'ffffffffffffffffffffffff' } });
  assert.equal(ok.data.ok, true);
  assert.notEqual(h.userStore[0].inviteTokenHash, 'old'); assert.match(h.userStore[0].inviteTokenHash, /^[0-9a-f]{64}$/);
  await h.flush(); assert.equal(h.calls.sent.at(-1).to, 'e@scm.mn');
});

test('permission catalog endpoints', async () => {
  const h = harness({ matrix: { loan_officer: { 'perm:loan_requests.change_status': 'none' } } });
  assert.equal((await h.invoke('get', '/api/config/permission-catalog', { user: OFFICER })).code, 403);
  const catalog = await h.invoke('get', '/api/config/permission-catalog');
  assert.equal(catalog.data.permissions.length, 16);
  assert.equal(catalog.data.effective.loan_officer['loan_requests.change_status'], false);
  assert.equal(catalog.data.effective.director['loan_requests.assign'], true);
  const mine = await h.invoke('get', '/api/me/permissions', { user: OFFICER });
  assert.ok(mine.data.keys.includes('loan_requests.view_assigned') && !mine.data.keys.includes('loan_requests.change_status') && !mine.data.keys.includes('loan_requests.delete'));
});

test('D18 admin settings: metaPixelId (10-20 digits, empty clears), subset updates, strict validation, logged without the value', async () => {
  const h = harness({ flag: true });
  const ok = await h.invoke('put', '/api/admin/settings', { body: { metaPixelId: ' 123456789012345 ' } });
  assert.deepEqual([ok.code, ok.data], [200, { metaPixelId: '123456789012345' }]);
  const saved = h.calls.siteConfig.at(-1);
  assert.equal(saved.query.key, 'meta_pixel_id');
  assert.equal(saved.update.$set.value, '123456789012345');
  assert.equal(saved.update.$set.group, 'integrations');
  assert.deepEqual(h.calls.logs.at(-1), { action: 'admin_settings_changed', details: 'metaPixelId=set' });
  const cleared = await h.invoke('put', '/api/admin/settings', { body: { metaPixelId: '' } });
  assert.deepEqual(cleared.data, { metaPixelId: '' });
  assert.equal(h.calls.siteConfig.at(-1).update.$set.value, '');
  assert.equal(h.calls.logs.at(-1).details, 'metaPixelId=cleared');
  const both = await h.invoke('put', '/api/admin/settings', { body: { loanRequestDeleteEnabled: true, metaPixelId: '1234567890' } });
  assert.deepEqual(both.data, { loanRequestDeleteEnabled: true, metaPixelId: '1234567890' });
  for (const body of [{ metaPixelId: '12345' }, { metaPixelId: '1'.repeat(21) }, { metaPixelId: 'abc1234567890' }, { metaPixelId: 1234567890 }, { metaPixelId: null }, { metaPixelId: '1234567890', extra: 1 }, { metaPixelId: '1234567890', loanRequestDeleteEnabled: 'yes' }]) {
    const before = h.calls.siteConfig.length;
    assert.equal((await h.invoke('put', '/api/admin/settings', { body })).code, 400, JSON.stringify(body));
    assert.equal(h.calls.siteConfig.length, before, 'nothing written on invalid input');
  }
  assert.equal((await h.invoke('put', '/api/admin/settings', { user: OFFICER, body: { metaPixelId: '1234567890' } })).code, 403);
  assert.equal(normalizePixelId('1234567890'), '1234567890');
  assert.equal(normalizePixelId(' 1234567890123456789012 '), '');
  assert.equal(await readMetaPixelId({ findOne: () => thenable({ value: '1234567890' }) }), '1234567890');
  assert.equal(await readMetaPixelId({ findOne: () => thenable({ value: true }) }), '');
  assert.equal(await readMetaPixelId({ findOne: () => thenable(null) }), '');
});
