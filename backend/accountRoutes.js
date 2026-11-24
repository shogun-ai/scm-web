// D16 account/admin routes: profile (/api/me*), delete toggle (/api/admin/settings), trust requests, user invites.
// Dependencies are injected so the handlers are testable without Mongo/Express (see accountRoutes.test.js).
import crypto from 'node:crypto';
import * as emails from './accountEmails.js';
import { createIntakeLimiter } from './loanIntake.js';
import { isValidEmailAddress } from './mailer.js';

export const INVITE_TTL_MS = 48 * 3600 * 1000;
export const DELETE_FLAG_KEY = 'loanRequestDeleteEnabled';
export const META_PIXEL_KEY = 'meta_pixel_id';
const SETTINGS_KEYS = ['loanRequestDeleteEnabled', 'metaPixelId'];
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// ---------- pure helpers ----------
export const hashInviteToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');
export const isTokenShape = token => typeof token === 'string' && TOKEN_RE.test(token);

export function createInviteToken({ randomBytes = crypto.randomBytes, now = new Date() } = {}) {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(now.getTime() + INVITE_TTL_MS) };
}

// Timing-safe comparison of the stored hash against the hash of the presented token, plus expiry.
export function inviteTokenMatches(user, token, now = new Date()) {
  if (!user || !isTokenShape(token) || typeof user.inviteTokenHash !== 'string' || !user.inviteExpiresAt) return false;
  const expected = Buffer.from(user.inviteTokenHash, 'hex');
  const actual = Buffer.from(hashInviteToken(token), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  return new Date(user.inviteExpiresAt).getTime() > now.getTime();
}

// >= 10 chars (max 128), at least one letter and one digit.
export function passwordPolicyError(password) {
  if (typeof password !== 'string' || password.length < 10) return 'Нууц үг хамгийн багадаа 10 тэмдэгт байна.';
  if (password.length > 128) return 'Нууц үг 128 тэмдэгтээс хэтрэхгүй.';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'Нууц үг үсэг болон тоо агуулсан байна.';
  return null;
}

export const maskEmail = email => {
  const [local = '', domain = ''] = String(email || '').split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`;
};

export const trustReference = (id, year = new Date().getFullYear()) => `TRUST-${year}-${String(id).slice(-6).toUpperCase()}`;

export const TRUST_CHANNELS = ['web', 'messenger', 'webchat'];
export function validateTrustSubmission(body) {
  const errors = {};
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const value = {
    lastname: str(src.lastname, 60), firstname: str(src.firstname, 60), phone: str(src.phone, 30),
    email: str(src.email, 254), amount: str(typeof src.amount === 'number' ? String(src.amount) : src.amount, 40),
  };
  for (const key of ['lastname', 'firstname', 'phone', 'amount']) if (!value[key]) errors[key] = 'Заавал бөглөнө үү.';
  // D23: submission channel (whitelist); anything else is stored as 'web'. The form sends it as `channel` (or `source`).
  const channel = str(src.channel, 20) || str(src.source, 20);
  value.channel = TRUST_CHANNELS.includes(channel) ? channel : 'web';
  if (value.phone && !/^[\d+\-\s()]{6,30}$/.test(value.phone)) errors.phone = 'Утасны дугаар буруу байна.';
  if (value.email && !isValidEmailAddress(value.email)) errors.email = 'Имэйл хаяг буруу байна.';
  return { value, errors };
}

export function validateTrustMessage(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Хүсэлт буруу байна.' };
  if (Object.keys(body).some(key => key !== 'message')) return { error: 'Зөвшөөрөгдөөгүй талбар байна.' };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) return { error: 'Мессеж 1–2000 тэмдэгт байна.', errors: { message: 'Мессеж 1–2000 тэмдэгт байна.' } };
  return { message };
}

// Legacy PUT /api/trusts/:id may only touch these fields (never reference/messages/history/applicant data).
export function pickTrustUpdate(body) {
  const update = {};
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    if (typeof body.status === 'string' && body.status.trim() && body.status.length <= 40) update.status = body.status.trim();
    if (typeof body.contactNote === 'string') update.contactNote = body.contactNote.slice(0, 2000);
  }
  return update;
}

// D18: Meta Pixel ID is digits only (10-20); anything else is treated as unset.
export const normalizePixelId = value => (typeof value === 'string' && /^[0-9]{10,20}$/.test(value.trim()) ? value.trim() : '');
export async function readMetaPixelId(SiteConfig) {
  const doc = await SiteConfig.findOne({ key: META_PIXEL_KEY }).lean();
  return normalizePixelId(doc?.value);
}

export async function readDeleteFlag(SiteConfig) {
  const doc = await SiteConfig.findOne({ key: DELETE_FLAG_KEY }).lean();
  return doc?.value === true;
}

// Never throws: login must keep working even if history storage fails. Returns the event id (string) or null.
export async function recordLoginEvent({ LoginEvent, user, req, now = new Date() }) {
  try {
    const event = await LoginEvent.create({ userId: String(user._id), at: now, ip: str(req?.ip, 80), userAgent: str(req?.headers?.['user-agent'], 300), success: true });
    return event?._id ? String(event._id) : null;
  } catch { return null; }
}

// ---------- routes ----------
export function registerAccountRoutes({
  app, User, SiteConfig, Log, LoginEvent, TrustRequest, authenticateUser, requireAdmin, permissions, createLog = async () => {},
  mailer, bcrypt, env = process.env, now = () => new Date(), schedule = setImmediate, randomBytes = crypto.randomBytes,
  logger = console, getCompanyPhone = async () => '',
}) {
  const inviteReadLimiter = createIntakeLimiter({ max: 30 });
  const setPasswordLimiter = createIntakeLimiter({ max: 10 });
  const inviteSendLimiter = createIntakeLimiter({ max: 30 });
  const trustSubmitLimiter = createIntakeLimiter({ max: 10 });
  const adminUrl = () => env.ADMIN_APP_URL || 'https://www.scm.mn/admin';
  const setPasswordBase = () => (env.ADMIN_APP_URL || 'https://www.scm.mn/admin').replace(/[?#].*$/, '');
  const limitOf = (value, def, max) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || def));
  const companyPhone = async () => { try { return String((await getCompanyPhone()) || ''); } catch { return ''; } };
  const fire = work => schedule(async () => { try { await work(); } catch { logger.error?.('[account] background task failed'); } });
  const send = async message => (mailer?.send ? mailer.send(message) : { result: 'skipped' });
  const mailQueued = () => (mailer?.enabled === false || !mailer?.send ? 'skipped' : 'queued');
  const senderEmail = user => str(user?.notificationEmail, 254) || str(user?.email, 254);
  const generic500 = res => res.status(500).json({ message: 'Алдаа гарлаа.' });

  // ----- Profile -----
  app.get('/api/me', authenticateUser, (req, res) => {
    const u = req.user || {};
    res.json({ _id: String(u._id), name: u.name || '', email: u.email || '', notificationEmail: u.notificationEmail || '', role: u.role || 'employee', roles: Array.isArray(u.roles) ? [...u.roles] : [], isTwoFAEnabled: Boolean(u.isTwoFAEnabled), createdAt: u.createdAt || null });
  });

  app.get('/api/me/logins', authenticateUser, async (req, res) => {
    try {
      const limit = limitOf(req.query?.limit, 20, 100);
      const events = await LoginEvent.find({ userId: String(req.user._id) }).sort({ at: -1 }).limit(limit).lean();
      const current = String(req.auth?.lid || '');
      res.json((events || []).map(event => ({ at: event.at, ip: event.ip || '', userAgent: event.userAgent || '', current: Boolean(current) && String(event._id) === current })));
    } catch { generic500(res); }
  });

  app.get('/api/me/logs', authenticateUser, async (req, res) => {
    try {
      const limit = limitOf(req.query?.limit, 50, 200);
      const id = String(req.user._id);
      // Older Log rows have no userId; match those by display name only.
      const filter = { $or: [{ userId: id }, { userId: { $exists: false }, userName: req.user.name || req.user.email || '' }] };
      const logs = await Log.find(filter).sort({ date: -1 }).limit(limit).lean();
      res.json((logs || []).map(log => ({ date: log.date, action: log.action || '', details: log.details || '' })));
    } catch { generic500(res); }
  });

  // ----- Admin settings -----
  app.get('/api/admin/settings', authenticateUser, requireAdmin, async (_req, res) => {
    try { res.json({ loanRequestDeleteEnabled: await readDeleteFlag(SiteConfig), metaPixelId: await readMetaPixelId(SiteConfig) }); } catch { generic500(res); }
  });
  // PUT accepts any non-empty subset of { loanRequestDeleteEnabled:boolean, metaPixelId:string(10-20 digits) | '' (clears) }.
  app.put('/api/admin/settings', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const body = req.body;
      const isObject = body && typeof body === 'object' && !Array.isArray(body);
      const keys = isObject ? Object.keys(body) : [];
      const errors = {};
      if (!isObject || !keys.length || keys.some(key => !SETTINGS_KEYS.includes(key))) errors._form = 'Тохиргоо буруу байна.';
      if (isObject && keys.includes('loanRequestDeleteEnabled') && typeof body.loanRequestDeleteEnabled !== 'boolean') errors.loanRequestDeleteEnabled = 'true эсвэл false байна.';
      if (isObject && keys.includes('metaPixelId') && !(typeof body.metaPixelId === 'string' && (body.metaPixelId.trim() === '' || normalizePixelId(body.metaPixelId)))) errors.metaPixelId = 'Pixel ID нь 10–20 оронтой тоо байна.';
      if (Object.keys(errors).length) return res.status(400).json({ message: 'Тохиргоо буруу байна.', errors });
      const out = {};
      if (keys.includes('loanRequestDeleteEnabled')) {
        await SiteConfig.findOneAndUpdate(
          { key: DELETE_FLAG_KEY },
          { $set: { value: body.loanRequestDeleteEnabled, label: 'Хүсэлт устгах унтраалга', group: 'internal', updatedAt: now() } },
          { upsert: true },
        );
        await createLog(req.user, 'admin_settings_changed', `${DELETE_FLAG_KEY}=${body.loanRequestDeleteEnabled}`);
        out.loanRequestDeleteEnabled = body.loanRequestDeleteEnabled;
      }
      if (keys.includes('metaPixelId')) {
        const pixelId = normalizePixelId(body.metaPixelId);
        await SiteConfig.findOneAndUpdate(
          { key: META_PIXEL_KEY },
          { $set: { value: pixelId, label: 'Meta Pixel ID', group: 'integrations', updatedAt: now() } },
          { upsert: true },
        );
        await createLog(req.user, 'admin_settings_changed', `metaPixelId=${pixelId ? 'set' : 'cleared'}`);
        out.metaPixelId = pixelId;
      }
      res.json(out);
    } catch { generic500(res); }
  });

  // ----- Trust requests -----
  app.post('/api/trusts', trustSubmitLimiter, async (req, res) => {
    try {
      const { value, errors } = validateTrustSubmission(req.body);
      if (Object.keys(errors).length) return res.status(400).json({ message: 'Мэдээллээ шалгана уу.', errors });
      const doc = new TrustRequest(value);
      doc.reference = trustReference(doc._id, now().getFullYear());
      await doc.save();
      res.status(201).json({ message: 'Success', reference: doc.reference });
      const reference = doc.reference;
      fire(async () => {
        if (value.email) {
          const outcome = await send({ to: value.email, reference, ...emails.trustAcknowledgement({ reference, phone: value.phone, companyPhone: await companyPhone() }) });
          await TrustRequest.updateOne({ _id: doc._id }, { $push: { history: { at: now(), type: 'email', email: { template: 'trust_ack', result: outcome?.result || 'failed' } } } }).catch(() => {});
        }
      });
      fire(async () => {
        const to = str(env.TRUST_NOTIFY_EMAIL, 254) || str(env.MAIL_REPLY_TO, 254);
        if (to) await send({ to, reference, ...emails.staffTrustNotification({ reference, phone: value.phone, adminUrl: adminUrl() }) });
      });
    } catch { generic500(res); }
  });

  app.get('/api/trusts', authenticateUser, permissions.require('trusts.view', 'trusts.message'), async (_req, res) => {
    try { res.json(await TrustRequest.find().sort({ createdAt: -1 }).limit(1000)); } catch { generic500(res); }
  });

  app.put('/api/trusts/:id', authenticateUser, permissions.require('trusts.view', 'trusts.message'), async (req, res) => {
    try {
      if (!OBJECT_ID_RE.test(req.params.id || '')) return res.status(400).json({ message: 'ID буруу байна.' });
      const update = pickTrustUpdate(req.body);
      if (!Object.keys(update).length) return res.status(400).json({ message: 'Өөрчлөх талбар байхгүй байна.' });
      const trust = await TrustRequest.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
      if (!trust) return res.status(404).json({ message: 'Хүсэлт олдсонгүй.' });
      res.json(trust);
    } catch { generic500(res); }
  });

  app.post('/api/trusts/:id/message', authenticateUser, permissions.require('trusts.message'), async (req, res) => {
    try {
      if (!OBJECT_ID_RE.test(req.params.id || '')) return res.status(400).json({ message: 'ID буруу байна.' });
      const parsed = validateTrustMessage(req.body);
      if (parsed.error) return res.status(400).json({ message: parsed.error, ...(parsed.errors ? { errors: parsed.errors } : {}) });
      const trust = await TrustRequest.findById(req.params.id).lean();
      if (!trust) return res.status(404).json({ message: 'Хүсэлт олдсонгүй.' });
      const to = str(trust.email, 254);
      if (!to || !isValidEmailAddress(to)) return res.status(400).json({ message: 'Харилцагчийн имэйл бүртгэлгүй байна.', code: 'NO_APPLICANT_EMAIL' });
      const reference = trust.reference || trustReference(trust._id);
      let result = 'failed';
      try {
        const outcome = await send({ to, reference, replyTo: senderEmail(req.user), ...emails.trustMessage({ reference, message: parsed.message, companyPhone: await companyPhone() }) });
        result = outcome?.result || 'failed';
      } catch { logger.error?.('[account] trust message failed'); }
      const entry = { at: now(), message: parsed.message, actor: { userId: String(req.user._id), name: req.user.name || req.user.email || 'Ажилтан' }, email: { template: 'trust_message', result } };
      const updated = await TrustRequest.findByIdAndUpdate(trust._id, { $push: { messages: entry } }, { new: true });
      await createLog(req.user, 'trust_message', `${trust._id}: ${result}`);
      res.json({ ok: true, email: { result }, trust: updated });
    } catch { generic500(res); }
  });

  // ----- User invites -----
  const issueInvite = async (userId, user) => {
    const { token, tokenHash, expiresAt } = createInviteToken({ randomBytes, now: now() });
    await User.updateOne({ _id: userId }, { $set: { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt } });
    const to = str(user.email, 254);
    fire(async () => { await send({ to, ...emails.userInvite({ name: user.name, setPasswordUrl: `${setPasswordBase()}?setPassword=${token}`, expiresAt }) }); });
    return { email: { result: mailQueued() }, expiresAt };
  };

  app.post('/api/users', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const name = str(body.name, 120);
      const email = str(body.email, 254);
      const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim().slice(0, 40) : 'employee';
      const roles = Array.isArray(body.roles) ? body.roles.filter(item => typeof item === 'string' && item).slice(0, 2) : [];
      const hasPassword = typeof body.password === 'string' && body.password.length > 0;
      if (!name || !email) return res.status(400).json({ message: 'Бүх талбарыг бөглөнө үү' });
      if (!hasPassword && !isValidEmailAddress(email)) return res.status(400).json({ message: 'Имэйл хаяг буруу байна.', errors: { email: 'Имэйл хаяг буруу байна.' } });
      let notificationEmail = '';
      if (body.notificationEmail !== undefined && body.notificationEmail !== '') {
        notificationEmail = str(body.notificationEmail, 254);
        if (!isValidEmailAddress(notificationEmail)) return res.status(400).json({ message: 'Мэдэгдлийн имэйл буруу байна.', errors: { notificationEmail: 'Имэйл хаяг буруу байна.' } });
      }
      if (await User.findOne({ email })) return res.status(400).json({ message: 'И-мэйл бүртгэлтэй байна' });
      // Legacy: an explicit password keeps the old behaviour. Otherwise the account is unusable until the invite is accepted.
      const password = await bcrypt.hash(hasPassword ? body.password : randomBytes(32).toString('hex'), 10);
      const created = await new User({ name, email, password, role, roles, ...(notificationEmail ? { notificationEmail } : {}) }).save();
      const safe = { _id: created._id, name: created.name, email: created.email, role: created.role, roles: created.roles };
      if (hasPassword) return res.json({ message: 'Амжилттай', user: safe });
      const invite = await issueInvite(created._id, created);
      await createLog(req.user, 'user_invited', `${created._id}`);
      res.json({ message: 'Амжилттай', user: safe, invite: { email: invite.email, expiresAt: invite.expiresAt } });
    } catch { res.status(500).json({ message: 'Алдаа гарлаа' }); }
  });

  app.post('/api/users/:id/invite', authenticateUser, requireAdmin, inviteSendLimiter, async (req, res) => {
    try {
      if (!OBJECT_ID_RE.test(req.params.id || '')) return res.status(400).json({ message: 'ID буруу байна.' });
      const user = await User.findById(req.params.id).select('_id name email isActive').lean();
      if (!user || user.isActive === false) return res.status(404).json({ message: 'Хэрэглэгч олдсонгүй' });
      const invite = await issueInvite(user._id, user);
      await createLog(req.user, 'user_invited', `${user._id} resend`);
      res.json({ ok: true, invite: { email: invite.email, expiresAt: invite.expiresAt } });
    } catch { generic500(res); }
  });

  const findInvited = async token => {
    if (!isTokenShape(token)) return null;
    const user = await User.findOne({ inviteTokenHash: hashInviteToken(token) }).select('_id name email isActive inviteTokenHash inviteExpiresAt').lean();
    return user && user.isActive !== false && inviteTokenMatches(user, token, now()) ? user : null;
  };

  app.get('/api/auth/invite/:token', inviteReadLimiter, async (req, res) => {
    try {
      res.set?.('Cache-Control', 'no-store');
      const user = await findInvited(req.params.token);
      if (!user) return res.json({ valid: false });
      res.json({ valid: true, email: maskEmail(user.email), expiresAt: user.inviteExpiresAt });
    } catch { res.json({ valid: false }); }
  });

  app.post('/api/auth/set-password', setPasswordLimiter, async (req, res) => {
    const invalid = () => res.status(400).json({ message: 'Холбоос хүчингүй эсвэл хугацаа дууссан байна.', code: 'INVALID_TOKEN' });
    try {
      res.set?.('Cache-Control', 'no-store');
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const policy = passwordPolicyError(body.password);
      if (policy) return res.status(400).json({ message: policy, code: 'WEAK_PASSWORD' });
      const user = await findInvited(body.token);
      if (!user) return invalid();
      const hashed = await bcrypt.hash(body.password, 10);
      // Atomic single use: only one request can match the hash while it is still stored and unexpired.
      const updated = await User.findOneAndUpdate(
        { _id: user._id, inviteTokenHash: user.inviteTokenHash, inviteExpiresAt: { $gt: now() } },
        { $set: { password: hashed }, $unset: { inviteTokenHash: 1, inviteExpiresAt: 1 } },
      );
      if (!updated) return invalid();
      await createLog({ name: user.name, email: user.email, role: 'employee' }, 'user_password_set', 'Урилгаар нууц үг тогтоолоо');
      res.json({ ok: true });
    } catch { generic500(res); }
  });

  return {};
}
