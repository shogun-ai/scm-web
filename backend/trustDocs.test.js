import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { registerAccountRoutes } from './accountRoutes.js';
import { createPermissionService } from './permissions.js';
import { createTrustDocService, registerTrustDocRoutes, parseTrustDocRequest, sanitizeTrust, isTrustClosed, TRUST_DOC_PRESETS } from './trustDocs.js';
import { createDailyDigest, DIGEST_CRON, DIGEST_TIMEZONE } from './dailyDigest.js';
import { normalizeAssignment, validateAssignmentPatch, readAssignmentSettings } from './assignmentSettings.js';
import { hashToken } from './loanTasks.js';
import * as emails from './accountEmails.js';

const NOW = new Date('2026-11-24T02:00:00Z'); // 10:00 Ulaanbaatar
const hex = n => String(n).padStart(24, '0');
const ADMIN = { _id: hex(1), name: 'Админ', email: 'admin@scm.mn', notificationEmail: 'admin.notify@scm.mn', role: 'admin', roles: [], isActive: true };
const DIRECTOR = { _id: hex(2), name: 'Захирал', email: 'director@scm.mn', role: 'employee', roles: ['director'], isActive: true };
const SARAA = { _id: hex(3), name: 'Сараа', email: 'saraa@scm.mn', notificationEmail: ' saraa.notify@scm.mn ', role: 'employee', roles: ['loan_officer'], isActive: true };
const BOLD = { _id: hex(4), name: 'Болд', email: 'bold@scm.mn', role: 'employee', roles: ['finance_manager'], isActive: true };
const NOBODY = { _id: hex(5), name: 'Хэн ч', email: 'x@scm.mn', role: 'employee', roles: [], isActive: true };
const INACTIVE = { _id: hex(6), name: 'Идэвхгүй', email: 'old@scm.mn', role: 'employee', roles: ['loan_officer'], isActive: false };
const NOMAIL = { _id: hex(7), name: 'Имэйлгүй', email: '', role: 'employee', roles: ['loan_officer'], isActive: true };
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(64, 2)]);
const pdfFile = (fieldname, name = 'лавлагаа.pdf') => ({ fieldname, originalname: name, mimetype: 'application/pdf', buffer: PDF });

// ---------- tiny Mongo-like matcher over plain objects ----------
const clone = value => {
  if (value instanceof Date) return new Date(value.getTime());
  if (value && typeof value === 'object' && typeof value.toHexString === 'function') return value.toHexString();
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
};
const norm = value => (value instanceof Date ? value.getTime() : value && typeof value === 'object' && typeof value.toHexString === 'function' ? value.toHexString() : value);
const same = (value, expected) => (expected === null ? value === undefined || value === null : norm(value) === norm(expected));
const leafValues = (doc, path) => path.split('.').reduce((values, key) => values.flatMap(value => (Array.isArray(value) ? value.map(item => (item && typeof item === 'object' ? item[key] : undefined)) : [value && typeof value === 'object' ? value[key] : undefined])), [doc]);
function matches(doc, filter) {
  return Object.entries(filter || {}).every(([key, cond]) => {
    if (key === '$or') return cond.some(item => matches(doc, item));
    if (key === '$and') return cond.every(item => matches(doc, item));
    if (key === '$nor') return true; // loan status filters are re-checked in JS by the digest
    const values = leafValues(doc, key);
    const flat = values.flatMap(value => (Array.isArray(value) ? [value, ...value] : [value]));
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && typeof cond.toHexString !== 'function' && Object.keys(cond).some(op => op.startsWith('$'))) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$in') return arg.some(item => flat.some(value => same(value, item)));
        if (op === '$nin') return !arg.some(item => flat.some(value => same(value, item)));
        if (op === '$ne') return !flat.some(value => same(value, arg));
        if (op === '$gt') return flat.some(value => value !== undefined && norm(value) > norm(arg));
        if (op === '$elemMatch') return values.some(value => Array.isArray(value) && value.some(item => matches(item, arg)));
        throw new Error(`unsupported ${op}`);
      });
    }
    return flat.some(value => same(value, cond));
  });
}
let idSeq = 1000;
function applyUpdate(doc, update) {
  for (const [key, value] of Object.entries(update.$set || {})) doc[key] = clone(value);
  for (const key of Object.keys(update.$unset || {})) delete doc[key];
  for (const [key, value] of Object.entries(update.$push || {})) {
    const items = value && Array.isArray(value.$each) ? value.$each : [value];
    doc[key] = [...(doc[key] || []), ...clone(items).map(item => (key === 'files' ? { _id: hex(++idSeq), ...item } : item))];
  }
  return doc;
}
const chain = value => { const api = { select() { return api; }, sort() { return api; }, limit() { return api; }, lean: async () => clone(value), then: (resolve, reject) => Promise.resolve(clone(value)).then(resolve, reject) }; return api; };

function harness({ trusts = [], users = [ADMIN, DIRECTOR, SARAA, BOLD, NOBODY, INACTIVE, NOMAIL], loans = [], config = {}, env = { MAIL_REPLY_TO: 'desk@scm.mn', TRUST_NOTIFY_EMAIL: 'trust@scm.mn' }, matrix = null, mailEnabled = true, fetchBuffer = PDF, uploadFailAt = 0 } = {}) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const calls = { sent: [], logs: [], tasks: [], uploads: 0, destroyed: [], fetched: [], siteWrites: [] };
  const trustStore = trusts.map(item => clone(item));
  const siteStore = new Map(Object.entries(config).map(([key, value]) => [key, { key, value }]));
  let seq = 0;
  class TrustRequest {
    constructor(doc) { Object.assign(this, clone(doc)); this._id = hex(++seq + 500); this.status = this.status || 'pending'; }
    async save() { trustStore.push(clone({ ...this })); return this; }
    static find(query = {}) { return chain(trustStore.filter(item => matches(item, query))); }
    static findById(id) { return chain(trustStore.find(item => String(item._id) === String(id)) || null); }
    static findOne(query) { return chain(trustStore.find(item => matches(item, query)) || null); }
    static async findByIdAndUpdate(id, update) { const item = trustStore.find(entry => String(entry._id) === String(id)); return item ? clone(applyUpdate(item, update)) : null; }
    static async findOneAndUpdate(query, update) { const item = trustStore.find(entry => matches(entry, query)); return item ? clone(applyUpdate(item, update)) : null; }
    static async updateOne(query, update) { const item = trustStore.find(entry => matches(entry, query)); if (item) applyUpdate(item, update); return {}; }
  }
  const User = { findById: id => chain(users.find(user => String(user._id) === String(id)) || null), find: () => chain(users.filter(user => user.isActive !== false)) };
  const SiteConfig = {
    findOne: query => chain(siteStore.get(query.key) || null),
    async findOneAndUpdate(query, update) { calls.siteWrites.push({ key: query.key, value: update.$set.value }); siteStore.set(query.key, { key: query.key, ...(siteStore.get(query.key) || {}), ...clone(update.$set) }); return {}; },
    async updateOne(query, update, options) {
      const existing = siteStore.get(query.key);
      if (!existing) { if (options?.upsert) siteStore.set(query.key, { key: query.key, ...clone(update.$setOnInsert || {}) }); return { modifiedCount: 0 }; }
      if (!matches(existing, query)) return { modifiedCount: 0 };
      if (update.$set) { Object.assign(existing, clone(update.$set)); return { modifiedCount: 1 }; }
      return { modifiedCount: 0 };
    },
  };
  const LoanRequest = { find: query => chain(loans.filter(loan => matches(loan, { 'assignee.userId': query['assignee.userId'] }))) };
  const mailer = { enabled: mailEnabled, send: async message => { calls.sent.push(message); return { result: 'sent' }; } };
  const multer = () => ({ any: () => (req, _res, next) => next(req.uploadError) });
  multer.memoryStorage = () => ({});
  const cloudinary = {
    utils: { private_download_url: (id, format, options) => `https://api.cloudinary.com/v1_1/demo/${options.resource_type}/download?public_id=${encodeURIComponent(id)}&type=${options.type}` },
    uploader: {
      upload_stream: (options, callback) => ({ end: () => { calls.uploads++; calls.folder = options.folder; if (uploadFailAt && calls.uploads === uploadFailAt) callback(new Error('cloud down')); else callback(null, { public_id: `${options.folder}/doc${calls.uploads}`, format: '' }); } }),
      destroy: async publicId => { calls.destroyed.push(publicId); return { result: 'ok' }; },
    },
  };
  const requireAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden' }));
  const passAuth = (_req, _res, next) => next();
  const permissions = createPermissionService({ loadMatrix: async () => matrix });
  const getAssignmentSettings = () => readAssignmentSettings(SiteConfig);
  const logger = { error() {}, warn() {}, info() {} };
  const schedule = fn => calls.tasks.push(fn);
  const common = { now: () => NOW, schedule, logger, randomBytes: size => crypto.randomBytes(size) };
  const service = createTrustDocService({ TrustRequest, User, SiteConfig, mailer, env, getCompanyPhone: async () => '7599-1919', getAssignmentSettings, ...common });
  const digest = createDailyDigest({ User, LoanRequest, TrustRequest, SiteConfig, mailer, env, now: () => NOW, logger });
  registerAccountRoutes({ app, User, SiteConfig, Log: {}, LoginEvent: {}, TrustRequest, authenticateUser: passAuth, requireAdmin, permissions, createLog: async (user, action, details) => { calls.logs.push({ action, details }); }, mailer, bcrypt: {}, env, getCompanyPhone: async () => '7599-1919', trustDocs: service, dailyDigest: digest, ...common });
  registerTrustDocRoutes({ app, multer, cloudinary, http: {}, TrustRequest, User, authenticateUser: passAuth, permissions, service, mailer, env, createLog: async (user, action, details) => { calls.logs.push({ action, details }); }, fetchFile: async url => { calls.fetched.push(url); if (fetchBuffer instanceof Error) throw fetchBuffer; return fetchBuffer; }, ...common });
  const invoke = async (method, path, req = {}) => {
    let finish; const done = new Promise(resolve => { finish = resolve; });
    const response = {
      code: 200, headers: {}, headersSent: false,
      set(key, value) { if (typeof key === 'object') Object.assign(this.headers, key); else this.headers[key] = value; return this; },
      status(code) { this.code = code; return this; },
      json(data) { this.data = data; this.headersSent = true; finish(this); return this; },
      send(data) { this.body = data; this.headersSent = true; finish(this); return this; },
    };
    const handlers = routes.get(`${method}:${path}`); assert.ok(handlers, `route ${method}:${path}`);
    const request = { user: ADMIN, params: {}, query: {}, body: {}, headers: {}, files: [], ip: `ip-${Math.random()}`, ...req };
    const run = index => handlers[index](request, response, () => run(index + 1));
    await run(0);
    return done;
  };
  const flush = async () => { while (calls.tasks.length) await calls.tasks.shift()(); };
  return { invoke, calls, trustStore, siteStore, flush, service, digest, SiteConfig, User, mailer };
}

const TRUST = { _id: hex(100), reference: 'TRUST-2026-ABC123', lastname: 'Бат', firstname: 'Болд', phone: '99112233', email: 'client@example.mn', amount: '50,000,000', status: 'pending', createdAt: NOW };
const ID_ITEM = { key: 'trust_id_reference' };
const tokenFrom = message => /upload=([A-Za-z0-9_-]{43})/.exec(message.text)?.[1];

// ---------- request parsing ----------
test('parseTrustDocRequest: presets use fixed labels, extra_N needs a label, strict limits', () => {
  const ok = parseTrustDocRequest({ items: [{ key: 'trust_id_reference', label: 'хуурамч' }, { key: 'extra_1', label: '  Нэмэлт   лавлагаа ' }], note: ' тайлбар ', expiresInDays: 5 });
  assert.deepEqual(ok.items, [{ key: 'trust_id_reference', label: 'Иргэний үнэмлэхийн лавлагаа', group: 'personal' }, { key: 'extra_1', label: 'Нэмэлт   лавлагаа', group: 'other' }]);
  assert.equal(ok.note, 'тайлбар'); assert.equal(ok.expiresInDays, 5);
  assert.equal(parseTrustDocRequest({ items: [ID_ITEM] }).expiresInDays, 14);
  for (const body of [null, [], {}, { items: [] }, { items: [{ key: 'nope' }] }, { items: [{ key: 'extra_1' }] }, { items: [{ key: 'extra_11', label: 'x' }] }, { items: [ID_ITEM, ID_ITEM] },
    { items: [ID_ITEM], note: 'x'.repeat(2001) }, { items: [ID_ITEM], expiresInDays: 0 }, { items: [ID_ITEM], expiresInDays: 31 }, { items: [ID_ITEM], expiresInDays: '5' }, { items: [ID_ITEM], extra: 1 },
    { items: [{ key: 'extra_1', label: 'x'.repeat(121) }] }, { items: Array.from({ length: 11 }, (_, i) => ({ key: `extra_${(i % 10) + 1}`, label: `a${i}` })) }]) {
    assert.ok(parseTrustDocRequest(body).errors, JSON.stringify(body).slice(0, 80));
  }
  assert.equal(TRUST_DOC_PRESETS.length, 5);
});

test('isTrustClosed + sanitizeTrust never expose token hashes, publicIds or Cloudinary URLs', () => {
  assert.equal(isTrustClosed('resolved'), true); assert.equal(isTrustClosed('pending'), false);
  const view = sanitizeTrust({ _id: 'x', status: 'pending', files: [{ _id: 'f1', fileName: 'a.pdf', publicId: 'scm_trust_private/abc', deliveryType: 'authenticated', fileUrl: 'https://res.cloudinary.com/x', fieldKey: 'trust_id_reference', label: 'L', size: 5 }], uploadLinks: [{ _id: 'l1', tokenHash: 'deadbeef', items: [{ key: 'trust_id_reference', label: 'L' }], expiresAt: NOW }] });
  const json = JSON.stringify(view);
  for (const secret of ['scm_trust_private', 'deadbeef', 'cloudinary', 'tokenHash', 'publicId', 'deliveryType']) assert.equal(json.includes(secret), false, secret);
  assert.equal(view.files[0].ref, 'tf-f1'); assert.equal(view.files[0].canOpen, true); assert.equal(view.files[0].group, 'personal');
});

// ---------- manual doc request + token lifecycle ----------
test('manual doc-request: permission, hashed token only, link to /trust-request, history, Reply-To', async () => {
  const h = harness({ trusts: [{ ...TRUST, assignee: { userId: SARAA._id, name: 'Сараа' } }] });
  const body = { items: [ID_ITEM, { key: 'extra_1', label: 'Банкны тодорхойлолт' }], note: 'Өнөөдөр оруулна уу' };
  assert.equal((await h.invoke('post', '/api/trusts/:id/doc-request', { user: NOBODY, params: { id: TRUST._id }, body })).code, 403);
  assert.equal((await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: 'bad' }, body })).code, 400);
  assert.equal((await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: hex(999) }, body })).code, 404);
  assert.equal((await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: TRUST._id }, body: { items: [] } })).code, 400);
  const res = await h.invoke('post', '/api/trusts/:id/doc-request', { user: SARAA, params: { id: TRUST._id }, body });
  assert.equal(res.code, 200);
  assert.equal(res.data.email.result, 'sent'); assert.equal(res.data.sentTo, 'c*****@example.mn');
  const mail = h.calls.sent.at(-1);
  assert.equal(mail.to, 'client@example.mn'); assert.equal(mail.replyTo, 'saraa.notify@scm.mn', 'assignee notification email');
  assert.match(mail.text, /^.*Иргэний үнэмлэхийн лавлагаа/m); assert.ok(mail.text.includes('Банкны тодорхойлолт'));
  assert.match(mail.text, /https:\/\/www\.scm\.mn\/trust-request\?upload=/);
  const token = tokenFrom(mail);
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  const stored = h.trustStore[0];
  assert.equal(stored.uploadLinks[0].tokenHash, hashToken(token));
  assert.equal(JSON.stringify(stored).includes(token), false, 'raw token is never stored');
  assert.equal(stored.uploadLinks[0].expiresAt.getTime() - NOW.getTime(), 14 * 24 * 3600 * 1000);
  assert.deepEqual(stored.history.map(entry => entry.type), ['docs_requested', 'email']);
  assert.equal(stored.history[1].email.result, 'sent');
  const json = JSON.stringify(res.data);
  for (const secret of [token, hashToken(token), 'tokenHash']) assert.equal(json.includes(secret), false);
  assert.equal(res.data.trust.uploadLinks.length, 1);
  assert.equal(h.calls.logs.at(-1).action, 'trust_doc_request');
});

test('manual doc-request: no applicant email -> 400, closed request -> 403, mailer failure still records the link', async () => {
  const h = harness({ trusts: [{ ...TRUST, email: '' }, { ...TRUST, _id: hex(101), status: 'resolved' }] });
  const body = { items: [ID_ITEM] };
  const noEmail = await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: hex(100) }, body });
  assert.deepEqual([noEmail.code, noEmail.data.code], [400, 'NO_APPLICANT_EMAIL']);
  const closed = await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: hex(101) }, body });
  assert.deepEqual([closed.code, closed.data.code], [403, 'TERMINAL']);
  assert.equal(h.calls.sent.length, 0);
  const failing = harness({ trusts: [TRUST] });
  failing.mailer.send = async () => ({ result: 'failed' });
  const res = await failing.invoke('post', '/api/trusts/:id/doc-request', { params: { id: TRUST._id }, body });
  assert.equal(res.data.email.result, 'failed'); assert.equal(failing.trustStore[0].uploadLinks.length, 1);
});

test('a new request revokes the previous link; expired, revoked, closed and malformed tokens are all the same 404', async () => {
  const h = harness({ trusts: [TRUST] });
  const params = { id: TRUST._id };
  await h.invoke('post', '/api/trusts/:id/doc-request', { params, body: { items: [ID_ITEM] } });
  const first = tokenFrom(h.calls.sent.at(-1));
  assert.equal((await h.invoke('get', '/api/trusts/upload/:token', { params: { token: first } })).code, 200);
  await h.invoke('post', '/api/trusts/:id/doc-request', { params, body: { items: [{ key: 'trust_funds_savings_book' }] } });
  const second = tokenFrom(h.calls.sent.at(-1));
  assert.equal((await h.invoke('get', '/api/trusts/upload/:token', { params: { token: first } })).code, 404, 'revoked by the newer link');
  const ok = await h.invoke('get', '/api/trusts/upload/:token', { params: { token: second } });
  assert.equal(ok.code, 200);
  assert.deepEqual(Object.keys(ok.data).sort(), ['expiresAt', 'items', 'kind', 'note', 'productName', 'requestNo']);
  assert.deepEqual(ok.data.items.map(item => [item.key, item.group, item.uploaded]), [['trust_funds_savings_book', 'funds', false]]);
  assert.equal(JSON.stringify(ok.data).includes('Бат'), false, 'no applicant name');
  assert.equal(JSON.stringify(ok.data).includes('99112233'), false, 'no applicant phone');
  for (const token of ['short', 'x'.repeat(43), '../../etc/passwd', undefined]) assert.equal((await h.invoke('get', '/api/trusts/upload/:token', { params: { token } })).code, 404);
  h.trustStore[0].uploadLinks.at(-1).expiresAt = new Date(NOW.getTime() - 1);
  assert.equal((await h.invoke('get', '/api/trusts/upload/:token', { params: { token: second } })).code, 404, 'expired');
  h.trustStore[0].uploadLinks.at(-1).expiresAt = new Date(NOW.getTime() + 1000);
  h.trustStore[0].status = 'resolved';
  assert.equal((await h.invoke('get', '/api/trusts/upload/:token', { params: { token: second } })).code, 404, 'closed request');
});

// ---------- applicant upload ----------
async function withLink(options = {}) {
  const h = harness({ trusts: [options.trust || TRUST], ...options.h });
  await h.invoke('post', '/api/trusts/:id/doc-request', { params: { id: (options.trust || TRUST)._id }, body: { items: [ID_ITEM, { key: 'trust_funds_bank_statement' }] } });
  const token = tokenFrom(h.calls.sent.at(-1));
  h.calls.sent.length = 0;
  return { h, token };
}

test('upload: stores private files for requested keys, history + staff notification, no Cloudinary data in the response', async () => {
  const { h, token } = await withLink({ trust: { ...TRUST, assignee: { userId: SARAA._id, name: 'Сараа' } } });
  const res = await h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference'), pdfFile('trust_funds_bank_statement', 'statement.pdf')] });
  assert.equal(res.code, 200); assert.equal(res.data.uploaded, 2);
  assert.deepEqual(res.data.items.map(item => [item.key, item.uploaded]), [['trust_id_reference', true], ['trust_funds_bank_statement', true]]);
  assert.equal(JSON.stringify(res.data).includes('scm_trust_private'), false);
  assert.equal(h.calls.folder, 'scm_trust_private');
  const stored = h.trustStore[0];
  assert.equal(stored.files.length, 2);
  assert.deepEqual([stored.files[0].source, stored.files[0].fieldKey, stored.files[0].group, stored.files[0].mimeType], ['applicant_link', 'trust_id_reference', 'personal', 'application/pdf']);
  assert.match(stored.files[0].publicId, /^scm_trust_private\//);
  assert.equal(stored.history.at(-1).type, 'upload'); assert.equal(stored.history.at(-1).count, 2);
  await h.flush();
  const note = h.calls.sent.at(-1);
  assert.equal(note.to, 'saraa.notify@scm.mn'); assert.ok(note.text.includes('2 файл')); assert.equal(note.text.includes('Бат'), false);
  assert.equal(h.trustStore[0].history.at(-1).email.template, 'staff_trust_upload');
  // second upload through the same link adds files; unassigned requests notify TRUST_NOTIFY_EMAIL
  const again = await h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference')] });
  assert.equal(again.code, 200); assert.equal(h.trustStore[0].files.length, 3);
});

test('upload: unassigned request notifies TRUST_NOTIFY_EMAIL', async () => {
  const { h, token } = await withLink();
  await h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference')] });
  await h.flush();
  assert.equal(h.calls.sent.at(-1).to, 'trust@scm.mn');
});

test('upload validation: magic bytes, unrequested key, empty, count, size, parser error, closed request; nothing is stored on failure', async () => {
  const { h, token } = await withLink();
  const params = { token };
  const bad = async (files, extra = {}) => h.invoke('post', '/api/trusts/upload/:token', { params, files, ...extra });
  let res = await bad([{ fieldname: 'trust_id_reference', originalname: 'x.png', mimetype: 'image/png', buffer: Buffer.from('<html>not an image</html>') }]);
  assert.equal(res.code, 400); assert.ok(res.data.errors.trust_id_reference, 'content sniffed, not the claimed mimetype');
  res = await bad([{ ...pdfFile('trust_id_reference'), mimetype: 'image/png' }]);
  assert.equal(res.code, 400, 'mimetype must match the detected format');
  res = await bad([pdfFile('trust_savings')]); assert.equal(res.code, 400); assert.ok(res.data.errors._files || Object.keys(res.data.errors).length);
  res = await bad([pdfFile('trust_funds_savings_book')]); assert.equal(res.code, 400, 'key not requested by this link');
  res = await bad([]); assert.equal(res.code, 400);
  res = await bad([{ fieldname: 'trust_id_reference', originalname: 'e.pdf', mimetype: 'application/pdf', buffer: Buffer.alloc(0) }]); assert.equal(res.code, 400);
  res = await bad(Array.from({ length: 6 }, () => pdfFile('trust_id_reference'))); assert.equal(res.code, 400, 'max files per key');
  res = await bad([{ fieldname: 'trust_id_reference', originalname: 'big.pdf', mimetype: 'application/pdf', buffer: Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]) }]); assert.equal(res.code, 400, 'over 10 MB');
  res = await bad([pdfFile('trust_id_reference')], { uploadError: new Error('LIMIT_FILE_SIZE') }); assert.equal(res.code, 400);
  assert.equal(h.calls.uploads, 0); assert.equal(h.trustStore[0].files, undefined);
  h.trustStore[0].status = 'resolved';
  assert.equal((await bad([pdfFile('trust_id_reference')])).code, 404);
  h.trustStore[0].status = 'pending';
  // per-link cap
  h.trustStore[0].files = Array.from({ length: 30 }, (_, i) => ({ _id: hex(2000 + i), linkId: String(h.trustStore[0].uploadLinks[0]._id) }));
  res = await bad([pdfFile('trust_id_reference')]); assert.equal(res.code, 400); assert.ok(res.data.errors._files);
});

test('upload: a Cloudinary failure destroys files that were already uploaded and saves nothing', async () => {
  const { h, token } = await withLink({ h: { uploadFailAt: 2 } });
  const res = await h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference'), pdfFile('trust_funds_bank_statement')] });
  assert.equal(res.code, 500);
  assert.deepEqual(h.calls.destroyed, ['scm_trust_private/doc1']);
  assert.equal(h.trustStore[0].files, undefined);
});

test('upload: a link revoked while the multipart upload is in flight is rejected atomically and files are cleaned up', async () => {
  const { h, token } = await withLink();
  const link = h.trustStore[0].uploadLinks[0];
  // the GET-time check passes, then the link is revoked before the conditional write
  const pending = h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference')] });
  link.revokedAt = NOW;
  const res = await pending;
  assert.equal(res.code, 404);
  assert.equal(h.trustStore[0].files, undefined);
});

// ---------- secure file proxy ----------
async function withFile() {
  const { h, token } = await withLink();
  await h.invoke('post', '/api/trusts/upload/:token', { params: { token }, files: [pdfFile('trust_id_reference', 'лавлагаа')] });
  const other = { ...TRUST, _id: hex(101), reference: 'TRUST-2026-OTHER1' };
  h.trustStore.push(other);
  return { h, ref: `tf-${h.trustStore[0].files[0]._id}` };
}

test('file proxy: trusts.view only, inline/attachment with real type and name, nosniff, no-store, audit log', async () => {
  const { h, ref } = await withFile();
  const params = { id: TRUST._id, fileRef: ref };
  const denied = await h.invoke('get', '/api/trusts/:id/files/:fileRef', { user: NOBODY, params });
  assert.equal(denied.code, 403); assert.equal(h.calls.fetched.length, 0);
  const res = await h.invoke('get', '/api/trusts/:id/files/:fileRef', { user: SARAA, params });
  assert.equal(res.code, 200); assert.ok(Buffer.isBuffer(res.body));
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /^inline; filename=/); assert.ok(res.headers['Content-Disposition'].includes("filename*=UTF-8''%D0%BB"));
  assert.ok(res.headers['Content-Disposition'].includes('.pdf'));
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff'); assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.match(res.headers['Content-Security-Policy'], /sandbox/);
  assert.match(h.calls.fetched[0], /^https:\/\/api\.cloudinary\.com\/.*type=authenticated/);
  const dl = await h.invoke('get', '/api/trusts/:id/files/:fileRef', { params, query: { download: '1' } });
  assert.match(dl.headers['Content-Disposition'], /^attachment;/);
  assert.deepEqual(h.calls.logs.filter(log => log.action.startsWith('trust_file')).map(log => log.action), ['trust_file_opened', 'trust_file_downloaded']);
  assert.equal(h.calls.logs.at(-1).details.includes('http'), false);
});

test('file proxy scope: IDOR across requests, unknown refs, foreign publicIds, bad ids and upstream failures', async () => {
  const { h, ref } = await withFile();
  const call = (params, extra) => h.invoke('get', '/api/trusts/:id/files/:fileRef', { params, ...extra });
  assert.equal((await call({ id: hex(101), fileRef: ref })).code, 404, 'file of request A is not reachable through request B');
  assert.equal((await call({ id: hex(999), fileRef: ref })).code, 404);
  for (const fileRef of ['tf-zzzz', 'fd-' + hex(2000), 'tf-0', 'tf-', '../x', 'tf-' + 'a'.repeat(60)]) assert.equal((await call({ id: TRUST._id, fileRef })).code, 404, fileRef);
  assert.equal((await call({ id: 'bad', fileRef: ref })).code, 400);
  h.trustStore[0].files[0].publicId = 'other_folder/abc';
  assert.equal((await call({ id: TRUST._id, fileRef: ref })).code, 404, 'publicId outside the private folders is never proxied');
  h.trustStore[0].files[0].publicId = 'scm_trust_private/../escape';
  assert.equal((await call({ id: TRUST._id, fileRef: ref })).code, 404);
  h.trustStore[0].files[0].publicId = 'scm_trust_private/doc1';
  h.trustStore[0].files[0].deliveryType = 'upload';
  assert.equal((await call({ id: TRUST._id, fileRef: ref })).code, 404, 'non-authenticated files without a legacy url');
  assert.equal(h.calls.fetched.length, 0);
  h.trustStore[0].files[0].deliveryType = 'authenticated';
  const failing = harness({ trusts: [{ ...TRUST, files: [{ _id: hex(300), fileName: 'a.pdf', publicId: 'scm_trust_private/a', deliveryType: 'authenticated', mimeType: 'application/pdf' }] }], fetchBuffer: new Error('boom') });
  assert.equal((await failing.invoke('get', '/api/trusts/:id/files/:fileRef', { params: { id: TRUST._id, fileRef: `tf-${hex(300)}` } })).code, 502);
});

test('GET/PUT /api/trusts and message responses are sanitized', async () => {
  const { h } = await withFile();
  const list = await h.invoke('get', '/api/trusts', { user: SARAA });
  const json = JSON.stringify(list.data);
  for (const secret of ['tokenHash', 'scm_trust_private', 'publicId', 'cloudinary']) assert.equal(json.includes(secret), false, secret);
  assert.equal(list.data[0].files[0].fileName, 'лавлагаа');
  assert.equal(list.data[0].uploadLinks[0].items[0].key, 'trust_id_reference');
  const put = await h.invoke('put', '/api/trusts/:id', { user: SARAA, params: { id: TRUST._id }, body: { contactNote: 'ok' } });
  assert.equal(JSON.stringify(put.data).includes('tokenHash'), false);
  const msg = await h.invoke('post', '/api/trusts/:id/message', { user: SARAA, params: { id: TRUST._id }, body: { message: 'Сайн байна уу' } });
  assert.equal(JSON.stringify(msg.data).includes('tokenHash'), false);
});

// ---------- auto doc request on submit ----------
const SUBMIT = { lastname: 'Бат', firstname: 'Болд', phone: '99112233', amount: '5000000', email: 'client@example.mn' };

test('POST /api/trusts: auto doc request is on by default (ack + material request), and off when trust_auto_doc_request=false', async () => {
  const on = harness({ trusts: [] });
  const res = await on.invoke('post', '/api/trusts', { user: undefined, body: SUBMIT });
  assert.equal(res.code, 201);
  await on.flush();
  const templates = on.calls.sent.filter(mail => mail.to === 'client@example.mn').map(mail => mail.subject);
  assert.equal(templates.length, 2); assert.match(templates[0], /хүлээн авлаа/); assert.match(templates[1], /Нэмэлт материал шаардлагатай/);
  const stored = on.trustStore[0];
  assert.equal(stored.uploadLinks.length, 1); assert.equal(stored.uploadLinks[0].auto, true); assert.equal(stored.uploadLinks[0].items.length, 5);
  assert.deepEqual(stored.history.map(entry => entry.type), ['created', 'email', 'docs_requested', 'email']);
  assert.ok(tokenFrom(on.calls.sent.find(mail => /Нэмэлт материал/.test(mail.subject))));
  assert.equal(JSON.stringify(res.data).includes('upload='), false);

  const off = harness({ trusts: [], config: { trust_auto_doc_request: false } });
  await off.invoke('post', '/api/trusts', { body: SUBMIT }); await off.flush();
  assert.equal(off.trustStore[0].uploadLinks, undefined);
  assert.equal(off.calls.sent.filter(mail => mail.to === 'client@example.mn').length, 1, 'only the acknowledgement');

  const noEmail = harness({ trusts: [] });
  await noEmail.invoke('post', '/api/trusts', { body: { ...SUBMIT, email: '' } }); await noEmail.flush();
  assert.equal(noEmail.trustStore[0].uploadLinks, undefined);
  assert.equal(noEmail.calls.sent.some(mail => mail.to === 'client@example.mn'), false);
  assert.equal(noEmail.calls.sent.length, 2, 'staff notification (+ unassigned copy to the shared mailbox)');
});

// ---------- settings ----------
test('admin settings: trust_auto_doc_request and daily_digest_enabled default true, strict booleans, persisted and logged', async () => {
  const h = harness();
  const get = await h.invoke('get', '/api/admin/settings');
  assert.equal(get.data.trustAutoDocRequest, true); assert.equal(get.data.dailyDigestEnabled, true);
  assert.deepEqual(get.data.assignment, { loan: { mode: 'manual', staffId: null }, trust: { mode: 'manual', staffId: null } });
  assert.deepEqual(get.data.assignmentStaff.map(item => item.name).sort(), ['Админ', 'Болд', 'Захирал', 'Имэйлгүй', 'Сараа'].sort());
  assert.equal(JSON.stringify(get.data.assignmentStaff).includes('@'), false, 'staff list carries no emails');
  for (const body of [{ trustAutoDocRequest: 'no' }, { dailyDigestEnabled: 1 }, { trustAutoDocRequest: true, bogus: 1 }, { assignment: null }, { assignment: {} }, { assignment: { other: { mode: 'auto' } } }]) {
    assert.equal((await h.invoke('put', '/api/admin/settings', { body })).code, 400, JSON.stringify(body));
  }
  assert.equal((await h.invoke('put', '/api/admin/settings', { user: SARAA, body: { trustAutoDocRequest: false } })).code, 403);
  const ok = await h.invoke('put', '/api/admin/settings', { body: { trustAutoDocRequest: false, dailyDigestEnabled: false } });
  assert.deepEqual(ok.data, { trustAutoDocRequest: false, dailyDigestEnabled: false });
  assert.equal(h.siteStore.get('trust_auto_doc_request').value, false); assert.equal(h.siteStore.get('daily_digest_enabled').value, false);
  assert.deepEqual(h.calls.logs.map(log => log.details), ['trust_auto_doc_request=false', 'daily_digest_enabled=false']);
  const after = await h.invoke('get', '/api/admin/settings');
  assert.equal(after.data.trustAutoDocRequest, false); assert.equal(after.data.dailyDigestEnabled, false);
});

test('assignment settings validation: auto needs an active request staff member; manual clears; partial updates keep the other side', async () => {
  const h = harness();
  const put = body => h.invoke('put', '/api/admin/settings', { body: { assignment: body } });
  assert.equal((await put({ loan: { mode: 'auto' } })).code, 400, 'auto without staffId');
  assert.equal((await put({ loan: { mode: 'auto', staffId: INACTIVE._id } })).code, 400, 'inactive');
  assert.equal((await put({ loan: { mode: 'auto', staffId: NOBODY._id } })).code, 400, 'not request staff');
  assert.equal((await put({ loan: { mode: 'auto', staffId: hex(999) } })).code, 400, 'unknown');
  assert.equal((await put({ loan: { mode: 'auto', staffId: 'nope' } })).code, 400);
  assert.equal((await put({ loan: { mode: 'weird' } })).code, 400);
  assert.equal((await put({ loan: { mode: 'auto', staffId: SARAA._id, extra: 1 } })).code, 400);
  const bad = await put({ trust: { mode: 'auto', staffId: INACTIVE._id } });
  assert.ok(bad.data.errors.assignment.trust);
  const ok = await put({ loan: { mode: 'auto', staffId: SARAA._id } });
  assert.deepEqual(ok.data.assignment, { loan: { mode: 'auto', staffId: SARAA._id }, trust: { mode: 'manual', staffId: null } });
  const both = await put({ trust: { mode: 'auto', staffId: BOLD._id } });
  assert.deepEqual(both.data.assignment, { loan: { mode: 'auto', staffId: SARAA._id }, trust: { mode: 'auto', staffId: BOLD._id } });
  const manual = await put({ loan: { mode: 'manual', staffId: SARAA._id } });
  assert.deepEqual(manual.data.assignment.loan, { mode: 'manual', staffId: null });
  assert.equal(h.calls.logs.at(-1).action, 'admin_settings_changed');
  assert.deepEqual(normalizeAssignment({ loan: { mode: 'auto' }, trust: { mode: 'auto', staffId: 'bad' } }), { loan: { mode: 'manual', staffId: null }, trust: { mode: 'manual', staffId: null } });
  assert.ok((await validateAssignmentPatch({ loan: { mode: 'manual' } }, null, h.User)).value);
});

// ---------- trust assignment (D25) ----------
test('trust auto-assignment on submit: assignee, history, assignee email, Reply-To, shared notification', async () => {
  const h = harness({ trusts: [], config: { assignment_settings: { loan: { mode: 'manual', staffId: null }, trust: { mode: 'auto', staffId: SARAA._id } } } });
  await h.invoke('post', '/api/trusts', { body: SUBMIT }); await h.flush();
  const stored = h.trustStore[0];
  assert.deepEqual(stored.assignee, { userId: SARAA._id, name: 'Сараа' });
  assert.ok(stored.assignedAt);
  assert.deepEqual(stored.history.slice(0, 2).map(entry => entry.type), ['created', 'assigned']);
  const ack = h.calls.sent.find(mail => /хүлээн авлаа/.test(mail.subject));
  assert.equal(ack.replyTo, 'saraa.notify@scm.mn');
  assert.equal(h.calls.sent.find(mail => /Нэмэлт материал/.test(mail.subject)).replyTo, 'saraa.notify@scm.mn');
  const toAssignee = h.calls.sent.find(mail => mail.to === 'saraa.notify@scm.mn');
  assert.match(toAssignee.subject, /Танд итгэлцлийн хүсэлт хуваарилагдлаа/);
  assert.equal(toAssignee.text.includes('Бат'), false); assert.equal(toAssignee.text.includes('99112233'), false, 'phone masked');
  assert.ok(h.calls.sent.some(mail => mail.to === 'trust@scm.mn' && !/хуваарилаагүй/.test(mail.subject)));
  assert.equal(h.calls.sent.some(mail => mail.to === 'desk@scm.mn'), false, 'assigned: no unassigned copy');
});

test('trust auto-assignment: inactive configured staff -> unassigned and MAIL_REPLY_TO is notified', async () => {
  const h = harness({ trusts: [], config: { assignment_settings: { trust: { mode: 'auto', staffId: INACTIVE._id } } } });
  await h.invoke('post', '/api/trusts', { body: SUBMIT }); await h.flush();
  assert.equal(h.trustStore[0].assignee, undefined);
  const recipients = h.calls.sent.filter(mail => /Шинэ итгэлцлийн хүсэлт/.test(mail.subject)).map(mail => mail.to).sort();
  assert.deepEqual(recipients, ['desk@scm.mn', 'trust@scm.mn']);
  assert.ok(h.calls.sent.every(mail => !/Бат|99112233/.test(mail.text) || mail.to === 'client@example.mn'));
});

test('manual assignment: trusts.assign only, validates staff, history, notification, unassign, reply-to follows the assignee', async () => {
  const h = harness({ trusts: [TRUST] });
  const params = { id: TRUST._id };
  assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: SARAA, params, body: { staffId: BOLD._id } })).code, 403, 'officer lacks trusts.assign');
  assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: NOBODY, params, body: { staffId: BOLD._id } })).code, 403);
  for (const body of [{}, { staffId: 'x' }, { staffId: BOLD._id, extra: 1 }, []]) assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: DIRECTOR, params, body })).code, 400, JSON.stringify(body));
  assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: DIRECTOR, params, body: { staffId: INACTIVE._id } })).code, 400);
  assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: DIRECTOR, params, body: { staffId: NOBODY._id } })).code, 400);
  assert.equal((await h.invoke('post', '/api/trusts/:id/assign', { user: DIRECTOR, params: { id: hex(999) }, body: { staffId: BOLD._id } })).code, 404);
  const res = await h.invoke('post', '/api/trusts/:id/assign', { user: DIRECTOR, params, body: { staffId: SARAA._id } });
  assert.equal(res.code, 200); assert.deepEqual(res.data.trust.assignee, { userId: SARAA._id, name: 'Сараа' }); assert.equal(res.data.notify.result, 'queued');
  await h.flush();
  assert.equal(h.calls.sent.at(-1).to, 'saraa.notify@scm.mn');
  assert.deepEqual(h.trustStore[0].history.map(entry => entry.type), ['assigned', 'email']);
  assert.equal(h.trustStore[0].history[0].actor.name, 'Захирал');
  // replies now go to the assignee
  await h.invoke('post', '/api/trusts/:id/message', { user: DIRECTOR, params, body: { message: 'Сайн байна уу' } });
  assert.equal(h.calls.sent.at(-1).replyTo, 'saraa.notify@scm.mn');
  // self-assignment does not email the actor
  h.calls.sent.length = 0;
  const self = await h.invoke('post', '/api/trusts/:id/assign', { user: { ...BOLD, role: 'admin' }, params, body: { staffId: BOLD._id } });
  assert.equal(self.data.notify.result, 'skipped'); await h.flush(); assert.equal(h.calls.sent.length, 0);
  const un = await h.invoke('post', '/api/trusts/:id/assign', { user: ADMIN, params, body: { staffId: null } });
  assert.equal(un.data.trust.assignee, undefined); assert.equal(h.trustStore[0].history.filter(entry => entry.type === 'unassigned').length, 1);
  const list = await h.invoke('get', '/api/trusts/assignees', { user: DIRECTOR });
  assert.deepEqual(list.data.map(item => item.name).sort(), ['Админ', 'Болд', 'Захирал', 'Имэйлгүй', 'Сараа'].sort());
  assert.equal(JSON.stringify(list.data).includes('@'), false);
  assert.equal((await h.invoke('get', '/api/trusts/assignees', { user: SARAA })).code, 403);
});

test('trust status changes are recorded in history; unchanged status is not', async () => {
  const h = harness({ trusts: [TRUST] });
  await h.invoke('put', '/api/trusts/:id', { user: SARAA, params: { id: TRUST._id }, body: { status: 'resolved' } });
  await h.invoke('put', '/api/trusts/:id', { user: SARAA, params: { id: TRUST._id }, body: { status: 'resolved' } });
  await h.invoke('put', '/api/trusts/:id', { user: SARAA, params: { id: TRUST._id }, body: { contactNote: 'x' } });
  assert.deepEqual(h.trustStore[0].history.map(entry => [entry.type, entry.from, entry.to]), [['status', 'pending', 'resolved']]);
  assert.equal((await h.invoke('put', '/api/trusts/:id', { user: SARAA, params: { id: hex(999) }, body: { status: 'resolved' } })).code, 404);
});

// ---------- daily digest ----------
const loanOf = (n, userId, extra = {}) => ({ _id: hex(800 + n), applicationReference: `SCM-2026-00000${n}`, selectedProduct: 'cons_loan', taskStatus: 'in_review', status: 'studying', assignee: { userId, name: 'x' }, firstname: 'Нууц', lastname: 'Нэр', phone: '99887766', amount: 7777777, createdAt: new Date('2026-11-10T00:00:00Z'), taskUpdatedAt: new Date('2026-11-20T00:00:00Z'), taskHistory: [{ type: 'assigned', at: new Date('2026-11-14T00:00:00Z') }], ...extra });
const trustOf = (n, userId, extra = {}) => ({ _id: hex(900 + n), reference: `TRUST-2026-00000${n}`, status: 'pending', phone: '99887766', lastname: 'Нууц', assignee: { userId, name: 'x' }, assignedAt: new Date('2026-11-22T00:00:00Z'), createdAt: new Date('2026-11-21T00:00:00Z'), ...extra });

test('daily digest: one email per staff with their open loans and trusts, PII-free, terminal and unassigned skipped', async () => {
  const h = harness({
    loans: [loanOf(1, SARAA._id), loanOf(2, SARAA._id, { taskStatus: 'resolved' }), loanOf(3, SARAA._id, { taskStatus: undefined, status: 'rejected' }), loanOf(4, BOLD._id, { taskStatus: 'additional_docs' }), loanOf(5, hex(777))],
    trusts: [trustOf(1, SARAA._id), trustOf(2, SARAA._id, { status: 'resolved' }), trustOf(3, DIRECTOR._id)],
  });
  const result = await h.digest.run();
  assert.deepEqual(result, { status: 'done', staff: 3, sent: 3, failed: 0 });
  const bySaraa = h.calls.sent.find(mail => mail.to === 'saraa.notify@scm.mn');
  assert.match(bySaraa.subject, /2 нээлттэй/);
  assert.ok(bySaraa.text.includes('SCM-2026-000001') && bySaraa.text.includes('TRUST-2026-000001'));
  assert.equal(bySaraa.text.includes('SCM-2026-000002'), false, 'resolved loan excluded'); assert.equal(bySaraa.text.includes('SCM-2026-000003'), false, 'legacy rejected excluded');
  assert.equal(bySaraa.text.includes('TRUST-2026-000002'), false, 'resolved trust excluded');
  assert.match(bySaraa.text, /Зээлийн хүсэлт \(1\)/); assert.match(bySaraa.text, /Итгэлцлийн хүсэлт \(1\)/);
  assert.match(bySaraa.text, /хуваарилагдсанаас 10 хоног, сүүлд өөрчилсөнөөс 4 хоног/);
  assert.ok(bySaraa.text.includes('Хянаж буй'));
  assert.ok(bySaraa.text.includes('https://www.scm.mn/admin'));
  const everything = JSON.stringify(h.calls.sent);
  for (const pii of ['Нууц', '99887766', '7777777']) assert.equal(everything.includes(pii), false, pii);
  const bold = h.calls.sent.find(mail => mail.to === 'bold@scm.mn');
  assert.ok(bold.text.includes('SCM-2026-000004')); assert.equal(bold.text.includes('TRUST-'), false, 'no trust section when empty');
  assert.ok(h.calls.sent.find(mail => mail.to === 'director@scm.mn').text.includes('TRUST-2026-000003'));
  assert.equal(h.calls.sent.some(mail => /SCM-2026-000005/.test(mail.text)), false, 'assigned to an unknown user');
  assert.equal(h.siteStore.get('daily_digest_last_run').value, '2026-11-24', 'UB date');
});

test('daily digest is idempotent per UB day: a second run (even concurrent) sends nothing', async () => {
  const h = harness({ loans: [loanOf(1, SARAA._id)] });
  const [a, b] = await Promise.all([h.digest.run(), h.digest.run()]);
  assert.deepEqual([a.status, b.status].sort(), ['done', 'skipped']);
  assert.equal([a, b].find(item => item.status === 'skipped').reason, 'already_ran');
  assert.equal(h.calls.sent.length, 1);
  const again = await h.digest.run();
  assert.deepEqual(again, { status: 'skipped', reason: 'already_ran' });
  assert.equal(h.calls.sent.length, 1);
  // next UB day runs again
  const tomorrow = createDailyDigest({ User: h.User, LoanRequest: { find: query => chain(query['assignee.userId']?.$in?.includes('') ? [] : [loanOf(1, SARAA._id)]) }, TrustRequest: { find: () => chain([]) }, SiteConfig: h.SiteConfig, mailer: h.mailer, now: () => new Date(NOW.getTime() + 24 * 3600 * 1000), logger: { info() {}, error() {} } });
  assert.equal((await tomorrow.run()).status, 'done');
  assert.equal(h.calls.sent.length, 2);
});

test('daily digest flags 2+ day idle requests first and gives admins the unassigned backlog', async () => {
  const h = harness({
    loans: [
      loanOf(1, SARAA._id, { taskUpdatedAt: new Date('2026-11-23T12:00:00Z') }),
      loanOf(2, SARAA._id),
      loanOf(6, '', { assignee: { userId: '', name: '' }, taskStatus: 'new', createdAt: new Date('2026-11-20T00:00:00Z') }),
      loanOf(7, '', { assignee: { userId: '', name: '' }, taskStatus: 'new', createdAt: new Date('2026-11-24T00:00:00Z'), taskUpdatedAt: new Date('2026-11-24T00:00:00Z') }),
    ],
    trusts: [trustOf(4, undefined, { assignee: { userId: '', name: '' }, createdAt: new Date('2026-11-19T00:00:00Z') })],
  });
  await h.digest.run();
  const saraa = h.calls.sent.find(mail => mail.to === 'saraa.notify@scm.mn');
  assert.match(saraa.subject, /2 нээлттэй хүсэлт, 1 хугацаа хэтэрсэн/);
  assert.match(saraa.text, /Анхаарах: 1 хүсэлт 2\+ хоног хөдөлгөөнгүй/);
  assert.ok(saraa.text.indexOf('⚠ SCM-2026-000002') > -1 && saraa.text.indexOf('⚠ SCM-2026-000002') < saraa.text.indexOf('• SCM-2026-000001'), 'stale listed first');
  assert.equal(saraa.text.includes('SCM-2026-000006'), false, 'staff do not get the unassigned backlog');
  const admin = h.calls.sent.find(mail => mail.to === 'admin.notify@scm.mn');
  assert.ok(admin, 'admin gets a digest for the unassigned backlog even with nothing assigned');
  assert.match(admin.subject, /2 хуваарилаагүй/);
  assert.ok(admin.text.includes('⚠ SCM-2026-000006') && admin.text.includes('TRUST-2026-000004'));
  assert.equal(admin.text.includes('SCM-2026-000007'), false, 'unassigned for less than 2 days is not listed');
  assert.equal(h.calls.sent.some(mail => mail.to === 'director@scm.mn'), false, 'non-admin without own items gets nothing');
  for (const pii of ['Нууц', '99887766', '7777777']) assert.equal(JSON.stringify(h.calls.sent).includes(pii), false, pii);
});

test('daily digest skips inactive staff, staff without email, staff with nothing open; respects the flag and MAIL_ENABLED', async () => {
  const h = harness({ loans: [loanOf(1, INACTIVE._id), loanOf(2, NOMAIL._id), loanOf(3, SARAA._id)] });
  const result = await h.digest.run();
  assert.equal(result.staff, 1); assert.deepEqual(h.calls.sent.map(mail => mail.to), ['saraa.notify@scm.mn']);
  const off = harness({ loans: [loanOf(1, SARAA._id)], config: { daily_digest_enabled: false } });
  assert.deepEqual(await off.digest.run(), { status: 'skipped', reason: 'disabled' });
  assert.equal(off.calls.sent.length, 0); assert.equal(off.siteStore.has('daily_digest_last_run'), false, 'a disabled run does not consume the day');
  const noMail = harness({ loans: [loanOf(1, SARAA._id)], mailEnabled: false });
  assert.deepEqual(await noMail.digest.run(), { status: 'skipped', reason: 'mail_disabled' });
  assert.equal(noMail.siteStore.has('daily_digest_last_run'), false);
  const failing = harness({ loans: [loanOf(1, SARAA._id)] });
  failing.mailer.send = async () => ({ result: 'failed' });
  assert.deepEqual(await failing.digest.run(), { status: 'done', staff: 1, sent: 0, failed: 1 });
  assert.equal(DIGEST_CRON, '0 9 * * *'); assert.equal(DIGEST_TIMEZONE, 'Asia/Ulaanbaatar');
});

test('POST /api/admin/daily-digest/test: admin only, sends the caller their own digest, ignores flag and daily marker', async () => {
  const h = harness({ loans: [loanOf(1, ADMIN._id), loanOf(2, SARAA._id)], config: { daily_digest_enabled: false, daily_digest_last_run: '2026-11-24' } });
  assert.equal((await h.invoke('post', '/api/admin/daily-digest/test', { user: SARAA })).code, 403);
  const res = await h.invoke('post', '/api/admin/daily-digest/test');
  assert.equal(res.code, 200); assert.deepEqual([res.data.result, res.data.loans, res.data.trusts], ['sent', 1, 0]);
  assert.equal(h.calls.sent.length, 1); assert.equal(h.calls.sent[0].to, 'admin.notify@scm.mn');
  assert.ok(h.calls.sent[0].text.includes('SCM-2026-000001')); assert.equal(h.calls.sent[0].text.includes('SCM-2026-000002'), false);
  assert.equal(res.data.sentTo.includes('admin.notify'), false, 'address is masked');
  assert.equal(h.calls.logs.at(-1).action, 'daily_digest_test');
  // an admin with nothing open still gets an (empty) test email; no address -> skipped
  const none = harness();
  assert.deepEqual((await none.invoke('post', '/api/admin/daily-digest/test', { user: { ...ADMIN, notificationEmail: '', email: '' } })).data, { result: 'skipped', reason: 'no_email' });
  const noMail = harness({ mailEnabled: false });
  assert.equal((await noMail.invoke('post', '/api/admin/daily-digest/test')).data.reason, 'mail_disabled');
  const empty = harness();
  await empty.invoke('post', '/api/admin/daily-digest/test');
  assert.match(empty.calls.sent[0].text, /алга/);
});

test('email templates: digest caps the list and escapes HTML; trust document request lists labels', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ reference: `R${i}`, productName: '<b>x</b>', statusLabel: 'Шинэ', assignedDays: 1, changedDays: 2 }));
  const mail = emails.dailyDigest({ items, total: 60, adminUrl: 'https://www.scm.mn/admin', dateLabel: '2026-11-24' });
  assert.equal((mail.text.match(/^• /gm) || []).length, 50); assert.ok(mail.text.includes('өөр 10 хүсэлт')); assert.equal(mail.html.includes('<b>x</b>'), false);
  const doc = emails.trustDocumentRequest({ reference: 'TRUST-1', items: ['A', 'B'], note: 'n', uploadUrl: 'https://www.scm.mn/trust-request?upload=abc', expiresAt: NOW });
  assert.ok(doc.text.includes('• A') && doc.text.includes('Материал оруулах: https://www.scm.mn/trust-request?upload=abc'));
});
