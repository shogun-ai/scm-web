// SMTP mailer (nodemailer injected). Never throws into callers; never logs addresses, content or secrets.

const DEFAULT_FROM = '"SCM" <no-reply@scm.mn>';
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
// Plain address only (no display names) to keep header injection impossible.
export const isValidEmailAddress = value => typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim()) && !/[\r\n]/.test(value);

export function readMailConfig(env = process.env) {
  const host = String(env.SMTP_HOST || '').trim();
  const port = Number(env.SMTP_PORT);
  const user = String(env.SMTP_USER || '').trim();
  const pass = String(env.SMTP_PASS || '');
  const enabled = env.MAIL_ENABLED === 'true' && Boolean(host) && Number.isInteger(port) && port > 0 && Boolean(user) && Boolean(pass);
  const secure = env.SMTP_SECURE === 'true' ? true : env.SMTP_SECURE === 'false' ? false : port === 465;
  return {
    enabled, host, port: Number.isInteger(port) ? port : 0, secure, user, pass,
    from: String(env.MAIL_FROM || '').trim() || DEFAULT_FROM,
    replyTo: isValidEmailAddress(String(env.MAIL_REPLY_TO || '').trim()) ? String(env.MAIL_REPLY_TO).trim() : undefined,
  };
}

const safeCode = error => String(error?.code || error?.responseCode || 'ERROR').replace(/[^\w.-]/g, '').slice(0, 40) || 'ERROR';
const safeTag = value => String(value || '-').replace(/[^\w.-]/g, '').slice(0, 60) || '-';

export function createMailer({ env = process.env, createTransport, logger = console } = {}) {
  const config = readMailConfig(env);
  const enabled = config.enabled && typeof createTransport === 'function';
  if (!enabled) logger.info?.('[mail] disabled');
  let transport = null;
  const getTransport = () => {
    if (!transport) {
      transport = createTransport({
        host: config.host, port: config.port, secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
      });
    }
    return transport;
  };
  return {
    enabled,
    // message: { to, subject, text, html, replyTo?, template?, reference? } -> { result: 'sent'|'skipped'|'failed', code? }
    // replyTo (D10): valid message.replyTo -> MAIL_REPLY_TO -> omitted.
    async send(message = {}) {
      if (!enabled) return { result: 'skipped' };
      const to = typeof message.to === 'string' ? message.to.trim() : '';
      if (!isValidEmailAddress(to) || !message.subject) return { result: 'skipped' };
      const replyTo = isValidEmailAddress(message.replyTo) ? message.replyTo.trim() : config.replyTo;
      try {
        await getTransport().sendMail({ from: config.from, to, subject: message.subject, text: message.text, html: message.html, ...(replyTo ? { replyTo } : {}) });
        return { result: 'sent' };
      } catch (error) {
        const code = safeCode(error);
        logger.error?.(`[mail] failed template=${safeTag(message.template)} ref=${safeTag(message.reference)} code=${code}`);
        return { result: 'failed', code };
      }
    },
  };
}

// Fire-and-forget; onDone(result) is optional and its errors are swallowed.
export function sendInBackground(mailer, message, onDone, { schedule = setImmediate } = {}) {
  schedule(async () => {
    let outcome;
    try { outcome = mailer?.send ? await mailer.send(message) : { result: 'skipped' }; } catch { outcome = { result: 'failed', code: 'ERROR' }; }
    if (typeof onDone === 'function') {
      try { await onDone(outcome); } catch { /* history write failures are non-fatal */ }
    }
  });
}
