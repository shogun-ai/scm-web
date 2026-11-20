import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { registerLoanTaskRoutes, LOAN_TASK_SCHEMA_FIELDS, applyLoanTaskSchema, legacyLoanPostGone, taskLockBlocks, hashToken, detectFileFormat, validateTaskFiles } from './loanTasks.js';
import { buildDefaultConfig } from '../shared/loanWidgets.js';

const NOW = new Date('2026-11-20T03:00:00Z');
const LOAN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OFFICER_ID = '0123456789abcdef01234567';
const OTHER_ID = 'abcdef0123456789abcdef01';
const MANAGER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const officer = { _id: OFFICER_ID, name: 'Сараа', role: 'employee', roles: ['loan_officer'] };
const otherOfficer = { _id: OTHER_ID, name: 'Дорж', role: 'employee', roles: ['loan_officer'], email: 'dorj@scm.mn', isActive: true };
const manager = { _id: MANAGER_ID, name: 'Менежер', role: 'employee', roles: ['director'] };
const admin = { _id: MANAGER_ID, name: 'Admin', role: 'admin' };
const PDF = () => Buffer.from('%PDF-1.7\nhello');
const PNG = () => Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('data')]);
const pdfFile = (fieldname, extra = {}) => ({ fieldname, originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: PDF(), ...extra });

// ---------- tiny Mongo matcher / updater over plain objects ----------
const leafValues = (doc, path) => path.split('.').reduce((values, key) => values.flatMap(value => {
  if (Array.isArray(value)) return value.map(item => (item && typeof item === 'object' ? item[key] : undefined));
  return [value && typeof value === 'object' ? value[key] : undefined];
}), [doc]);
const norm = value => (value instanceof Date ? value.getTime() : value && typeof value === 'object' && typeof value.toHexString === 'function' ? value.toHexString() : value);
const same = (value, expected) => (expected === null ? value === undefined || value === null : norm(value) === norm(expected));
function matches(doc, filter) {
  return Object.entries(filter || {}).every(([key, cond]) => {
    if (key === '$and') return cond.every(item => matches(doc, item));
    if (key === '$or') return cond.some(item => matches(doc, item));
    const values = leafValues(doc, key);
    const flat = values.flatMap(value => (Array.isArray(value) ? [value, ...value] : [value]));
    if (cond instanceof RegExp) return flat.some(value => typeof value === 'string' && cond.test(value));
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && Object.keys(cond).some(op => op.startsWith('$'))) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$in') return arg.some(item => flat.some(value => same(value, item)));
        if (op === '$nin') return !arg.some(item => flat.some(value => same(value, item)));
        if (op === '$ne') return !flat.some(value => same(value, arg));
        if (op === '$exists') return arg ? flat.some(value => value !== undefined) : flat.every(value => value === undefined);
        if (op === '$gt') return flat.some(value => value !== undefined && norm(value) > norm(arg));
        if (op === '$elemMatch') return values.some(value => Array.isArray(value) && value.some(item => matches(item, arg)));
        throw new Error(`unsupported ${op}`);
      });
    }
    return flat.some(value => same(value, cond));
  });
}
function applyUpdate(doc, update) {
  for (const [key, value] of Object.entries(update.$set || {})) doc[key] = structuredClone(value);
  for (const [key, value] of Object.entries(update.$inc || {})) doc[key] = (doc[key] || 0) + value;
  for (const key of Object.keys(update.$unset || {})) delete doc[key];
  for (const [key, value] of Object.entries(update.$push || {})) {
    const items = value && Array.isArray(value.$each) ? value.$each : [value];
    doc[key] = [...(doc[key] || []), ...structuredClone(items).map(item => ({ _id: new mongoose.Types.ObjectId().toHexString(), ...item }))];
  }
  return doc;
}

function harness({ env = { LOAN_TASKS_ENABLED: 'true' }, configs = [], loans = [], users = [otherOfficer], uploadFailAt = 0, mailer } = {}) {
  const routes = new Map();
  const store = loans.map(loan => structuredClone(loan));
  const configStore = configs.map(config => structuredClone(config));
  const records = [];
  const calls = { uploads: 0, destroys: 0, finds: [], counts: [], updates: [], selects: [], automation: 0, logs: [], sent: [], configFinds: 0 };
  const tasks = [];
  let clock = NOW;
  const chain = (value, onSelect) => ({ select(fields) { onSelect?.(fields); return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => structuredClone(value) });
  class LoanRequest {
    constructor(payload) {
      Object.assign(this, structuredClone(payload));
      this._id = LOAN_ID;
      if (Array.isArray(this.fileDetails)) this.fileDetails = this.fileDetails.map((file, index) => ({ _id: `f${index}`, ...file }));
    }
    async save() { records.push(this); store.push(structuredClone({ ...this })); return this; }
    static find(query) { calls.finds.push(query); return chain(store.filter(doc => matches(doc, query)), fields => calls.selects.push(fields)); }
    static async countDocuments(query) { calls.counts.push(query); return store.filter(doc => matches(doc, query)).length; }
    static findOne(query) { calls.finds.push(query); return chain(store.find(doc => matches(doc, query)) || null); }
    static async findOneAndUpdate(query, update, options) {
      calls.updates.push({ query, update, options });
      const doc = store.find(item => matches(item, query));
      if (!doc) return null;
      return structuredClone(applyUpdate(doc, update));
    }
    static async updateOne(query, update) { const doc = store.find(item => matches(item, query)); if (doc) applyUpdate(doc, update); return { acknowledged: true }; }
  }
  const LoanFormConfig = {
    find: () => { calls.configFinds++; return chain(configStore); },
    async create(doc) { if (configStore.some(item => item.productKey === doc.productKey)) throw Object.assign(new Error('dup'), { code: 11000 }); configStore.push(structuredClone(doc)); return structuredClone(doc); },
    async findOneAndUpdate(query, update) { const doc = configStore.find(item => matches(item, query)); if (!doc) return null; return structuredClone(applyUpdate(doc, update)); },
  };
  const User = {
    findById: id => chain(users.find(user => String(user._id) === String(id)) || null),
    find: query => chain(users.filter(user => query._id.$in.includes(String(user._id)))),
  };
  const app = Object.fromEntries(['get', 'post', 'put', 'patch'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const multer = () => ({ any: () => (req, _res, callback) => callback(req.uploadError) });
  multer.memoryStorage = () => ({});
  const cloudinary = {
    url: id => `https://res.cloudinary.com/demo/raw/authenticated/s--sig--/${id}`,
    utils: { private_download_url: (id, format, options) => `https://api.cloudinary.com/v1_1/demo/${options.resource_type}/download?public_id=${encodeURIComponent(id)}&format=${format}&type=${options.type}&expires_at=${options.expires_at}&signature=sig` },
    uploader: {
      upload_stream: (_options, callback) => ({ end: () => { calls.uploads++; if (uploadFailAt && calls.uploads === uploadFailAt) callback(new Error('cloud down')); else callback(null, { public_id: `scm_loan_private/doc${calls.uploads}` }); } }),
      destroy: async () => { calls.destroys++; },
    },
  };
  const fakeMailer = mailer || { send: async message => { calls.sent.push(message); return { result: 'sent' }; } };
  const requireAdmin = (req, res, next) => (req.user?.role === 'admin' || req.user?.roles?.includes('admin') ? next() : res.status(403).json({ message: 'Forbidden' }));
  registerLoanTaskRoutes({
    app, multer, cloudinary, LoanRequest, LoanFormConfig, User,
    authenticateUser: (_req, _res, next) => next(), requireAdmin,
    createLog: async (user, action, details) => { calls.logs.push({ action, details }); },
    mailer: fakeMailer, automate: () => { calls.automation++; }, env, now: () => clock,
    getCompanyPhone: async () => '7599-1919', schedule: fn => tasks.push(fn), logger: { error() {}, warn() {}, info() {} },
  });
  const invoke = async (method, path, req = {}) => {
    let finish;
    const done = new Promise(resolve => { finish = resolve; });
    const response = { code: 200, headers: {}, headersSent: false, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; this.headersSent = true; finish(this); return this; } };
    const handlers = routes.get(`${method}:${path}`);
    assert.ok(handlers, `route ${method}:${path}`);
    const request = { user: officer, params: {}, query: {}, ip: `ip-${Math.random()}`, files: [], body: {}, ...req };
    const run = index => handlers[index](request, response, () => run(index + 1));
    await run(0);
    return done;
  };
  const flush = async () => { while (tasks.length) await tasks.shift()(); };
  return { invoke, calls, records, store, configStore, flush, setNow: date => { clock = date; } };
}

const activeConfig = (extra = {}) => ({
  ...buildDefaultConfig('cons_loan'), isActive: true, version: 3, defaultAssigneeId: '',
  steps: [
    { id: 'contact', title: 'Холбоо барих', fields: [{ kind: 'preset', key: 'full_name', required: true }, { kind: 'preset', key: 'phone', required: true }, { kind: 'preset', key: 'email' }, { kind: 'preset', key: 'register_number' }] },
    { id: 'loan', title: 'Зээл', fields: [{ kind: 'preset', key: 'loan_amount', required: true }, { kind: 'preset', key: 'other_loans' }, { kind: 'custom', key: 'cf_workplace', type: 'text', label: 'Ажлын газар', required: false, maxLength: 200 }] },
    { id: 'docs', title: 'Баримт', fields: [{ kind: 'preset', key: 'id_reference', required: true }, { kind: 'custom', key: 'cf_slip', type: 'file', label: 'Цалин', required: false, accept: ['pdf'], maxSizeMb: 1, maxFiles: 1 }] },
  ],
  subProducts: [
    { id: 'live-promo', name: 'Live', isActive: true, startDate: '2026-11-01', endDate: '2026-12-31', inheritSteps: true, steps: [], defaultAssigneeId: OTHER_ID, order: 1 },
    { id: 'expired', name: 'Expired', isActive: true, startDate: '2026-01-01', endDate: '2026-02-01', inheritSteps: true, steps: [], order: 2 },
    { id: 'scheduled', name: 'Scheduled', isActive: true, startDate: '2027-01-01', endDate: null, inheritSteps: true, steps: [], order: 3 },
    { id: 'off', name: 'Off', isActive: false, inheritSteps: true, steps: [], order: 4 },
  ],
  updatedBy: { userId: MANAGER_ID, name: 'Admin' },
  ...extra,
});
const answers = (extra = {}) => ({ full_name: { lastName: 'Бат', firstName: 'Болд' }, phone: '99001234', email: 'bold@example.mn', register_number: 'УБ90050112', loan_amount: 5000000, other_loans: { hasActiveLoans: true, loans: [{ lender: 'Хаан', balance: 100, monthlyPayment: 10 }] }, ...extra });
const submitBody = (extra = {}) => ({ productKey: 'cons_loan', subProductId: '', configVersion: '3', answers: JSON.stringify(answers()), consent: 'true', website: '', ...extra });
const submit = (h, { body = {}, files = [pdfFile('id_reference')], uploadError } = {}) => h.invoke('post', '/api/loan-tasks/public/submit', { user: undefined, body: submitBody(body), files, uploadError });
const legacyLoan = (extra = {}) => ({ _id: LOAN_ID, status: 'resolved', workflowRevision: 5, applicationReference: 'SCM-2025-AAAAAA', firstname: 'Болд', lastname: 'Бат', regNo: 'УБ90050112', phone: '99001234', selectedProduct: 'cons_loan', amount: 1000, applicationData: { borrower: { regNo: 'УБ90050112' } }, fileDetails: [{ _id: 'fd1', fieldName: 'file_id', fileName: 'id.pdf', fileUrl: 'https://res.cloudinary.com/x', publicId: 'scm_loan_private/p1', deliveryType: 'authenticated' }], assignee: { userId: OFFICER_ID, name: 'Сараа' }, ...extra });

test('feature flag off: public GET reports disabled, everything else 503, quick flow untouched', async () => {
  const h = harness({ env: {}, configs: [activeConfig()] });
  let response = await h.invoke('get', '/api/loan-tasks/public/products');
  assert.deepEqual(response.data, { enabled: false, products: [] });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'cons_loan' } });
  assert.deepEqual(response.data, { enabled: false, product: null });
  for (const [method, path, req] of [['post', '/api/loan-tasks/public/submit'], ['get', '/api/loan-tasks'], ['get', '/api/loan-tasks/summary'], ['get', '/api/loan-tasks/:id', { params: { id: LOAN_ID } }], ['post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID } }], ['get', '/api/loan-tasks/admin/configs'], ['get', '/api/loan-tasks/upload/:token', { params: { token: 'x' } }], ['post', '/api/loan-tasks/upload/:token', { params: { token: 'x' } }], ['post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID } }]]) {
    response = await h.invoke(method, path, req);
    assert.equal(response.code, 503, path); assert.equal(response.data.code, 'DISABLED');
  }
  assert.equal(h.calls.uploads, 0); assert.equal(h.records.length, 0);
});

test('public products expose only active configs and live sub products without internal fields', async () => {
  const h = harness({ configs: [activeConfig(), { ...buildDefaultConfig('biz_loan'), isActive: false, version: 1 }] });
  let response = await h.invoke('get', '/api/loan-tasks/public/products');
  assert.deepEqual(response.data, { enabled: true, products: [{ productKey: 'cons_loan', name: 'Хэрэглээний зээл', hasLiveSubProducts: true }] });
  assert.equal(response.headers['Cache-Control'], 'public, max-age=60');
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'cons_loan' } });
  const product = response.data.product;
  assert.equal(product.configVersion, 3);
  assert.deepEqual(product.subProducts.map(sub => sub.id), ['live-promo']);
  assert.equal(product.subProducts[0].steps.length, 3);
  const json = JSON.stringify(response.data);
  for (const secret of ['defaultAssigneeId', 'updatedBy', OTHER_ID, 'storage']) assert.equal(json.includes(secret), false, secret);
  assert.equal(product.steps[0].fields[0].widget, 'full_name');
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'biz_loan' } });
  assert.deepEqual(response.data, { enabled: true, product: null });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'made_up' } });
  assert.equal(response.code, 404);
});

test('valid submission stores a task-v1 request and returns only the reference', async () => {
  const h = harness({ configs: [activeConfig()] });
  const response = await submit(h, { body: { status: 'approved', assignee: OFFICER_ID, answers: JSON.stringify(answers({ status: 'approved', assignee: { userId: OFFICER_ID }, applicationData: { x: 1 } })) } });
  assert.equal(response.code, 201, JSON.stringify(response.data));
  assert.deepEqual(Object.keys(response.data), ['applicationReference']);
  assert.match(response.data.applicationReference, /^SCM-2026-[A-F0-9]{6}$/);
  const loan = h.records[0];
  assert.equal(loan.intakeVersion, 'quick-v1'); assert.equal(loan.formVersion, 'task-v1');
  assert.equal(loan.taskStatus, 'new'); assert.equal(loan.status, 'pending'); assert.equal(loan.taskRevision, 0);
  assert.equal(loan.assignee, undefined);
  assert.equal(loan.firstname, 'Болд'); assert.equal(loan.lastname, 'Бат'); assert.equal(loan.regNo, 'УБ90050112'); assert.equal(loan.amount, 5000000); assert.equal(loan.selectedProduct, 'cons_loan');
  assert.equal(loan.taskForm.configVersion, 3); assert.equal(loan.taskForm.steps.length, 3); assert.equal(loan.taskForm.steps[0].fields[0].label, 'Овог нэр');
  assert.equal(Object.hasOwn(loan.taskAnswers, 'status'), false); assert.equal(Object.hasOwn(loan.taskAnswers, 'applicationData'), false);
  assert.deepEqual(loan.taskAnswers.id_reference, [{ fileDetailId: 'f0', fileName: 'doc.pdf' }]);
  assert.equal(loan.fileDetails[0].fieldName, 'file_id'); assert.equal(loan.fileDetails[0].deliveryType, 'authenticated');
  assert.deepEqual(loan.applicationData.otherLoans, [{ source: 'self_declared', lender: 'Хаан', balance: 100, monthlyPayment: 10 }]);
  assert.equal(loan.applicationData.intake.version, 'task-v1');
  assert.equal(loan.taskHistory[0].type, 'created');
  assert.equal(h.calls.automation, 0, 'D6: AI automation off by default');
  await h.flush();
  assert.equal(h.calls.sent.length, 1);
  assert.equal(h.calls.sent[0].template, 'applicant_ack'); assert.equal(h.calls.sent[0].to, 'bold@example.mn');
  assert.equal(h.calls.sent[0].replyTo, '', 'no assignee -> mailer falls back to MAIL_REPLY_TO');
  for (const pii of ['УБ90050112', 'Болд', '5000000']) assert.equal(h.calls.sent[0].text.includes(pii), false, pii);
  assert.equal(h.store[0].taskHistory.at(-1).type, 'email'); assert.equal(h.store[0].taskHistory.at(-1).email.result, 'sent');
});

test('invalid submissions are rejected before any cloud upload', async () => {
  const cases = [
    [{ body: { answers: JSON.stringify(answers({ phone: '' })) } }, 400, 'phone'],
    [{ body: { answers: JSON.stringify(answers({ full_name: { lastName: '', firstName: 'Болд' } })) } }, 400, 'full_name'],
    [{ files: [] }, 400, 'id_reference'],
    [{ files: [pdfFile('id_reference', { buffer: Buffer.from('MZ-not-a-pdf') })] }, 400, 'id_reference'],
    [{ files: [pdfFile('id_reference', { mimetype: 'image/png' })] }, 400, 'id_reference'],
    [{ files: [pdfFile('id_reference', { buffer: Buffer.alloc(0) })] }, 400, 'id_reference'],
    [{ files: [pdfFile('id_reference'), pdfFile('cf_slip', { buffer: Buffer.concat([PDF(), Buffer.alloc(1024 * 1024)]) })] }, 400, 'cf_slip'],
    [{ files: [pdfFile('id_reference'), pdfFile('cf_slip'), pdfFile('cf_slip')] }, 400, 'cf_slip'],
    [{ files: [pdfFile('id_reference'), pdfFile('file_selfie')] }, 400, 'file_selfie'],
    [{ files: [pdfFile('id_reference'), pdfFile('__proto__')] }, 400, '_files'],
    [{ files: [pdfFile('id_reference'), { fieldname: 'cf_slip', mimetype: 'image/png', buffer: PNG() }] }, 400, 'cf_slip'],
    [{ body: { consent: 'false' } }, 400, 'consent'],
    [{ body: { answers: '{bad json' } }, 400, '_form'],
    [{ body: { answers: JSON.stringify({ cf_workplace: 'x'.repeat(33 * 1024) }) } }, 400, '_form'],
    [{ body: { answers: JSON.stringify(answers({ other_loans: { hasActiveLoans: true, loans: [] } })) } }, 400, 'other_loans'],
  ];
  for (const [input, code, key] of cases) {
    const h = harness({ configs: [activeConfig()] });
    const response = await submit(h, input);
    assert.equal(response.code, code, `${key}: ${JSON.stringify(response.data)}`);
    assert.ok(Object.hasOwn(response.data.errors || {}, key), `${key} in ${JSON.stringify(response.data)}`);
    assert.equal(h.calls.uploads, 0, key); assert.equal(h.records.length, 0, key);
  }
});

test('product availability, config version, honeypot and multer limits', async () => {
  let h = harness({ configs: [activeConfig()] });
  let response = await submit(h, { body: { configVersion: '2' } });
  assert.equal(response.code, 409); assert.equal(response.data.code, 'CONFIG_CHANGED');
  response = await submit(h, { body: { subProductId: 'expired' } });
  assert.equal(response.code, 404); assert.equal(response.data.code, 'PRODUCT_UNAVAILABLE');
  response = await submit(h, { body: { productKey: 'biz_loan' } });
  assert.equal(response.code, 404);
  response = await submit(h, { body: { website: 'spam' } });
  assert.equal(response.code, 400); assert.equal(h.records.length, 0);
  response = await submit(h, { uploadError: new Error('LIMIT_FILE_SIZE') });
  assert.equal(response.code, 400);
  h = harness({ configs: [activeConfig({ isActive: false })] });
  response = await submit(h);
  assert.equal(response.code, 404);
  h = harness({ configs: [activeConfig({ baseProductEnabled: false })] });
  assert.equal((await submit(h)).code, 404);
  assert.equal((await submit(h, { body: { subProductId: 'live-promo' } })).code, 201);
  assert.equal(h.calls.uploads, 1);
});

test('cloud failure destroys already uploaded files and saves nothing', async () => {
  const h = harness({ configs: [activeConfig()], uploadFailAt: 2 });
  const response = await submit(h, { files: [pdfFile('id_reference'), pdfFile('cf_slip')] });
  assert.equal(response.code, 500); assert.equal(h.calls.destroys, 1); assert.equal(h.records.length, 0);
  assert.equal(JSON.stringify(response.data).includes('cloud down'), false);
});

test('default assignee: active staff assigned + notified (D10 replyTo), inactive leaves new with system note', async () => {
  let h = harness({ configs: [activeConfig()] });
  let response = await submit(h, { body: { subProductId: 'live-promo' } });
  assert.equal(response.code, 201);
  assert.equal(h.records[0].taskStatus, 'assigned'); assert.equal(h.records[0].status, 'assigned');
  assert.deepEqual(h.records[0].assignee, { userId: OTHER_ID, name: 'Дорж' });
  assert.equal(h.records[0].taskForm.subProductId, 'live-promo');
  await h.flush();
  const staffMail = h.calls.sent.find(message => message.template === 'staff_assignment');
  assert.equal(staffMail.to, 'dorj@scm.mn');
  assert.equal(staffMail.text.includes('Бат'), false);
  assert.equal(h.calls.sent.find(message => message.template === 'applicant_ack').replyTo, 'dorj@scm.mn');
  h = harness({ configs: [activeConfig()], users: [{ ...otherOfficer, isActive: false }] });
  response = await submit(h, { body: { subProductId: 'live-promo' } });
  assert.equal(response.code, 201);
  assert.equal(h.records[0].taskStatus, 'new'); assert.equal(h.records[0].assignee, undefined);
  assert.ok(h.records[0].taskHistory.some(entry => entry.type === 'note' && entry.actor.system));
});

test('mail failures never affect the response; AI automation only with flag', async () => {
  const h = harness({ configs: [activeConfig()], env: { LOAN_TASKS_ENABLED: 'true', LOAN_TASKS_AI_AUTOMATION: 'true' }, mailer: { send: async () => { throw new Error('smtp'); } } });
  const response = await submit(h);
  assert.equal(response.code, 201);
  await h.flush();
  assert.equal(h.calls.automation, 1);
});

test('admin config CRUD: admin only, validation, optimistic version, cache invalidation', async () => {
  const h = harness({ configs: [activeConfig()] });
  let response = await h.invoke('get', '/api/loan-tasks/admin/configs', { user: manager });
  assert.equal(response.code, 403);
  response = await h.invoke('get', '/api/loan-tasks/admin/configs', { user: admin });
  assert.equal(response.code, 200);
  assert.equal(response.data.products.length, 8);
  const cons = response.data.products.find(item => item.productKey === 'cons_loan');
  assert.equal(cons.saved, true); assert.deepEqual(cons.config.subProducts.map(sub => sub.status), ['live', 'expired', 'scheduled', 'inactive']);
  const biz = response.data.products.find(item => item.productKey === 'biz_loan');
  assert.equal(biz.saved, false); assert.equal(biz.config.version, 0); assert.equal(biz.config.isActive, false);
  assert.ok(response.data.presets.length > 10);

  await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'cons_loan' } });
  const body = { ...activeConfig(), expectedVersion: 3 };
  delete body.version;
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: manager, params: { productKey: 'cons_loan' }, body });
  assert.equal(response.code, 403);
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'cons_loan' }, body: { ...body, steps: [] } });
  assert.equal(response.code, 400); assert.ok(response.data.errors.steps);
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'cons_loan' }, body: { ...body, defaultAssigneeId: OFFICER_ID } });
  assert.equal(response.code, 400, 'unknown staff'); assert.ok(response.data.errors.defaultAssigneeId);
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'cons_loan' }, body: { ...body, expectedVersion: 2 } });
  assert.equal(response.code, 409); assert.equal(response.data.code, 'VERSION_CONFLICT');
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'cons_loan' }, body: { ...body, isActive: false } });
  assert.equal(response.code, 200, JSON.stringify(response.data)); assert.equal(response.data.version, 4); assert.equal(Object.hasOwn(response.data, 'expectedVersion'), false);
  assert.equal(h.configStore[0].updatedBy.name, 'Admin');
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { params: { productKey: 'cons_loan' } });
  assert.equal(response.data.product, null, 'cache invalidated after PUT');
  // create (expectedVersion 0) and duplicate create conflict
  const fresh = { ...buildDefaultConfig('biz_loan'), expectedVersion: 0 };
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'biz_loan' }, body: fresh });
  assert.equal(response.code, 200); assert.equal(response.data.version, 1);
  response = await h.invoke('put', '/api/loan-tasks/admin/configs/:productKey', { user: admin, params: { productKey: 'biz_loan' }, body: fresh });
  assert.equal(response.code, 409);
  assert.ok(h.calls.logs.some(log => log.action === 'loan_task_config_saved'));
});

test('staff list is scoped inside $and, projection omits PII, manager filters guarded', async () => {
  const docs = [legacyLoan({ status: 'studying' }), legacyLoan({ _id: 'cccccccccccccccccccccccc', status: 'pending', assignee: { userId: OTHER_ID, name: 'Дорж' } })];
  const h = harness({ loans: docs });
  let response = await h.invoke('get', '/api/loan-tasks', { query: { status: 'in_review', search: 'Бат.*', limit: '1000' } });
  assert.equal(response.code, 200);
  assert.equal(response.data.limit, 100);
  const query = h.calls.finds.at(-1);
  assert.ok(Array.isArray(query.$and));
  assert.ok(query.$and.some(filter => filter['assignee.userId'] === OFFICER_ID));
  assert.ok(query.$and.some(filter => filter.$or && filter.$or[0].applicationReference instanceof RegExp && filter.$or[0].applicationReference.source === 'Бат\\.\\*'));
  assert.ok(!h.calls.selects.at(-1).includes('regNo')); assert.ok(!h.calls.selects.at(-1).includes('taskAnswers')); assert.ok(!h.calls.selects.at(-1).includes('applicationData'));
  response = await h.invoke('get', '/api/loan-tasks', { query: {} });
  assert.deepEqual(response.data.items.map(item => item._id), [LOAN_ID]);
  assert.equal(response.data.items[0].taskStatus, 'in_review'); assert.equal(response.data.items[0].taskStatusSource, 'legacy'); assert.equal(response.data.items[0].isTaskForm, false);
  response = await h.invoke('get', '/api/loan-tasks', { query: { assignee: 'all' } });
  assert.equal(response.code, 403);
  response = await h.invoke('get', '/api/loan-tasks', { user: { _id: OFFICER_ID, role: 'employee' } });
  assert.equal(response.code, 403);
  response = await h.invoke('get', '/api/loan-tasks', { user: manager, query: { assignee: 'all' } });
  assert.equal(response.data.total, 2);
  response = await h.invoke('get', '/api/loan-tasks/summary', { user: manager });
  assert.deepEqual(response.data, { counts: { new: 0, assigned: 1, additional_docs: 0, in_review: 1, rejected: 0, resolved: 0 }, total: 2 });
});

test('legacy request actions write only task fields (+assignee), never legacy status', async () => {
  const h = harness({ loans: [legacyLoan()] });
  let response = await h.invoke('get', '/api/loan-tasks/:id', { params: { id: LOAN_ID } });
  assert.equal(response.data.taskStatus, 'resolved'); assert.deepEqual(response.data.outcome.code, 'approved_conditional');
  assert.equal(response.data.taskForm, null); assert.equal(response.data.answers, null);
  assert.equal(response.data.files[0].label, 'Иргэний үнэмлэхийн лавлагаа'); assert.ok(response.data.files[0].url.startsWith('https://api.cloudinary.com/v1_1/demo/raw/download?public_id=scm_loan_private%2Fp1'));
  assert.ok(response.data.files[0].url.includes(`expires_at=${Math.floor(NOW.getTime() / 1000) + 600}`), 'short-lived URL generated at read time');
  assert.equal(response.data.allowedActions.reopen, false);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'reopen', note: 'x', expectedRevision: 0 } });
  assert.equal(response.code, 403);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'assign', assigneeId: OTHER_ID, expectedRevision: 0 } });
  assert.equal(response.code, 403);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { user: manager, params: { id: LOAN_ID }, body: { type: 'reopen', note: 'Дахин шалгана', expectedRevision: 1 } });
  assert.equal(response.code, 409); assert.equal(response.data.code, 'REVISION_CONFLICT');
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { user: manager, params: { id: LOAN_ID }, body: { type: 'reopen', note: 'Дахин шалгана', expectedRevision: 0 } });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  assert.equal(response.data.taskStatus, 'in_review'); assert.equal(response.data.taskRevision, 1);
  const update = h.calls.updates.at(-1);
  assert.deepEqual(update.query.taskRevision, { $in: [0, null] });
  for (const forbidden of ['status', 'workflowRevision', 'applicationData', 'fileDetails', 'regNo']) {
    assert.equal(Object.hasOwn(update.update.$set, forbidden), false, forbidden);
    assert.equal(Object.hasOwn(update.update.$inc, forbidden), false, forbidden);
  }
  assert.equal(h.store[0].status, 'resolved'); assert.equal(h.store[0].workflowRevision, 5);
  assert.equal(response.data.history.at(-1).type, 'reopened'); assert.equal(response.data.history.at(-1).outcome, 'approved_conditional');
  // D5: manager assignment on a legacy request updates only assignee + task fields
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { user: manager, params: { id: LOAN_ID }, body: { type: 'assign', assigneeId: OTHER_ID, expectedRevision: 1 } });
  assert.equal(response.code, 200);
  assert.deepEqual(Object.keys(h.calls.updates.at(-1).update.$set).sort(), ['assignee', 'taskAssignedAt', 'taskUpdatedAt']);
  assert.deepEqual(h.store[0].assignee, { userId: OTHER_ID, name: 'Дорж' });
  await h.flush();
  assert.equal(h.calls.sent.at(-1).template, 'staff_assignment');
  for (const log of h.calls.logs) for (const pii of ['УБ90050112', 'Болд', '99001234']) assert.equal(log.details.includes(pii), false);
  // former assignee lost access -> 404
  response = await h.invoke('get', '/api/loan-tasks/:id', { params: { id: LOAN_ID } });
  assert.equal(response.code, 404);
  response = await h.invoke('get', '/api/loan-tasks/:id', { params: { id: 'nope' } });
  assert.equal(response.code, 400);
});

test('status transitions require outcome/note; note action persists in history (bug fix)', async () => {
  const h = harness({ loans: [legacyLoan({ status: 'studying' })] });
  let response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'resolved', note: 'ok', expectedRevision: 0 } });
  assert.equal(response.code, 400); assert.ok(response.data.errors.outcome);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'rejected', expectedRevision: 0 } });
  assert.equal(response.code, 400); assert.ok(response.data.errors.note);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'in_review', expectedRevision: 0, status: 'approved' } });
  assert.equal(response.code, 400);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'note', note: 'Утсаар холбогдсон' } });
  assert.equal(response.code, 200);
  assert.equal(h.store[0].taskHistory[0].note, 'Утсаар холбогдсон'); assert.equal(h.store[0].taskHistory[0].type, 'note');
  assert.equal(response.data.history[0].actor.name, 'Сараа'); assert.equal(h.store[0].taskRevision, undefined);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'resolved', outcome: { code: 'disbursed' }, note: 'Олгосон', expectedRevision: 0 } });
  assert.equal(response.code, 200);
  assert.equal(h.store[0].taskStatus, 'resolved'); assert.equal(h.store[0].taskOutcome.code, 'disbursed'); assert.equal(h.store[0].status, 'studying');
  assert.deepEqual(response.data.outcome.code, 'disbursed');
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'in_review', expectedRevision: 1 } });
  assert.equal(response.code, 403, 'staff cannot leave terminal state');
});

test('staff file upload goes to taskFiles and never fileDetails', async () => {
  const h = harness({ loans: [legacyLoan({ status: 'studying' })] });
  let response = await h.invoke('post', '/api/loan-tasks/:id/files', { params: { id: LOAN_ID }, body: { fieldKey: 'bank_statement' }, files: [pdfFile('files'), { fieldname: 'files', originalname: 'a.png', mimetype: 'image/png', buffer: PNG() }] });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  assert.equal(h.store[0].taskFiles.length, 2); assert.equal(h.store[0].fileDetails.length, 1);
  assert.equal(h.store[0].taskFiles[0].fieldName, 'file_bank'); assert.equal(h.store[0].taskFiles[0].source, 'staff');
  assert.equal(Object.hasOwn(h.calls.updates.at(-1).update.$push, 'fileDetails'), false);
  assert.ok(response.data.files.some(file => file.source === 'staff' && file.label === 'Дансны хуулга'));
  response = await h.invoke('post', '/api/loan-tasks/:id/files', { params: { id: LOAN_ID }, body: { fieldKey: 'bogus' }, files: [pdfFile('files')] });
  assert.equal(response.code, 400);
  response = await h.invoke('post', '/api/loan-tasks/:id/files', { params: { id: LOAN_ID }, body: { fieldKey: 'additional' }, files: [pdfFile('files', { buffer: Buffer.from('nope') })] });
  assert.equal(response.code, 400); assert.equal(h.calls.uploads, 2);
  const closed = harness({ loans: [legacyLoan()] });
  response = await closed.invoke('post', '/api/loan-tasks/:id/files', { params: { id: LOAN_ID }, body: { fieldKey: 'additional' }, files: [pdfFile('files')] });
  assert.equal(response.code, 403);
});

test('applicant upload link lifecycle (D7): hash-only storage, expiry, terminal revocation', async () => {
  const h = harness({ loans: [legacyLoan({ status: 'studying', email: 'bold@example.mn' })], users: [otherOfficer, { ...officer, email: 'saraa@scm.mn', isActive: true }] });
  let response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'bank_statement' }, { key: 'additional', label: 'Цалингийн тодорхойлолт' }], note: 'Сүүлийн 6 сар' } });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  const token = new URL(response.data.uploadUrl).searchParams.get('upload');
  assert.match(response.data.uploadUrl, /^https:\/\/www\.scm\.mn\/loan-request\?upload=/);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(h.store[0]).includes(token), false, 'plain token never stored');
  assert.equal(h.store[0].taskUploadLinks[0].tokenHash, hashToken(token));
  assert.equal(h.store[0].taskStatus, 'additional_docs'); assert.equal(h.store[0].status, 'studying');
  assert.equal(new Date(response.data.expiresAt).getTime(), NOW.getTime() + 7 * 86400000);
  assert.equal(JSON.stringify(response.data.task).includes('tokenHash'), false);
  assert.equal(response.data.task.uploadLinks[0].active, true);
  await h.flush();
  const docMail = h.calls.sent.find(message => message.template === 'applicant_doc_request');
  assert.equal(docMail.to, 'bold@example.mn'); assert.ok(docMail.text.includes(token)); assert.equal(docMail.replyTo, 'saraa@scm.mn', 'D10 reply-to assignee');

  response = await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token } });
  assert.equal(response.code, 200);
  assert.deepEqual(Object.keys(response.data).sort(), ['expiresAt', 'items', 'note', 'productName', 'requestNo']);
  assert.equal(response.data.requestNo, 'SCM-2025-AAAAAA');
  assert.deepEqual(response.data.items.map(item => [item.key, item.label, item.uploaded]), [['bank_statement', 'Дансны хуулга', false], ['additional', 'Цалингийн тодорхойлолт', false]]);
  for (const pii of ['Болд', 'УБ90050112', '99001234']) assert.equal(JSON.stringify(response.data).includes(pii), false);

  response = await h.invoke('post', '/api/loan-tasks/upload/:token', { user: undefined, params: { token }, files: [pdfFile('id_reference')] });
  assert.equal(response.code, 400, 'not a requested key'); assert.equal(h.calls.uploads, 0);
  response = await h.invoke('post', '/api/loan-tasks/upload/:token', { user: undefined, params: { token }, files: [pdfFile('bank_statement')] });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  assert.equal(response.data.uploaded, 1); assert.equal(response.data.items[0].uploaded, true);
  assert.equal(h.store[0].taskFiles[0].source, 'applicant_link'); assert.equal(h.store[0].taskFiles[0].fieldName, 'file_bank');
  await h.flush();
  assert.equal(h.calls.sent.at(-1).template, 'staff_applicant_upload'); assert.equal(h.calls.sent.at(-1).to, 'saraa@scm.mn');

  response = await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token: 'A'.repeat(43) } });
  assert.equal(response.code, 404); assert.equal(response.data.code, 'LINK_INVALID');
  h.setNow(new Date(NOW.getTime() + 8 * 86400000));
  response = await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token } });
  assert.equal(response.code, 404, 'expired');
  h.setNow(NOW);

  // A new request revokes the previous link.
  response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'ndsh_reference' }], expiresInDays: 3, expectedRevision: 1 } });
  assert.equal(response.code, 200);
  const token2 = new URL(response.data.uploadUrl).searchParams.get('upload');
  assert.equal((await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token } })).code, 404);
  assert.equal((await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token: token2 } })).code, 200);
  // Terminal status revokes all links.
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'rejected', note: 'Шаардлага хангаагүй', expectedRevision: 2 } });
  assert.equal(response.code, 200);
  assert.ok(h.store[0].taskUploadLinks.every(link => link.revokedAt));
  assert.equal((await h.invoke('get', '/api/loan-tasks/upload/:token', { user: undefined, params: { token: token2 } })).code, 404);
  response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'additional' }] } });
  assert.equal(response.code, 403);
  response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'additional' }], hack: 1 } });
  assert.equal(response.code, 403);
});

test('doc-request validation', async () => {
  const h = harness({ loans: [legacyLoan({ status: 'studying' })] });
  for (const body of [{ items: [] }, { items: [{ key: 'phone' }] }, { items: [{ key: 'additional' }], expiresInDays: 31 }, { items: [{ key: 'additional' }, { key: 'additional' }] }, { items: [{ key: 'additional' }], extra: true }]) {
    const response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body });
    assert.equal(response.code, 400, JSON.stringify(body));
  }
  const response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'additional' }], expectedRevision: 9 } });
  assert.equal(response.code, 409);
  const fresh = harness({ loans: [legacyLoan({ status: 'pending', assignee: { userId: '', name: '' } })] });
  assert.equal((await fresh.invoke('post', '/api/loan-tasks/:id/doc-request', { user: manager, params: { id: LOAN_ID }, body: { items: [{ key: 'additional' }] } })).code, 400);
});

test('schema additions do not materialize on legacy documents', () => {
  const connection = new mongoose.Mongoose();
  const schema = new connection.Schema({ status: { type: String, default: 'pending' }, assignee: { userId: String, name: String } });
  schema.add(LOAN_TASK_SCHEMA_FIELDS);
  const Model = connection.model('LegacyLoanTest', schema);
  const doc = Model.hydrate({ _id: new mongoose.Types.ObjectId(), status: 'studying' });
  for (const key of Object.keys(LOAN_TASK_SCHEMA_FIELDS)) assert.equal(doc[key], undefined, key);
  assert.deepEqual(Object.keys(doc.toObject()).sort(), ['_id', 'status']);
  assert.deepEqual(doc.modifiedPaths(), []);
  const created = new Model({ status: 'pending' });
  assert.equal(created.taskHistory, undefined); assert.equal(created.taskFiles, undefined); assert.equal(created.taskUploadLinks, undefined);
  const task = new Model({ taskStatus: 'new', taskHistory: [{ at: NOW, type: 'created', to: 'new' }] });
  assert.equal(task.taskHistory[0].type, 'created');
  assert.ok(new Model({ taskStatus: 'bogus' }).validateSync().errors.taskStatus);
  const indexed = applyLoanTaskSchema(new connection.Schema({ status: String }));
  assert.ok(indexed.indexes().some(([fields]) => fields['taskUploadLinks.tokenHash'] === 1));
});

test('legacy POST /api/loans is gone (D9) and task lock guards legacy routes', () => {
  const response = { status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  legacyLoanPostGone({}, response);
  assert.equal(response.code, 410); assert.equal(response.data.error, 'Энэ хаяг хаагдсан. /api/loans/quick ашиглана уу.');
  assert.equal(taskLockBlocks(officer, { taskStatus: 'resolved' }, 'PUT'), true);
  assert.equal(taskLockBlocks(officer, { taskStatus: 'resolved' }, 'GET'), false);
  assert.equal(taskLockBlocks(manager, { taskStatus: 'rejected' }, 'PUT'), false);
  assert.equal(taskLockBlocks(officer, { status: 'approved' }, 'PUT'), false, 'legacy statuses handled by existing guard');
});

test('file helpers detect magic bytes and guard prototype keys', () => {
  assert.equal(detectFileFormat(PDF()), 'pdf');
  assert.equal(detectFileFormat(PNG()), 'png');
  assert.equal(detectFileFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
  assert.equal(detectFileFormat(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), 'webp');
  assert.equal(detectFileFormat(Buffer.from('GIF89a')), null);
  const { errors } = validateTaskFiles([pdfFile('constructor'), pdfFile('toString')], {});
  assert.deepEqual(Object.keys(errors), ['constructor', '_files']);
  assert.equal(Object.getPrototypeOf(errors), Object.prototype);
});

// ---------- 2026-11-20 review fixes (route level) ----------
test('review fixes: list revision, closed product, size guard, doc-request only, short-lived task file URLs', async () => {
  // H1: the board list returns taskRevision (selected + mapped).
  let h = harness({ loans: [legacyLoan({ status: 'studying', taskStatus: 'in_review', taskRevision: 2 })] });
  let response = await h.invoke('get', '/api/loan-tasks', { user: manager });
  assert.equal(response.code, 200); assert.equal(response.data.items[0].taskRevision, 2);
  assert.match(h.calls.selects.at(-1), /\btaskRevision\b/);
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { user: manager, params: { id: LOAN_ID }, body: { type: 'assign', assigneeId: OTHER_ID, expectedRevision: response.data.items[0].taskRevision } });
  assert.equal(response.code, 200, 'quick-assign with the list revision succeeds');

  // M4 (code): active product with nothing live -> explicit closed state; inactive / live keep previous shapes.
  const closedConfig = activeConfig({ baseProductEnabled: false, subProducts: [{ id: 'expired', name: 'Expired', isActive: true, startDate: '2026-01-01', endDate: '2026-02-01', inheritSteps: true, steps: [], order: 1 }] });
  h = harness({ configs: [closedConfig] });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { user: undefined, params: { productKey: 'cons_loan' }, query: { t: '123' } });
  assert.deepEqual(response.data, { enabled: true, closed: true, product: null, productKey: 'cons_loan', name: response.data.name, message: 'Одоогоор хүсэлт хүлээн авахгүй байна.' });
  assert.ok(response.data.name);
  h = harness({ configs: [activeConfig({ isActive: false })] });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { user: undefined, params: { productKey: 'cons_loan' } });
  assert.deepEqual(response.data, { enabled: true, product: null }, 'inactive -> legacy fallback');
  h = harness({ configs: [activeConfig()] });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { user: undefined, params: { productKey: 'cons_loan' }, query: { t: String(Date.now()) } });
  assert.equal(response.data.closed, undefined); assert.equal(response.data.product.configVersion, 3, 'unknown cache-buster query ignored');
  h = harness({ env: {}, configs: [closedConfig] });
  response = await h.invoke('get', '/api/loan-tasks/public/products/:productKey', { user: undefined, params: { productKey: 'cons_loan' } });
  assert.deepEqual(response.data, { enabled: false, product: null }, 'flag off unchanged');

  // M4 (security): declared oversize multipart is rejected before parsing / uploading.
  h = harness({ configs: [activeConfig()] });
  response = await h.invoke('post', '/api/loan-tasks/public/submit', { user: undefined, headers: { 'content-length': String(60 * 1024 * 1024) }, body: submitBody(), files: [pdfFile('id_reference')] });
  assert.equal(response.code, 413); assert.equal(response.data.code, 'PAYLOAD_TOO_LARGE'); assert.equal(h.calls.uploads, 0); assert.equal(h.records.length, 0);
  response = await h.invoke('post', '/api/loan-tasks/public/submit', { user: undefined, headers: { 'content-length': '2048' }, body: submitBody(), files: [pdfFile('id_reference')] });
  assert.equal(response.code, 201, 'normal declared size passes');
  response = await h.invoke('post', '/api/loan-tasks/upload/:token', { user: undefined, headers: { 'content-length': String(60 * 1024 * 1024) }, params: { token: 'A'.repeat(43) }, files: [pdfFile('bank_statement')] });
  assert.equal(response.code, 413);
  // public submit keeps the stored URL on fileDetails (legacy LOS + AI intake read fileDetails[].fileUrl).
  assert.ok(h.records[0].fileDetails[0].fileUrl.includes('s--sig--')); assert.equal(h.records[0].fileDetails[0].publicId, 'scm_loan_private/doc1');

  // M2 (code): request_docs / status->additional_docs rejected on /actions.
  h = harness({ loans: [legacyLoan({ status: 'studying' })] });
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'request_docs', items: ['НДШ'], expectedRevision: 0 } });
  assert.equal(response.code, 400); assert.equal(response.data.code, 'USE_DOC_REQUEST');
  response = await h.invoke('post', '/api/loan-tasks/:id/actions', { params: { id: LOAN_ID }, body: { type: 'status', to: 'additional_docs', expectedRevision: 0 } });
  assert.equal(response.code, 400); assert.ok(response.data.errors.to);
  assert.equal(h.store[0].taskStatus, undefined); assert.equal(h.calls.updates.length, 0);
  response = await h.invoke('get', '/api/loan-tasks/:id', { params: { id: LOAN_ID } });
  assert.equal(response.data.allowedActions.transitions.includes('additional_docs'), false);

  // M3: new task files persist no signed URL; detail returns a short-lived download URL. L1: requested label kept.
  response = await h.invoke('post', '/api/loan-tasks/:id/files', { params: { id: LOAN_ID }, body: { fieldKey: 'bank_statement' }, files: [pdfFile('files')] });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  const stored = h.store[0].taskFiles[0];
  assert.equal(stored.fileUrl, undefined); assert.equal(stored.publicId, 'scm_loan_private/doc1'); assert.equal(stored.resourceType, 'raw'); assert.equal(stored.label, 'Дансны хуулга');
  const staffFile = response.data.files.find(file => file.source === 'staff');
  assert.ok(staffFile.url.startsWith('https://api.cloudinary.com/v1_1/demo/raw/download?public_id=scm_loan_private%2Fdoc1'));
  assert.ok(staffFile.url.includes(`expires_at=${Math.floor(NOW.getTime() / 1000) + 600}`));
  response = await h.invoke('post', '/api/loan-tasks/:id/doc-request', { params: { id: LOAN_ID }, body: { items: [{ key: 'extra_1', label: 'Банкны хуулга (Хаан)' }], expectedRevision: 0 } });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  const token = new URL(response.data.uploadUrl).searchParams.get('upload');
  response = await h.invoke('post', '/api/loan-tasks/upload/:token', { user: undefined, params: { token }, headers: { 'content-length': '4096' }, files: [pdfFile('extra_1')] });
  assert.equal(response.code, 200, JSON.stringify(response.data));
  assert.equal(h.store[0].taskFiles[1].label, 'Банкны хуулга (Хаан)'); assert.equal(h.store[0].taskFiles[1].fileUrl, undefined);
  response = await h.invoke('get', '/api/loan-tasks/:id', { params: { id: LOAN_ID } });
  const linkFile = response.data.files.find(file => file.source === 'applicant_link');
  assert.equal(linkFile.label, 'Банкны хуулга (Хаан)');
  assert.equal(JSON.stringify(response.data).includes('tokenHash'), false);
});
