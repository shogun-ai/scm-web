// D22: authenticated loan file proxy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerLoanFileRoutes, sniffMime, resolveContentType, displayFileName, contentDisposition, fileRefOf, resolveFileRef, fileSourceOf,
  sourceUrlFor, createFetchFile, FILE_PROXY_MAX_BYTES,
} from './loanFiles.js';
import { toTaskDetail } from './loanTasks.js';
import { resolvePermissions } from '../shared/permissions.js';

const LOAN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OWNER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccccccccccc';
const owner = { _id: OWNER, role: 'employee', roles: ['loan_officer'] };
const stranger = { _id: OTHER, role: 'employee', roles: ['loan_officer'] };
const admin = { _id: 'dddddddddddddddddddddddd', role: 'admin', roles: ['admin'] };
const PDF = Buffer.from('%PDF-1.7\nhello');
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('data')]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const GIF = Buffer.from('GIF89a....');
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.from('....')]);

const baseLoan = (extra = {}) => ({
  _id: LOAN_ID, assignee: { userId: OWNER },
  fileDetails: [
    { _id: 'fd1', fileName: 'Иргэний үнэмлэх', mimeType: 'application/pdf', publicId: 'scm_loan_private/p1', deliveryType: 'authenticated', label: 'ID' },
    { fileName: 'noid.png', mimeType: 'image/png', publicId: 'scm_loan_private/p2', deliveryType: 'authenticated', resourceType: 'image' },
    { _id: 'fd3', fileName: 'old.pdf', fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/old.pdf' },
    { _id: 'fd4', fileName: 'evil.pdf', publicId: 'other_folder/x', deliveryType: 'authenticated', fileUrl: 'https://res.cloudinary.com/demo/raw/authenticated/s--sig--/x' },
    { _id: 'fd5', fileName: 'ssrf.pdf', fileUrl: 'https://evil.example/x.pdf' },
  ],
  taskFiles: [{ _id: 'tf1', fileName: 'staff.jpg', mimeType: 'text/html', publicId: 'scm_loan_private/p3', deliveryType: 'authenticated' }],
  ...extra,
});

function harness({ loans = [baseLoan()], bytes = PDF, fetchError, perms } = {}) {
  const routes = new Map(); const calls = { finds: [], fetched: [], logs: [] };
  const app = { get: (path, ...handlers) => routes.set(`get:${path}`, handlers) };
  const LoanRequest = {
    findOne(query) {
      calls.finds.push(query);
      const hit = loans.find(loan => String(loan._id) === query._id && (!query['assignee.userId'] || loan.assignee?.userId === query['assignee.userId'])) || null;
      return { select() { return this; }, lean: async () => structuredClone(hit) };
    },
  };
  const cloudinary = { utils: { private_download_url: (id, format, options) => `https://api.cloudinary.com/v1_1/demo/${options.resource_type}/download?public_id=${encodeURIComponent(id)}&type=${options.type}&expires_at=${options.expires_at}` } };
  registerLoanFileRoutes({
    app, authenticateUser: (_req, _res, next) => next(), LoanRequest, cloudinary, now: () => new Date('2026-11-20T03:00:00Z'),
    fetchFile: async (url, options) => { calls.fetched.push({ url, options }); if (fetchError) throw fetchError; return bytes; },
    createLog: async (user, action, details) => { calls.logs.push({ action, details }); }, logger: { error() {} }, limiter: (_req, _res, next) => next(),
    ...(perms ? { getPermissions: async () => perms } : {}),
  });
  const invoke = async (req) => {
    let finish; const done = new Promise(resolve => { finish = resolve; });
    const res = {
      code: 200, headers: {}, body: undefined,
      set(headers) { Object.assign(this.headers, headers); return this; }, status(code) { this.code = code; return this; },
      json(data) { this.body = data; finish(this); return this; }, send(data) { this.body = data; finish(this); return this; },
    };
    const handlers = routes.get('get:/api/loan-requests/:id/files/:fileRef');
    const request = { user: owner, params: { id: LOAN_ID, fileRef: 'fd-fd1' }, query: {}, ...req };
    const run = index => handlers[index](request, res, () => run(index + 1));
    await run(0);
    return done;
  };
  return { invoke, calls };
}

test('magic sniffing recognises pdf, png, jpeg, webp, gif, heic and rejects the rest', () => {
  assert.equal(sniffMime(PDF), 'application/pdf');
  assert.equal(sniffMime(PNG), 'image/png');
  assert.equal(sniffMime(JPG), 'image/jpeg');
  assert.equal(sniffMime(WEBP), 'image/webp');
  assert.equal(sniffMime(GIF), 'image/gif');
  assert.equal(sniffMime(HEIC), 'image/heic');
  assert.equal(sniffMime(Buffer.from('<html><script>alert(1)</script>')), null);
  assert.equal(sniffMime(Buffer.from('ab')), null);
  assert.equal(sniffMime(null), null);
});

test('content type: bytes win, then allow-listed stored mimeType, else octet-stream (never html/svg)', () => {
  assert.equal(resolveContentType('image/png', PDF), 'application/pdf');
  assert.equal(resolveContentType('image/jpg', Buffer.from('xxxxxxxx')), 'image/jpeg');
  assert.equal(resolveContentType('application/pdf; charset=x', Buffer.from('xxxxxxxx')), 'application/pdf');
  assert.equal(resolveContentType('text/html', Buffer.from('xxxxxxxx')), 'application/octet-stream');
  assert.equal(resolveContentType('image/svg+xml', Buffer.from('xxxxxxxx')), 'application/octet-stream');
  assert.equal(resolveContentType(undefined, Buffer.from('xxxxxxxx')), 'application/octet-stream');
  assert.equal(resolveContentType('toString', Buffer.from('xxxxxxxx')), 'application/octet-stream');
});

test('file name: extension forced to match the type, path/quote characters removed', () => {
  assert.equal(displayFileName('Иргэний үнэмлэх', 'application/pdf'), 'Иргэний үнэмлэх.pdf');
  assert.equal(displayFileName('scan.PDF', 'application/pdf'), 'scan.PDF');
  assert.equal(displayFileName('photo.jpeg', 'image/jpeg'), 'photo.jpeg');
  assert.equal(displayFileName('photo.png', 'image/jpeg'), 'photo.png.jpg');
  assert.equal(displayFileName('../../etc/pa"ss\r\nwd', 'application/octet-stream'), 'pa' + 'ss' + 'wd');
  assert.equal(displayFileName('', 'image/png'), 'file.png');
  assert.equal(displayFileName(undefined, 'application/octet-stream'), 'file');
  assert.equal(displayFileName('.hidden', 'image/webp'), 'hidden.webp');
});

test('content-disposition: inline by default, attachment for download, RFC 5987 + ASCII fallback', () => {
  const inline = contentDisposition('Иргэний үнэмлэх', 'application/pdf');
  assert.match(inline, /^inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
  assert.ok(inline.includes(`filename*=UTF-8''${encodeURIComponent('Иргэний үнэмлэх.pdf')}`));
  assert.match(inline, /filename="file\.pdf"/, 'non-ASCII stem falls back to a safe ASCII name with the extension');
  const attach = contentDisposition("a b's (1).png", 'image/png', { download: true });
  assert.ok(attach.startsWith('attachment; filename="a_b_s_1_.png"'));
  assert.ok(attach.includes("filename*=UTF-8''a%20b%27s%20%281%29.png"));
  assert.equal(/[\r\n]/.test(contentDisposition('x\r\nSet-Cookie: a=b', 'application/pdf')), false);
});

test('file refs: _id based, index based only when the subdocument has no _id, unknown refs rejected', () => {
  const loan = baseLoan();
  assert.equal(fileRefOf('fd', loan.fileDetails[0], 0), 'fd-fd1');
  assert.equal(fileRefOf('fd', loan.fileDetails[1], 1), 'fd-1');
  assert.equal(fileRefOf('tf', loan.taskFiles[0], 0), 'tf-tf1');
  assert.equal(resolveFileRef(loan, 'fd-fd1').file.fileName, 'Иргэний үнэмлэх');
  assert.equal(resolveFileRef(loan, 'fd-1').file.fileName, 'noid.png');
  assert.equal(resolveFileRef(loan, 'fd-0'), null, 'index form is not valid for subdocuments that have an _id');
  assert.equal(resolveFileRef(loan, 'tf-tf1').kind, 'tf');
  for (const ref of ['', 'fd-', 'xx-1', 'fd-99', 'fd-../x', 'fd-fd1/..', undefined, null, 'tf-fd1']) assert.equal(resolveFileRef(loan, ref), null, String(ref));
});

test('private-folder guard: only private authenticated ids or https res.cloudinary.com legacy URLs are proxyable', () => {
  const [a, b, c, d, e] = baseLoan().fileDetails;
  assert.equal(fileSourceOf(a), 'private');
  assert.equal(fileSourceOf(b), 'private');
  assert.equal(fileSourceOf(c), 'legacy');
  assert.equal(fileSourceOf(d), null, 'authenticated outside the private folder is never signed or fetched');
  assert.equal(fileSourceOf(e), null);
  assert.equal(fileSourceOf({ publicId: 'scm_loan_private/../x', deliveryType: 'authenticated' }), null);
  assert.equal(fileSourceOf({ fileUrl: 'http://res.cloudinary.com/x' }), null);
  assert.equal(fileSourceOf(null), null);
  const cloudinary = { utils: { private_download_url: (id, format, options) => `signed:${id}:${options.resource_type}:${options.type}:${options.expires_at}` } };
  const now = new Date('2026-11-20T03:00:00Z');
  assert.equal(sourceUrlFor(a, { cloudinary, now }), `signed:scm_loan_private/p1:raw:authenticated:${Math.floor(now.getTime() / 1000) + 120}`);
  assert.equal(sourceUrlFor(b, { cloudinary, now }).split(':')[2], 'image');
  assert.equal(sourceUrlFor(c, { cloudinary, now }), c.fileUrl);
  assert.equal(sourceUrlFor(d, { cloudinary, now }), '');
  assert.equal(sourceUrlFor(a, { now }), '', 'no signer -> nothing to fetch');
});

test('route: owner opens a private pdf inline with the real type, name, nosniff and no-store', async () => {
  const h = harness();
  const res = await h.invoke({});
  assert.equal(res.code, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /^inline; filename="file\.pdf"; filename\*=UTF-8''/);
  assert.ok(res.headers['Content-Disposition'].includes(encodeURIComponent('Иргэний үнэмлэх.pdf')));
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(res.headers['Content-Length'], String(PDF.length));
  assert.deepEqual(res.body, PDF);
  assert.ok(h.calls.fetched[0].url.startsWith('https://api.cloudinary.com/v1_1/demo/raw/download?public_id=scm_loan_private%2Fp1&type=authenticated&expires_at='));
  assert.equal(h.calls.fetched[0].options.maxBytes, FILE_PROXY_MAX_BYTES);
  assert.deepEqual(h.calls.logs, [{ action: 'loan_file_opened', details: `${LOAN_ID}: fd-fd1 (ID)` }]);
  assert.equal(JSON.stringify(h.calls.logs).includes('Иргэний'), false, 'file name is not logged');
});

test('route: ?download=1 switches to attachment; extension follows sniffed bytes, not the stored name', async () => {
  const h = harness({ bytes: PNG });
  const res = await h.invoke({ query: { download: '1' }, params: { id: LOAN_ID, fileRef: 'fd-fd1' } });
  assert.equal(res.headers['Content-Type'], 'image/png');
  assert.match(res.headers['Content-Disposition'], /^attachment; /);
  assert.ok(res.headers['Content-Disposition'].includes(encodeURIComponent('Иргэний үнэмлэх.png')));
  assert.equal(h.calls.logs[0].action, 'loan_file_downloaded');
  const other = await harness({ bytes: PNG }).invoke({ query: { download: 'true' } });
  assert.match(other.headers['Content-Disposition'], /^inline; /, 'only download=1 downloads');
});

test('route: stored html mimeType with unrecognised bytes is served as opaque octet-stream attachment-safe type', async () => {
  const res = await harness({ bytes: Buffer.from('<html>x</html>') }).invoke({ params: { id: LOAN_ID, fileRef: 'tf-tf1' } });
  assert.equal(res.headers['Content-Type'], 'application/octet-stream');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
});

test('route: legacy res.cloudinary.com url is fetched directly', async () => {
  const h = harness({ bytes: JPG });
  const res = await h.invoke({ params: { id: LOAN_ID, fileRef: 'fd-fd3' } });
  assert.equal(res.code, 200);
  assert.equal(h.calls.fetched[0].url, 'https://res.cloudinary.com/demo/raw/upload/v1/old.pdf');
  assert.equal(res.headers['Content-Type'], 'image/jpeg');
  assert.ok(res.headers['Content-Disposition'].includes('old.pdf.jpg'), 'extension corrected to the real type');
});

test('route: index ref works for subdocuments without _id', async () => {
  const res = await harness({ bytes: PNG }).invoke({ params: { id: LOAN_ID, fileRef: 'fd-1' } });
  assert.equal(res.code, 200);
  assert.equal(res.headers['Content-Type'], 'image/png');
});

test('route: scope / IDOR - unassigned staff get 404 and nothing is fetched; admin and view_all see all', async () => {
  const h = harness();
  const res = await h.invoke({ user: stranger });
  assert.equal(res.code, 404);
  assert.deepEqual(h.calls.fetched, []);
  assert.deepEqual(h.calls.finds[0], { _id: LOAN_ID, 'assignee.userId': OTHER });
  assert.equal((await harness().invoke({ user: admin })).code, 200);
  const all = harness({ perms: new Set(['loan_requests.view_all']) });
  assert.equal((await all.invoke({ user: stranger })).code, 200);
  assert.deepEqual(all.calls.finds[0], { _id: LOAN_ID });
});

test('route: no view permission -> 403; bad id -> 400; unknown/unsafe refs and sources -> 404 without fetching', async () => {
  const none = harness({ perms: new Set() });
  assert.equal((await none.invoke({})).code, 403);
  assert.equal(none.calls.finds.length, 0);
  const h = harness();
  assert.equal((await h.invoke({ params: { id: 'not-an-id', fileRef: 'fd-fd1' } })).code, 400);
  assert.equal((await h.invoke({ params: { id: LOAN_ID, fileRef: 'fd-nope' } })).code, 404);
  assert.equal((await h.invoke({ params: { id: LOAN_ID, fileRef: 'fd-fd4' } })).code, 404, 'authenticated file outside the private folder');
  assert.equal((await h.invoke({ params: { id: LOAN_ID, fileRef: 'fd-fd5' } })).code, 404, 'non-cloudinary host');
  assert.equal((await h.invoke({ params: { id: '111111111111111111111111', fileRef: 'fd-fd1' } })).code, 404);
  assert.deepEqual(h.calls.fetched, []);
});

test('route: upstream failure -> 502, oversize -> 413, empty body -> 404; no Cloudinary URL in errors', async () => {
  const fail = await harness({ fetchError: Object.assign(new Error('boom https://api.cloudinary.com/secret'), { code: 'ECONNRESET' }) }).invoke({});
  assert.equal(fail.code, 502);
  assert.equal(JSON.stringify(fail.body).includes('cloudinary'), false);
  const big = await harness({ fetchError: Object.assign(new Error('max'), { code: 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' }) }).invoke({});
  assert.equal(big.code, 413);
  assert.equal((await harness({ bytes: Buffer.alloc(0) }).invoke({})).code, 404);
});

test('createFetchFile: streams with cap, timeout, no redirects; rejects oversize', async () => {
  const seen = [];
  const http = { get: async (url, options) => { seen.push({ url, options }); return { data: new Uint8Array([1, 2, 3]) }; } };
  const buffer = await createFetchFile(http)('https://x.test/a', { maxBytes: 10, timeout: 500 });
  assert.deepEqual([...buffer], [1, 2, 3]);
  assert.equal(seen[0].options.maxContentLength, 10);
  assert.equal(seen[0].options.maxRedirects, 0);
  assert.equal(seen[0].options.timeout, 500);
  await assert.rejects(() => createFetchFile({ get: async () => ({ data: new Uint8Array(11) }) })('https://x.test/a', { maxBytes: 10 }), { code: 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' });
});

test('task detail serializer never leaks Cloudinary URLs; urls are proxy paths with refs', () => {
  const loan = baseLoan({ status: 'pending', taskStatus: 'in_review', taskRevision: 1 });
  const cloudinary = { utils: { private_download_url: () => 'https://api.cloudinary.com/should-not-appear' } };
  const detail = toTaskDetail(loan, admin, { cloudinary, now: new Date('2026-11-20T03:00:00Z'), perms: resolvePermissions(admin) });
  const json = JSON.stringify(detail);
  assert.equal(json.includes('cloudinary'), false);
  assert.equal(json.includes('publicId'), false);
  assert.deepEqual(detail.files.map(file => file.url), [
    `/api/loan-requests/${LOAN_ID}/files/fd-fd1`, `/api/loan-requests/${LOAN_ID}/files/fd-1`, `/api/loan-requests/${LOAN_ID}/files/fd-fd3`, '', '', `/api/loan-requests/${LOAN_ID}/files/tf-tf1`,
  ]);
  assert.deepEqual(detail.files.map(file => file.ref), ['fd-fd1', 'fd-1', 'fd-fd3', 'fd-fd4', 'fd-fd5', 'tf-tf1']);
  assert.equal(detail.files[0].fileName, 'Иргэний үнэмлэх');
  assert.equal(detail.files[5].source, 'staff');
});
