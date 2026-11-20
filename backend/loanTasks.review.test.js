// Regression tests for the 2026-11-20 loan-task review findings (docs/reviews/2026-11-20-loan-tasks-*.md).
// These replaced the original probes that asserted the defective behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import {
  toTaskListItem, toTaskDetail, fileRuleForLoan, sanitizeLegacyLoanWrite, fileDownloadUrl, safeHttpUrl, isPrivateLoanPublicId,
  isPublicProductClosed, LOAN_TASK_SCHEMA_FIELDS, FILE_URL_TTL_SECONDS,
} from './loanTasks.js';
import { TRUST_PROXY_HOPS, stripTaskSecrets, rejectOversizedBody, taskLockBlocks, assertLegacyPatchAllowed } from './loanIntake.js';
import { buildDefaultConfig, validateConfig, resolveSteps } from '../shared/loanWidgets.js';
import { validateTaskAction, allowedTaskActions } from '../shared/loanTaskStatus.js';

const NOW = new Date('2026-11-20T03:00:00Z');
const loan = (extra = {}) => ({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', status: 'pending', taskStatus: 'in_review', taskRevision: 3, firstname: 'A', lastname: 'B', ...extra });
const admin = { _id: 'u', role: 'admin' };
const cloudinary = { utils: { private_download_url: (id, format, options) => `https://api.cloudinary.com/v1_1/demo/${options.resource_type}/download?public_id=${encodeURIComponent(id)}&type=${options.type}&expires_at=${options.expires_at}&signature=sig` } };
const serverSrc = () => fs.readFileSync(new URL('./server.js', import.meta.url), 'utf8');
const routeBlock = (src, signature, length = 2500) => { const start = src.indexOf(signature); assert.ok(start >= 0, signature); return src.slice(start, start + length); };

test('H1: list items carry taskRevision so board quick-assign sends the current revision', () => {
  assert.equal(toTaskListItem(loan()).taskRevision, 3);
  assert.equal(toTaskListItem(loan({ taskRevision: undefined })).taskRevision, 0);
  const src = fs.readFileSync(new URL('./loanTasks.js', import.meta.url), 'utf8');
  assert.match(src, /LIST_FIELDS = '[^']*\btaskRevision\b/);
  const board = fs.readFileSync(new URL('../frontend/src/components/loanTask/LoanTaskBoard.jsx', import.meta.url), 'utf8');
  assert.match(board, /expectedRevision: item\.taskRevision \|\| 0/);
});

test('H2: trust proxy is an exact hop count; req.ip is the client seen by the single proxy, XFF cannot be spoofed further', async () => {
  assert.equal(TRUST_PROXY_HOPS, 1);
  const src = serverSrc();
  assert.match(src, /app\.set\('trust proxy', TRUST_PROXY_HOPS\);/);
  assert.equal(/app\.set\('trust proxy', true\)/.test(src), false);
  assert.ok(src.indexOf("app.set('trust proxy'") < src.indexOf('registerLoanIntakeRoutes({'), 'set before routes');

  const app = express();
  app.set('trust proxy', TRUST_PROXY_HOPS);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const get = headers => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: server.address().port, path: '/ip', headers }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve(JSON.parse(body).ip));
    }).on('error', reject);
  });
  try {
    // Render's proxy appends the real client address; a client-forged prefix is ignored.
    assert.equal(await get({ 'X-Forwarded-For': '203.0.113.7' }), '203.0.113.7');
    assert.equal(await get({ 'X-Forwarded-For': '6.6.6.6, 203.0.113.8' }), '203.0.113.8');
    assert.notEqual(await get({ 'X-Forwarded-For': '203.0.113.9' }), await get({ 'X-Forwarded-For': '198.51.100.1' }), 'distinct clients get distinct limiter keys');
  } finally { server.close(); }
});

test('M1 (code) / M1 (security): legacy writes cannot set task fields, file arrays, intakeVersion or operators', () => {
  const body = {
    status: 'studying', amount: 5, applicationData: { a: 1 }, approvalNote: 'ok', assignee: { userId: 'x', name: 'y' },
    formVersion: 'task-v1', intakeVersion: 'quick-v1', fileDetails: [{ fileUrl: 'https://evil' }], fileNames: ['x'],
    taskOutcome: { code: 'approved' }, 'taskHistory.0.note': 'forged', taskSomethingNew: 1, $push: { taskHistory: {} }, $set: { taskStatus: 'resolved' },
  };
  for (const key of Object.keys(LOAN_TASK_SCHEMA_FIELDS)) body[key] = 'forged';
  const put = sanitizeLegacyLoanWrite(body, { allowAssignee: true });
  assert.deepEqual(Object.keys(put).sort(), ['amount', 'applicationData', 'approvalNote', 'assignee', 'status']);
  const create = sanitizeLegacyLoanWrite(body);
  assert.deepEqual(Object.keys(create).sort(), ['amount', 'applicationData', 'approvalNote', 'status']);
  assert.deepEqual(sanitizeLegacyLoanWrite(JSON.parse('{"__proto__":{"x":1},"amount":1}')), { amount: 1 });
  assert.deepEqual(sanitizeLegacyLoanWrite(undefined), {});
  assert.deepEqual(sanitizeLegacyLoanWrite(['a']), {});

  const src = serverSrc();
  const putBlock = routeBlock(src, "app.put('/api/loans/:id'", 4000);
  assert.match(putBlock, /sanitizeLegacyLoanWrite\(rawUpdate, \{ allowAssignee: true \}\)/);
  assert.match(putBlock, /res\.json\(stripTaskSecrets\(updated\)\)/);
  const staffBlock = routeBlock(src, "app.post('/api/loans/staff'", 600);
  assert.match(staffBlock, /\.\.\.sanitizeLegacyLoanWrite\(req\.body\)/);
});

test('M1 (security): only private-folder authenticated files are signed, short-lived, at read time', () => {
  const now = NOW;
  const url = fileDownloadUrl({ publicId: 'scm_loan_private/abc', deliveryType: 'authenticated' }, { cloudinary, now });
  assert.ok(url.startsWith('https://api.cloudinary.com/v1_1/demo/raw/download?public_id=scm_loan_private%2Fabc&type=authenticated'));
  assert.ok(url.includes(`expires_at=${Math.floor(now.getTime() / 1000) + FILE_URL_TTL_SECONDS}`));
  assert.ok(FILE_URL_TTL_SECONDS >= 300 && FILE_URL_TTL_SECONDS <= 900);
  // Forged publicIds outside the private folder: never signed, and the stored URL is not returned either.
  assert.equal(fileDownloadUrl({ publicId: 'other_folder/abc', deliveryType: 'authenticated', fileUrl: 'https://res.cloudinary.com/x' }, { cloudinary, now }), '');
  assert.equal(fileDownloadUrl({ publicId: 'scm_loan_private/../x', deliveryType: 'authenticated' }, { cloudinary, now }), '');
  assert.equal(isPrivateLoanPublicId('scm_loan_private'), false);
  assert.equal(fileDownloadUrl({ publicId: 'scm_loan_private/abc', deliveryType: 'authenticated' }, { now }), '', 'no signer -> no URL');
});

test('L5 / item 12: only http(s) file URLs are returned', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('data:text/html,x'), '');
  assert.equal(safeHttpUrl('https://user:pw@res.cloudinary.com/x'), '');
  assert.equal(safeHttpUrl('not a url'), '');
  assert.equal(safeHttpUrl('https://res.cloudinary.com/demo/raw/upload/v1/a.pdf'), 'https://res.cloudinary.com/demo/raw/upload/v1/a.pdf');
  const detail = toTaskDetail(loan({ fileDetails: [{ _id: 'a', fieldName: 'file_id', fileUrl: 'javascript:alert(1)' }, { _id: 'b', fieldName: 'file_id', fileUrl: 'http://res.cloudinary.com/demo/a.pdf' }] }), admin, { cloudinary, now: NOW });
  assert.deepEqual(detail.files.map(file => file.url), ['', 'http://res.cloudinary.com/demo/a.pdf']);
});

test('L1 / item 14: free-text extra_N files show their requested label (file label or link item label)', () => {
  const legacy = loan({ formVersion: undefined });
  assert.ok(fileRuleForLoan(legacy, 'extra_1'));
  assert.ok(fileRuleForLoan(legacy, 'extra_10'));
  assert.equal(fileRuleForLoan(legacy, 'extra_11'), null);
  assert.equal(fileRuleForLoan(legacy, 'extra_0'), null);
  const detail = toTaskDetail(loan({
    taskUploadLinks: [{ _id: 'l1', tokenHash: 'h', items: [{ key: 'extra_2', label: 'Цалингийн тодорхойлолт' }] }],
    taskFiles: [
      { _id: 'f1', fieldName: 'file_additional', fieldKey: 'extra_1', label: 'Банкны хуулга', fileName: 'x.pdf', source: 'applicant_link', linkId: 'l0' },
      { _id: 'f2', fieldName: 'file_additional', fieldKey: 'extra_2', fileName: 'y.pdf', source: 'applicant_link', linkId: 'l1' },
      { _id: 'f3', fieldName: 'file_additional', fieldKey: 'extra_3', fileName: 'z.pdf', source: 'applicant_link', linkId: 'missing' },
    ],
  }), admin, { cloudinary, now: NOW });
  assert.deepEqual(detail.files.map(file => file.label).slice(0, 2), ['Банкны хуулга', 'Цалингийн тодорхойлолт']);
  assert.ok(detail.files[2].label, 'falls back to generic label');
  assert.equal(JSON.stringify(detail).includes('tokenHash'), false);
});

test('M2 (code) / item 7: additional_docs is reachable only through doc-request', () => {
  const l = loan({ taskStatus: 'in_review' });
  assert.equal(allowedTaskActions(l, { manager: true }).transitions.includes('additional_docs'), false);
  assert.throws(() => validateTaskAction({ type: 'status', to: 'additional_docs', expectedRevision: 3 }, l, { manager: true }), error => error.status === 400 && Boolean(error.errors.to));
  const detailSrc = fs.readFileSync(new URL('../frontend/src/components/loanTask/LoanTaskDetail.jsx', import.meta.url), 'utf8');
  assert.match(detailSrc, /filter\(code => code !== 'additional_docs'\)/);
});

test('M4 (code) / item 9: active product with nothing live is closed, not a legacy fallback', () => {
  const base = { ...buildDefaultConfig('cons_loan'), isActive: true, version: 1 };
  assert.equal(isPublicProductClosed({ ...base, baseProductEnabled: false, subProducts: [] }, NOW), true);
  assert.equal(isPublicProductClosed({ ...base, baseProductEnabled: false, subProducts: [{ id: 'old', name: 'x', isActive: true, startDate: '2026-01-01', endDate: '2026-02-01' }] }, NOW), true);
  assert.equal(isPublicProductClosed({ ...base, baseProductEnabled: false, subProducts: [{ id: 'live', name: 'x', isActive: true, startDate: '2026-11-01', endDate: null }] }, NOW), false);
  assert.equal(isPublicProductClosed({ ...base, baseProductEnabled: true }, NOW), false);
  assert.equal(isPublicProductClosed({ ...base, isActive: false, baseProductEnabled: false }, NOW), false, 'inactive config keeps legacy fallback');
  assert.equal(isPublicProductClosed(undefined, NOW), false);
});

test('M4 (security) / item 6: declared oversize bodies are rejected before parsing; missing length passes to multer limits', () => {
  const guard = rejectOversizedBody(100);
  const run = headers => {
    const res = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    let passed = false;
    guard({ headers }, res, () => { passed = true; });
    return { passed, res };
  };
  assert.equal(run({ 'content-length': '100' }).passed, true);
  assert.equal(run({}).passed, true, 'chunked / no Content-Length');
  const big = run({ 'content-length': '101' });
  assert.equal(big.passed, false); assert.equal(big.res.code, 413); assert.equal(big.res.data.code, 'PAYLOAD_TOO_LARGE'); assert.equal(big.res.headers.Connection, 'close');
  assert.equal(run({ 'content-length': '-5' }).res.code, 400);
  assert.equal(run({ 'content-length': '1e9' }).res.code, 400);
});

test('M2 (security) / item 4: legacy PATCH honours the task lock and task-v1 requests use the board', () => {
  const officer = { _id: 'o', roles: ['loan_officer'] };
  const director = { _id: 'd', roles: ['director'] };
  assert.equal(taskLockBlocks(officer, { taskStatus: 'resolved' }, 'PATCH'), true);
  assert.equal(taskLockBlocks(director, { taskStatus: 'resolved' }, 'PATCH'), false);
  assert.equal(taskLockBlocks(officer, { taskStatus: 'in_review' }, 'PATCH'), false);
  assert.throws(() => assertLegacyPatchAllowed({ status: 'approved' }, { formVersion: 'task-v1' }), error => error.status === 409 && error.code === 'USE_TASK_BOARD');
  assert.throws(() => assertLegacyPatchAllowed({ assigneeId: '' }, { formVersion: 'task-v1' }), error => error.status === 409);
  assert.doesNotThrow(() => assertLegacyPatchAllowed({ note: 'x' }, { formVersion: 'task-v1' }));
  assert.doesNotThrow(() => assertLegacyPatchAllowed({ status: 'approved' }, { intakeVersion: 'quick-v1' }));
});

test('L5 (code) / item 15: legacy serializers never expose upload token hashes', () => {
  const doc = { _id: 'x', status: 'studying', taskUploadLinks: [{ _id: 'l', tokenHash: 'abc', note: 'n' }] };
  const out = stripTaskSecrets(doc);
  assert.deepEqual(out.taskUploadLinks, [{ _id: 'l', note: 'n' }]);
  assert.equal(doc.taskUploadLinks[0].tokenHash, 'abc', 'input not mutated');
  assert.equal(JSON.stringify(stripTaskSecrets({ toJSON: () => ({ taskUploadLinks: [{ tokenHash: 'abc' }] }) })).includes('abc'), false, 'mongoose documents');
  assert.equal(stripTaskSecrets(null), null);
  const src = serverSrc();
  assert.match(routeBlock(src, "app.get('/api/loans', authenticateUser", 500), /select\('-taskUploadLinks\.tokenHash -messenger.psid'\)/);
  const intake = fs.readFileSync(new URL('./loanIntake.js', import.meta.url), 'utf8');
  assert.match(routeBlock(intake, "app.get('/api/loan-requests/:id'", 600), /select\('-taskUploadLinks\.tokenHash -messenger.psid'\)[\s\S]*stripTaskSecrets\(loan\)/);
});

test('admin editor payload (name/version kept, status/saved stripped) passes validateConfig', () => {
  const cfg = { ...buildDefaultConfig('cons_loan'), name: 'Хэрэглээний зээл', version: 2, saved: undefined, isActive: true, defaultAssigneeId: '' };
  const { updatedAt: _u, updatedBy: _b, expectedVersion: _e, ...rest } = cfg; // mirrors toPayload
  const result = validateConfig({ ...rest, expectedVersion: 2, subProducts: [] });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('resolveSteps of default config yields file fields with accept arrays', () => {
  const steps = resolveSteps(buildDefaultConfig('cons_loan').steps);
  const files = steps.flatMap(s => s.fields).filter(f => f.type === 'file');
  assert.ok(files.length > 0);
  for (const f of files) assert.ok(Array.isArray(f.accept) && f.accept.length > 0, f.key);
});
