// D24/D25: trust request additional material (applicant upload links, file proxy) and assignment.
// Design: docs/design/loan-task-management.md §24-§25. Tokens: 32 random bytes, only the SHA-256 hash is stored.
// Public endpoints are separate from the loan ones: GET|POST /api/trusts/upload/:token (the token itself knows the kind).
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { FILE_FORMATS, LIMITS } from '../shared/loanWidgets.js';
import { hashToken, validateTaskFiles, detectFileFormat } from './loanTasks.js';
import { createIntakeLimiter, rejectOversizedBody } from './loanIntake.js';
import { resolveFileRef, fileRefOf, isProxyableFile, serveProxiedFile, createFetchFile, TRUST_PRIVATE_FOLDER, FILE_PROXY_MAX_BYTES } from './loanFiles.js';
import { isValidEmailAddress } from './mailer.js';
import * as emails from './accountEmails.js';
import { findActiveRequestStaff, notifyEmailOf, isActiveRequestStaff } from './assignmentSettings.js';

export { TRUST_PRIVATE_FOLDER };
export const TRUST_AUTO_DOC_KEY = 'trust_auto_doc_request';
export const TRUST_CLOSED_STATUSES = ['resolved', 'closed', 'rejected', 'completed', 'done'];
export const isTrustClosed = status => TRUST_CLOSED_STATUSES.includes(String(status || '').toLowerCase());
export const TRUST_LINK_TTL_DAYS = 14;
export const TRUST_LINK_UPLOAD_CAP = 30;
const MB = 1024 * 1024;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const TRUST_DOC_GROUPS = [
  { key: 'personal', label: 'Хувийн' },
  { key: 'funds', label: 'Хөрөнгийн эх үүсвэр' },
  { key: 'other', label: 'Бусад' },
];
export const TRUST_DOC_PRESETS = [
  { key: 'trust_id_reference', label: 'Иргэний үнэмлэхийн лавлагаа', group: 'personal' },
  { key: 'trust_address_reference', label: 'Оршин суугаа газрын лавлагаа', group: 'personal' },
  { key: 'trust_funds_bank_statement', label: 'Дансны хуулга (хөрөнгийн эх үүсвэр)', group: 'funds' },
  { key: 'trust_funds_savings_book', label: 'Хадгаламжийн дэвтэр', group: 'funds' },
  { key: 'trust_funds_other', label: 'Хөрөнгийн эх үүсвэрийн бусад баримт', group: 'funds' },
];
const PRESET_BY_KEY = new Map(TRUST_DOC_PRESETS.map(item => [item.key, item]));
const EXTRA_KEY_RE = /^extra_([1-9]|10)$/;
export const isExtraKey = key => EXTRA_KEY_RE.test(key);
export const groupOfKey = key => PRESET_BY_KEY.get(key)?.group || 'other';

// File rule for a requested key (applicant uploads: pdf/jpg/png/webp, 10 MB each).
export const trustFileRule = (key, label = '') => ({
  formats: Object.keys(FILE_FORMATS), maxBytes: LIMITS.fileMaxMb * MB, maxFiles: isExtraKey(key) ? 3 : 5, required: false,
  label: label || PRESET_BY_KEY.get(key)?.label || key,
});

// body: { items: [{ key, label? }], note?, expiresInDays? } -> { items, note, expiresInDays } | { errors }
export function parseTrustDocRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { errors: { _form: 'Хүсэлт буруу байна.' } };
  const errors = {};
  if (Object.keys(body).some(key => !['items', 'note', 'expiresInDays'].includes(key))) errors._form = 'Зөвшөөрөгдөөгүй талбар байна.';
  const items = [];
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 10) errors.items = 'Материал 1–10 сонгоно уу.';
  else {
    const seen = new Set();
    body.items.forEach((item, index) => {
      const key = item && typeof item === 'object' && typeof item.key === 'string' ? item.key : '';
      const preset = PRESET_BY_KEY.get(key);
      if (!preset && !isExtraKey(key)) { errors[`items.${index}.key`] = 'Материалын төрөл буруу байна.'; return; }
      if (seen.has(key)) { errors[`items.${index}.key`] = 'Давхардсан материал.'; return; }
      seen.add(key);
      if (preset) { items.push({ key, label: preset.label, group: preset.group }); return; }
      const label = typeof item.label === 'string' ? item.label.replace(/[\r\n]+/g, ' ').trim() : '';
      if (!label || label.length > 120) { errors[`items.${index}.label`] = 'Нэр 1–120 тэмдэгт байна.'; return; }
      items.push({ key, label, group: 'other' });
    });
  }
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 2000)) errors.note = 'Тайлбар 2000 тэмдэгтээс хэтрэхгүй.';
  const days = body.expiresInDays === undefined ? TRUST_LINK_TTL_DAYS : body.expiresInDays;
  if (!Number.isInteger(days) || days < 1 || days > 30) errors.expiresInDays = '1–30 хоног.';
  if (Object.keys(errors).length) return { errors };
  return { items, note: str(body.note, 2000), expiresInDays: days };
}

// ---------- API-safe view of a TrustRequest (never leaks Cloudinary ids/URLs or token hashes) ----------
export function sanitizeTrust(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const out = { ...plain };
  if (Array.isArray(plain.files)) {
    out.files = plain.files.map((file, index) => ({
      _id: file?._id ? String(file._id) : undefined, ref: fileRefOf('tf', file, index), fileName: file?.fileName || '', mimeType: file?.mimeType || '', size: file?.size ?? null,
      fieldKey: file?.fieldKey || '', label: file?.label || '', group: file?.group || groupOfKey(file?.fieldKey), source: file?.source || '', uploadedAt: file?.uploadedAt || null, canOpen: isProxyableFile(file),
    }));
  }
  if (Array.isArray(plain.uploadLinks)) {
    out.uploadLinks = plain.uploadLinks.map(link => ({
      _id: link?._id ? String(link._id) : undefined, items: (Array.isArray(link?.items) ? link.items : []).map(item => ({ key: item.key, label: item.label, group: item.group || groupOfKey(item.key) })),
      note: link?.note || '', expiresAt: link?.expiresAt || null, createdAt: link?.createdAt || null, createdBy: link?.createdBy ? { name: link.createdBy.name || '', system: Boolean(link.createdBy.system) } : null,
      revokedAt: link?.revokedAt || null, auto: Boolean(link?.auto),
    }));
  }
  return out;
}

const revokeLinks = (links, at) => (Array.isArray(links) ? links : []).map(link => (link.revokedAt ? link : { ...link, revokedAt: at }));

export class TrustDocError extends Error {
  constructor(message, status = 400, code = '', extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra; }
}

export function createTrustDocService({
  TrustRequest, User, SiteConfig, mailer, env = process.env, now = () => new Date(), randomBytes = crypto.randomBytes,
  getCompanyPhone = async () => '', getAssignmentSettings = async () => null, logger = console,
}) {
  const send = async message => (mailer?.send ? mailer.send(message) : { result: 'skipped' });
  const companyPhone = async () => { try { return String((await getCompanyPhone()) || ''); } catch { return ''; } };
  const uploadBase = () => (env.TRUST_UPLOAD_BASE_URL || 'https://www.scm.mn/trust-request').replace(/[?#].*$/, '');
  const adminUrl = () => env.ADMIN_APP_URL || 'https://www.scm.mn/admin';
  const SYSTEM = { name: 'Систем', system: true };

  const autoEnabled = async () => {
    try { return (await SiteConfig.findOne({ key: TRUST_AUTO_DOC_KEY }).lean())?.value !== false; } catch { return true; }
  };
  // Active staff member for automatic trust assignment (setting trust.mode === 'auto'), else null.
  const autoAssignee = async () => {
    try {
      const setting = (await getAssignmentSettings())?.trust;
      return setting?.mode === 'auto' && setting.staffId ? await findActiveRequestStaff(User, setting.staffId) : null;
    } catch { return null; }
  };
  // Reply-To for applicant emails: assignee notification email (else caller falls back to MAIL_REPLY_TO via the mailer).
  const assigneeEmail = async trust => {
    const id = trust?.assignee?.userId;
    if (!id || !OBJECT_ID_RE.test(String(id))) return '';
    try {
      const user = await User.findById(String(id)).select('email notificationEmail isActive').lean();
      return user && user.isActive !== false ? notifyEmailOf(user) : '';
    } catch { return ''; }
  };
  const pushHistory = async (id, entry) => { try { await TrustRequest.updateOne({ _id: id }, { $push: { history: entry } }); } catch { logger.error?.('[trust-docs] history write failed'); } };

  // Creates an upload link, sends the email (synchronously: the result is returned) and records both in history.
  async function issue({ trust, items, note = '', expiresInDays = TRUST_LINK_TTL_DAYS, actor = SYSTEM, replyTo = '', auto = false }) {
    const to = str(trust?.email, 254);
    if (!to || !isValidEmailAddress(to)) throw new TrustDocError('Харилцагчийн имэйл бүртгэлгүй байна.', 400, 'NO_APPLICANT_EMAIL');
    if (isTrustClosed(trust.status)) throw new TrustDocError('Шийдвэрлэсэн хүсэлтэд материал хүсэх боломжгүй.', 403, 'TERMINAL');
    const at = now();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(at.getTime() + expiresInDays * 24 * 3600 * 1000);
    const link = { _id: new mongoose.Types.ObjectId(), tokenHash: hashToken(token), items, note, expiresAt, createdAt: at, createdBy: { userId: actor.userId || '', name: actor.name || '', system: Boolean(actor.system) }, auto };
    const links = [...revokeLinks(trust.uploadLinks, at), link].slice(-10);
    const masked = emails.maskEmail(to);
    const entry = { at, type: 'docs_requested', items: items.map(item => item.label), actor: { userId: actor.userId || '', name: actor.name || '', system: Boolean(actor.system) }, sentTo: masked, ...(note ? { note } : {}) };
    const saved = await TrustRequest.findOneAndUpdate({ _id: trust._id, status: { $nin: TRUST_CLOSED_STATUSES } }, { $set: { uploadLinks: links }, $push: { history: entry } }, { new: true, lean: true });
    if (!saved) throw new TrustDocError('Шийдвэрлэсэн хүсэлтэд материал хүсэх боломжгүй.', 403, 'TERMINAL');
    const reference = trust.reference || saved.reference || '';
    let result = 'failed';
    try {
      const outcome = await send({ to, reference, ...(replyTo ? { replyTo } : {}), ...emails.trustDocumentRequest({ reference, items: items.map(item => item.label), note, uploadUrl: `${uploadBase()}?upload=${token}`, expiresAt, companyPhone: await companyPhone() }) });
      result = outcome?.result || 'failed';
    } catch { logger.error?.('[trust-docs] email failed'); }
    await pushHistory(trust._id, { at: now(), type: 'email', email: { template: 'trust_doc_request', result }, sentTo: masked });
    return { result, expiresAt, sentTo: masked };
  }

  // Auto request after a trust submission: setting `trust_auto_doc_request` (default on) + an applicant email. -> result | null
  async function autoRequest(trust) {
    if (!trust?.email || !isValidEmailAddress(String(trust.email).trim())) return null;
    if (!(await autoEnabled())) return null;
    // Abuse guard: at most one automatic link email per address per 24h (public form can be submitted with any email).
    try {
      const email = String(trust.email).trim();
      const since = new Date(now().getTime() - 24 * 3600 * 1000);
      const recent = await TrustRequest.exists({
        _id: { $ne: trust._id },
        email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        uploadLinks: { $elemMatch: { auto: true, createdAt: { $gte: since } } },
      });
      if (recent) return null;
    } catch { /* if the check fails, fall through and send (availability over strictness) */ }
    try {
      return await issue({ trust, items: TRUST_DOC_PRESETS.map(({ key, label, group }) => ({ key, label, group })), actor: SYSTEM, replyTo: await assigneeEmail(trust), auto: true });
    } catch (error) {
      if (!(error instanceof TrustDocError)) logger.error?.('[trust-docs] auto request failed');
      return null;
    }
  }

  // Assigns (staff) or unassigns (null) a trust request, records history and notifies the assignee in the background.
  async function assign({ trust, staff, actor, schedule = setImmediate }) {
    const at = now();
    const base = { actor: { userId: String(actor?._id || ''), name: actor?.name || actor?.email || 'Ажилтан', system: false } };
    let updated;
    if (staff) {
      const assignee = { userId: String(staff._id), name: staff.name || '' };
      updated = await TrustRequest.findByIdAndUpdate(trust._id, { $set: { assignee, assignedAt: at }, $push: { history: { at, type: 'assigned', assignee, ...base } } }, { new: true, lean: true });
    } else {
      updated = await TrustRequest.findByIdAndUpdate(trust._id, { $unset: { assignee: 1, assignedAt: 1 }, $push: { history: { at, type: 'unassigned', ...base } } }, { new: true, lean: true });
    }
    let notify = 'skipped';
    const to = staff && String(staff._id) !== String(actor?._id || '') ? notifyEmailOf(staff) : '';
    if (to && isValidEmailAddress(to) && mailer?.send && mailer.enabled !== false) {
      notify = 'queued';
      const reference = trust.reference || '';
      schedule(async () => {
        try {
          const outcome = await send({ to, reference, ...emails.staffTrustAssignment({ reference, phone: trust.phone, adminUrl: adminUrl() }) });
          await pushHistory(trust._id, { at: now(), type: 'email', email: { template: 'staff_trust_assignment', result: outcome?.result || 'failed' } });
        } catch { logger.error?.('[trust-docs] assignment email failed'); }
      });
    }
    return { trust: updated, notify };
  }

  return { issue, autoRequest, assign, autoAssignee, assigneeEmail, autoEnabled, pushHistory };
}

// ---------- routes ----------
export function registerTrustDocRoutes({
  app, multer, cloudinary, http, TrustRequest, User, authenticateUser, permissions, service, mailer, env = process.env,
  createLog = async () => {}, now = () => new Date(), schedule = setImmediate, logger = console,
  fetchFile = http ? createFetchFile(http) : async () => { throw new Error('no http client'); }, maxBytes = FILE_PROXY_MAX_BYTES,
  readLimiter = createIntakeLimiter({ max: 300 }), uploadLimiter = createIntakeLimiter({ max: Number.parseInt(env.TRUST_UPLOAD_MAX, 10) || 20 }), fileLimiter = createIntakeLimiter({ max: 300 }),
}) {
  const generic500 = res => res.status(500).json({ message: 'Алдаа гарлаа.' });
  const adminUrl = () => env.ADMIN_APP_URL || 'https://www.scm.mn/admin';
  const MULTIPART_MARGIN = LIMITS.answersJsonBytes + MB;
  const guardSize = rejectOversizedBody(LIMITS.bytesTotal + MULTIPART_MARGIN, `Нийт файлын хэмжээ ${Math.round(LIMITS.bytesTotal / MB)} МБ-аас хэтрэхгүй.`);
  const parseFiles = multer ? multer({ storage: multer.memoryStorage(), limits: { files: LIMITS.filesTotal, fileSize: LIMITS.fileMaxMb * MB, fields: 2, fieldSize: 200, parts: 14 } }).any() : (_req, _res, next) => next();
  const linkInvalid = res => res.status(404).json({ message: 'Холбоос хүчингүй эсвэл хугацаа нь дууссан байна.', code: 'LINK_INVALID' });

  const findLink = async token => {
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
    const tokenHash = hashToken(token);
    const trust = await TrustRequest.findOne({ 'uploadLinks.tokenHash': tokenHash }).select('_id reference status assignee phone files uploadLinks').lean();
    const link = trust?.uploadLinks?.find(item => item.tokenHash === tokenHash);
    if (!link || link.revokedAt || !(new Date(link.expiresAt).getTime() > now().getTime())) return null;
    if (isTrustClosed(trust.status)) return null;
    return { trust, link, tokenHash };
  };
  const linkItems = (trust, link) => (link.items || []).map(item => {
    const rule = trustFileRule(item.key, item.label);
    const uploaded = (trust.files || []).some(file => file.linkId === String(link._id) && file.fieldKey === item.key);
    return { key: item.key, label: item.label || rule.label, group: item.group || groupOfKey(item.key), accept: [...rule.formats], maxSizeMb: Math.round(rule.maxBytes / MB), maxFiles: rule.maxFiles, uploaded };
  });

  const uploadPrivate = (file, fieldKey) => new Promise((resolve, reject) => {
    const format = detectFileFormat(file.buffer);
    const stream = cloudinary.uploader.upload_stream({ folder: TRUST_PRIVATE_FOLDER, resource_type: 'raw', type: 'authenticated' }, (error, result) => (error ? reject(error) : resolve({
      fileName: String(file.originalname || 'file').slice(0, 200), publicId: result.public_id, deliveryType: 'authenticated', resourceType: 'raw',
      format: typeof result.format === 'string' ? result.format : '', mimeType: FILE_FORMATS[format] || file.mimetype, size: file.buffer.length, fieldKey,
    })));
    stream.end(file.buffer);
  });
  const destroyAll = persisted => Promise.allSettled(persisted.map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw', type: 'authenticated' })));

  // ----- Public applicant upload (token = request kind trust) -----
  app.get('/api/trusts/upload/:token', readLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const found = await findLink(req.params.token);
      if (!found) return linkInvalid(res);
      const { trust, link } = found;
      res.json({ kind: 'trust', requestNo: trust.reference || '', productName: 'Итгэлцэл', items: linkItems(trust, link), note: link.note || '', expiresAt: link.expiresAt });
    } catch { generic500(res); }
  });

  app.post('/api/trusts/upload/:token', guardSize, uploadLimiter, async (req, res) => {
    let found;
    try {
      res.set('Cache-Control', 'no-store');
      found = await findLink(req.params.token);
      if (!found) return linkInvalid(res);
    } catch { return generic500(res); }
    parseFiles(req, res, async parseError => {
      const persisted = [];
      let saved = false;
      try {
        if (parseError) return res.status(400).json({ message: 'Файл тус бүр 10 МБ-аас бага, нийт 12 хүртэл файл оруулна уу.' });
        const { trust, link, tokenHash } = found;
        const rules = {};
        for (const item of link.items || []) rules[item.key] = trustFileRule(item.key, item.label);
        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) return res.status(400).json({ message: 'Файл оруулна уу.' });
        const { errors, byKey } = validateTaskFiles(files, rules, { requireRequired: false });
        const already = (trust.files || []).filter(file => file.linkId === String(link._id)).length;
        if (already + files.length > TRUST_LINK_UPLOAD_CAP) errors._files = 'Энэ холбоосоор оруулах файлын дээд хязгаарт хүрсэн байна.';
        if (Object.keys(errors).length) return res.status(400).json({ message: 'Файлаа шалгана уу.', errors });
        const at = now();
        const entries = [];
        for (const [key, list] of Object.entries(byKey)) {
          for (const file of list) {
            const stored = await uploadPrivate(file, key);
            persisted.push(stored);
            entries.push({ ...stored, label: rules[key].label, group: (link.items.find(item => item.key === key) || {}).group || groupOfKey(key), source: 'applicant_link', linkId: String(link._id), uploadedAt: at });
          }
        }
        const labels = Object.keys(byKey).map(key => rules[key].label);
        const updated = await TrustRequest.findOneAndUpdate(
          { _id: trust._id, status: { $nin: TRUST_CLOSED_STATUSES }, uploadLinks: { $elemMatch: { tokenHash, revokedAt: null, expiresAt: { $gt: at } } } },
          { $push: { files: { $each: entries }, history: { at, type: 'upload', count: entries.length, items: labels, actor: { name: 'Харилцагч', system: false } } } },
          { new: true, lean: true },
        );
        if (!updated) { await destroyAll(persisted); saved = true; return linkInvalid(res); }
        saved = true;
        res.json({ uploaded: entries.length, items: linkItems(updated, (updated.uploadLinks || []).find(item => String(item._id) === String(link._id)) || link) });
        schedule(async () => {
          try {
            const reference = trust.reference || '';
            const to = (await service.assigneeEmail(trust)) || String(env.TRUST_NOTIFY_EMAIL || '').trim() || String(env.MAIL_REPLY_TO || '').trim();
            if (!to || !isValidEmailAddress(to) || !mailer?.send) return;
            const outcome = await mailer.send({ to, reference, ...emails.staffTrustUpload({ reference, count: entries.length, adminUrl: adminUrl() }) });
            await service.pushHistory(trust._id, { at: now(), type: 'email', email: { template: 'staff_trust_upload', result: outcome?.result || 'failed' } });
          } catch { logger.error?.('[trust-docs] upload notification failed'); }
        });
      } catch {
        if (!saved) await destroyAll(persisted);
        if (!res.headersSent) res.status(500).json({ message: 'Файл хадгалахад алдаа гарлаа.' });
      }
    });
  });

  // ----- Staff: request additional material -----
  app.post('/api/trusts/:id/doc-request', authenticateUser, permissions.require('trusts.message'), async (req, res) => {
    try {
      if (!OBJECT_ID_RE.test(req.params.id || '')) return res.status(400).json({ message: 'ID буруу байна.' });
      const parsed = parseTrustDocRequest(req.body);
      if (parsed.errors) return res.status(400).json({ message: 'Мэдээллээ шалгана уу.', errors: parsed.errors });
      const trust = await TrustRequest.findById(req.params.id).lean();
      if (!trust) return res.status(404).json({ message: 'Хүсэлт олдсонгүй.' });
      const actor = { userId: String(req.user._id), name: req.user.name || req.user.email || 'Ажилтан', system: false };
      const replyTo = (await service.assigneeEmail(trust)) || notifyEmailOf(req.user);
      let outcome;
      try { outcome = await service.issue({ trust, items: parsed.items, note: parsed.note, expiresInDays: parsed.expiresInDays, actor, replyTo }); } catch (error) {
        if (error instanceof TrustDocError) return res.status(error.status).json({ message: error.message, code: error.code });
        throw error;
      }
      await createLog(req.user, 'trust_doc_request', `${trust._id}: items=${parsed.items.length} ${outcome.result}`);
      const updated = await TrustRequest.findById(trust._id).lean();
      res.json({ ok: true, email: { result: outcome.result }, sentTo: outcome.sentTo, expiresAt: outcome.expiresAt, trust: sanitizeTrust(updated) });
    } catch { logger.error?.('[trust-docs] doc request failed'); generic500(res); }
  });

  // ----- Staff: assignment -----
  app.get('/api/trusts/assignees', authenticateUser, permissions.require('trusts.assign'), async (_req, res) => {
    try {
      const users = await User.find({ isActive: { $ne: false } }).select('_id name role roles isActive').limit(500).lean();
      res.json((Array.isArray(users) ? users : []).filter(isActiveRequestStaff).map(user => ({ _id: String(user._id), name: user.name || '', role: user.role || '' })));
    } catch { generic500(res); }
  });

  app.post('/api/trusts/:id/assign', authenticateUser, permissions.require('trusts.assign'), async (req, res) => {
    try {
      if (!OBJECT_ID_RE.test(req.params.id || '')) return res.status(400).json({ message: 'ID буруу байна.' });
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'staffId') || !('staffId' in body)) return res.status(400).json({ message: 'Хүсэлт буруу байна.' });
      const staffId = body.staffId;
      if (staffId !== null && (typeof staffId !== 'string' || !OBJECT_ID_RE.test(staffId))) return res.status(400).json({ message: 'Ажилтан буруу байна.', errors: { staffId: 'Ажилтан сонгоно уу.' } });
      const trust = await TrustRequest.findById(req.params.id).lean();
      if (!trust) return res.status(404).json({ message: 'Хүсэлт олдсонгүй.' });
      let staff = null;
      if (staffId) {
        staff = await findActiveRequestStaff(User, staffId);
        if (!staff) return res.status(400).json({ message: 'Идэвхтэй ажилтан олдсонгүй.', errors: { staffId: 'Идэвхтэй ажилтан олдсонгүй.' } });
      }
      const result = await service.assign({ trust, staff, actor: req.user, schedule });
      await createLog(req.user, staff ? 'trust_assigned' : 'trust_unassigned', `${trust._id}${staff ? ` -> ${staff._id}` : ''}`);
      res.json({ ok: true, notify: { result: result.notify }, trust: sanitizeTrust(result.trust) });
    } catch { generic500(res); }
  });

  // ----- Staff: secure file proxy (same hardening as the loan proxy, D22) -----
  app.get('/api/trusts/:id/files/:fileRef', authenticateUser, permissions.require('trusts.view'), fileLimiter, async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!OBJECT_ID_RE.test(id)) return res.status(400).json({ message: 'Хүсэлтийн ID буруу байна.' });
      const trust = await TrustRequest.findById(id).select('files').lean();
      const entry = trust ? resolveFileRef({ taskFiles: trust.files }, req.params.fileRef) : null;
      if (!entry || entry.kind !== 'tf' || !isProxyableFile(entry.file)) return res.status(404).json({ message: 'Файл олдсонгүй.' });
      const download = req.query?.download === '1';
      return await serveProxiedFile({
        res, file: entry.file, cloudinary, fetchFile, now: now(), maxBytes, download, logger, tag: `trust=${id} ref=${req.params.fileRef}`,
        onServed: () => Promise.resolve(createLog(req.user, download ? 'trust_file_downloaded' : 'trust_file_opened', `${id}: ${req.params.fileRef}${entry.file.label ? ` (${String(entry.file.label).slice(0, 60)})` : ''}`)).catch(() => {}),
      });
    } catch {
      logger.error?.('[trust-docs] file proxy error');
      return res.status(500).json({ message: 'Файлыг нээхэд алдаа гарлаа.' });
    }
  });
}
