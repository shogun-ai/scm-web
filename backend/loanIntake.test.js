import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuickIntake, validateRequestPatch, createIntakeLimiter, canAccessRequest, requestScope, quickApplicationData, validateIntakeFiles, isAllowedLoanRemoteUrl, automationWriteQuery, registerLoanIntakeRoutes, assertLinkedResearchAccess, researchVisibilityStages } from './loanIntake.js';

const ID = '0123456789abcdef01234567';
const OTHER = 'abcdef0123456789abcdef01';
const officer = { _id: ID, role: 'employee', roles: ['loan_officer'] };
const manager = { _id: OTHER, role: 'employee', roles: ['director'] };
const validBody = () => ({ borrowerType: 'individual', firstName: 'Болд', phone: '9900 1234', email: 'BOLD@example.mn', loanType: 'cons_loan', amount: '5000000', term: '12', repaymentSource: 'Цалингийн орлого', consent: 'true' });
const rejects = (body, field) => assert.throws(() => validateQuickIntake({ ...validBody(), ...body }), error => error.status === 400 && Object.hasOwn(error.errors, field));

test('quick intake validates essential fields and strips privileged injection', () => {
  const result = validateQuickIntake({ ...validBody(), status: 'approved', source: 'staff', assignee: { userId: OTHER }, applicationData: { injected: true }, createdByStaff: true });
  assert.equal(result.status, 'pending'); assert.equal(result.source, 'web'); assert.equal(result.createdByStaff, false);
  assert.equal(result.phone, '99001234'); assert.equal(result.email, 'bold@example.mn');
  assert.equal(result.amount, 5000000); assert.equal(result.term, 12);
  assert.equal(result.assignee, undefined); assert.equal(result.applicationData, undefined);
  rejects({ phone: 'abcd1234' }, 'phone'); rejects({ email: 'bad' }, 'email'); rejects({ consent: 'false' }, 'consent');
  rejects({ loanType: 'made_up' }, 'loanType'); rejects({ firstName: ' ' }, 'firstName'); rejects({ repaymentSource: '' }, 'repaymentSource');
  for (const amount of ['0', '-1', 'NaN', 'Infinity', '0.5', '1000000000001']) rejects({ amount }, 'amount');
  for (const term of ['0', '-1', '121', '1.5', 'Infinity']) rejects({ term }, 'term');
});

test('organization intake needs contact and organization, while documents remain optional', () => {
  rejects({ borrowerType: 'organization' }, 'contactName');
  const payload = validateQuickIntake({ ...validBody(), borrowerType: 'organization', orgName: 'Бизнес ХХК', contactName: 'Саруул' });
  const data = quickApplicationData(payload, []);
  assert.equal(data.org.contactPhone, '99001234'); assert.equal(data.org.orgName, 'Бизнес ХХК');
  assert.equal(data.intake.documentsOptional, true); assert.deepEqual(data.collaterals, []);
  assert.equal(data.consents.dataProcessing, true);
});

test('role AND assignment are necessary for employee access', () => {
  const loan = { assignee: { userId: ID } };
  assert.equal(canAccessRequest(officer, loan), true);
  assert.equal(canAccessRequest({ ...officer, _id: OTHER }, loan), false);
  assert.equal(canAccessRequest({ _id: ID, role: 'employee' }, loan), false);
  assert.equal(canAccessRequest(manager, loan), true);
  assert.deepEqual(requestScope(officer), { 'assignee.userId': ID });
  assert.deepEqual(requestScope(manager), {});
});

test('workflow prevents injected changes, reassignment, silent returns and final-state bypasses', () => {
  assert.throws(() => validateRequestPatch({ assignee: { userId: OTHER } }, {}, true));
  assert.throws(() => validateRequestPatch({ assigneeId: OTHER }, {}, false), error => error.status === 403);
  assert.throws(() => validateRequestPatch({ assigneeId: 'bad' }, {}, true));
  assert.throws(() => validateRequestPatch({ status: 'returned' }, {}, false));
  assert.throws(() => validateRequestPatch({ status: 'rejected', note: ' ' }, {}, true));
  assert.deepEqual(validateRequestPatch({ status: 'returned', note: 'Баримт дутуу' }, { status: 'studying' }), { status: 'returned', approvalNote: 'Баримт дутуу' });
  assert.throws(() => validateRequestPatch({ note: 'rewrite' }, { status: 'approved' }, false), error => error.status === 403);
  for (const previous of ['approved', 'resolved', 'rejected', 'closed', 'disbursed']) {
    assert.throws(() => validateRequestPatch({ status: 'pending' }, { status: previous }, true), error => error.status === 403);
    assert.deepEqual(validateRequestPatch({ status: 'committee' }, { status: previous }, true), { status: 'committee' });
  }
  for (const previous of ['pending', 'rejected', 'closed']) assert.throws(() => validateRequestPatch({ status: 'disbursed' }, { status: previous }, true));
  assert.deepEqual(validateRequestPatch({ status: 'disbursed' }, { status: 'approved' }, true), { status: 'disbursed' });
});

test('rate limiter applies before parsing, separates addresses and resets', () => {
  let current = 0; let continued = 0; const replies = [];
  const limiter = createIntakeLimiter({ max: 2, windowMs: 1000, now: () => current });
  const res = { set: (_key, value) => replies.push(value), status(code) { this.code = code; return this; }, json(value) { replies.push(value); } };
  limiter({ ip: 'a' }, res, () => continued++); limiter({ ip: 'a' }, res, () => continued++); limiter({ ip: 'a' }, res, () => continued++);
  assert.equal(continued, 2); assert.equal(res.code, 429); assert.equal(replies[0], '1');
  limiter({ ip: 'b' }, res, () => continued++); current = 1000; limiter({ ip: 'a' }, res, () => continued++);
  assert.equal(continued, 4);
});

test('uploaded bytes must match supported MIME, with count and aggregate limits', () => {
  const pdf = { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n'), fieldname: 'file_bank' };
  assert.equal(validateIntakeFiles([pdf]).length, 1);
  assert.throws(() => validateIntakeFiles([{ ...pdf, buffer: Buffer.from('<script>') }]));
  assert.throws(() => validateIntakeFiles([{ mimetype: 'text/plain', buffer: Buffer.from('hello') }]));
  assert.throws(() => validateIntakeFiles(Array(13).fill(pdf)));
  const huge = { ...pdf, buffer: Buffer.alloc(10 * 1024 * 1024, 0) }; huge.buffer.write('%PDF-');
  assert.throws(() => validateIntakeFiles(Array(6).fill(huge)));
});

test('remote download validation rejects SSRF host tricks and credentials', () => {
  assert.equal(isAllowedLoanRemoteUrl('https://res.cloudinary.com/demo/raw/authenticated/s--signed--/document'), true);
  for (const url of ['http://res.cloudinary.com/a', 'https://res.cloudinary.com.evil.test/a', 'https://evil.test/?res.cloudinary.com', 'https://res.cloudinary.com@127.0.0.1/a', 'https://user:pass@res.cloudinary.com/a', 'https://res.cloudinary.com:444/a', 'file:///etc/passwd']) assert.equal(isAllowedLoanRemoteUrl(url), false);
});

test('AI write predicate uses untouched BSON-compatible snapshot to preserve staff edits', () => {
  const snapshot = { borrower: { firstName: 'Original' }, consents: { acceptedAt: new Date('2026-10-12') } };
  const query = automationWriteQuery(ID, snapshot);
  snapshot.borrower.firstName = 'AI changed';
  assert.equal(query.applicationData.borrower.firstName, 'Original');
  assert.ok(query.applicationData.consents.acceptedAt instanceof Date);
  assert.deepEqual(automationWriteQuery(ID, null), { _id: ID });
});

test('linked quick research denies unrelated staff and finalized employee writes', () => {
  const loan = { intakeVersion: 'quick-v1', assignee: { userId: ID }, status: 'approved' };
  assert.doesNotThrow(() => assertLinkedResearchAccess(officer, loan));
  assert.throws(() => assertLinkedResearchAccess(officer, loan, true), error => error.status === 403);
  assert.throws(() => assertLinkedResearchAccess({ ...officer, _id: OTHER }, loan), error => error.status === 404);
  assert.doesNotThrow(() => assertLinkedResearchAccess(manager, loan, true));
  assert.doesNotThrow(() => assertLinkedResearchAccess({ role: 'employee' }, { intakeVersion: undefined }, true));
});

test('research lookup enforces quick assignment while preserving unrelated legacy contract', () => {
  const pipeline = researchVisibilityStages(officer);
  assert.equal(pipeline[0].$lookup.from, 'loanrequests');
  assert.equal(pipeline[0].$lookup.pipeline[0].$match.intakeVersion, 'quick-v1');
  assert.deepEqual(pipeline[1].$match.$or[1], { '_quickRequest.assignee.userId': ID });
  assert.equal(researchVisibilityStages({ _id: ID, role: 'employee' })[1].$match.$or.length, 1);
  assert.deepEqual(researchVisibilityStages(manager), []);
});

function harness({ permission = false, loan = { _id: ID, status: 'studying', workflowRevision: 2, assignee: { userId: ID } }, updateResult, staff = { _id: OTHER, name: 'Staff', roles: ['loan_officer'], isActive: true } } = {}) {
  const routes = new Map(); const records = []; const calls = { uploads: 0, destroys: 0, updates: [], query: null, automation: 0, permissions: 0, parse: 0 };
  const chain = value => ({ select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value });
  class Model {
    constructor(payload) { Object.assign(this, payload); this._id = ID; }
    async save() { records.push(this); return this; }
    static find(query) { calls.query = query; return chain([]); }
    static countDocuments() { return 0; }
    static findOne(query) { calls.query = query; return chain(loan); }
    static async findOneAndUpdate(query, update) { calls.updates.push({ query, update }); return updateResult === null ? null : { ...loan, ...update.$set }; }
  }
  const app = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const multer = () => ({ fields: () => (req, _res, callback) => { calls.parse++; return callback(req.uploadError); } }); multer.memoryStorage = () => ({});
  const cloudinary = { url: id => `https://res.cloudinary.com/demo/raw/authenticated/s--signature--/${id}`, uploader: { upload_stream: (_options, callback) => ({ end: () => { calls.uploads++; callback(null, { public_id: 'private/doc' }); } }), destroy: async () => { calls.destroys++; } } };
  registerLoanIntakeRoutes({ app, multer, cloudinary, LoanRequest: Model, User: { findById: () => chain(staff), find: () => chain([staff]) }, authenticateUser: (_req, _res, next) => next(), committeeAction: (next, previous) => ['approved', 'rejected', 'resolved'].includes(next) || next === 'committee' && ['approved', 'resolved', 'rejected', 'closed', 'disbursed'].includes(previous) ? 'decision' : null, userHasPermission: async () => { calls.permissions++; return permission; }, automate: () => { calls.automation++; }, createLog: async () => {} });
  const invoke = async (method, path, req = {}) => {
    let finish;
    const done = new Promise(resolve => { finish = resolve; });
    const response = { code: 200, set() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; finish(this); return this; } };
    const handlers = routes.get(`${method}:${path}`);
    const request = { user: officer, params: { id: ID }, query: {}, ip: 'test', files: {}, body: {}, ...req };
    const run = index => handlers[index](request, response, () => run(index + 1));
    await run(0);
    return done;
  };
  return { invoke, calls, records };
}

test('public route returns reference only, creates request only, rejects invalid before cloud persistence', async () => {
  const h = harness();
  let response = await h.invoke('post', '/api/loans/quick', { body: { ...validBody(), status: 'approved' } });
  assert.equal(response.code, 201); assert.deepEqual(Object.keys(response.data), ['applicationReference']);
  assert.equal(h.records.length, 1); assert.equal(h.records[0].intakeVersion, 'quick-v1'); assert.equal(h.records[0].status, 'pending'); assert.equal(h.calls.automation, 1);
  response = await h.invoke('post', '/api/loans/quick', { body: { ...validBody(), consent: false }, files: { file_id: [{ buffer: Buffer.from('%PDF-'), mimetype: 'application/pdf' }] } });
  assert.equal(response.code, 400); assert.equal(h.calls.uploads, 0);
});

test('private upload response does not expose private document URLs to public caller', async () => {
  const h = harness();
  const response = await h.invoke('post', '/api/loans/quick', { body: validBody(), files: { file_bank: [{ fieldname: 'file_bank', originalname: 'statement.pdf', mimetype: 'application/pdf', size: 9, buffer: Buffer.from('%PDF-1.7\n') }] } });
  assert.equal(response.code, 201); assert.equal(h.calls.uploads, 1); assert.equal(h.records[0].fileDetails[0].deliveryType, 'authenticated');
  assert.ok(h.records[0].fileDetails[0].fileUrl.includes('authenticated/s--signature--'));
  assert.equal(JSON.stringify(response.data).includes('cloudinary'), false);
});

test('queue denies unrelated roles and scopes employees, preserving escaped search', async () => {
  const h = harness();
  let response = await h.invoke('get', '/api/loan-requests', { user: { _id: ID, role: 'employee' } });
  assert.equal(response.code, 403);
  response = await h.invoke('get', '/api/loan-requests', { query: { limit: '1000', search: 'a.*' } });
  assert.equal(response.code, 200); assert.equal(response.data.limit, 100); assert.equal(h.calls.query['assignee.userId'], ID);
  assert.equal(h.calls.query.$or[0].firstname.source, 'a\\.\\*');
});

test('decision permission checked before write; status and revision detect conflicts', async () => {
  const denied = harness();
  let response = await denied.invoke('patch', '/api/loan-requests/:id', { body: { status: 'approved' } });
  assert.equal(response.code, 403); assert.equal(denied.calls.updates.length, 0);
  const allowed = harness({ permission: true });
  response = await allowed.invoke('patch', '/api/loan-requests/:id', { body: { status: 'approved' } });
  assert.equal(response.code, 200); assert.equal(allowed.calls.updates[0].query['assignee.userId'], ID);
  assert.equal(allowed.calls.updates[0].query.workflowRevision, 2); assert.equal(allowed.calls.updates[0].update.$inc.workflowRevision, 1);
  const conflict = harness({ updateResult: null });
  response = await conflict.invoke('patch', '/api/loan-requests/:id', { body: { status: 'assessment' } });
  assert.equal(response.code, 409);
});

test('assignment verifies staff activation and stores server-controlled name', async () => {
  const bad = harness({ staff: { _id: OTHER, name: 'inactive', isActive: false, role: 'loan_officer' } });
  let response = await bad.invoke('patch', '/api/loan-requests/:id', { user: manager, body: { assigneeId: OTHER } });
  assert.equal(response.code, 400); assert.equal(bad.calls.updates.length, 0);
  const good = harness({ loan: { _id: ID, status: 'pending' } });
  response = await good.invoke('patch', '/api/loan-requests/:id', { user: manager, body: { assigneeId: OTHER } });
  assert.equal(response.code, 200); assert.deepEqual(response.data.assignee, { userId: OTHER, name: 'Staff' }); assert.equal(response.data.status, 'assigned');
});

test('retry is scoped and atomically excludes running and final employee cases', async () => {
  const h = harness();
  let response = await h.invoke('post', '/api/loan-requests/:id/intake-automation');
  assert.equal(response.code, 202); assert.deepEqual(response.data, { queued: true });
  const query = h.calls.updates[0].query;
  assert.equal(query.intakeVersion, 'quick-v1'); assert.equal(query['assignee.userId'], ID);
  assert.deepEqual(query['applicationData.autoIntake.status'], { $nin: ['pending', 'running'] });
  assert.ok(query.status.$nin.includes('approved')); assert.equal(h.calls.automation, 1);
  const running = harness({ updateResult: null });
  response = await running.invoke('post', '/api/loan-requests/:id/intake-automation');
  assert.equal(response.code, 409); assert.equal(running.calls.automation, 0);
  const final = harness({ updateResult: null, loan: { _id: ID, intakeVersion: 'quick-v1', assignee: { userId: ID }, status: 'approved' } });
  response = await final.invoke('post', '/api/loan-requests/:id/intake-automation');
  assert.equal(response.code, 403); assert.equal(final.calls.automation, 0);
});
