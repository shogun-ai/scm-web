import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifySignature, buildPostElement, buildPostsCarousel, splitText, buildMessengerProfile, nodeToMessengerMessages, toMessengerButtons, createPsidLimiter, createGraphClient, createScmMessenger, registerScmMessengerRoutes, partitionEntries,
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
// seen = true: the PSID already has a (idle) session, so typed text is not treated as a first contact (D21 #1).
function makeMessenger({ env = {}, content, axios = fakeAxios(), limiter, clock = { t: NOW.getTime() }, seen = true, logger = { error() {}, warn() {} } } = {}) {
  const store = memoryStore();
  if (seen) store.map.set(PSID, { state: 'idle', draft: {}, postId: '' });
  const messenger = createScmMessenger({
    content, axios, env: { FB_PAGE_ACCESS_TOKEN: TOKEN, FB_VERIFY_TOKEN: VERIFY, PUBLIC_API_BASE_URL: 'http://api.test', ...env }, sessionStore: store,
    rateLimiter: limiter, now: () => clock.t, logger,
  });
  return { messenger, axios, store, clock };
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

test('messenger profile has no greeting / ice_breakers (D21 #8); configureProfile posts only get_started + persistent_menu', async () => {
  const profile = buildMessengerProfile();
  assert.deepEqual(Object.keys(profile).sort(), ['get_started', 'persistent_menu']);
  const custom = makeMessenger({ content: { ...CONTENT, loadSetting: async key => (key === 'bot_greeting_text' ? 'Хуучин мэндчилгээ' : undefined) } });
  assert.deepEqual(await custom.messenger.configureProfile(), { ok: true });
  const posted = custom.axios.calls.post.find(item => item.url.endsWith('/me/messenger_profile')).data;
  assert.equal(posted.greeting, undefined);
  assert.equal(posted.ice_breakers, undefined);
  assert.equal(posted.persistent_menu[0].call_to_actions.length, 7);
  assert.equal(JSON.stringify(posted).includes('Хуучин'), false, 'a stored greeting is ignored');
});

test('persistent menu per §21: 7 postbacks incl. Холбоо барих; get started = restart', () => {
  const profile = buildMessengerProfile();
  assert.deepEqual(profile.get_started, { payload: 'restart' });
  const items = profile.persistent_menu[0].call_to_actions;
  assert.deepEqual(items.map(item => [item.type, item.title, item.payload]), [
    ['postback', 'Дахин эхлүүлэх', 'restart'], ['postback', 'Зээл', 'loans'], ['postback', 'Итгэлцэл', 'trust'],
    ['postback', 'Идэвхтэй зээлийн зар', 'ads'], ['postback', 'Төлөлт хийх', 'payment'], ['postback', 'Холбоо барих', 'contact'], ['postback', 'Хэл / Language', 'language'],
  ]);
  assert.ok(items.every(item => item.title.length <= 30));
});

// ---------- validators ----------
// ---------- state machine ----------
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
  assert.deepEqual(CHANNELS, ['web', 'messenger', 'webchat']);
});

test('validateMessengerInput rejects bad phone/amount/term/product/psid/post id', () => {
  for (const patch of [{ phone: '123' }, { phone: 99001234 }, { amount: 0 }, { amount: 1.5 }, { amount: 1e13 }, { term: 0 }, { term: 121 }, { term: 1.5 }, { productKey: 'nope' }, { psid: 'abc' }, { psid: '' }, { postId: '../x' }, { firstname: '' }]) {
    assert.throws(() => validateMessengerInput({ ...validInput, ...patch }), error => error.status === 400 && error.code === 'INVALID_INPUT', JSON.stringify(patch));
  }
  assert.throws(() => validateMessengerInput(null), /Мэдээллээ шалгана уу/);
  assert.equal(validateMessengerInput({ ...validInput, postId: '' }).postId, '');
});

// ---------- rate limit ----------
test('rate limit: N per hour per PSID, window resets, PSIDs independent (chat default 30)', () => {
  let t = 1000;
  const limiter = createPsidLimiter({ max: 3, now: () => t });
  assert.deepEqual([1, 2, 3, 4].map(() => limiter.take('a')), [true, true, true, false]);
  assert.equal(limiter.take('b'), true);
  t += 3600 * 1000 + 1;
  assert.equal(limiter.take('a'), true);
  const capped = createPsidLimiter({ cap: 1 });
  assert.equal(capped.take('x'), true);
  assert.equal(capped.take('y'), false, 'bounded memory');
});

// ---------- service: conversation over the webhook ----------
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

test('Zentro page guard, echoes, duplicate mids and bad senders are ignored', async () => {
  const { messenger, axios } = makeMessenger({ env: { ZENTRO_FB_PAGE_ID: '999' } });
  await messenger.handleEntry({ id: '999', messaging: [say('hello')] });
  await messenger.handleEntry({ id: '111', messaging: [event({ message: { text: 'x', is_echo: true } }), event({ message: { text: 'x' } }, 'abc'), event({}), event({ message: { text: '  ' } })] });
  assert.equal(axios.calls.post.length, 0);
  const dup = event({ message: { mid: 'm1', text: 'Хүү' } });
  await messenger.handleEntry({ id: '111', messaging: [dup, dup] });
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 1);
});

test('Page posts: carousel + detail text + apply link from a post; cached 5 minutes; stale served on Graph failure; read-only', async () => {
  const long = `Гарчиг\n${'Урт текст '.repeat(300)}`;
  const posts = [{ id: 'p_1', message: long, full_picture: 'https://x/y.jpg', permalink_url: 'https://www.facebook.com/p/1' }, { id: 'p_2', message: 'Хоёр' }];
  const { messenger, axios, clock } = makeMessenger({ axios: fakeAxios({ posts }) });
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
  // applying from a post opens the web form (nothing is collected in chat)
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:p_2')] });
  assert.equal(sent(axios).at(-1).attachment.payload.buttons[0].url, 'https://www.scm.mn/loan-request?source=messenger');
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

test('contact node -> Messenger button template with phone_number / web_url / postback buttons; call button dropped for invalid phone', () => {
  const node = { text: 'Утас: 75991919', buttons: [{ kind: 'call', title: 'Залгах', phone: '+97675991919' }, { kind: 'url', title: 'Вэбсайт', url: 'https://www.scm.mn' }, { kind: 'postback', title: 'Зээл', payload: 'loans' }], quickReplies: [{ title: 'Цэс', payload: 'restart' }] };
  const [message] = nodeToMessengerMessages(node);
  assert.equal(message.attachment.payload.template_type, 'button');
  assert.deepEqual(message.attachment.payload.buttons.map(b => [b.type, b.payload || b.url]), [['phone_number', '+97675991919'], ['web_url', 'https://www.scm.mn'], ['postback', 'loans']]);
  assert.equal(message.quick_replies[0].payload, 'restart');
  assert.deepEqual(toMessengerButtons([{ kind: 'call', title: 'Залгах', phone: '123' }, { kind: 'call', title: 'x', phone: '+97675991919' }]).map(b => b.type), ['phone_number']);
});

test('language menu: language node, lang:en placeholder, lang:mn restarts and clears the session; typed text is not affected', async () => {
  const { messenger, axios, store } = makeMessenger({ content: CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [postback('language')] });
  assert.match(texts(axios).at(-1), /Choose your language/);
  assert.deepEqual(sent(axios).at(-1).quick_replies.map(reply => reply.payload), ['lang:mn', 'lang:en']);
  await messenger.handleEntry({ id: '111', messaging: [quick('lang:en')] });
  assert.match(texts(axios).at(-1), /English version is coming soon[\s\S]*Англи хувилбар/);
  assert.deepEqual(sent(axios).at(-1).quick_replies.map(reply => reply.payload), ['restart']);
  await messenger.handleEntry({ id: '111', messaging: [postback('apply:cons_loan'), quick('lang:mn')] });
  assert.equal((await store.get(PSID))?.state, 'idle', 'lang:mn restarts');
  assert.match(texts(axios).at(-1), /Солонго Капитал/);
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 0);
});

// ---------- D21 ----------
const CMS_CONTENT = {
  async loadProducts() {
    return [
      { productKey: 'cons_loan', title: 'Хэрэглээний зээл', isActive: true, order: 1, individual: { conditions: ['Хүү 2%'], requirements: ['18 нас'] } },
      { productKey: 'heated_parking', title: 'Дулаан зогсоолын зээл', shortDesc: 'Дулаан зогсоол', isActive: true, order: 2, individual: { conditions: ['Хүү 1.9%'], requirements: ['Иргэний үнэмлэх'] } },
      { productKey: 'old_cms', title: 'Хаагдсан', isActive: false, order: 3 },
      { productKey: 'trust', title: 'Итгэлцэл', isActive: true, order: 4 },
    ];
  },
  async loadSetting() { return undefined; },
};

test('referral, opt-in and first contact restart: welcome text + menu cards carousel; no menu quick replies', async () => {
  for (const trigger of [event({ referral: { ref: 'post_cta', source: 'SHORTLINK', type: 'OPEN_THREAD' } }), event({ optin: { ref: 'x' } }), event({ postback: { payload: 'restart', referral: { ref: 'r' } } }), say('Сайн байна уу'), say('hello там')]) {
    const { messenger, axios, store } = makeMessenger({ content: CONTENT, seen: false });
    await messenger.handleEntry({ id: '111', messaging: [trigger] });
    const messages = sent(axios);
    assert.equal(messages.length, 2, JSON.stringify(trigger));
    assert.match(messages[0].text, /Солонго Капитал/);
    const cards = messages[1].attachment.payload;
    assert.equal(cards.template_type, 'generic');
    assert.deepEqual(cards.elements.map(element => element.buttons[0].payload), ['loans', 'trust', 'ads', 'payment', 'contact']);
    assert.ok(cards.elements.every(element => /^https:\/\//.test(element.image_url)), 'default image on imageless cards');
    assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 0, 'no legacy chat');
    assert.equal((await store.get(PSID)).state, 'idle', 'seen marker saved');
  }
});

test('after the first contact, free text goes to the chatbot again; a seen PSID is never restarted by typed text', async () => {
  const { messenger, axios } = makeMessenger({ content: CONTENT, seen: false });
  await messenger.handleEntry({ id: '111', messaging: [say('Сайн уу')] });
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 0);
  await messenger.handleEntry({ id: '111', messaging: [say('Хүү хэд вэ?')] });
  assert.equal(axios.calls.post.filter(call => call.url.endsWith('/api/chat')).length, 1);
  // first contact with a payload / known menu text is handled as that action, not as a restart
  const fresh = makeMessenger({ content: CONTENT, seen: false });
  await fresh.messenger.handleEntry({ id: '111', messaging: [postback('payment')] });
  assert.match(texts(fresh.axios).at(-1), /Хаан банк/);
  const typed = makeMessenger({ content: CONTENT, seen: false });
  await typed.messenger.handleEntry({ id: '111', messaging: [say('Төлөлт хийх')] });
  assert.match(texts(typed.axios).at(-1), /Хаан банк/);
  assert.equal((await typed.store.get(PSID)).state, 'idle');
  // an apply action marks the PSID as seen too (no restart on the next typed text)
  const flow = makeMessenger({ content: CONTENT, seen: false });
  await flow.messenger.handleEntry({ id: '111', messaging: [postback('apply:cons_loan'), say('Бат Болд')] });
  assert.equal((await flow.store.get(PSID)).state, 'idle');
  assert.equal(chatCalls(flow.axios).length, 1);
});

test('diagnostic logs: one PII-free line per event (kind, node, result); typed text and payload values are never logged; failures carry the code only', async () => {
  const lines = [];
  const logger = { info: line => lines.push(line), error: line => lines.push(line), warn() {} };
  const { messenger } = makeMessenger({ content: CONTENT, logger, seen: false });
  for (const e of [event({ referral: { ref: 'secret-ref-value' } }), say('Миний утас 99001234'), postback('loans'), quick('terms:cons_loan'), postback('apply:cons_loan'), say('Бат Болд'), say('Миний утас 99001234')]) {
    await messenger.handleEntry({ id: '111', messaging: [e] });
  }
  assert.deepEqual(lines, [
    '[scm-messenger] event kind=referral node=restart result=sent',
    '[scm-messenger] event kind=message node=chat result=sent',
    '[scm-messenger] event kind=postback node=loans result=sent',
    '[scm-messenger] event kind=message node=terms:cons_loan result=sent',
    '[scm-messenger] event kind=postback node=apply result=sent',
    '[scm-messenger] event kind=message node=chat result=sent',
    '[scm-messenger] event kind=message node=chat result=sent',
  ]);
  const everything = lines.join('\n');
  for (const secret of ['99001234', 'Бат', 'secret-ref-value', PSID, TOKEN, 'утас']) assert.equal(everything.includes(secret), false, secret);
  // failure: Graph rejects the send
  const failLines = [];
  const failing = makeMessenger({ content: CONTENT, logger: { info: line => failLines.push(line), error: line => failLines.push(line), warn() {} } });
  failing.axios.post = async (url, data) => { failing.axios.calls.post.push({ url, data }); throw Object.assign(new Error(`bad ${TOKEN}`), { response: { status: 400, data: { error: { code: 200 } } } }); };
  await failing.messenger.handleEntry({ id: '111', messaging: [postback('payment')] });
  assert.match(failLines[0], /^\[scm-messenger\] event kind=postback node=payment result=failed code=200/);
  assert.equal(failLines.join('\n').includes(TOKEN), false);
});

test('adapter: terms cards -> one button template per block (plain text for parts without buttons); post view -> image + text + button template; long text keeps a button template', () => {
  const buttons = [{ kind: 'postback', title: 'Хүсэлт гаргах', payload: 'apply:k' }, { kind: 'url', title: 'Тооцоолуур', url: 'https://www.scm.mn/calculator?product=k' }, { kind: 'postback', title: 'Буцах', payload: 'loans' }];
  const terms = nodeToMessengerMessages({ cards: [
    { title: 'Иргэн', text: 'Иргэн\nНөхцөл:\n• Хүү', buttons: [] }, { title: 'Иргэн (2)', text: 'үргэлжлэл', buttons },
    { title: 'Байгууллага', text: 'Байгууллага\n• Хүү', buttons },
  ], quickReplies: [{ title: 'Цэс', payload: 'restart' }] });
  assert.equal(terms.length, 3);
  assert.deepEqual(terms[0], { text: 'Иргэн\nНөхцөл:\n• Хүү' });
  assert.equal(terms[1].attachment.payload.template_type, 'button');
  assert.deepEqual(terms[1].attachment.payload.buttons.map(button => button.type), ['postback', 'web_url', 'postback']);
  assert.equal(terms[2].attachment.payload.text, 'Байгууллага\n• Хүү');
  assert.deepEqual(terms[2].quick_replies.map(reply => reply.payload), ['restart']);
  const long = 'Урт текст '.repeat(300);
  const post = nodeToMessengerMessages({ text: long, imageUrl: 'https://fb/img.jpg', buttons: buttons.slice(0, 2), quickReplies: [{ title: 'Цэс', payload: 'restart' }] });
  assert.deepEqual(post[0], { attachment: { type: 'image', payload: { url: 'https://fb/img.jpg', is_reusable: true } } });
  const textParts = post.filter(message => message.text);
  assert.ok(textParts.length >= 2 && textParts.every(message => message.text.length <= 1900));
  const last = post.at(-1).attachment.payload;
  assert.equal(last.template_type, 'button');
  assert.ok(last.text.length <= 640);
  assert.equal(post.at(-1).quick_replies.length, 1);
  const rebuilt = [...textParts.map(message => message.text), last.text === 'Доорх сонголтоос сонгоно уу.' ? '' : last.text].join(' ').replace(/\s+/g, ' ').trim();
  assert.equal(rebuilt, long.replace(/\s+/g, ' ').trim(), 'no text lost');
  const short = nodeToMessengerMessages({ text: 'Богино пост', buttons: buttons.slice(0, 1) });
  assert.equal(short.length, 1);
  assert.equal(short[0].attachment.payload.text, 'Богино пост');
  assert.equal(nodeToMessengerMessages({ imageUrl: 'http://insecure/x.png', text: 'x' })[0].text, 'x', 'non-https image skipped');
});

test('Messenger terms for a CMS-only product are button templates with [Хүсэлт гаргах][Тооцоолуур][Буцах]', async () => {
  const { messenger, axios } = makeMessenger({ content: CMS_CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [quick('terms:heated_parking')] });
  const message = sent(axios).at(-1).attachment.payload;
  assert.equal(message.template_type, 'button');
  assert.match(message.text, /^Дулаан зогсоолын зээл\n\nИргэн/);
  assert.deepEqual(message.buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?product=heated_parking&source=messenger', 'https://www.scm.mn/calculator?product=heated_parking&source=messenger', 'loans']);
  assert.ok(message.text.length <= 640);
  await messenger.handleEntry({ id: '111', messaging: [quick('terms:old_cms')] });
  assert.match(texts(axios).at(-1), /олдсонгүй/);
  await messenger.handleEntry({ id: '111', messaging: [postback('loans')] });
  const loans = sent(axios).at(-1).attachment.payload.elements;
  assert.deepEqual(loans.map(element => element.title), ['Хэрэглээний зээл', 'Дулаан зогсоолын зээл']);
  assert.ok(loans.every(element => element.image_url), 'default image fills imageless product cards');
});

test('post:<id> in Messenger: image attachment, full text, button template with [apply][Facebook-т нээх][Буцах]; ads cards use the postback', async () => {
  const posts = [{ id: '1_1', message: `Зээл олгож байна\n${'Дэлгэрэнгүй '.repeat(200)}`, full_picture: 'https://fb/img.jpg', permalink_url: 'https://www.facebook.com/p/1' }];
  const { messenger, axios, store } = makeMessenger({ content: CMS_CONTENT, axios: fakeAxios({ posts }) });
  await messenger.handleEntry({ id: '111', messaging: [postback('ads')] });
  assert.deepEqual(sent(axios).at(-1).attachment.payload.elements[0].buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?source=messenger', 'post:1_1', 'contact']);
  const before = sent(axios).length;
  await messenger.handleEntry({ id: '111', messaging: [postback('post:1_1')] });
  const messages = sent(axios).slice(before);
  assert.deepEqual(messages[0], { attachment: { type: 'image', payload: { url: 'https://fb/img.jpg', is_reusable: true } } });
  const template = messages.at(-1).attachment.payload;
  const fullText = [...messages.filter(message => message.text).map(message => message.text), template.text].join(' ');
  assert.ok(fullText.length > 2300 && fullText.startsWith('Зээл олгож байна'), 'full post text, split in several messages');
  assert.ok(messages.filter(message => message.text).length >= 1 && template.text.length <= 640);
  assert.equal(template.template_type, 'button');
  assert.deepEqual(template.buttons.map(button => [button.title, button.payload || button.url]), [['Хүсэлт гаргах', 'https://www.scm.mn/loan-request?source=messenger'], ['Facebook-т нээх', 'https://www.facebook.com/p/1'], ['Буцах', 'ads']]);
  assert.equal(template.buttons[1].type, 'web_url');
  assert.equal(messages.at(-1).quick_replies[0].payload, 'restart');
  await messenger.handleEntry({ id: '111', messaging: [postback('post:missing')] });
  assert.match(texts(axios).at(-1), /олдсонгүй/);
  assert.ok(axios.calls.post.every(call => /\/me\/messages$/.test(call.url)), 'read-only toward the Page');
  assert.equal((await store.get(PSID)).state, 'idle');
});

test('default image comes from bot_default_image_url in Messenger cards', async () => {
  const content = { ...CMS_CONTENT, loadSetting: async key => (key === 'bot_default_image_url' ? 'https://cdn.scm.mn/default.png' : undefined) };
  const { messenger, axios } = makeMessenger({ content });
  await messenger.handleEntry({ id: '111', messaging: [postback('restart')] });
  assert.ok(sent(axios).at(-1).attachment.payload.elements.every(element => element.image_url === 'https://cdn.scm.mn/default.png'));
});

test('status.messengerProfileOk requires the new menu (Холбоо барих present)', async () => {
  const old = { get_started: { payload: 'restart' }, persistent_menu: [{ call_to_actions: [{ type: 'postback', payload: 'restart' }, { type: 'postback', payload: 'loans' }] }] };
  const fresh = { get_started: { payload: 'restart' }, persistent_menu: [{ call_to_actions: buildMessengerProfile().persistent_menu[0].call_to_actions }] };
  assert.equal((await makeMessenger({ axios: fakeAxios({ profile: old }) }).messenger.status()).messengerProfileOk, false);
  assert.equal((await makeMessenger({ axios: fakeAxios({ profile: fresh }) }).messenger.status()).messengerProfileOk, true);
});

test('loanTasks.validateMessengerInput accepts a CMS-only key only together with its name', () => {
  const base = { productKey: 'heated_parking', productName: ' Дулаан  зогсоолын зээл ', lastname: 'Бат', firstname: 'Болд', phone: '99001234', amount: 5000000, term: 12, psid: PSID, postId: '' };
  const ok = validateMessengerInput(base);
  assert.equal(ok.productKey, 'heated_parking');
  assert.equal(ok.productName, 'Дулаан зогсоолын зээл');
  assert.throws(() => validateMessengerInput({ ...base, productName: '' }), error => error.status === 400);
  assert.throws(() => validateMessengerInput({ ...base, productKey: 'bad key!' }), error => error.status === 400);
  assert.equal('productName' in validateMessengerInput({ ...base, productKey: 'cons_loan' }), false, 'built-in products keep their own names');
});

// ---------- D23: steering to the web form (no in-chat applications) ----------
const chatCalls = axios => axios.calls.post.filter(call => call.url.endsWith('/api/chat'));
const lastApplyButton = axios => { const payload = sent(axios).at(-1).attachment.payload; assert.equal(payload.template_type, 'button', JSON.stringify(sent(axios).slice(-2)).slice(0, 400)); return payload.buttons[0]; };
const applyButton = url => ({ type: 'web_url', title: 'Хүсэлт гаргах', url, webview_height_ratio: 'full' });
function axiosWithChat(reply) {
  const ax = fakeAxios();
  const originalPost = ax.post.bind(ax);
  ax.post = async (url, data, options) => (url.endsWith('/api/chat') ? (ax.calls.post.push({ url, data, options }), typeof reply === 'function' ? reply() : { data: reply }) : originalPost(url, data, options));
  return ax;
}

test('D23 free text: AI answer <=3 sentences / <=400 chars (no links), then the detected product card with a web_url [Хүсэлт гаргах]; quick replies [Зээл][Итгэлцэл][Цэс]', async () => {
  const ax = axiosWithChat({ reply: `Хэрэглээний зээлийн хүү 1.5% байна. Хугацаа 12 сар хүртэл. Баримт бичиг цөөн. Дөрөв дэх өгүүлбэр харагдахгүй. Дэлгэрэнгүй https://x.mn/y [ACTION: loan_request]` });
  const { messenger } = makeMessenger({ axios: ax, content: CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [say('Хэрэглээний зээлийн хүү хэд вэ?')] });
  assert.equal(chatCalls(ax).length, 1);
  assert.deepEqual(texts(ax), ['Хэрэглээний зээлийн хүү 1.5% байна. Хугацаа 12 сар хүртэл. Баримт бичиг цөөн.']);
  const card = sent(ax).at(-1);
  const element = card.attachment.payload.elements[0];
  assert.equal(card.attachment.payload.elements.length, 1);
  assert.equal(element.title, 'Хэрэглээний зээл');
  assert.deepEqual(element.buttons.map(button => [button.type, button.title, button.payload || button.url]), [
    ['postback', 'Нөхцөл, шаардлага', 'terms:cons_loan'], ['web_url', 'Хүсэлт гаргах', 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger'], ['web_url', 'Тооцоолуур', 'https://www.scm.mn/calculator?product=cons_loan&source=messenger'],
  ]);
  assert.equal(element.buttons[1].webview_height_ratio, 'full');
  assert.deepEqual(card.quick_replies.map(item => [item.title, item.payload]), [['Зээл', 'loans'], ['Итгэлцэл', 'trust'], ['Цэс', 'restart']]);
  assert.equal(sent(ax).length, 2, 'answer + card only, no clarifying question');
  // very long answer is cut at a sentence end within 400 chars
  const long = axiosWithChat({ reply: `${'а'.repeat(300)}. ${'б'.repeat(300)}.` });
  const second = makeMessenger({ axios: long, content: CONTENT });
  await second.messenger.handleEntry({ id: '111', messaging: [say('Сайн байна уу')] });
  assert.equal(texts(long)[0], `${'а'.repeat(300)}.`);
});

test('D23 free text without a product: loans carousel, each card with an apply web_url; CMS-only and trust matches; trust card links the trust form', async () => {
  const { messenger, axios } = makeMessenger({ content: CMS_CONTENT });
  await messenger.handleEntry({ id: '111', messaging: [say('Сайн байна уу, мэдээлэл авмаар байна')] });
  const carousel = sent(axios).at(-1).attachment.payload.elements;
  assert.deepEqual(carousel.map(element => element.title), ['Хэрэглээний зээл', 'Дулаан зогсоолын зээл']);
  assert.ok(carousel.every(element => element.buttons.some(button => button.type === 'web_url' && /\/loan-request\?product=/.test(button.url))));
  await messenger.handleEntry({ id: '111', messaging: [say('дулаан зогсоол авах гэсэн юм')] });
  const parking = sent(axios).at(-1).attachment.payload.elements;
  assert.equal(parking.length, 1);
  assert.equal(parking[0].buttons[1].url, 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger');
  await messenger.handleEntry({ id: '111', messaging: [say('итгэлцэл гэж юу вэ?')] });
  assert.ok(sent(axios).at(-1).attachment.payload.elements[0].buttons.some(button => button.url === 'https://www.scm.mn/trust-request?source=messenger'));
});

test('D23 chat rate limit: over the limit the AI is skipped but the steering card still goes out; AI failure keeps the card and sends no apology', async () => {
  const ax = fakeAxios();
  const { messenger } = makeMessenger({ axios: ax, content: CONTENT, limiter: createPsidLimiter({ max: 1 }) });
  await messenger.handleEntry({ id: '111', messaging: [say('Хэрэглээний зээл'), say('Хэрэглээний зээл дахин')] });
  assert.equal(chatCalls(ax).length, 1, 'second message is not sent to the AI');
  assert.equal(sent(ax).filter(message => message.attachment).length, 2, 'both messages still get the product card');
  const broken = axiosWithChat(() => { throw new Error('chat down'); });
  const failing = makeMessenger({ axios: broken, content: CONTENT });
  await failing.messenger.handleEntry({ id: '111', messaging: [say('Хэрэглээний зээл')] });
  assert.equal(texts(broken).length, 0, 'no apology text, only the card');
  assert.equal(sent(broken).at(-1).attachment.payload.elements[0].buttons[1].type, 'web_url');
});

test('D23 every apply action is a web_url button (full webview): card buttons, apply:<key>, apply:post:<id>, apply:trust, bare apply, typed intents; nothing is stored', async () => {
  const cases = [
    [postback('apply:cons_loan'), 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger', /Хэрэглээний зээл/],
    [postback('apply:car_loan'), 'https://www.scm.mn/loan-request?product=car_loan&source=messenger', null],
    [postback('apply:biz_loan'), 'https://www.scm.mn/loan-request?product=biz_loan&source=messenger', /Бизнесийн зээл/],
    [postback('apply:heated_parking'), 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger', /Дулаан зогсоолын зээл/],
    [postback('apply:cons_loan:post:p_9'), 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger', null],
    [postback('apply:post:p_9'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [postback('apply:trust'), 'https://www.scm.mn/trust-request?source=messenger', /Итгэлцэл/],
    [postback('apply'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [postback('apply:123_456'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [postback('apply:old_cms'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [quick('product:car_coll_loan'), 'https://www.scm.mn/loan-request?product=car_coll_loan&source=messenger', null],
    [say('Зээлийн хүсэлт'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [say('хүсэлт гаргах'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [say('Дулаан зогсоолын хүсэлт гаргах'), 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger', null],
    [quick('confirm'), 'https://www.scm.mn/loan-request?source=messenger', null],
    [quick('edit'), 'https://www.scm.mn/loan-request?source=messenger', null],
  ];
  for (const [trigger, url, textPattern] of cases) {
    const { messenger, axios, store } = makeMessenger({ content: CMS_CONTENT });
    await messenger.handleEntry({ id: '111', messaging: [trigger] });
    assert.equal(sent(axios).at(-1).attachment?.payload?.template_type, 'button', JSON.stringify(trigger));
    assert.deepEqual(lastApplyButton(axios), applyButton(url), JSON.stringify(trigger.postback || trigger.message));
    assert.ok(sent(axios).at(-1).attachment.payload.text.length <= 640);
    if (textPattern) assert.match(sent(axios).at(-1).attachment.payload.text, textPattern);
    assert.equal(chatCalls(axios).length, 0, 'no AI call for apply actions');
    assert.equal((await store.get(PSID)).state, 'idle', 'no in-chat flow is started');
    assert.deepEqual(sent(axios).at(-1).quick_replies.map(item => item.payload), ['loans', 'restart']);
  }
  // Card buttons (type apply) from the loans carousel are the same web_url buttons (no apply postback anywhere).
  const { messenger, axios } = makeMessenger({ content: CMS_CONTENT });
  for (const id of ['loans', 'trust']) await messenger.handleEntry({ id: '111', messaging: [postback(id)] });
  assert.equal(JSON.stringify(sent(axios)).includes('"payload":"apply'), false);
});

test('D23 stale sessions of the removed in-chat flow are treated as idle; old quick replies answer with a short text + web form button', async () => {
  const { messenger, axios, store } = makeMessenger({ content: CONTENT });
  store.map.set(PSID, { state: 'phone', draft: { productKey: 'cons_loan', lastname: 'Бат', firstname: 'Болд' }, postId: '' });
  await messenger.handleEntry({ id: '111', messaging: [say('99001234')] });
  assert.equal(chatCalls(axios).length, 1, 'typed text is ordinary free text now');
  assert.deepEqual(await store.get(PSID), { state: 'idle', draft: {}, postId: '' });
  assert.equal(JSON.stringify(sent(axios)).includes('Утасны дугаар'), false, 'no flow prompts');
  store.map.set(PSID, { state: 'confirm', draft: { productKey: 'cons_loan', phone: '99001234' }, postId: '' });
  await messenger.handleEntry({ id: '111', messaging: [quick('confirm')] });
  assert.equal(lastApplyButton(axios).url, 'https://www.scm.mn/loan-request?source=messenger');
  assert.equal((await store.get(PSID)).state, 'idle');
  assert.equal(JSON.stringify(await store.get(PSID)).includes('99001234'), false, 'stale draft (PII) is dropped');
  store.map.set(PSID, { state: 'amount', draft: {}, postId: '' });
  await messenger.handleEntry({ id: '111', messaging: [quick('cancel')] });
  assert.match(texts(axios).at(-1), /цэс/);
  assert.deepEqual(sent(axios).at(-1).quick_replies.map(item => item.payload), ['restart']);
  store.map.set(PSID, { state: 'name', draft: {}, postId: '' });
  await messenger.handleEntry({ id: '111', messaging: [postback('back')] });
  assert.equal(sent(axios).at(-1).attachment.payload.template_type, 'generic', 'back -> welcome menu cards');
  assert.equal(chatCalls(axios).length, 1);
  assert.equal(createScmMessenger({ axios: fakeAxios(), sessionStore: memoryStore() }).createRequest, undefined, 'the messenger has no request creator anymore');
});

test('D23 menu payloads send nodes (apply buttons are web_url); restart clears the session; contact node; typed menu titles', async () => {
  const posts = [{ id: 'p_1', message: 'Зээл олгож байна\nдэлгэрэнгүй', permalink_url: 'https://www.facebook.com/p/1' }];
  const { messenger, axios, store } = makeMessenger({ content: CONTENT, axios: fakeAxios({ posts }) });
  await messenger.handleEntry({ id: '111', messaging: [postback('loans')] });
  const loans = sent(axios).at(-1).attachment.payload.elements;
  assert.deepEqual(loans[0].buttons.map(button => button.payload || button.url), ['terms:cons_loan', 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger', 'https://www.scm.mn/calculator?product=cons_loan&source=messenger']);
  await messenger.handleEntry({ id: '111', messaging: [quick('terms:cons_loan')] });
  const termsMessage = sent(axios).at(-1).attachment.payload;
  assert.deepEqual(termsMessage.buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?product=cons_loan&source=messenger', 'https://www.scm.mn/calculator?product=cons_loan&source=messenger', 'loans']);
  await messenger.handleEntry({ id: '111', messaging: [postback('ads')] });
  assert.deepEqual(sent(axios).at(-1).attachment.payload.elements[0].buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?source=messenger', 'post:p_1', 'contact']);
  await messenger.handleEntry({ id: '111', messaging: [postback('restart')] });
  assert.equal(sent(axios).at(-1).attachment.payload.template_type, 'generic');
  assert.deepEqual(await store.get(PSID), { state: 'idle', draft: {}, postId: '' });
  await messenger.handleEntry({ id: '111', messaging: [postback('contact')] });
  assert.match(sent(axios).at(-1).attachment.payload.text, /Утас: /);
  await messenger.handleEntry({ id: '111', messaging: [say('Төлөлт хийх')] });
  assert.match(texts(axios).at(-1), /Хаан банк/, 'typed menu titles behave like the buttons');
  assert.equal(chatCalls(axios).length, 0);
  assert.ok(axios.calls.post.every(call => /\/me\/messages$/.test(call.url)), 'read-only toward the Page');
});
