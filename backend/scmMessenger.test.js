import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifySignature, buildPostElement, buildPostsCarousel, splitText, buildMessengerProfile, parsePhone, parseAmount, parseTerm, parseName,
  startApplication, advance, nodeToMessengerMessages, createPsidLimiter, createGraphClient, createScmMessenger, registerScmMessengerRoutes, partitionEntries,
  createSharedWebhookForwarder, GraphError, stripChatControlTokens,
} from './scmMessenger.js';
import { buildMessengerTaskDoc, validateMessengerInput, toTaskListItem, LOAN_TASK_SCHEMA_FIELDS, sanitizeLegacyLoanWrite, CHANNELS } from './loanTasks.js';
import { stripTaskSecrets } from './loanIntake.js';
import { deriveTaskState } from '../shared/loanTaskStatus.js';

const PSID = '1234567890123456';
const TOKEN = 'EAAB-secret-page-token-123';
const APP_SECRET = 'app-secret-xyz';
const VERIFY = 'verify-me';
const NOW = new Date('2026-11-20T03:00:00Z');
const sign = (body, secret = APP_SECRET) => `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

// ---------- fakes ----------
function fakeAxios({ posts = [], page = { id: '111', name: 'Солонго Капитал', username: 'Solongo.Capital' }, subscribed = [{ subscribed_fields: ['messages', 'messaging_postbacks'] }], profile, chatReply = { reply: 'Сайн байна уу' }, failGet = false } = {}) {
  const calls = { get: [], post: [] };
  const pathOf = url => url.replace(/^https:\/\/graph\.facebook\.com\/[^/]+\//, '');
  const graphError = code => Object.assign(new Error(`failed with ${TOKEN}`), { response: { status: 400, data: { error: { code, type: 'OAuthException', message: `bad token ${TOKEN}` } } } });
  return {
    calls,
    async get(url, options) {
      calls.get.push({ url, params: options.params });
      if (failGet) throw graphError(190);
      const path = pathOf(url);
      if (path === 'me/posts') return { data: { data: posts } };
      if (path === 'me') return { data: page };
      if (path === 'me/subscribed_apps') return { data: { data: subscribed } };
      if (path === 'me/messenger_profile') return { data: { data: profile ? [profile] : [] } };
      throw new Error(`unexpected GET ${path}`);
    },
    async post(url, data, options) {
      calls.post.push({ url, data, options });
      if (url.endsWith('/api/chat')) return { data: chatReply };
      return { data: { ok: true } };
    },
  };
}
const memoryStore = () => {
  const map = new Map();
  return { map, async get(psid) { return map.has(psid) ? structuredClone(map.get(psid)) : null; }, async save(psid, session) { map.set(psid, structuredClone(session)); }, async clear(psid) { map.delete(psid); } };
};
const sent = axios => axios.calls.post.filter(call => call.url.endsWith('/me/messages')).map(call => call.data.message);
const texts = axios => sent(axios).map(message => message.text).filter(Boolean);
const event = (extra = {}, psid = PSID) => ({ sender: { id: psid }, ...extra });
const quick = payload => event({ message: { text: payload, quick_reply: { payload } } });
const say = text => event({ message: { text } });
const postback = payload => event({ postback: { payload } });

const CONTENT = {
  async loadProducts() {
    return [
      { productKey: 'cons_loan', title: 'Хэрэглээний зээл', shortDesc: 'Богино', isActive: true, order: 1, individual: { conditions: ['Хүү 2%'], requirements: ['18 нас'] } },
      { productKey: 'trust', title: 'Итгэлцэл', isActive: true, order: 4 },
    ];
  },
  async loadSetting(key) { return key === 'payment_accounts' ? [{ bank: 'Хаан банк', accountNumber: '5000123456', accountName: 'Солонго Капитал ББСБ' }] : undefined; },
};
function makeMessenger({ env = {}, content, axios = fakeAxios(), createRequest, limiter, clock = { t: NOW.getTime() } } = {}) {
  const store = memoryStore();
  const requests = [];
  const messenger = createScmMessenger({
    content, axios, env: { FB_PAGE_ACCESS_TOKEN: TOKEN, FB_VERIFY_TOKEN: VERIFY, PUBLIC_API_BASE_URL: 'http://api.test', ...env }, sessionStore: store,
    createRequest: createRequest || (async input => { requests.push(input); return { applicationReference: 'SCM-2026-ABC123', productKey: input.productKey, productName: 'Хэрэглээний зээл', assigned: true }; }),
    rateLimiter: limiter, now: () => clock.t, logger: { error() {}, warn() {} },
  });
  return { messenger, axios, store, requests, clock };
}

// ---------- signature ----------
test('verifySignature: valid HMAC passes; tampered, missing, wrong-length and secretless fail', () => {
  const body = Buffer.from('{"object":"page"}');
  assert.equal(verifySignature(body, sign(body), APP_SECRET), true);
  assert.equal(verifySignature(body, sign(body, 'other'), APP_SECRET), false);
  assert.equal(verifySignature(Buffer.from('{"object":"x"}'), sign(body), APP_SECRET), false);
  assert.equal(verifySignature(body, 'sha256=abc', APP_SECRET), false);
  assert.equal(verifySignature(body, undefined, APP_SECRET), false);
  assert.equal(verifySignature(body, sign(body), ''), false);
  assert.equal(verifySignature(undefined, sign(body), APP_SECRET), false);
  assert.equal(verifySignature(body, sign(body).replace('sha256=', 'md5='), APP_SECRET), false);
});

// ---------- carousel ----------
test('carousel: <=10 posts, title = first line, 3 buttons, https-only media, junk skipped', () => {
  const posts = Array.from({ length: 14 }, (_, index) => ({ id: `p_${index}`, message: `Гарчиг ${index}\nДэлгэрэнгүй текст`, full_picture: 'https://scontent.fb/img.jpg', permalink_url: `https://www.facebook.com/Solongo.Capital/posts/${index}` }));
  const elements = buildPostsCarousel([{ message: 'no id' }, { id: 'x' }, ...posts]);
  assert.equal(elements.length, 10);
  assert.equal(elements[0].title, 'Гарчиг 0');
  assert.equal(elements[0].subtitle, 'Дэлгэрэнгүй текст');
  assert.equal(elements[0].image_url, 'https://scontent.fb/img.jpg');
  assert.deepEqual(elements[0].buttons.map(button => [button.type, button.title, button.payload || button.url]), [
    ['postback', 'Дэлгэрэнгүй', 'detail:p_0'], ['postback', 'Зээлийн хүсэлт', 'apply:p_0'], ['web_url', 'Facebook-т үзэх', 'https://www.facebook.com/Solongo.Capital/posts/0'],
  ]);
  const plain = buildPostElement({ id: 'q', message: 'x'.repeat(200), full_picture: 'http://insecure/img.jpg', permalink_url: 'javascript:alert(1)' });
  assert.equal(plain.title.length, 80);
  assert.equal(plain.image_url, undefined);
  assert.equal(plain.default_action, undefined);
  assert.equal(plain.buttons.length, 2, 'no unsafe web_url button');
  assert.equal(buildPostElement({ id: 'i', full_picture: 'https://x/y.png' }).title, 'Солонго Капитал');
  assert.deepEqual(buildPostsCarousel(null), []);
});

test('splitText chunks long posts at boundaries, max 5 chunks', () => {
  assert.deepEqual(splitText('short'), ['short']);
  const long = Array.from({ length: 50 }, (_, index) => `Мөр ${index} `.padEnd(100, 'а')).join('\n');
  const chunks = splitText(long, 2000);
  assert.ok(chunks.length >= 3 && chunks.every(chunk => chunk.length <= 2000));
  assert.equal(chunks.join('\n').replace(/\s/g, ''), long.replace(/\s/g, ''));
  assert.equal(splitText('я'.repeat(50000), 2000).length, 5);
  assert.deepEqual(splitText(''), []);
});

test('persistent menu per §19: restart, loans, trust, ads, payment postbacks; get started = restart', () => {
  const profile = buildMessengerProfile();
  assert.deepEqual(profile.get_started, { payload: 'restart' });
  const items = profile.persistent_menu[0].call_to_actions;
  assert.deepEqual(items.map(item => [item.type, item.title, item.payload]), [
    ['postback', 'Дахин эхлүүлэх', 'restart'], ['postback', 'Зээл', 'loans'], ['postback', 'Итгэлцэл', 'trust'],
    ['postback', 'Идэвхтэй зээлийн зар', 'ads'], ['postback', 'Төлөлт хийх', 'payment'],
  ]);
  assert.ok(items.every(item => item.title.length <= 30));
});

// ---------- validators ----------
test('validators: phone, amount, term, name', () => {
  assert.equal(parsePhone('9900 1234'), '99001234');
  assert.equal(parsePhone('+976 99001234'), '99001234');
  assert.equal(parsePhone('99-00-12-34'), '99001234');
  for (const bad of ['9900123', '990012345', 'abcdefgh', '', null, '+97699001']) assert.equal(parsePhone(bad), null, String(bad));
  assert.equal(parseAmount('5000000'), 5000000);
  assert.equal(parseAmount('5,000,000₮'), 5000000);
  assert.equal(parseAmount('5 сая'), 5000000);
  assert.equal(parseAmount('2.5 сая'), 2500000);
  assert.equal(parseAmount('2,5сая'), 2500000);
  assert.equal(parseAmount('500 мянга'), 500000);
  assert.equal(parseAmount('300k'), 300000);
  for (const bad of ['0', '-5', '1000', 'олон', '', '1e9x', '99999999999', '5 сая сая', null]) assert.equal(parseAmount(bad), null, String(bad));
  assert.equal(parseTerm('12'), 12);
  assert.equal(parseTerm('24 сар'), 24);
  assert.equal(parseTerm('2 жил'), 24);
  for (const bad of ['0', '121', '-1', '1.5', 'жил', '', '5 өдөр', null]) assert.equal(parseTerm(bad), null, String(bad));
  assert.deepEqual(parseName('Бат Болд'), { lastname: 'Бат', firstname: 'Болд' });
  assert.deepEqual(parseName('Б.Болд'), { lastname: 'Б', firstname: 'Болд' });
  assert.deepEqual(parseName('Бат-Эрдэнэ Сүхбаатар Болд'), { lastname: 'Бат-Эрдэнэ', firstname: 'Сүхбаатар Болд' });
  for (const bad of ['Болд', 'Бат 123', '12 34', '', 'a', '<b>x</b> y', 'я'.repeat(81)]) assert.equal(parseName(bad), null, bad);
});

// ---------- state machine ----------
test('state machine: full happy path ends in submit with a complete draft', () => {
  let { session, messages } = startApplication({ postId: '123_456' });
  assert.equal(session.state, 'product');
  assert.equal(session.postId, '123_456');
  assert.ok(messages.at(-1).quickReplies.some(reply => reply.payload === 'product:cons_loan'));
  const step = input => { const result = advance(session, input); session = result.session; return result; };
  assert.equal(step({ payload: 'product:cons_loan' }).session.state, 'name');
  assert.equal(step({ text: 'Бат Болд' }).session.state, 'phone');
  assert.equal(step({ text: '99001234' }).session.state, 'amount');
  assert.equal(step({ text: '5 сая' }).session.state, 'term');
  const confirm = step({ text: '12' });
  assert.equal(confirm.session.state, 'confirm');
  assert.match(confirm.messages[0].text, /Хэрэглээний зээл[\s\S]*Бат Болд[\s\S]*99001234[\s\S]*5,000,000₮[\s\S]*12 сар/);
  const done = step({ payload: 'confirm' });
  assert.equal(done.action, 'submit');
  assert.deepEqual(done.session.draft, { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд', phone: '99001234', amount: 5000000, term: 12 });
});

test('state machine: invalid input keeps the state and the draft (with an error text); input session is not mutated', () => {
  const base = { state: 'phone', draft: { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд' }, postId: '' };
  const frozen = structuredClone(base);
  for (const bad of ['123', 'утас', '+1 555 0100']) {
    const result = advance(base, { text: bad });
    assert.equal(result.session.state, 'phone');
    assert.match(result.messages[0].text, /8 оронтой/);
    assert.equal(result.action, null);
  }
  assert.deepEqual(base, frozen);
  for (const [state, text] of [['name', 'Болд'], ['amount', 'хэдэн ч байсан'], ['term', '500'], ['product', 'ямар нэг']]) {
    assert.equal(advance({ state, draft: {} }, { text }).session.state, state, state);
  }
  // quick-reply payloads from older messages must not be accepted as free text answers
  assert.equal(advance({ state: 'amount', draft: {} }, { payload: 'confirm' }).session.state, 'amount');
  assert.equal(advance({ state: 'confirm', draft: base.draft }, { text: 'за' }).action, null);
});

test('state machine: back, restart, cancel, product by typed name, unknown state', () => {
  const draft = { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд', phone: '99001234' };
  assert.equal(advance({ state: 'amount', draft }, { payload: 'back' }).session.state, 'phone');
  assert.equal(advance({ state: 'amount', draft }, { text: 'Буцах' }).session.state, 'phone');
  assert.equal(advance({ state: 'product', draft: {} }, { payload: 'back' }).action, 'cancel');
  assert.equal(advance({ state: 'confirm', draft }, { payload: 'restart' }).session.state, 'product');
  assert.equal(advance({ state: 'confirm', draft }, { payload: 'restart' }).session.draft.productKey, undefined);
  for (const input of [{ payload: 'cancel' }, { text: 'цуцлах' }, { text: 'Cancel' }]) {
    const result = advance({ state: 'term', draft }, input);
    assert.equal(result.session, null);
    assert.equal(result.action, 'cancel');
  }
  assert.equal(advance({ state: 'product', draft: {} }, { text: 'Кредит карт' }).session.draft.productKey, 'credit_card');
  assert.deepEqual(advance({ state: 'idle' }, { text: 'x' }), { session: null, messages: [], action: null });
  assert.deepEqual(advance(null, { text: 'x' }), { session: null, messages: [], action: null });
  assert.equal(startApplication({ postId: '../evil' }).session.postId, '', 'invalid post id is dropped');
});

// ---------- LoanRequest creation shape ----------
const config = { productKey: 'cons_loan', version: 3, isActive: true, defaultAssigneeId: '' };
const validInput = { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд', phone: '99001234', amount: 5000000, term: 12, psid: PSID, postId: '123_456' };

test('LoanRequest shape: task-v1, taskStatus new, channel messenger, snapshot + answers, no legacy workflow writes', () => {
  const doc = buildMessengerTaskDoc({ input: validateMessengerInput(validInput), config, at: NOW, productName: 'Хэрэглээний зээл' });
  assert.equal(doc.formVersion, 'task-v1');
  assert.equal(doc.intakeVersion, 'quick-v1');
  assert.equal(doc.taskStatus, 'new');
  assert.equal(doc.status, 'pending');
  assert.equal(doc.channel, 'messenger');
  assert.equal(doc.source, 'web', 'legacy source enum is not widened');
  assert.deepEqual(doc.messenger, { psid: PSID, postId: '123_456' });
  assert.equal(doc.assignee, undefined);
  assert.equal(doc.taskRevision, 0);
  assert.equal(doc.workflowRevision, undefined);
  assert.equal(doc.createdByStaff, false);
  assert.deepEqual([doc.selectedProduct, doc.userType, doc.lastname, doc.firstname, doc.phone, doc.amount, doc.term], ['cons_loan', 'individual', 'Бат', 'Болд', '99001234', 5000000, 12]);
  assert.deepEqual(doc.taskAnswers, { full_name: { lastName: 'Бат', firstName: 'Болд' }, phone: '99001234', loan_amount: 5000000, loan_term: 12 });
  assert.deepEqual(doc.taskForm.steps[0].fields.map(field => field.key), ['full_name', 'phone', 'loan_amount', 'loan_term']);
  assert.equal(doc.taskForm.productName, 'Хэрэглээний зээл');
  assert.equal(doc.taskForm.configVersion, 3);
  assert.equal(doc.taskHistory[0].type, 'created');
  assert.equal(doc.taskHistory[0].actor.system, true);
  assert.equal(doc.applicationData.consents.dataProcessing, true);
  assert.equal(doc.applicationData.intake.channel, 'messenger');
  assert.equal(deriveTaskState(doc).taskStatus, 'new');
  const noPost = buildMessengerTaskDoc({ input: validateMessengerInput({ ...validInput, postId: '' }), config, at: NOW, productName: 'x' });
  assert.deepEqual(noPost.messenger, { psid: PSID });
});

test('LoanRequest shape: default assignee makes it assigned; list DTO exposes channel but never the psid', () => {
  const assignee = { userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Сараа' };
  const doc = buildMessengerTaskDoc({ input: validateMessengerInput(validInput), config, assignee, at: NOW, productName: 'Хэрэглээний зээл' });
  assert.equal(doc.taskStatus, 'assigned');
  assert.equal(doc.status, 'assigned');
  assert.deepEqual(doc.assignee, assignee);
  assert.deepEqual(doc.taskHistory.map(item => item.type), ['created', 'assigned']);
  const item = toTaskListItem({ _id: 'abc', ...doc });
  assert.equal(item.channel, 'messenger');
  assert.equal(item.isTaskForm, true);
  assert.equal(JSON.stringify(item).includes(PSID), false);
  assert.equal(JSON.stringify(item).includes('psid'), false);
  assert.equal(toTaskListItem({ _id: 'w', formVersion: 'task-v1', taskStatus: 'new' }).channel, 'web');
  assert.equal(JSON.stringify(stripTaskSecrets({ _id: 'x', messenger: { psid: PSID, postId: 'p' } })).includes(PSID), false);
  assert.deepEqual(stripTaskSecrets({ messenger: { psid: PSID, postId: 'p' } }).messenger, { postId: 'p' });
  assert.ok(Object.hasOwn(LOAN_TASK_SCHEMA_FIELDS, 'channel') && Object.hasOwn(LOAN_TASK_SCHEMA_FIELDS, 'messenger'));
  assert.deepEqual(sanitizeLegacyLoanWrite({ channel: 'messenger', 'messenger.psid': '1', phone: '99001234' }), { phone: '99001234' }, 'legacy writes cannot forge channel/psid');
  assert.deepEqual(CHANNELS, ['web', 'messenger']);
});

test('validateMessengerInput rejects bad phone/amount/term/product/psid/post id', () => {
  for (const patch of [{ phone: '123' }, { phone: 99001234 }, { amount: 0 }, { amount: 1.5 }, { amount: 1e13 }, { term: 0 }, { term: 121 }, { term: 1.5 }, { productKey: 'nope' }, { psid: 'abc' }, { psid: '' }, { postId: '../x' }, { firstname: '' }]) {
    assert.throws(() => validateMessengerInput({ ...validInput, ...patch }), error => error.status === 400 && error.code === 'INVALID_INPUT', JSON.stringify(patch));
  }
  assert.throws(() => validateMessengerInput(null), /Мэдээллээ шалгана уу/);
  assert.equal(validateMessengerInput({ ...validInput, postId: '' }).postId, '');
});

// ---------- rate limit ----------
test('rate limit: 3 per hour per PSID, window resets, PSIDs independent', () => {
  let t = 1000;
  const limiter = createPsidLimiter({ now: () => t });
  assert.deepEqual([1, 2, 3, 4].map(() => limiter.take('a')), [true, true, true, false]);
  assert.equal(limiter.take('b'), true);
  t += 3600 * 1000 + 1;
  assert.equal(limiter.take('a'), true);
  const capped = createPsidLimiter({ cap: 1 });
  assert.equal(capped.take('x'), true);
  assert.equal(capped.take('y'), false, 'bounded memory');
});

// ---------- service: conversation over the webhook ----------
test('in-chat application over Messenger events creates exactly one request and confirms with a reference + doc link', async () => {
  const { messenger, axios, store, requests } = makeMessenger();
  for (const e of [postback('apply:123_456'), quick('product:cons_loan'), say('Бат Болд'), say('99001234'), say('5 сая'), say('12'), quick('confirm')]) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд', phone: '99001234', amount: 5000000, term: 12, psid: PSID, postId: '123_456' });
  assert.equal(store.map.size, 0, 'session cleared');
  assert.ok(texts(axios).some(text => text.includes('SCM-2026-ABC123')));
  const last = sent(axios).at(-1).attachment.payload;
  assert.equal(last.template_type, 'button');
  assert.equal(last.buttons[0].url, 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger');
  assert.ok(axios.calls.post.every(call => call.url.endsWith('/me/messages')), 'no other Graph writes');
  assert.ok(axios.calls.post.every(call => call.data.messaging_type === 'RESPONSE' && call.data.recipient.id === PSID));
});

test('validation errors are reported in chat and nothing is created', async () => {
  const { messenger, axios, store, requests } = makeMessenger();
  for (const e of [say('Зээлийн хүсэлт'), quick('product:cons_loan'), say('Болд'), say('Бат Болд'), say('123'), say('99001234'), say('1'), say('5 сая'), say('999')]) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal(requests.length, 0);
  assert.equal((await store.get(PSID)).state, 'term');
  const all = texts(axios).join('\n');
  assert.match(all, /Овог, нэрээ хоёуланг/);
  assert.match(all, /8 оронтой байх ёстой/);
  assert.match(all, /Дүн буруу байна/);
  assert.match(all, /Хугацаа 1–120 сар/);
});

test('rate limit blocks the 4th submission from the same PSID without creating a request', async () => {
  const { messenger, axios, requests } = makeMessenger();
  const flow = [postback('apply'), quick('product:cons_loan'), say('Бат Болд'), say('99001234'), say('5 сая'), say('12'), quick('confirm')];
  for (let round = 0; round < 4; round += 1) for (const e of flow) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal(requests.length, 3);
  assert.match(texts(axios).at(-1), /хязгаарт хүрсэн/);
});

test('request creation failure keeps the draft at confirm and shows a fallback; retry succeeds', async () => {
  let fail = true;
  const requests = [];
  const { messenger, axios, store } = makeMessenger({ createRequest: async input => { if (fail) throw Object.assign(new Error('db'), { status: 503 }); requests.push(input); return { applicationReference: 'SCM-2026-ZZZZZZ' }; } });
  for (const e of [postback('apply'), quick('product:biz_loan'), say('Бат Болд'), say('99001234'), say('5 сая'), say('12'), quick('confirm')]) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal((await store.get(PSID)).state, 'confirm');
  assert.match(texts(axios).at(-1), /бүртгэж чадсангүй/);
  fail = false;
  await messenger.handleEntry({ id: '111', messaging: [quick('confirm')] });
  assert.equal(requests.length, 1);
  assert.equal(await store.get(PSID), null);
});

test('restart/menu abort the flow and show the welcome node; contact goes to legacy chat; back goes one step inside the flow', async () => {
  const { messenger, axios, store } = makeMessenger({ content: CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [postback('apply'), quick('product:cons_loan'), say('Бат Болд')] });
  assert.equal((await store.get(PSID)).state, 'phone');
  await messenger.handleEntry({ id: '111', messaging: [postback('back')] });
  assert.equal((await store.get(PSID)).state, 'name');
  await messenger.handleEntry({ id: '111', messaging: [postback('restart')] });
  assert.equal(await store.get(PSID), null, 'restart clears the session');
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 0);
  const welcome = sent(axios).at(-1);
  assert.match(welcome.text, /Солонго Капитал/);
  assert.deepEqual(welcome.quick_replies.map(reply => reply.payload), ['loans', 'trust', 'ads', 'payment']);
  await messenger.handleEntry({ id: '111', messaging: [postback('contact'), postback('back'), say('Хүү хэд вэ?')] });
  const chats = axios.calls.post.filter(call => call.url.endsWith('/api/chat'));
  assert.deepEqual(chats.map(call => call.data.message), ['contact', 'back', 'Хүү хэд вэ?']);
  assert.equal(chats[0].data.sessionId, `fb_${PSID}`);
  assert.ok(texts(axios).includes('Сайн байна уу'));
  await messenger.handleEntry({ id: '111', messaging: [say('Төлөлт хийх')] });
  assert.match(texts(axios).at(-1), /Хаан банк/, 'typed menu titles behave like the buttons');
});

test('free text: legacy reply truncated to 600 chars, followed by [Зээл][Итгэлцэл][Цэс]; no carousels; ACTION token and failures handled', async () => {
  let reply = { reply: 'Тооцоолол [ACTION: loan_request]' };
  const ax = fakeAxios();
  const originalPost = ax.post.bind(ax);
  ax.post = async (url, data, options) => (url.endsWith('/api/chat') ? (ax.calls.post.push({ url, data, options }), { data: reply }) : originalPost(url, data, options));
  const { messenger } = makeMessenger({ axios: ax });
  await messenger.handleEntry({ id: '111', messaging: [say('a')] });
  assert.match(texts(ax).at(-1), /Зээлийн хүсэлт: https:\/\/www\.scm\.mn\/loan-request/);
  assert.deepEqual(sent(ax).at(-1).quick_replies.map(item => [item.title, item.payload]), [['Зээл', 'loans'], ['Итгэлцэл', 'trust'], ['Цэс', 'restart']]);
  reply = { reply: 'Сонго', cards: [{ title: 'Бизнес', productUrl: '/loans/biz' }], productCard: { title: 'Карт' } };
  await messenger.handleEntry({ id: '111', messaging: [say('b')] });
  assert.equal(sent(ax).at(-1).text, 'Сонго');
  assert.ok(sent(ax).every(message => !message.attachment), 'no long product carousels');
  reply = { reply: `${'я'.repeat(2000)} [ACTION: loan_request]` };
  await messenger.handleEntry({ id: '111', messaging: [say('c')] });
  const long = sent(ax).at(-1).text;
  assert.ok(long.length <= 600);
  assert.match(long, /loan-request$/, 'link kept inside the limit');
  assert.deepEqual(stripChatControlTokens('Х [OPTIONS: а, б] [ACTION: loan_request]'), { cleanText: 'Х', options: ['а', 'б'], action: 'loan_request' });
  const broken = fakeAxios();
  broken.post = async url => { if (url.endsWith('/api/chat')) throw new Error('chat down'); broken.calls.post.push({ url }); return { data: {} }; };
  const failing = makeMessenger({ axios: broken });
  await failing.messenger.handleEntry({ id: '111', messaging: [say('x')] });
  assert.equal(broken.calls.post.length, 1, 'fallback apology sent');
});

test('node adapter: generic template <=10 cards, <=3 buttons, title/subtitle <=80; quick replies <=13, title <=20, on the last message', () => {
  const cards = Array.from({ length: 12 }, (_, i) => ({ title: 'я'.repeat(120), subtitle: 'ю'.repeat(120), imageUrl: 'https://x/y.png', buttons: [
    { kind: 'postback', title: 'Нэг '.repeat(10), payload: `terms:k${i}` }, { kind: 'url', title: 'Хоёр', url: 'https://www.scm.mn/calculator' },
    { kind: 'postback', title: 'Гурав', payload: 'a' }, { kind: 'postback', title: 'Дөрөв', payload: 'b' }] }));
  const replies = Array.from({ length: 20 }, (_, i) => ({ title: 'ы'.repeat(30), payload: `p${i}` }));
  const messages = nodeToMessengerMessages({ text: 'Мэндчилгээ', cards, quickReplies: replies });
  assert.equal(messages.length, 2, 'text and template are separate messages');
  assert.equal(messages[0].quick_replies, undefined);
  const elements = messages[1].attachment.payload.elements;
  assert.equal(messages[1].attachment.payload.template_type, 'generic');
  assert.equal(elements.length, 10);
  assert.ok(elements.every(el => el.title.length <= 80 && el.subtitle.length <= 80 && el.buttons.length === 3 && el.buttons.every(b => b.title.length <= 20)));
  assert.deepEqual(elements[0].buttons.map(b => b.type), ['postback', 'web_url', 'postback']);
  assert.equal(elements[0].buttons[1].url, 'https://www.scm.mn/calculator');
  assert.equal(messages[1].quick_replies.length, 13);
  assert.ok(messages[1].quick_replies.every(reply => reply.title.length <= 20 && reply.content_type === 'text'));
  assert.deepEqual(nodeToMessengerMessages({ text: 'x', quickReplies: [{ title: 'А', payload: 'a' }] }), [{ text: 'x', quick_replies: [{ content_type: 'text', title: 'А', payload: 'a' }] }]);
  assert.equal(nodeToMessengerMessages({}).length, 1, 'empty node still yields a fallback text');
  assert.ok(nodeToMessengerMessages({ text: 'я'.repeat(5000) }).every(message => message.text.length <= 1900));
});

test('menu payloads send nodes: loans carousel, terms text, trust, payment, ads; a node interrupts the application', async () => {
  const posts = [{ id: 'p_1', message: 'Зар\nдэлгэрэнгүй', permalink_url: 'https://www.facebook.com/p/1' }];
  const { messenger, axios, store } = makeMessenger({ content: CONTENT, axios: fakeAxios({ posts }) });
  await messenger.handleEntry({ id: '111', messaging: [postback('loans')] });
  const loans = sent(axios).at(-1).attachment.payload.elements;
  assert.deepEqual(loans.map(el => el.title), ['Хэрэглээний зээл']);
  assert.deepEqual(loans[0].buttons.map(b => b.payload || b.url), ['terms:cons_loan', 'apply:cons_loan', 'https://www.scm.mn/calculator?product=cons_loan&source=messenger']);
  await messenger.handleEntry({ id: '111', messaging: [quick('terms:cons_loan')] });
  assert.match(texts(axios).at(-1), /Иргэн/);
  await messenger.handleEntry({ id: '111', messaging: [postback('trust')] });
  assert.deepEqual(sent(axios).at(-1).attachment.payload.elements[0].buttons.map(b => b.url), ['https://www.scm.mn/trust-request?source=messenger', 'https://www.scm.mn/trust-calculator?source=messenger']);
  await messenger.handleEntry({ id: '111', messaging: [postback('ads')] });
  assert.deepEqual(sent(axios).at(-1).attachment.payload.elements[0].buttons.map(b => b.payload || b.url), ['https://www.facebook.com/p/1', 'apply:post:p_1']);
  await messenger.handleEntry({ id: '111', messaging: [postback('payment')] });
  assert.match(texts(axios).at(-1), /Хаан банк/);
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:cons_loan'), postback('loans')] });
  assert.equal(await store.get(PSID), null, 'a menu node interrupts the in-chat application');
  assert.ok(axios.calls.post.every(call => /\/me\/messages$/.test(call.url)), 'read-only toward the Page');
});

test('apply:<productKey> starts the in-chat application with the product preselected; apply:post:<id> keeps the post', async () => {
  const { messenger, axios, store, requests } = makeMessenger({ content: CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:cons_loan')] });
  assert.deepEqual(await store.get(PSID), { state: 'name', draft: { productKey: 'cons_loan' }, postId: '' });
  assert.match(texts(axios).join('\n'), /Хэрэглээний зээл/);
  for (const e of [say('Бат Болд'), say('99001234'), say('5 сая'), say('12'), quick('confirm')]) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal(requests[0].productKey, 'cons_loan');
  assert.equal(requests[0].postId, '');
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:post:p_9')] });
  assert.deepEqual(await store.get(PSID), { state: 'product', draft: {}, postId: 'p_9' });
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:car_loan')] });
  assert.equal((await store.get(PSID)).draft.productKey, 'car_purchase_loan', 'car_loan content key maps to the purchase product');
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:unknown_key')] });
  assert.equal((await store.get(PSID)).state, 'product', 'unknown key falls back to the product step');
  assert.equal(startApplication({ productKey: 'cons_loan' }).session.state, 'name');
  assert.equal(startApplication({ productKey: 'nope' }).session.state, 'product');
});

test('Zentro page guard, echoes, duplicate mids and bad senders are ignored', async () => {
  const { messenger, axios } = makeMessenger({ env: { ZENTRO_FB_PAGE_ID: '999' } });
  await messenger.handleEntry({ id: '999', messaging: [say('hello')] });
  await messenger.handleEntry({ id: '111', messaging: [event({ message: { text: 'x', is_echo: true } }), event({ message: { text: 'x' } }, 'abc'), event({}), event({ message: { text: '  ' } })] });
  assert.equal(axios.calls.post.length, 0);
  const dup = event({ message: { mid: 'm1', text: 'Хүү' } });
  await messenger.handleEntry({ id: '111', messaging: [dup, dup] });
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 1);
});

test('Page posts: carousel + detail text + apply from a post; cached 5 minutes; stale served on Graph failure; read-only', async () => {
  const long = `Гарчиг\n${'Урт текст '.repeat(300)}`;
  const posts = [{ id: 'p_1', message: long, full_picture: 'https://x/y.jpg', permalink_url: 'https://www.facebook.com/p/1' }, { id: 'p_2', message: 'Хоёр' }];
  const { messenger, axios, clock, requests } = makeMessenger({ axios: fakeAxios({ posts }) });
  await messenger.handleEntry({ id: '111', messaging: [postback('posts')] });
  const elements = sent(axios).at(-1).attachment.payload.elements;
  assert.deepEqual(elements.map(element => element.title), ['Гарчиг', 'Хоёр']);
  await messenger.handleEntry({ id: '111', messaging: [postback('detail:p_1')] });
  const detailTexts = texts(axios).slice(-2);
  assert.ok(detailTexts.every(text => text.length <= 1900));
  const lastDetail = sent(axios).at(-1);
  assert.deepEqual(lastDetail.quick_replies.map(reply => [reply.title, reply.payload]), [['Зээлийн хүсэлт өгөх', 'apply:p_1'], ['Сайт дээр бөглөх', 'site'], ['Цэс', 'menu']]);
  await messenger.handleEntry({ id: '111', messaging: [postback('detail:nope')] });
  assert.match(texts(axios).at(-1), /олдсонгүй/);
  assert.equal(axios.calls.get.filter(call => call.url.endsWith('/me/posts')).length, 1, 'cached');
  assert.deepEqual(axios.calls.get[0].params.fields, 'id,message,full_picture,permalink_url,created_time');
  clock.t += 5 * 60 * 1000 + 1;
  await messenger.handleEntry({ id: '111', messaging: [postback('posts')] });
  assert.equal(axios.calls.get.filter(call => call.url.endsWith('/me/posts')).length, 2, 'refreshed after TTL');
  // Graph failure after TTL: stale copy is served
  const failing = makeMessenger({ axios: fakeAxios({ posts }) });
  await failing.messenger.getPosts();
  failing.axios.get = async () => { throw new Error('down'); };
  failing.clock.t += 10 * 60 * 1000;
  assert.equal((await failing.messenger.getPosts()).length, 2);
  // applying from a post stores the post id on the request
  for (const e of [postback('apply:p_2'), quick('product:cons_loan'), say('Бат Болд'), say('99001234'), say('5 сая'), say('12'), quick('confirm')]) await messenger.handleEntry({ id: '111', messaging: [e] });
  assert.equal(requests[0].postId, 'p_2');
  // read-only: no call ever targets the feed or any post-creating edge
  assert.ok(axios.calls.post.every(call => /\/me\/messages$/.test(call.url)));
});

test('graph client blocks every write path except me/messages and me/messenger_profile (no publishing)', async () => {
  const axios = fakeAxios();
  const graph = createGraphClient({ axios, env: { FB_PAGE_ACCESS_TOKEN: TOKEN } });
  for (const path of ['me/feed', 'me/photos', '111/feed', 'me/videos', 'me/messages/../feed']) {
    await assert.rejects(() => graph.post(path, { message: 'x' }), error => error instanceof GraphError && !error.message.includes(TOKEN));
  }
  assert.equal(axios.calls.post.length, 0);
  await graph.post('me/messages', { a: 1 });
  await graph.post('me/messenger_profile', { a: 1 });
  assert.equal(axios.calls.post.length, 2);
});

// ---------- status / profile ----------
test('status reports page match, webhook subscription, profile and shared callback expectation without leaking secrets', async () => {
  const profile = { get_started: { payload: 'restart' }, persistent_menu: buildMessengerProfile().persistent_menu };
  const { messenger } = makeMessenger({
    axios: fakeAxios({ profile }),
    env: { FB_APP_SECRET: APP_SECRET, ZENTRO_META_APP_SECRET: 'zentro-secret-value', ZENTRO_FB_PAGE_ID: '999', PUBLIC_API_BASE_URL: 'https://api.scm.mn' },
  });
  const status = await messenger.status();
  assert.deepEqual([status.tokenConfigured, status.verifyTokenConfigured, status.appSecretConfigured], [true, true, true]);
  assert.deepEqual(status.page, { id: '111', name: 'Солонго Капитал' });
  assert.equal(status.matchesExpected, true);
  assert.equal(status.webhookSubscribed, true);
  assert.deepEqual(status.subscribedFields, ['messages', 'messaging_postbacks']);
  assert.equal(status.messengerProfileOk, true);
  assert.equal(status.isZentroPage, false);
  assert.equal(status.callback.expectedPath, '/api/zentro/facebook/webhook');
  assert.equal(status.callback.expectedUrl, 'https://api.scm.mn/api/zentro/facebook/webhook');
  assert.equal(status.callback.sharedSecretConfigured, true);
  const json = JSON.stringify(status);
  for (const secret of [TOKEN, APP_SECRET, VERIFY, 'zentro-secret-value']) assert.equal(json.includes(secret), false, 'secret leaked');
});

test('status: token missing, invalid token (no leak), wrong or Zentro page, custom expected page', async () => {
  const none = makeMessenger({ env: { FB_PAGE_ACCESS_TOKEN: '' } });
  const missing = await none.messenger.status();
  assert.deepEqual([missing.tokenConfigured, missing.page, missing.matchesExpected, missing.webhookSubscribed, missing.messengerProfileOk], [false, null, false, false, false]);
  assert.equal(none.axios.calls.get.length, 0);
  const bad = await makeMessenger({ axios: fakeAxios({ failGet: true }) }).messenger.status();
  assert.equal(bad.error, 'TOKEN_INVALID');
  assert.equal(bad.page, null);
  assert.equal(JSON.stringify(bad).includes(TOKEN), false);
  const other = await makeMessenger({ axios: fakeAxios({ page: { id: '5', name: 'Бусад', username: 'other.page' } }) }).messenger.status();
  assert.equal(other.matchesExpected, false);
  const zentro = await makeMessenger({ axios: fakeAxios({ page: { id: '999', name: 'AMM', username: 'Solongo.Capital' } }), env: { ZENTRO_FB_PAGE_ID: '999' } }).messenger.status();
  assert.deepEqual([zentro.isZentroPage, zentro.matchesExpected], [true, false]);
  const byId = await makeMessenger({ axios: fakeAxios({ page: { id: '777', name: 'X' } }), env: { FB_EXPECTED_PAGE: '777' } }).messenger.status();
  assert.equal(byId.matchesExpected, true);
  const unsub = await makeMessenger({ axios: fakeAxios({ subscribed: [] }) }).messenger.status();
  assert.equal(unsub.webhookSubscribed, false);
});

test('configureProfile posts the §18 menu; skips without token and for the Zentro page; reports Graph errors without tokens', async () => {
  const ok = makeMessenger();
  assert.deepEqual(await ok.messenger.configureProfile(), { ok: true });
  const call = ok.axios.calls.post.find(item => item.url.endsWith('/me/messenger_profile'));
  assert.deepEqual(call.data, buildMessengerProfile());
  assert.equal(call.options.params.access_token, TOKEN, 'token only goes to Graph');
  assert.deepEqual(await makeMessenger({ env: { FB_PAGE_ACCESS_TOKEN: '' } }).messenger.configureProfile(), { ok: false, skipped: true, reason: 'TOKEN_MISSING' });
  const zentro = makeMessenger({ axios: fakeAxios({ page: { id: '999' } }), env: { ZENTRO_FB_PAGE_ID: '999' } });
  assert.deepEqual(await zentro.messenger.configureProfile(), { ok: false, skipped: true, reason: 'ZENTRO_PAGE' });
  assert.equal(zentro.axios.calls.post.length, 0);
  const failing = fakeAxios();
  failing.post = async () => { throw Object.assign(new Error(TOKEN), { response: { status: 400, data: { error: { code: 10 } } } }); };
  const result = await makeMessenger({ axios: failing }).messenger.configureProfile();
  assert.deepEqual(result, { ok: false, reason: 'GRAPH_ERROR', fbCode: 10 });
});

// ---------- routes ----------
function routeHarness({ env = {}, axios, messenger: custom, logs = [] } = {}) {
  const made = custom ? { messenger: custom } : makeMessenger({ env, axios });
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const requireAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden' }));
  registerScmMessengerRoutes({ app, authenticateUser: (_req, _res, next) => next(), requireAdmin, createLog: async (_user, action, details) => { logs.push({ action, details }); }, messenger: made.messenger, logger: { error() {} } });
  const invoke = async (method, path, req = {}) => {
    let finish;
    const done = new Promise(resolve => { finish = resolve; });
    const response = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; finish(this); return this; }, send(data) { this.data = data; finish(this); return this; }, sendStatus(code) { this.code = code; finish(this); return this; } };
    const handlers = routes.get(`${method}:${path}`);
    assert.ok(handlers, `route ${method}:${path}`);
    const request = { user: { role: 'admin', name: 'A' }, query: {}, body: {}, headers: {}, protocol: 'https', get(name) { return this.headers[name.toLowerCase()] || (name === 'host' ? 'api.test' : undefined); }, ...req };
    const run = index => handlers[index](request, response, () => run(index + 1));
    await run(0);
    return done;
  };
  return { ...made, invoke, logs };
}

test('webhook GET verification uses FB_VERIFY_TOKEN', async () => {
  const h = routeHarness();
  const ok = await h.invoke('get', '/api/messenger/webhook', { query: { 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY, 'hub.challenge': '4242' } });
  assert.deepEqual([ok.code, ok.data], [200, '4242']);
  for (const query of [{ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '1' }, { 'hub.mode': 'subscribe', 'hub.challenge': '1' }, { 'hub.verify_token': VERIFY }, {}]) {
    assert.equal((await h.invoke('get', '/api/messenger/webhook', { query })).code, 403);
  }
  assert.equal((await routeHarness({ env: { FB_VERIFY_TOKEN: '', MESSENGER_VERIFY_TOKEN: '' } }).invoke('get', '/api/messenger/webhook', { query: { 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1' } })).code, 403, 'unset token never matches empty');
});

test('webhook POST: signature enforced when FB_APP_SECRET is set; legacy unsigned flow kept otherwise; non-page 404', async () => {
  const bodyObject = { object: 'page', entry: [{ id: '111', messaging: [say('Хүү хэд вэ?')] }] };
  const raw = Buffer.from(JSON.stringify(bodyObject));
  const signed = routeHarness({ env: { FB_APP_SECRET: APP_SECRET } });
  assert.equal((await signed.invoke('post', '/api/messenger/webhook', { body: bodyObject, rawBody: raw, headers: { 'x-hub-signature-256': sign(raw, 'wrong') } })).code, 401);
  assert.equal((await signed.invoke('post', '/api/messenger/webhook', { body: bodyObject, headers: {} })).code, 401, 'missing raw body/header');
  assert.equal(signed.axios.calls.post.length, 0);
  const accepted = await signed.invoke('post', '/api/messenger/webhook', { body: bodyObject, rawBody: raw, headers: { 'x-hub-signature-256': sign(raw) } });
  assert.equal(accepted.code, 200);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(signed.axios.calls.post.some(call => call.url === 'https://api.test/api/chat' || call.url.endsWith('/api/chat')));
  const legacy = routeHarness({ env: { PUBLIC_API_BASE_URL: '' } });
  assert.equal((await legacy.invoke('post', '/api/messenger/webhook', { body: bodyObject })).code, 200);
  assert.equal((await legacy.invoke('post', '/api/messenger/webhook', { body: { object: 'user' } })).code, 404);
  const guarded = routeHarness({ env: { FB_APP_SECRET: APP_SECRET, ZENTRO_FB_PAGE_ID: '111' } });
  await guarded.invoke('post', '/api/messenger/webhook', { body: bodyObject, rawBody: raw, headers: { 'x-hub-signature-256': sign(raw) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(guarded.axios.calls.post.length, 0, 'Zentro page entries are never handled by SCM');
});

test('admin endpoints: admin only; status never leaks token; profile reconfigure is logged', async () => {
  const profile = { get_started: { payload: 'restart' }, persistent_menu: buildMessengerProfile().persistent_menu };
  const h = routeHarness({ env: { FB_APP_SECRET: APP_SECRET }, axios: fakeAxios({ profile }) });
  const employee = { role: 'employee' };
  assert.equal((await h.invoke('get', '/api/admin/facebook/status', { user: employee })).code, 403);
  assert.equal((await h.invoke('post', '/api/admin/facebook/messenger-profile', { user: employee })).code, 403);
  assert.equal(h.axios.calls.get.length, 0);
  const status = await h.invoke('get', '/api/admin/facebook/status');
  assert.equal(status.code, 200);
  assert.equal(status.headers['Cache-Control'], 'no-store');
  for (const secret of [TOKEN, APP_SECRET, VERIFY]) assert.equal(JSON.stringify(status.data).includes(secret), false);
  assert.equal(status.data.matchesExpected, true);
  const done = await h.invoke('post', '/api/admin/facebook/messenger-profile');
  assert.deepEqual([done.code, done.data], [200, { ok: true }]);
  assert.deepEqual(h.logs.at(-1), { action: 'facebook_messenger_profile', details: 'ok' });
  const noToken = routeHarness({ env: { FB_PAGE_ACCESS_TOKEN: '' } });
  const missing = await noToken.invoke('post', '/api/admin/facebook/messenger-profile');
  assert.deepEqual([missing.code, missing.data.code], [503, 'TOKEN_MISSING']);
  const failing = fakeAxios();
  failing.post = async () => { throw Object.assign(new Error(TOKEN), { response: { status: 400, data: { error: { code: 200 } } } }); };
  const bad = await routeHarness({ axios: failing }).invoke('post', '/api/admin/facebook/messenger-profile');
  assert.equal(bad.code, 502);
  assert.equal(JSON.stringify(bad.data).includes(TOKEN), false);
});

// ---------- shared Meta app callback (D18.2) ----------
test('partitionEntries splits other Pages from the Zentro Page; unchanged without a configured id or entry id', () => {
  const entries = [{ id: '999', messaging: [1] }, { id: '111', messaging: [2] }, { messaging: [3] }];
  assert.deepEqual(partitionEntries(entries, '999'), { own: [entries[0], entries[2]], foreign: [entries[1]] });
  assert.deepEqual(partitionEntries(entries, ''), { own: entries, foreign: [] });
  assert.deepEqual(partitionEntries(undefined, '999'), { own: [], foreign: [] });
});

test('shared webhook forwarder: Zentro entry stays on the Zentro path; other Page entry goes to the SCM handler; unsigned payloads untouched', async () => {
  const handled = [];
  const messenger = { handleEntry: async (entry, ctx) => { handled.push({ entry, ctx }); } };
  const env = { ZENTRO_FB_PAGE_ID: '999', ZENTRO_META_APP_SECRET: APP_SECRET };
  const forward = createSharedWebhookForwarder({ messenger, env, logger: { error() {} } });
  const zentroEntry = { id: '999', messaging: [{ message: { text: 'машин' } }] };
  const scmEntry = { id: '111', messaging: [say('Зээл')] };
  const run = (body, { secret = APP_SECRET, header } = {}) => {
    const raw = Buffer.from(JSON.stringify(body));
    const req = { body, rawBody: raw, protocol: 'https', headers: {}, get(name) { return name === 'host' ? 'api.test' : (header ?? sign(raw, secret)); } };
    let nexted = 0;
    forward(req, {}, () => { nexted += 1; });
    return { req, nexted };
  };
  const only = run({ object: 'page', entry: [zentroEntry] });
  assert.equal(only.nexted, 1);
  assert.deepEqual(only.req.body.entry, [zentroEntry]);
  const mixedBody = { object: 'page', entry: [zentroEntry, scmEntry] };
  const mixed = run(mixedBody);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mixed.nexted, 1);
  assert.deepEqual(mixed.req.body, { object: 'page', entry: [zentroEntry] }, 'Zentro sees only its own entry');
  assert.deepEqual(handled.map(item => item.entry), [scmEntry]);
  assert.equal(handled[0].ctx.baseUrl, 'https://api.test');
  assert.deepEqual(mixedBody.entry, [zentroEntry, scmEntry], 'original body object is not mutated');
  // other-Page-only payload: Zentro handler receives no entries
  handled.length = 0;
  const foreignOnly = run({ object: 'page', entry: [scmEntry] });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(foreignOnly.req.body.entry, []);
  assert.equal(handled.length, 1);
  // bad signature: nothing is forwarded and the body is untouched (Zentro rejects with 401 itself)
  handled.length = 0;
  const forged = run({ object: 'page', entry: [scmEntry] }, { secret: 'attacker' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(forged.nexted, 1);
  assert.deepEqual(forged.req.body.entry, [scmEntry]);
  assert.equal(handled.length, 0);
  // no Zentro page id configured -> behaviour unchanged
  const unconfigured = createSharedWebhookForwarder({ messenger, env: { ZENTRO_META_APP_SECRET: APP_SECRET }, logger: { error() {} } });
  const raw = Buffer.from('{}');
  const req = { body: { object: 'page', entry: [scmEntry] }, rawBody: raw, headers: {}, get: () => sign(raw) };
  unconfigured(req, {}, () => {});
  assert.deepEqual(req.body.entry, [scmEntry]);
  assert.equal(handled.length, 0);
  // handler failures never break the request
  const boom = createSharedWebhookForwarder({ messenger: { handleEntry: async () => { throw new Error('x'); } }, env, logger: { error() {} } });
  const bodyBoom = { object: 'page', entry: [scmEntry] };
  const rawBoom = Buffer.from(JSON.stringify(bodyBoom));
  let ok = 0;
  boom({ body: bodyBoom, rawBody: rawBoom, headers: {}, protocol: 'https', get: () => sign(rawBoom) }, {}, () => { ok += 1; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ok, 1);
});
