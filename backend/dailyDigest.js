// D24: daily 09:00 (Asia/Ulaanbaatar) reminder email per staff member: open loan and trust requests assigned to them.
// Idempotent across restarts/instances via SiteConfig `daily_digest_last_run` (UB date), claimed with one atomic update.
// Privacy: the email carries only reference numbers, product/status labels and day counts (see accountEmails.dailyDigest).
import { PRODUCTS_MAP } from '../shared/loanFormConfig.js';
import { TASK_STATUS_LABELS, TERMINAL_TASK_STATUSES, deriveTaskState, taskStatusFilter } from '../shared/loanTaskStatus.js';
import { ubDate } from '../shared/loanWidgets.js';
import { isValidEmailAddress } from './mailer.js';
import * as emails from './accountEmails.js';
import { notifyEmailOf } from './assignmentSettings.js';
import { TRUST_CLOSED_STATUSES } from './trustDocs.js';

export const DIGEST_ENABLED_KEY = 'daily_digest_enabled';
export const DIGEST_LAST_RUN_KEY = 'daily_digest_last_run';
export const DIGEST_CRON = '0 9 * * *';
export const DIGEST_TIMEZONE = 'Asia/Ulaanbaatar';
const DAY_MS = 24 * 3600 * 1000;
const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const daysSince = (value, at) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? Math.max(0, Math.floor((at.getTime() - time) / DAY_MS)) : null;
};
const TRUST_STATUS_LABELS = { pending: 'Шинэ', in_progress: 'Хянаж буй' };
const OPEN_LIMIT = 5000;

export function createDailyDigest({
  User, LoanRequest, TrustRequest, SiteConfig, mailer, env = process.env, now = () => new Date(), logger = console, adminUrl,
}) {
  const link = () => adminUrl || env.ADMIN_APP_URL || 'https://www.scm.mn/admin';
  const mailOn = () => Boolean(mailer?.send) && mailer.enabled !== false;
  const isEnabled = async () => { try { return (await SiteConfig.findOne({ key: DIGEST_ENABLED_KEY }).lean())?.value !== false; } catch { return true; } };

  // Open (non-terminal) assigned requests for the given user ids -> Map<userId, { loans, trusts }>.
  async function collect(userIds, at) {
    const map = new Map(userIds.map(id => [id, { loans: [], trusts: [] }]));
    if (!userIds.length) return map;
    const loans = await LoanRequest.find({ 'assignee.userId': { $in: userIds }, $nor: TERMINAL_TASK_STATUSES.map(status => taskStatusFilter(status)) })
      .select({ applicationReference: 1, selectedProduct: 1, 'taskForm.productName': 1, status: 1, taskStatus: 1, assignee: 1, taskUpdatedAt: 1, createdAt: 1, taskHistory: { $slice: -20 } })
      .limit(OPEN_LIMIT).lean();
    for (const loan of Array.isArray(loans) ? loans : []) {
      const state = deriveTaskState(loan).taskStatus;
      const bucket = map.get(String(loan.assignee?.userId || ''));
      if (!bucket || TERMINAL_TASK_STATUSES.includes(state)) continue;
      const assigned = [...(Array.isArray(loan.taskHistory) ? loan.taskHistory : [])].reverse().find(entry => entry?.type === 'assigned')?.at || loan.createdAt;
      bucket.loans.push({
        reference: clean(loan.applicationReference), productName: clean(loan.taskForm?.productName || PRODUCTS_MAP[loan.selectedProduct] || loan.selectedProduct),
        statusLabel: TASK_STATUS_LABELS[state] || state, assignedDays: daysSince(assigned, at), changedDays: daysSince(loan.taskUpdatedAt || loan.createdAt, at),
      });
    }
    const trusts = TrustRequest ? await TrustRequest.find({ 'assignee.userId': { $in: userIds }, status: { $nin: TRUST_CLOSED_STATUSES } })
      .select({ reference: 1, status: 1, assignee: 1, assignedAt: 1, createdAt: 1, history: { $slice: -1 } }).limit(OPEN_LIMIT).lean() : [];
    for (const trust of Array.isArray(trusts) ? trusts : []) {
      const bucket = map.get(String(trust.assignee?.userId || ''));
      if (!bucket || TRUST_CLOSED_STATUSES.includes(String(trust.status || '').toLowerCase())) continue;
      const status = clean(trust.status) || 'pending';
      bucket.trusts.push({
        reference: clean(trust.reference), statusLabel: TRUST_STATUS_LABELS[status] || status.slice(0, 40),
        assignedDays: daysSince(trust.assignedAt || trust.createdAt, at), changedDays: daysSince(Array.isArray(trust.history) && trust.history.length ? trust.history[trust.history.length - 1].at : trust.createdAt, at),
      });
    }
    const oldest = (a, b) => (b.assignedDays ?? -1) - (a.assignedDays ?? -1);
    for (const bucket of map.values()) { bucket.loans.sort(oldest); bucket.trusts.sort(oldest); }
    return map;
  }

  const buildMessage = (to, bucket, at) => ({
    to,
    ...emails.dailyDigest({ items: bucket.loans, total: bucket.loans.length, trustItems: bucket.trusts, trustTotal: bucket.trusts.length, adminUrl: link(), dateLabel: ubDate(at) }),
  });

  // Atomic once-per-UB-day claim: the marker row is created if missing, then switched to today only if it is not already today.
  async function claim(today, at) {
    await SiteConfig.updateOne({ key: DIGEST_LAST_RUN_KEY }, { $setOnInsert: { value: 'never', label: 'Өдөр тутмын сануулгын сүүлийн ажиллалт', group: 'internal', updatedAt: at } }, { upsert: true });
    const result = await SiteConfig.updateOne({ key: DIGEST_LAST_RUN_KEY, value: { $ne: today } }, { $set: { value: today, updatedAt: at } });
    return (result?.modifiedCount ?? result?.nModified ?? 0) === 1;
  }

  // -> { status:'skipped', reason } | { status:'done', staff, sent, failed }
  async function run() {
    if (!mailOn()) return { status: 'skipped', reason: 'mail_disabled' };
    if (!(await isEnabled())) return { status: 'skipped', reason: 'disabled' };
    const at = now();
    if (!(await claim(ubDate(at), at))) return { status: 'skipped', reason: 'already_ran' };
    const users = await User.find({ isActive: { $ne: false } }).select('_id name email notificationEmail isActive').limit(1000).lean();
    const recipients = (Array.isArray(users) ? users : []).filter(user => user.isActive !== false).map(user => ({ id: String(user._id), to: notifyEmailOf(user) })).filter(item => isValidEmailAddress(item.to));
    const data = await collect(recipients.map(item => item.id), at);
    let sent = 0; let failed = 0; let staff = 0;
    for (const { id, to } of recipients) {
      const bucket = data.get(id);
      if (!bucket || (!bucket.loans.length && !bucket.trusts.length)) continue;
      staff += 1;
      try {
        const outcome = await mailer.send({ ...buildMessage(to, bucket, at), reference: 'digest' });
        if (outcome?.result === 'sent') sent += 1; else failed += 1;
      } catch { failed += 1; }
    }
    logger.info?.(`[daily-digest] staff=${staff} sent=${sent} failed=${failed}`);
    return { status: 'done', staff, sent, failed };
  }

  // Admin test: the caller's own digest, sent immediately (ignores the enabled flag and the daily marker).
  async function sendTest(user) {
    const to = notifyEmailOf(user);
    if (!mailOn()) return { result: 'skipped', reason: 'mail_disabled' };
    if (!isValidEmailAddress(to)) return { result: 'skipped', reason: 'no_email' };
    const at = now();
    const id = String(user._id);
    const bucket = (await collect([id], at)).get(id) || { loans: [], trusts: [] };
    const outcome = await mailer.send({ ...buildMessage(to, bucket, at), reference: 'digest-test' });
    return { result: outcome?.result || 'failed', sentTo: emails.maskEmail(to), loans: bucket.loans.length, trusts: bucket.trusts.length };
  }

  return { run, sendTest, collect, isEnabled };
}
