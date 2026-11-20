import test from 'node:test';
import assert from 'node:assert/strict';
import { readMailConfig, createMailer, sendInBackground, isValidEmailAddress } from './mailer.js';
import { applicantAcknowledgement, staffAssignment, applicantDocumentRequest, staffApplicantUpload, escapeHtml } from './loanTaskEmails.js';

const ENV = { MAIL_ENABLED: 'true', SMTP_HOST: 'smtp.itools.mn', SMTP_PORT: '465', SMTP_USER: 'no-reply@scm.mn', SMTP_PASS: 's3cret-pass', MAIL_FROM: '"SCM" <no-reply@scm.mn>' };
const silent = () => { const lines = []; return { lines, info: line => lines.push(line), error: line => lines.push(line), warn: line => lines.push(line) }; };
function fakeTransport({ fail } = {}) {
  const state = { options: null, messages: [], created: 0 };
  const createTransport = options => { state.created++; state.options = options; return { sendMail: async message => { if (fail) throw Object.assign(new Error(`535 auth failed for ${message.to} pass=${options.auth.pass}`), { code: 'EAUTH' }); state.messages.push(message); return { messageId: 'x' }; } }; };
  return { state, createTransport };
}
const message = { to: 'client@example.mn', subject: 'S', text: 'T', html: '<p>T</p>', template: 'applicant_ack', reference: 'SCM-2026-AB12CD' };

test('mail disabled unless MAIL_ENABLED=true and SMTP credentials are complete', async () => {
  for (const env of [{}, { ...ENV, MAIL_ENABLED: 'false' }, { ...ENV, SMTP_PASS: '' }, { ...ENV, SMTP_HOST: '' }, { ...ENV, SMTP_PORT: 'abc' }]) {
    assert.equal(readMailConfig(env).enabled, false);
    const { state, createTransport } = fakeTransport();
    const logger = silent();
    const mailer = createMailer({ env, createTransport, logger });
    assert.equal(mailer.enabled, false);
    assert.deepEqual(await mailer.send(message), { result: 'skipped' });
    assert.equal(state.created, 0);
    assert.deepEqual(logger.lines, ['[mail] disabled']);
  }
  assert.equal(createMailer({ env: ENV, logger: silent() }).enabled, false, 'no transport factory');
});

test('enabled mailer sends via injected transport with timeouts and secure port detection', async () => {
  const { state, createTransport } = fakeTransport();
  const mailer = createMailer({ env: ENV, createTransport, logger: silent() });
  assert.deepEqual(await mailer.send(message), { result: 'sent' });
  assert.equal(state.options.secure, true); assert.equal(state.options.port, 465);
  assert.equal(state.options.connectionTimeout, 10000); assert.equal(state.options.socketTimeout, 20000);
  assert.equal(state.messages[0].from, '"SCM" <no-reply@scm.mn>'); assert.equal(state.messages[0].to, 'client@example.mn');
  await mailer.send(message);
  assert.equal(state.created, 1, 'transport reused');
  assert.equal(readMailConfig({ ...ENV, SMTP_PORT: '587' }).secure, false);
  assert.equal(readMailConfig({ ...ENV, SMTP_PORT: '587', SMTP_SECURE: 'true' }).secure, true);
  assert.equal(readMailConfig({ ...ENV, SMTP_SECURE: 'false' }).secure, false);
  assert.equal(readMailConfig({ ...ENV, MAIL_FROM: '' }).from, '"SCM" <no-reply@scm.mn>');
  assert.deepEqual(await mailer.send({ ...message, to: 'not-an-email' }), { result: 'skipped' });
  assert.deepEqual(await mailer.send({ ...message, to: 'a@b.mn\r\nBcc: x@y.mn' }), { result: 'skipped' });
});

test('D10 reply-to: assignee email, else MAIL_REPLY_TO, else omitted; invalid values ignored', async () => {
  let fake = fakeTransport();
  let mailer = createMailer({ env: { ...ENV, MAIL_REPLY_TO: 'info@scm.mn' }, createTransport: fake.createTransport, logger: silent() });
  await mailer.send({ ...message, replyTo: 'saraa@scm.mn' });
  await mailer.send({ ...message, replyTo: '' });
  await mailer.send({ ...message, replyTo: 'bad\r\nBcc: evil@x.mn' });
  assert.deepEqual(fake.state.messages.map(item => item.replyTo), ['saraa@scm.mn', 'info@scm.mn', 'info@scm.mn']);
  fake = fakeTransport();
  mailer = createMailer({ env: ENV, createTransport: fake.createTransport, logger: silent() });
  await mailer.send(message);
  assert.equal(Object.hasOwn(fake.state.messages[0], 'replyTo'), false);
  assert.equal(readMailConfig({ ...ENV, MAIL_REPLY_TO: 'Name <x@y.mn>' }).replyTo, undefined);
  assert.equal(isValidEmailAddress('a@b.mn'), true); assert.equal(isValidEmailAddress('a@b'), false);
});

test('transport failure returns failed, never throws, logs without address or secrets', async () => {
  const { createTransport } = fakeTransport({ fail: true });
  const logger = silent();
  const mailer = createMailer({ env: ENV, createTransport, logger });
  const result = await mailer.send(message);
  assert.deepEqual(result, { result: 'failed', code: 'EAUTH' });
  const log = logger.lines.join('\n');
  assert.ok(log.includes('[mail] failed template=applicant_ack ref=SCM-2026-AB12CD code=EAUTH'));
  for (const secret of ['client@example.mn', 's3cret-pass', 'no-reply@scm.mn', 'smtp.itools.mn']) assert.equal(log.includes(secret), false, secret);
});

test('sendInBackground schedules, reports outcome and swallows errors', async () => {
  const tasks = [];
  const schedule = fn => tasks.push(fn);
  const outcomes = [];
  sendInBackground({ send: async () => ({ result: 'sent' }) }, message, outcome => outcomes.push(outcome), { schedule });
  sendInBackground({ send: async () => { throw new Error('boom'); } }, message, outcome => outcomes.push(outcome), { schedule });
  sendInBackground({ send: async () => ({ result: 'sent' }) }, message, () => { throw new Error('history down'); }, { schedule });
  assert.equal(outcomes.length, 0, 'nothing runs synchronously');
  for (const task of tasks) await task();
  assert.deepEqual(outcomes, [{ result: 'sent' }, { result: 'failed', code: 'ERROR' }]);
});

test('templates are Mongolian, PII-free and HTML-escaped', () => {
  const ack = applicantAcknowledgement({ reference: 'SCM-2026-AB12CD', productName: 'Хэрэглээний зээл', subProductName: '<script>x</script>', companyPhone: '7599-1919' });
  assert.equal(ack.subject, 'Таны зээлийн хүсэлт хүлээн авлаа — SCM-2026-AB12CD');
  assert.ok(ack.text.includes('ажлын 1-2 өдөрт')); assert.ok(ack.text.includes('7599-1919'));
  assert.equal(ack.html.includes('<script>'), false); assert.ok(ack.html.includes('&lt;script&gt;'));
  assert.equal(applicantAcknowledgement({ reference: 'R' }).text.includes('Лавлах утас'), false, 'phone omitted when unknown');
  const staff = staffAssignment({ reference: 'R1', productName: 'P', adminUrl: 'https://www.scm.mn/admin' });
  assert.ok(staff.subject.startsWith('Танд зээлийн хүсэлт хуваарилагдлаа')); assert.ok(staff.html.includes('href="https://www.scm.mn/admin"'));
  const doc = applicantDocumentRequest({ reference: 'R2', productName: 'P', items: ['НДШ лавлагаа'], uploadUrl: 'https://www.scm.mn/loan-request?upload=abc', expiresAt: '2026-11-27T03:00:00Z' });
  assert.ok(doc.text.includes('• НДШ лавлагаа')); assert.ok(doc.text.includes('2026-11-27 11:00')); assert.ok(doc.text.includes('upload=abc'));
  assert.ok(staffApplicantUpload({ reference: 'R3', count: 2 }).text.includes('2 файл'));
  for (const template of [ack, staff, doc]) for (const forbidden of ['regNo', 'УБ9']) assert.equal(template.text.includes(forbidden), false);
  assert.equal(escapeHtml(`"'&<>`), '&quot;&#39;&amp;&lt;&gt;');
  assert.equal(applicantAcknowledgement({ reference: 'A\r\nBcc: x' }).subject.includes('\n'), false, 'no header injection via subject');
});
