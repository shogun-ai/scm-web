import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNode, formatTerms, sanitizeAccounts, validateBotContent, createBotContentSource, registerBotRoutes, isNodeId,
  DEFAULT_WELCOME, MAX_CARDS, suggestCategory, normalizePhone, postButtons,
  validateBotCards, checkCard, defaultCards, sectionCards, chunkLines, FALLBACK_IMAGE_URL, CARD_SECTIONS,
  applyUrl, shortenAnswer, detectProduct, buildSteeringNode, buildApplyNode,
} from './botEngine.js';

const person = { conditions: ['Хүү 2%', 'Хугацаа 12 сар'], requirements: ['18 нас хүрсэн'] };
const org = { conditions: ['Хүү 3%'], requirements: ['Бизнес эрхэлсэн'] };
const PRODUCTS = [
  { productKey: 'cons_loan', title: 'Хэрэглээний зээл', shortDesc: 'Хурдан '.repeat(30), bgImageUrl: 'https://img/c.png', order: 3, isActive: true, individual: person },
  { productKey: 'biz_loan', title: 'Бизнесийн зээл', shortDesc: 'Бизнес', bgImageUrl: 'http://insecure/x.png', headerImageUrl: '', order: 1, isActive: true, individual: person, organization: org },
  { productKey: 'car_loan', title: 'Автомашины зээл', order: 2, isActive: true,
    purchase: { label: 'Худалдан авах', individual: person, organization: org }, collateral: { label: 'Барьцаалсан', individual: org } },
  { productKey: 'old_loan', title: 'Хуучин', order: 5, isActive: false, individual: person },
  { productKey: 'trust', title: 'Итгэлцэл', shortDesc: 'Хөрөнгө өсгөх', bgImageUrl: 'https://img/t.png', order: 4, isActive: true },
];
const ACCOUNTS = [{ bank: 'Хаан банк', accountNumber: '5000123456', accountName: 'Солонго Капитал ББСБ', iban: 'MN12 0005 5000 1234 56', note: 'Зээлийн гэрээний дугаар' }];

const PARKING = { productKey: 'heated_parking', title: 'Дулаан зогсоолын зээл', shortDesc: 'Дулаан зогсоол худалдан авах', bgImageUrl: 'https://img/p.png', order: 6, isActive: true, individual: person };
const CMS_PRODUCTS = [...PRODUCTS, PARKING];

const ctxOf = ({ products = PRODUCTS, settings = {}, posts = [], channel } = {}) => ({
  async loadProducts() { return products; },
  async loadSetting(key) { return settings[key]; },
  async getPosts() { return posts; },
  channel,
});
const quickPayloads = node => node.quickReplies.map(reply => reply.payload);

function assertNodeShape(node) {
  assert.ok(node.text || node.cards?.length, 'text or cards');
  for (const cardItem of node.cards || []) {
    assert.ok(cardItem.title && cardItem.title.length <= 80);
    assert.ok(!cardItem.subtitle || cardItem.subtitle.length <= 80);
    assert.ok(cardItem.buttons.length <= 3);
    for (const button of cardItem.buttons) {
      assert.ok(button.title.length <= 20);
      if (button.kind === 'call') assert.match(button.phone, /^\+976\d{8}$/);
      else assert.ok(button.kind === 'postback' ? typeof button.payload === 'string' : /^https:\/\//.test(button.url));
    }
    if (cardItem.imageUrl) assert.match(cardItem.imageUrl, /^https:\/\//);
  }
  assert.ok((node.quickReplies || []).length <= 13);
  for (const reply of node.quickReplies || []) assert.ok(reply.title.length <= 20 && reply.payload);
}

test('restart: default welcome + menu cards carousel (5 cards, default image); admin welcome from bot_welcome_text; quick replies only without cards', async () => {
  const node = await buildNode('restart', ctxOf());
  assert.equal(node.text, DEFAULT_WELCOME);
  assert.deepEqual(node.cards.map(item => [item.title, item.buttons[0].payload]), [['Зээл', 'loans'], ['Итгэлцэл', 'trust'], ['Идэвхтэй зээлийн зар', 'ads'], ['Төлөлт хийх', 'payment'], ['Холбоо барих', 'contact']]);
  assert.ok(node.cards.every(item => item.imageUrl === FALLBACK_IMAGE_URL), 'imageless cards get the default image');
  assert.equal(node.quickReplies, undefined);
  assertNodeShape(node);
  const allOff = await buildNode('restart', ctxOf({ settings: { bot_cards: { version: 1, sections: { menu: [{ id: 'a', title: 'А', active: false, buttons: [] }] } } } }));
  assert.equal(allOff.cards, undefined);
  assert.deepEqual(quickPayloads(allOff), ['loans', 'trust', 'ads', 'payment'], 'no active menu card -> quick replies keep the menu reachable');
  const custom = await buildNode('restart', ctxOf({ settings: { bot_welcome_text: '  Тавтай   морил  ' } }));
  assert.equal(custom.text, 'Тавтай морил');
  assert.equal((await buildNode('restart', ctxOf({ settings: { bot_welcome_text: 'я'.repeat(900) } }))).text.length, 500);
  assert.equal((await buildNode('menu', ctxOf())).text, DEFAULT_WELCOME, 'menu is an alias of restart');
  const broken = await buildNode('restart', { ...ctxOf(), loadSetting: async () => { throw new Error('db'); } });
  assert.equal(broken.text, DEFAULT_WELCOME, 'setting failure falls back to the default');
});

test('loans: active non-trust products by order, <=3 buttons, limits, https-only images, calculator url', async () => {
  const node = await buildNode('loans', ctxOf());
  assertNodeShape(node);
  assert.deepEqual(node.cards.map(item => item.title), ['Бизнесийн зээл', 'Автомашины зээл', 'Хэрэглээний зээл']);
  const cons = node.cards[2];
  assert.equal(cons.subtitle.length, 80);
  assert.equal(cons.imageUrl, 'https://img/c.png');
  assert.equal(node.cards[0].imageUrl, FALLBACK_IMAGE_URL, 'non-https image replaced by the default image');
  assert.deepEqual(cons.buttons, [
    { kind: 'postback', title: 'Нөхцөл, шаардлага', payload: 'terms:cons_loan' },
    { kind: 'url', title: 'Хүсэлт гаргах', url: 'https://www.scm.mn/loan-request?product=cons_loan&source=messenger' },
    { kind: 'url', title: 'Тооцоолуур', url: 'https://www.scm.mn/calculator?product=cons_loan&source=messenger' },
  ]);
  assert.ok(node.cards.every(item => !String(item.buttons[1].url).includes('product=trust')));
  const many = Array.from({ length: 15 }, (_, i) => ({ productKey: `p${i}`, title: `П${i}`, order: i, isActive: true }));
  assert.equal((await buildNode('loans', ctxOf({ products: many }))).cards.length, MAX_CARDS);
  const empty = await buildNode('loans', ctxOf({ products: [PRODUCTS[4]] }));
  assert.match(empty.text, /алга/);
  assert.equal(empty.cards, undefined);
  assert.equal((await buildNode('loans', ctxOf({ channel: 'web' }))).cards[2].buttons[2].url, 'https://www.scm.mn/calculator?product=cons_loan&source=web');
});

test('terms: individual / organization blocks, car_loan purchase and collateral variants, long text kept whole, unknown key falls back', async () => {
  const biz = await buildNode('terms:biz_loan', ctxOf());
  assertNodeShape(biz);
  const terms = node => node.cards.map(item => item.text).join('\n');
  assert.deepEqual(biz.cards.map(item => item.title), ['Иргэн', 'Байгууллага'], 'one button-template card per block');
  assert.match(biz.cards[0].text, /^Бизнесийн зээл\n\nИргэн\nНөхцөл:\n• Хүү 2%\n• Хугацаа 12 сар\nШаардлага:\n• 18 нас хүрсэн/);
  assert.match(biz.cards[1].text, /^Байгууллага\nНөхцөл:\n• Хүү 3%/);
  for (const item of biz.cards) {
    assert.ok(item.text.length <= 640);
    assert.deepEqual(item.buttons.map(button => [button.title, button.payload || button.url]), [['Хүсэлт гаргах', 'https://www.scm.mn/loan-request?product=biz_loan&source=messenger'], ['Тооцоолуур', 'https://www.scm.mn/calculator?product=biz_loan&source=messenger'], ['Буцах', 'loans']]);
  }
  assert.equal(biz.text, undefined);
  assert.equal((await buildNode('terms:biz_loan', ctxOf({ channel: 'web' }))).cards[0].buttons[1].url, 'https://www.scm.mn/calculator?product=biz_loan&source=web');
  const cons = await buildNode('terms:cons_loan', ctxOf());
  assert.ok(!terms(cons).includes('Байгууллага'), 'organization block omitted when absent');
  const car = await buildNode('terms:car_loan', ctxOf());
  assert.deepEqual(car.cards.map(item => item.title), ['Худалдан авах — Иргэн', 'Худалдан авах — Байгууллага', 'Барьцаалсан — Иргэн']);
  assert.ok(!terms(car).includes('Барьцаалсан — Байгууллага'));
  const longProduct = { productKey: 'long_loan', title: 'Урт', order: 1, isActive: true, individual: { conditions: Array.from({ length: 12 }, (_, i) => `${i} ${'я'.repeat(150)}`), requirements: [] } };
  const long = await buildNode('terms:long_loan', ctxOf({ products: [longProduct] }));
  assert.ok(long.cards.length >= 3 && long.cards.every(item => item.text.length <= 640));
  assert.deepEqual(long.cards.map(item => item.buttons.length), long.cards.map((_, i) => (i === long.cards.length - 1 ? 3 : 0)), 'buttons only on the last part');
  assert.deepEqual(chunkLines('a\nb', 640), ['a\nb']);
  assert.ok(chunkLines('я'.repeat(1500), 640).every(part => part.length <= 640));
  const huge = { productKey: 'h', title: 'Том', individual: { conditions: Array.from({ length: 200 }, () => 'я'.repeat(300)), requirements: [] } };
  assert.ok(formatTerms(huge).length <= 8000);
  assert.match(formatTerms({ title: 'Хоосон' }), /одоогоор оруулаагүй/);
  const empty = await buildNode('terms:e', ctxOf({ products: [{ productKey: 'e', title: 'Хоосон', isActive: true }] }));
  assert.match(empty.cards[0].text, /одоогоор оруулаагүй/);
  assert.equal(empty.cards[0].buttons.length, 3);
  for (const id of ['terms:nope', 'terms:old_loan', 'terms:trust']) {
    const node = await buildNode(id, ctxOf());
    assert.match(node.text, /олдсонгүй/);
    assert.deepEqual(quickPayloads(node), ['loans', 'restart']);
  }
  assert.match((await buildNode(`terms:${'a'.repeat(80)}`, ctxOf())).text, /олсонгүй/);
});

test('calc node: url button with the product', async () => {
  const node = await buildNode('calc:cons_loan', ctxOf());
  assertNodeShape(node);
  assert.equal(node.cards[0].buttons[0].url, 'https://www.scm.mn/calculator?product=cons_loan&source=messenger');
  assert.equal((await buildNode('calc', ctxOf())).cards[0].buttons[0].url, 'https://www.scm.mn/calculator?source=messenger');
});

test('trust: one card with trust-request (source=messenger) and trust-calculator url buttons; default card without content', async () => {
  const node = await buildNode('trust', ctxOf());
  assertNodeShape(node);
  assert.equal(node.cards.length, 1);
  assert.equal(node.cards[0].title, 'Итгэлцэл');
  assert.equal(node.cards[0].imageUrl, 'https://img/t.png');
  assert.deepEqual(node.cards[0].buttons, [
    { kind: 'url', title: 'Хүсэлт гаргах', url: 'https://www.scm.mn/trust-request?source=messenger' },
    { kind: 'url', title: 'Тооцоолуур', url: 'https://www.scm.mn/trust-calculator?source=messenger' },
  ]);
  const bare = await buildNode('trust', ctxOf({ products: [] }));
  assert.equal(bare.cards[0].title, 'Итгэлцэл');
  assert.equal(bare.cards[0].imageUrl, FALLBACK_IMAGE_URL);
  assert.equal((await buildNode('trust', ctxOf({ channel: 'web' }))).cards[0].buttons[0].url, 'https://www.scm.mn/trust-request?source=web');
});

test('ads: last 6 posts, permalink + post:<id> buttons, junk skipped, empty/failed Graph -> text', async () => {
  const posts = Array.from({ length: 9 }, (_, i) => ({ id: `p_${i}`, message: `Гарчиг ${i}\n${'Тайлбар '.repeat(30)}`, full_picture: 'https://fb/img.jpg', permalink_url: `https://www.facebook.com/p/${i}` }));
  posts.splice(2, 0, { id: 'x' }, { message: 'no id' });
  const node = await buildNode('ads', ctxOf({ posts }));
  assertNodeShape(node);
  assert.equal(node.cards.length, 6);
  assert.equal(node.cards[0].title, 'Гарчиг 0');
  assert.equal(node.cards[0].subtitle.length, 80);
  assert.deepEqual(node.cards[0].buttons.map(button => button.payload || button.url), ['post:p_0', 'contact'], 'Пост үзэх opens the post inside Messenger');
  const noLink = await buildNode('ads', ctxOf({ posts: [{ id: 'p_1', message: 'Зар', permalink_url: 'javascript:alert(1)' }] }));
  assert.deepEqual(noLink.cards[0].buttons.map(button => button.payload), ['post:p_1', 'contact']);
  assert.match((await buildNode('ads', ctxOf())).text, /зар алга/);
  const failing = await buildNode('ads', { ...ctxOf(), getPosts: async () => { throw new Error('graph'); } });
  assert.match(failing.text, /зар алга/);
  assert.match((await buildNode('ads', { loadProducts: async () => [], loadSetting: async () => undefined })).text, /зар алга/);
});

test('payment: accounts from payment_accounts, legacy chatbot_repayment_text fallback, then contact fallback', async () => {
  const withAccounts = await buildNode('payment', ctxOf({ settings: { payment_accounts: ACCOUNTS, chatbot_repayment_text: 'хуучин' } }));
  assertNodeShape(withAccounts);
  assert.match(withAccounts.text, /1\. Хаан банк\nДансны дугаар: 5000123456\nХүлээн авагч: Солонго Капитал ББСБ\nIBAN: MN12 0005 5000 1234 56\nГүйлгээний утга: Зээлийн гэрээний дугаар/);
  assert.ok(!withAccounts.text.includes('хуучин'));
  assert.deepEqual(quickPayloads(withAccounts), ['restart']);
  const legacy = await buildNode('payment', ctxOf({ settings: { payment_accounts: [], chatbot_repayment_text: 'Хаан банк 5000\r\n\r\nСолонго' } }));
  assert.equal(legacy.text, 'Хаан банк 5000\nСолонго');
  const invalidOnly = await buildNode('payment', ctxOf({ settings: { payment_accounts: [{ bank: 'Х' }], chatbot_repayment_text: 'fallback текст' } }));
  assert.equal(invalidOnly.text, 'fallback текст');
  assert.match((await buildNode('payment', ctxOf())).text, /тохируулаагүй/);
  const optional = await buildNode('payment', ctxOf({ settings: { payment_accounts: [{ bank: 'А', accountNumber: '1', accountName: 'Б' }] } }));
  assert.ok(!optional.text.includes('IBAN'));
});

test('fallback and failures: unknown node ids get the menu; loader errors give a safe text; no secrets/raw errors', async () => {
  for (const id of ['', 'nope', 'terms', 'x:y', undefined, null]) {
    const node = await buildNode(id, ctxOf());
    assertNodeShape(node);
    assert.deepEqual(quickPayloads(node), ['loans', 'trust', 'ads', 'payment']);
  }
  const boom = await buildNode('loans', { loadProducts: async () => { throw new Error('mongodb://user:pass@host'); }, loadSetting: async () => undefined });
  assert.ok(!JSON.stringify(boom).includes('mongodb'));
  assert.deepEqual(quickPayloads(boom), ['restart']);
  assert.equal(isNodeId('terms:cons_loan'), true);
  assert.equal(isNodeId('terms:'), false);
  assert.equal(isNodeId('__proto__'), false);
});

test('sanitizeAccounts / validateBotContent: limits and required fields', () => {
  assert.deepEqual(sanitizeAccounts('x'), []);
  assert.equal(sanitizeAccounts(Array.from({ length: 20 }, () => ACCOUNTS[0])).length, 10);
  const good = { welcomeText: ' Сайн уу ', paymentAccounts: [{ ...ACCOUNTS[0], bank: ' Хаан ' }, { bank: 'Б', accountNumber: '1', accountName: 'Н' }] };
  const ok = validateBotContent(good);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.welcomeText, 'Сайн уу');
  assert.equal(ok.value.paymentAccounts[0].bank, 'Хаан');
  assert.deepEqual(ok.value.paymentAccounts[1], { bank: 'Б', accountNumber: '1', accountName: 'Н', iban: '', note: '' });
  assert.equal(validateBotContent({ welcomeText: '', paymentAccounts: [] }).ok, true, 'empty welcome resets to default');
  const bad = [
    null, {}, { welcomeText: 5, paymentAccounts: [] }, { welcomeText: 'я'.repeat(501), paymentAccounts: [] }, { welcomeText: 'a' },
    { welcomeText: 'a', paymentAccounts: 'x' }, { welcomeText: 'a', paymentAccounts: Array.from({ length: 11 }, () => ACCOUNTS[0]) },
    { welcomeText: 'a', paymentAccounts: [null] }, { welcomeText: 'a', paymentAccounts: [['x']] },
    { welcomeText: 'a', paymentAccounts: [{ bank: '', accountNumber: '1', accountName: 'Н' }] },
    { welcomeText: 'a', paymentAccounts: [{ bank: 'Б', accountNumber: '1' }] },
    { welcomeText: 'a', paymentAccounts: [{ ...ACCOUNTS[0], note: 'я'.repeat(201) }] },
    { welcomeText: 'a', paymentAccounts: [{ ...ACCOUNTS[0], bank: 'я'.repeat(81) }] },
    { welcomeText: 'a', paymentAccounts: [{ ...ACCOUNTS[0], iban: 5 }] },
  ];
  for (const body of bad) assert.equal(validateBotContent(body).ok, false, JSON.stringify(body)?.slice(0, 60));
  assert.equal(validateBotContent({ welcomeText: 'a', paymentAccounts: [{ ...ACCOUNTS[0], note: 'я'.repeat(200) }] }).ok, true, 'boundary accepted');
});

test('content source caches products and settings for the TTL and invalidate() clears it', async () => {
  const calls = { products: 0, settings: 0 };
  let value = 'a';
  const clock = { t: 1000 };
  const source = createBotContentSource({
    ProductContent: { find: () => ({ sort: () => ({ limit: () => ({ lean: async () => { calls.products += 1; return PRODUCTS; } }) }) }) },
    SiteConfig: { findOne: () => ({ lean: async () => { calls.settings += 1; return { value }; } }) },
    now: () => clock.t, ttlMs: 60000,
  });
  await source.loadProducts(); await source.loadProducts();
  assert.equal(calls.products, 1);
  assert.equal(await source.loadSetting('k'), 'a');
  value = 'b';
  assert.equal(await source.loadSetting('k'), 'a', 'cached');
  source.invalidate();
  assert.equal(await source.loadSetting('k'), 'b');
  await source.loadProducts();
  assert.equal(calls.products, 2);
  clock.t += 60001;
  await source.loadProducts();
  assert.equal(calls.products, 3, 'refreshed after TTL');
});

// ---------- routes ----------
function harness({ docs = {}, limiter, logs = [], posts = [{ id: 'p_1', message: 'Зар' }], products = PRODUCTS } = {}) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'put', 'post', 'delete'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const updates = [];
  const SiteConfig = {
    findOne: ({ key }) => ({ lean: async () => (docs[key] === undefined ? null : { value: docs[key] }) }),
    findOneAndUpdate: async (filter, update) => { updates.push({ filter, update }); docs[filter.key] = update.$set.value; },
  };
  let invalidated = 0;
  const profileCalls = [];
  const content = { loadProducts: async () => products, loadSetting: async key => docs[key], invalidate: () => { invalidated += 1; } };
  registerBotRoutes({
    app, source: content, SiteConfig, getPosts: async () => posts, limiter, configureProfile: async () => { profileCalls.push(1); return { ok: true }; },
    authenticateUser: (_req, _res, next) => next(),
    requireAdmin: (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden' })),
    createLog: async (_user, action, details) => { logs.push({ action, details }); },
  });
  const invoke = async (method, path, req = {}) => {
    const response = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    const handlers = routes.get(`${method}:${path}`);
    assert.ok(handlers, path);
    const request = { user: { role: 'admin' }, params: {}, body: {}, ...req };
    const run = async index => { if (index < handlers.length) await handlers[index](request, response, () => run(index + 1)); };
    await run(0);
    return response;
  };
  return { invoke, updates, docs, logs, profileCalls, invalidated: () => invalidated };
}

test('GET /api/bot/node/:id: public, node JSON with web urls, 404 for unknown/oversized ids, rate limited, no secrets', async () => {
  const h = harness({ docs: { payment_accounts: ACCOUNTS } });
  const loans = await h.invoke('get', '/api/bot/node/:id', { user: undefined, params: { id: 'loans' } });
  assert.equal(loans.code, 200);
  assert.equal(loans.headers['Cache-Control'], 'public, max-age=30');
  assert.equal(loans.data.cards[0].buttons[2].url, 'https://www.scm.mn/calculator?product=biz_loan&source=web');
  assert.equal((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'terms:cons_loan' } })).code, 200);
  assert.match((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'payment' } })).data.text, /5000123456/);
  assert.equal((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'ads' } })).data.cards[0].buttons[0].payload, 'post:p_1');
  for (const id of ['nope', '..%2Fx', 'terms:', `terms:${'a'.repeat(100)}`, '__proto__']) assert.equal((await h.invoke('get', '/api/bot/node/:id', { params: { id } })).code, 404, id);
  const json = JSON.stringify(loans.data);
  assert.ok(!/token|secret|password|mongodb/i.test(json));
  let allowed = 1;
  const limited = harness({ limiter: (_req, res, next) => (allowed-- > 0 ? next() : res.status(429).json({ message: 'slow' })) });
  assert.equal((await limited.invoke('get', '/api/bot/node/:id', { params: { id: 'restart' } })).code, 200);
  assert.equal((await limited.invoke('get', '/api/bot/node/:id', { params: { id: 'restart' } })).code, 429);
});

test('admin bot-content: admin only; GET returns defaults + legacy text; PUT validates, stores, invalidates cache, logs', async () => {
  const employee = { role: 'employee' };
  const h = harness({ docs: { chatbot_repayment_text: 'Хуучин данс', payment_accounts: [{ bank: 'Б', accountNumber: '1', accountName: 'Н' }, { bad: true }] } });
  assert.equal((await h.invoke('get', '/api/admin/bot-content', { user: employee })).code, 403);
  assert.equal((await h.invoke('put', '/api/admin/bot-content', { user: employee, body: { welcomeText: 'a', paymentAccounts: [] } })).code, 403);
  assert.equal(h.updates.length, 0);
  const got = await h.invoke('get', '/api/admin/bot-content');
  assert.equal(got.headers['Cache-Control'], 'no-store');
  assert.deepEqual(got.data, { welcomeText: '', defaultWelcomeText: DEFAULT_WELCOME, paymentAccounts: [{ bank: 'Б', accountNumber: '1', accountName: 'Н', iban: '', note: '' }], legacyPaymentText: 'Хуучин данс' });
  const bad = await h.invoke('put', '/api/admin/bot-content', { body: { welcomeText: 'я'.repeat(501), paymentAccounts: [] } });
  assert.equal(bad.code, 400);
  assert.equal(h.updates.length, 0);
  assert.equal(h.invalidated(), 0);
  const saved = await h.invoke('put', '/api/admin/bot-content', { body: { welcomeText: ' Сайн ', paymentAccounts: ACCOUNTS, extra: 'ignored' } });
  assert.equal(saved.code, 200);
  assert.deepEqual(h.updates.map(update => update.filter.key), ['bot_welcome_text', 'payment_accounts']);
  assert.equal(h.docs.bot_welcome_text, 'Сайн');
  assert.deepEqual(h.docs.payment_accounts, ACCOUNTS);
  assert.ok(h.updates.every(update => update.update.$setOnInsert.group === 'chatbot'));
  assert.ok(!('chatbot_repayment_text' in h.updates.map(update => update.filter.key)), 'legacy payment text is never written');
  assert.equal(h.invalidated(), 1);
  assert.deepEqual(h.logs.at(-1), { action: 'bot_content_update', details: 'accounts:1' });
});

// ---------- D20: post categories + contact ----------
test('suggestCategory: keywords, safety wins over loan, default news', () => {
  assert.equal(suggestCategory('Хэрэглээний зээл олгож байна, хүү 1.8%'), 'loan');
  assert.equal(suggestCategory('Залилан сэрэмжил! Анхаараарай'), 'safety');
  assert.equal(suggestCategory('Зээлийн залилангаас сэрэмжил'), 'safety');
  assert.equal(suggestCategory('Шинэ жилийн мэнд'), 'news');
  assert.equal(suggestCategory(undefined), 'news');
});

test('ads buttons per category; admin override beats suggestion; unknown/inactive product falls back', async () => {
  const posts = [
    { id: 'a1', message: 'Автомашины зээл', permalink_url: 'https://www.facebook.com/p/a1' },
    { id: 'a2', message: 'Шинэ мэдээ', permalink_url: 'https://www.facebook.com/p/a2' },
    { id: 'a3', message: 'Залилан сэрэмжил', permalink_url: 'https://www.facebook.com/p/a3' },
    { id: 'a4', message: 'Мэдээ', permalink_url: 'https://www.facebook.com/p/a4' },
    { id: 'a5', message: 'Зээл', permalink_url: 'https://www.facebook.com/p/a5' },
  ];
  const meta = { a2: { category: 'loan', productKey: 'biz_loan' }, a3: { category: 'news', productKey: null }, a4: { category: 'loan', productKey: 'old_loan' }, a5: { category: 'loan', productKey: 'trust' } };
  const node = await buildNode('ads', ctxOf({ posts, settings: { bot_post_meta: meta }, channel: 'web' }));
  assertNodeShape(node);
  const view = item => item.buttons.map(button => button.payload || button.url);
  assert.deepEqual(view(node.cards[0]), ['https://www.scm.mn/loan-request?source=webchat', 'post:a1', 'contact']);
  assert.deepEqual(view(node.cards[1]), ['https://www.scm.mn/loan-request?product=biz_loan&source=webchat', 'terms:biz_loan', 'https://www.scm.mn/calculator?product=biz_loan&source=web']);
  assert.deepEqual(view(node.cards[2]), ['post:a3', 'contact'], 'override safety->news');
  assert.deepEqual(view(node.cards[3]), ['https://www.scm.mn/loan-request?source=webchat', 'post:a4', 'contact'], 'inactive product ignored');
  assert.deepEqual(view(node.cards[4]), ['https://www.scm.mn/loan-request?source=webchat', 'post:a5', 'contact'], 'trust is not a loan product');
  assert.deepEqual(postButtons({ id: 'z', message: 'мэдээ', permalink_url: 'https://www.facebook.com/p/z' }, undefined, [], {}).map(button => button.payload), ['post:z', 'contact']);
  assert.deepEqual(postButtons({ message: 'мэдээ', permalink_url: 'https://www.facebook.com/p/z' }, undefined, [], {}).map(button => button.url || button.payload), ['https://www.facebook.com/p/z', 'contact'], 'no usable id -> permalink url');
  const broken = await buildNode('ads', { ...ctxOf({ posts }), loadSetting: async () => { throw new Error('db'); } });
  assert.equal(broken.cards.length, 5, 'meta failure falls back to suggestions');
});

test('normalizePhone: E.164 with +976, first valid number, junk rejected', () => {
  assert.equal(normalizePhone('75991919, 75999191'), '+97675991919');
  assert.equal(normalizePhone('7599-1919'), '+97675991919');
  assert.equal(normalizePhone('+976 7599 1919'), '+97675991919');
  assert.equal(normalizePhone('97675991919'), '+97675991919');
  assert.equal(normalizePhone('75991919 75999191'), '+97675991919');
  assert.equal(normalizePhone('1919'), '');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone(undefined), '');
});

test('contact node: SiteConfig phone/email/address/hours, defaults, call button only for valid phone', async () => {
  assert.ok(isNodeId('contact'));
  const node = await buildNode('contact', ctxOf({ settings: { contact_phone: '75991919, 75999191', contact_email: 'info@scm.mn', contact_address: 'Хан-Уул', contact_hours: '09-18' } }));
  assert.match(node.text, /Утас: 75991919, 75999191/);
  assert.match(node.text, /Имэйл: info@scm.mn/);
  assert.match(node.text, /Хаяг: Хан-Уул/);
  assert.match(node.text, /Ажлын цаг: 09-18/);
  assert.deepEqual(node.buttons.map(button => [button.kind, button.phone || button.payload || button.url]), [['call', '+97675991919'], ['url', 'https://www.scm.mn'], ['postback', 'loans']]);
  assert.deepEqual(quickPayloads(node), ['loans', 'restart']);
  const defaults = await buildNode('contact', ctxOf());
  assert.match(defaults.text, /Ажлын цаг: Даваа/);
  assert.equal(defaults.buttons[0].phone, '+97675991919');
  const bad = await buildNode('contact', ctxOf({ settings: { contact_phone: 'ask staff' } }));
  assert.ok(!bad.buttons.some(button => button.kind === 'call'));
});

test('admin bot-posts: admin only; GET list with meta + suggestion; PUT validates category/product, stores, invalidates; DELETE clears', async () => {
  const posts = Array.from({ length: 25 }, (_, i) => ({ id: `p_${i}`, message: i === 0 ? `Зээл ${'я'.repeat(400)}` : 'Мэдээ', full_picture: 'https://fb/i.jpg', permalink_url: `https://www.facebook.com/p/${i}`, created_time: '2026-11-20T01:00:00+0000' }));
  const h = harness({ posts, docs: { bot_post_meta: { p_1: { category: 'safety', productKey: null } } } });
  const employee = { role: 'employee' };
  assert.equal((await h.invoke('get', '/api/admin/bot-posts', { user: employee })).code, 403);
  assert.equal((await h.invoke('put', '/api/admin/bot-posts/:postId', { user: employee, params: { postId: 'p_1' }, body: { category: 'news' } })).code, 403);
  assert.equal((await h.invoke('delete', '/api/admin/bot-posts/:postId', { user: employee, params: { postId: 'p_1' } })).code, 403);
  const got = await h.invoke('get', '/api/admin/bot-posts');
  assert.equal(got.data.posts.length, 20);
  assert.deepEqual(got.data.products.map(item => item.productKey), ['biz_loan', 'car_loan', 'cons_loan'], 'active loan products only, ordered');
  assert.equal(got.data.posts[0].message.length, 300);
  assert.deepEqual(got.data.posts[0].suggested, { category: 'loan' });
  assert.equal(got.data.posts[0].meta, null);
  assert.deepEqual(got.data.posts[1].meta, { category: 'safety', productKey: null });
  assert.equal(got.data.posts[0].permalink, 'https://www.facebook.com/p/0');
  const put = (params, body) => h.invoke('put', '/api/admin/bot-posts/:postId', { params, body, user: { role: 'admin', username: 'boss' } });
  assert.equal((await put({ postId: 'p_0' }, { category: 'bogus' })).code, 400);
  assert.equal((await put({ postId: 'p 0!' }, { category: 'news' })).code, 400);
  assert.equal((await put({ postId: 'p_0' }, { category: 'loan', productKey: 'old_loan' })).code, 400, 'inactive');
  assert.equal((await put({ postId: 'p_0' }, { category: 'loan', productKey: 'trust' })).code, 400, 'trust is not a loan');
  assert.equal((await put({ postId: 'p_0' }, { category: 'loan', productKey: 'nope' })).code, 400);
  assert.equal(h.updates.length, 0);
  assert.equal(h.invalidated(), 0);
  const ok = await put({ postId: 'p_0' }, { category: 'loan', productKey: 'biz_loan' });
  assert.equal(ok.code, 200);
  assert.equal(h.docs.bot_post_meta.p_0.productKey, 'biz_loan');
  assert.equal(h.docs.bot_post_meta.p_0.updatedBy, 'boss');
  assert.ok(h.docs.bot_post_meta.p_0.updatedAt);
  assert.ok(h.docs.bot_post_meta.p_1, 'other entries kept');
  assert.equal(h.invalidated(), 1);
  const news = await put({ postId: 'p_2' }, { category: 'news', productKey: 'biz_loan' });
  assert.equal(news.data.meta.productKey, null, 'product only kept for loan');
  const del = await h.invoke('delete', '/api/admin/bot-posts/:postId', { params: { postId: 'p_0' } });
  assert.equal(del.code, 200);
  assert.ok(!('p_0' in h.docs.bot_post_meta));
  assert.equal(h.invalidated(), 3);
  assert.ok(h.logs.some(log => log.action === 'bot_post_meta_clear'));
});

// ---------- D21 ----------
test('greetingText is gone: ignored on PUT, absent from GET, no Messenger profile refresh', async () => {
  assert.equal(validateBotContent({ welcomeText: '', paymentAccounts: [], greetingText: 'я'.repeat(500) }).ok, true, 'old clients may still send it');
  assert.equal('greetingText' in validateBotContent({ welcomeText: '', paymentAccounts: [], greetingText: 'x' }).value, false);
  const h = harness({ docs: { bot_greeting_text: 'Хуучин' } });
  const got = await h.invoke('get', '/api/admin/bot-content');
  assert.ok(!('greetingText' in got.data) && !('defaultGreetingText' in got.data));
  const saved = await h.invoke('put', '/api/admin/bot-content', { body: { welcomeText: '', paymentAccounts: [], greetingText: 'Шинэ' } });
  assert.equal(saved.code, 200);
  assert.deepEqual(saved.data, { ok: true, welcomeText: '', paymentAccounts: [] });
  assert.equal(h.docs.bot_greeting_text, 'Хуучин', 'old value untouched');
  assert.ok(h.updates.every(update => update.filter.key !== 'bot_greeting_text'));
});

test('bot_cards defaults: menu = 5 cards, loans derived from ProductContent incl. CMS-only products, trust/contact from current nodes', async () => {
  const ctx = ctxOf({ products: CMS_PRODUCTS });
  const loans = await defaultCards('loans', ctx);
  assert.deepEqual(loans.map(item => item.productKey), ['biz_loan', 'car_loan', 'cons_loan', 'heated_parking'], 'ordered, active, no trust');
  const parking = loans.at(-1);
  assert.deepEqual(parking.buttons, [
    { type: 'terms', title: 'Нөхцөл, шаардлага', value: 'heated_parking' }, { type: 'apply', title: 'Хүсэлт гаргах', value: 'heated_parking' }, { type: 'calculator', title: 'Тооцоолуур', value: 'heated_parking' },
  ]);
  assert.equal(parking.imageUrl, 'https://img/p.png');
  assert.equal((await defaultCards('menu', ctx)).length, 5);
  assert.ok((await defaultCards('menu', ctx)).every(item => checkCard(item).ok), 'defaults satisfy the card validation');
  for (const section of CARD_SECTIONS) assert.ok((await defaultCards(section, ctx)).every(item => checkCard(item).ok), section);
  assert.deepEqual(await defaultCards('payment', ctx), []);
  const contact = (await defaultCards('contact', ctx))[0];
  assert.deepEqual(contact.buttons.map(button => button.type), ['call', 'url', 'node']);
  assert.equal(contact.buttons[0].value, '+97675991919');
  assert.equal((await sectionCards('loans', ctx)).isDefault, true);
  // the loans node renders the CMS-only card with working terms/apply/calculator payloads
  const node = await buildNode('loans', ctx);
  assertNodeShape(node);
  assert.deepEqual(node.cards.at(-1).buttons.map(button => button.payload || button.url), ['terms:heated_parking', 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger', 'https://www.scm.mn/calculator?product=heated_parking&source=messenger']);
});

test('CMS-only product: terms:<key> works (not "олдсонгүй"); inactive product still not found', async () => {
  const terms = await buildNode('terms:heated_parking', ctxOf({ products: CMS_PRODUCTS }));
  assert.match(terms.cards[0].text, /^Дулаан зогсоолын зээл\n\nИргэн/);
  assert.equal(terms.cards[0].buttons[0].url, 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger');
  assert.match((await buildNode('terms:heated_parking', ctxOf())).text, /олдсонгүй/, 'absent from ProductContent');
  assert.equal((await buildNode('calc:heated_parking', ctxOf({ products: CMS_PRODUCTS }))).cards[0].title, 'Дулаан зогсоолын зээл — тооцоолуур');
});

test('stored bot_cards override defaults per section; inactive cards and cards of inactive products are hidden; button kinds resolve', async () => {
  const stored = { version: 1, sections: {
    loans: [
      { id: 'a', title: 'Миний карт', subtitle: 'Тайлбар', imageUrl: 'https://img/own.png', productKey: 'biz_loan', active: true, buttons: [
        { type: 'terms', title: 'Нөхцөл', value: 'biz_loan' }, { type: 'apply', title: 'Хүсэлт', value: 'biz_loan' }, { type: 'calculator', title: 'Тооцоолуур', value: 'biz_loan' }] },
      { id: 'b', title: 'Идэвхгүй', active: false, buttons: [] },
      { id: 'c', title: 'Хуучин бүтээгдэхүүн', productKey: 'old_loan', active: true, buttons: [] },
      { id: 'd', title: 'Мэдээлэл', active: true, buttons: [
        { type: 'url', title: 'Сайт', value: 'https://example.com/x' }, { type: 'call', title: 'Залгах', value: '7599-1919' }, { type: 'post', title: 'Пост', value: 'p_7' }] },
      { id: 'e', title: 'Цэс', active: true, buttons: [{ type: 'node', title: 'Төлөлт', value: 'payment' }, { type: 'url', title: 'Scm', value: 'https://www.scm.mn/loan-request' }, { type: 'calculator', title: 'Итгэлцэл', value: 'trust' }] },
    ],
  } };
  const node = await buildNode('loans', ctxOf({ settings: { bot_cards: stored }, channel: 'web' }));
  assertNodeShape(node);
  assert.deepEqual(node.cards.map(item => item.title), ['Миний карт', 'Мэдээлэл', 'Цэс']);
  assert.equal(node.cards[0].imageUrl, 'https://img/own.png');
  assert.deepEqual(node.cards[1].buttons, [{ kind: 'url', title: 'Сайт', url: 'https://example.com/x' }, { kind: 'call', title: 'Залгах', phone: '+97675991919' }, { kind: 'postback', title: 'Пост', payload: 'post:p_7' }]);
  assert.deepEqual(node.cards[2].buttons.map(button => button.payload || button.url), ['payment', 'https://www.scm.mn/loan-request?source=web', 'https://www.scm.mn/trust-calculator?source=web']);
  assert.equal(node.cards[1].imageUrl, FALLBACK_IMAGE_URL);
  // other sections stay default
  assert.equal((await sectionCards('menu', ctxOf({ settings: { bot_cards: stored } }))).isDefault, true);
  // a card linked to a product takes the product image when its own is blank
  const linked = await buildNode('loans', ctxOf({ settings: { bot_cards: { sections: { loans: [{ id: 'x', title: 'Авто', productKey: 'cons_loan', buttons: [] }] } } } }));
  assert.equal(linked.cards[0].imageUrl, 'https://img/c.png');
  // payment cards are appended below the accounts text; contact buttons come from the first active contact card
  const payment = await buildNode('payment', ctxOf({ settings: { payment_accounts: ACCOUNTS, bot_cards: { sections: { payment: [{ id: 'p', title: 'Анхаар', subtitle: 'Гүйлгээний утга', buttons: [{ type: 'node', title: 'Цэс', value: 'restart' }] }] } } } }));
  assert.match(payment.text, /5000123456/);
  assert.equal(payment.cards[0].title, 'Анхаар');
  const contact = await buildNode('contact', ctxOf({ settings: { bot_cards: { sections: { contact: [{ id: 'c', title: 'К', buttons: [{ type: 'url', title: 'Сайт', value: 'https://www.scm.mn/contact' }] }] } } } }));
  assert.deepEqual(contact.buttons, [{ kind: 'url', title: 'Сайт', url: 'https://www.scm.mn/contact?source=messenger' }]);
  const none = await buildNode('contact', ctxOf({ settings: { bot_cards: { sections: { contact: [{ id: 'c', title: 'К', active: false, buttons: [] }] } } } }));
  assert.equal(none.buttons[0].kind, 'call', 'built-in buttons are the fallback');
  // corrupt stored value never breaks a node
  assert.equal((await buildNode('loans', ctxOf({ settings: { bot_cards: 'garbage' } }))).cards.length, 3);
  assert.equal((await buildNode('loans', ctxOf({ settings: { bot_cards: { sections: { loans: [null, 5, { title: '' }] } } } }))).cards, undefined, 'all stored cards invalid -> empty text node');
});

test('default image: SiteConfig bot_default_image_url, else the site fallback; only https', async () => {
  const custom = await buildNode('restart', ctxOf({ settings: { bot_default_image_url: 'https://cdn.scm.mn/bot.png' } }));
  assert.ok(custom.cards.every(item => item.imageUrl === 'https://cdn.scm.mn/bot.png'));
  const insecure = await buildNode('restart', ctxOf({ settings: { bot_default_image_url: 'http://x/y.png' } }));
  assert.equal(insecure.cards[0].imageUrl, FALLBACK_IMAGE_URL);
  const broken = await buildNode('restart', { ...ctxOf(), loadSetting: async () => { throw new Error('db'); } });
  assert.equal(broken.cards[0].imageUrl, FALLBACK_IMAGE_URL);
  const own = await buildNode('loans', ctxOf({ settings: { bot_default_image_url: 'https://cdn.scm.mn/bot.png' } }));
  assert.equal(own.cards[2].imageUrl, 'https://img/c.png', 'a product image beats the default');
  assert.equal(own.cards[0].imageUrl, 'https://cdn.scm.mn/bot.png');
});

test('post:<id> node: image + full text + [apply/contact][Facebook-т нээх][Буцах -> ads]', async () => {
  assert.ok(isNodeId('post:123_456') && !isNodeId('post:') && !isNodeId('post:a b'));
  const body = `Зээл олгож байна\n${'Дэлгэрэнгүй текст '.repeat(100)}`;
  const posts = [
    { id: '1_1', message: body, full_picture: 'https://fb/img.jpg', permalink_url: 'https://www.facebook.com/p/1' },
    { id: '1_2', message: 'Залилангаас сэрэмжил', permalink_url: 'https://www.facebook.com/p/2' },
    { id: '1_3', message: 'Зээл', permalink_url: 'javascript:alert(1)' },
  ];
  const meta = { '1_3': { category: 'loan', productKey: 'biz_loan' } };
  const node = await buildNode('post:1_1', ctxOf({ posts }));
  assert.equal(node.text, body.replace(/\s+\n/g, '\n').trim());
  assert.ok(node.text.length > 1500, 'full text, not truncated to a card');
  assert.equal(node.imageUrl, 'https://fb/img.jpg');
  assert.deepEqual(node.buttons.map(button => [button.title, button.payload || button.url]), [['Хүсэлт гаргах', 'https://www.scm.mn/loan-request?source=messenger'], ['Facebook-т нээх', 'https://www.facebook.com/p/1'], ['Буцах', 'ads']]);
  assert.deepEqual(quickPayloads(node), ['restart']);
  const safety = await buildNode('post:1_2', ctxOf({ posts }));
  assert.equal(safety.imageUrl, undefined);
  assert.deepEqual(safety.buttons.map(button => button.payload || button.url), ['contact', 'https://www.facebook.com/p/2', 'ads']);
  const linked = await buildNode('post:1_3', ctxOf({ posts, settings: { bot_post_meta: meta } }));
  assert.deepEqual(linked.buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?product=biz_loan&source=messenger', 'ads'], 'no usable permalink -> no Facebook button');
  const missing = await buildNode('post:nope', ctxOf({ posts }));
  assert.match(missing.text, /олдсонгүй/);
  assert.deepEqual(quickPayloads(missing), ['ads', 'restart']);
  assert.match((await buildNode('post:x', { ...ctxOf(), getPosts: async () => { throw new Error('graph'); } })).text, /олдсонгүй/);
  assert.match((await buildNode(`post:${'a'.repeat(101)}`, ctxOf({ posts }))).text, /олсонгүй/);
  assert.match((await buildNode('post:1_1', ctxOf({ posts: [{ id: '1_1', full_picture: 'https://fb/i.jpg' }] }))).text, /\S/, 'picture-only post still has text');
});

test('validateBotCards: shape, limits, button types and values, duplicate ids, https images, default image', () => {
  const card = (patch = {}) => ({ id: 'c1', title: 'Карт', subtitle: 'Тайлбар', imageUrl: 'https://img/x.png', productKey: null, active: true, buttons: [{ type: 'node', title: 'Зээл', value: 'loans' }], ...patch });
  const ok = validateBotCards({ sections: { menu: [card()], loans: { cards: [card({ id: 'c2' })] } }, defaultImageUrl: ' https://img/d.png ' });
  assert.equal(ok.ok, true);
  assert.deepEqual(Object.keys(ok.value.sections), ['menu', 'loans']);
  assert.equal(ok.value.defaultImageUrl, 'https://img/d.png');
  assert.equal(validateBotCards({ defaultImageUrl: '' }).value.defaultImageUrl, '', 'empty clears the default image');
  assert.equal(validateBotCards({ sections: { menu: [{ title: 'Идгүй', buttons: [] }] } }).value.sections.menu[0].id, 'menu_1', 'missing id is generated');
  const btn = (type, value, title = 'Т') => card({ buttons: [{ type, title, value }] });
  const good = [btn('terms', 'biz_loan'), btn('apply', 'heated_parking'), btn('calculator', ''), btn('calculator', 'trust'), btn('url', 'https://scm.mn/x'), btn('call', '99001234'), btn('post', '123_456'), btn('node', 'post:1_2'), btn('node', 'terms:biz_loan')];
  for (const item of good) assert.equal(validateBotCards({ sections: { menu: [item] } }).ok, true, JSON.stringify(item.buttons));
  const bad = [
    card({ title: '' }), card({ title: 'я'.repeat(81) }), card({ subtitle: 'я'.repeat(81) }), card({ id: 'a b' }), card({ id: 5 }), card({ imageUrl: 'http://x/y.png' }), card({ imageUrl: 'javascript:alert(1)' }),
    card({ productKey: 'a b' }), card({ active: 'yes' }), card({ buttons: 'x' }), card({ buttons: Array.from({ length: 4 }, () => ({ type: 'node', title: 'Т', value: 'loans' })) }),
    btn('bogus', 'x'), btn('node', 'nope'), btn('node', 'apply:biz_loan'), btn('terms', ''), btn('apply', 'a b'), btn('calculator', 'a b'), btn('url', 'http://insecure.com'), btn('url', 'javascript:alert(1)'),
    btn('call', 'abc'), btn('post', 'a b'), btn('node', 'loans', ''), btn('node', 'loans', 'я'.repeat(21)), card({ buttons: [null] }), null, 'x',
  ];
  for (const item of bad) assert.equal(validateBotCards({ sections: { menu: [item] } }).ok, false, JSON.stringify(item)?.slice(0, 90));
  for (const body of [null, {}, { sections: {} }, { sections: [] }, { sections: { bogus: [] } }, { sections: { menu: 'x' } }, { defaultImageUrl: 5 }, { defaultImageUrl: 'http://x/y.png' },
    { sections: { menu: Array.from({ length: 11 }, (_, i) => card({ id: `c${i}` })) } }, { sections: { menu: [card(), card()] } }]) {
    assert.equal(validateBotCards(body).ok, false, JSON.stringify(body)?.slice(0, 80));
  }
});

test('admin bot-cards: admin only; GET defaults (isDefault) + products; PUT validates and merges sections; reset restores defaults; default image', async () => {
  const h = harness({ products: CMS_PRODUCTS });
  const employee = { role: 'employee' };
  assert.equal((await h.invoke('get', '/api/admin/bot-cards', { user: employee })).code, 403);
  assert.equal((await h.invoke('put', '/api/admin/bot-cards', { user: employee, body: { defaultImageUrl: '' } })).code, 403);
  assert.equal((await h.invoke('post', '/api/admin/bot-cards/reset/:section', { user: employee, params: { section: 'menu' } })).code, 403);
  const got = await h.invoke('get', '/api/admin/bot-cards');
  assert.equal(got.code, 200);
  assert.equal(got.headers['Cache-Control'], 'no-store');
  assert.deepEqual(Object.keys(got.data.sections), CARD_SECTIONS);
  assert.ok(CARD_SECTIONS.every(name => got.data.sections[name].isDefault === true));
  assert.equal(got.data.sections.menu.cards.length, 5);
  assert.deepEqual(got.data.sections.loans.cards.map(item => item.productKey), ['biz_loan', 'car_loan', 'cons_loan', 'heated_parking']);
  assert.equal(got.data.defaultImageUrl, '');
  assert.equal(got.data.fallbackImageUrl, FALLBACK_IMAGE_URL);
  assert.ok(got.data.products.some(item => item.productKey === 'heated_parking'));
  assert.deepEqual(got.data.products.find(item => item.productKey === 'trust'), { productKey: 'trust', title: 'Итгэлцэл', isTrust: true });
  assert.ok(!got.data.products.some(item => item.productKey === 'old_loan'), 'inactive products are not offered');

  const card = { id: 'z', title: 'Шинэ', subtitle: '', imageUrl: '', productKey: 'heated_parking', active: true, buttons: [{ type: 'apply', title: 'Хүсэлт', value: 'heated_parking' }] };
  for (const body of [{}, { sections: { menu: [{ ...card, title: '' }] } }, { sections: { bogus: [] } }, { defaultImageUrl: 'http://x/y.png' }]) {
    assert.equal((await h.invoke('put', '/api/admin/bot-cards', { body })).code, 400, JSON.stringify(body));
  }
  assert.equal(h.updates.length, 0);
  assert.equal(h.invalidated(), 0);
  const saved = await h.invoke('put', '/api/admin/bot-cards', { body: { sections: { loans: [card] }, defaultImageUrl: 'https://img/d.png', extra: 1 } });
  assert.equal(saved.code, 200);
  assert.deepEqual(saved.data.saved, ['loans']);
  assert.equal(saved.data.sections.loans.isDefault, false);
  assert.equal(saved.data.defaultImageUrl, 'https://img/d.png');
  assert.deepEqual(h.docs.bot_cards, { version: 1, sections: { loans: [card] } });
  assert.equal(h.docs.bot_default_image_url, 'https://img/d.png');
  assert.ok(h.updates.every(update => update.update.$setOnInsert.group === 'chatbot'));
  assert.equal(h.invalidated(), 1);
  assert.deepEqual(h.logs.at(-1), { action: 'bot_cards_update', details: 'sections:loans default_image' });
  await h.invoke('put', '/api/admin/bot-cards', { body: { sections: { trust: { cards: [{ ...card, id: 't', productKey: null }] } } } });
  assert.deepEqual(Object.keys(h.docs.bot_cards.sections).sort(), ['loans', 'trust'], 'other sections are merged, not replaced');
  const again = await h.invoke('get', '/api/admin/bot-cards');
  assert.equal(again.data.sections.loans.isDefault, false);
  assert.equal(again.data.sections.menu.isDefault, true);
  assert.equal(again.data.defaultImageUrl, 'https://img/d.png');
  // the public node uses the saved cards and the new default image
  const node = await h.invoke('get', '/api/bot/node/:id', { user: undefined, params: { id: 'loans' } });
  assert.deepEqual(node.data.cards.map(item => item.title), ['Шинэ']);
  // reset
  assert.equal((await h.invoke('post', '/api/admin/bot-cards/reset/:section', { params: { section: 'bogus' } })).code, 400);
  const reset = await h.invoke('post', '/api/admin/bot-cards/reset/:section', { params: { section: 'loans' } });
  assert.equal(reset.code, 200);
  assert.equal(reset.data.isDefault, true);
  assert.equal(reset.data.cards.length, 4);
  assert.deepEqual(Object.keys(h.docs.bot_cards.sections), ['trust']);
  assert.equal(h.docs.bot_default_image_url, 'https://img/d.png', 'reset keeps the default image');
  assert.deepEqual(h.logs.at(-1), { action: 'bot_cards_reset', details: 'section:loans' });
  const cleared = await h.invoke('put', '/api/admin/bot-cards', { body: { defaultImageUrl: '' } });
  assert.equal(cleared.data.defaultImageUrl, '');
  assert.equal(h.docs.bot_default_image_url, '');
});

test('admin bot-posts accepts CMS-only loan products as post product (D21 #3 validation)', async () => {
  const h = harness({ products: CMS_PRODUCTS });
  const got = await h.invoke('get', '/api/admin/bot-posts');
  assert.ok(got.data.products.some(item => item.productKey === 'heated_parking'));
  const ok = await h.invoke('put', '/api/admin/bot-posts/:postId', { params: { postId: 'p_1' }, body: { category: 'loan', productKey: 'heated_parking' } });
  assert.equal(ok.code, 200);
  assert.equal(h.docs.bot_post_meta.p_1.productKey, 'heated_parking');
  const node = await h.invoke('get', '/api/bot/node/:id', { user: undefined, params: { id: 'ads' } });
  assert.deepEqual(node.data.cards[0].buttons.map(button => button.payload || button.url), ['https://www.scm.mn/loan-request?product=heated_parking&source=webchat', 'terms:heated_parking', 'https://www.scm.mn/calculator?product=heated_parking&source=web']);
});

test('language nodes: choose language, English placeholder (bilingual), Mongolian = restart; valid node ids', async () => {
  for (const id of ['language', 'lang:mn', 'lang:en']) assert.ok(isNodeId(id), id);
  assert.ok(!isNodeId('lang:fr'));
  const language = await buildNode('language', ctxOf());
  assert.deepEqual(language.quickReplies.map(reply => [reply.title, reply.payload]), [['Монгол', 'lang:mn'], ['English', 'lang:en']]);
  const english = await buildNode('lang:en', ctxOf());
  assert.match(english.text, /English version is coming soon\. For now, please continue in Mongolian\.\nАнгли хувилбар одоогоор хийгдэж байна\. Түр монголоор үргэлжлүүлнэ үү\./);
  assert.deepEqual(english.quickReplies, [{ title: 'Монголоор үргэлжлүүлэх', payload: 'restart' }]);
  assert.deepEqual(await buildNode('lang:mn', ctxOf()), await buildNode('restart', ctxOf()));
});

// ---------- D23: steering to the web form ----------
test('D23 apply actions are web_url buttons: card apply, terms, trust, per channel source (messenger / webchat)', async () => {
  const messenger = await buildNode('loans', ctxOf());
  assert.equal(messenger.cards[0].buttons[1].url, 'https://www.scm.mn/loan-request?product=biz_loan&source=messenger');
  const web = await buildNode('loans', ctxOf({ channel: 'web' }));
  assert.equal(web.cards[0].buttons[1].url, 'https://www.scm.mn/loan-request?product=biz_loan&source=webchat');
  assert.equal(applyUrl('', { channel: 'messenger' }), 'https://www.scm.mn/loan-request?source=messenger');
  assert.equal(applyUrl('trust', { channel: 'messenger' }), 'https://www.scm.mn/trust-request?source=messenger');
  assert.equal(applyUrl('car_loan', { channel: 'messenger' }), 'https://www.scm.mn/loan-request?product=car_loan&source=messenger', 'car_loan stays; the form offers the variant choice');
  assert.equal(applyUrl('bad key!', { channel: 'messenger' }), 'https://www.scm.mn/loan-request?source=messenger');
  const apply = node => JSON.stringify(node).includes('"payload":"apply');
  for (const id of ['loans', 'trust', 'ads', 'terms:biz_loan']) assert.equal(apply(await buildNode(id, ctxOf({ posts: [{ id: 'p1', message: 'Зээл' }] }))), false, `${id} has no apply postback`);
});

test('D23 shortenAnswer: <=3 sentences, <=400 chars, cut at a sentence end; decimals are not sentence ends', () => {
  assert.equal(shortenAnswer('Нэг. Хоёр! Гурав? Дөрөв.'), 'Нэг. Хоёр! Гурав?');
  assert.equal(shortenAnswer('Хүү 1.5% сар бүр. Хугацаа 12 сар.'), 'Хүү 1.5% сар бүр. Хугацаа 12 сар.');
  const long = `${'а'.repeat(250)}. ${'б'.repeat(250)}. Гурав.`;
  assert.equal(shortenAnswer(long), `${'а'.repeat(250)}.`, 'the second sentence would exceed 400 -> dropped whole');
  const one = shortenAnswer(`${'слово '.repeat(120)}`);
  assert.ok(one.length <= 400 && one.endsWith('…'), 'a single over-long sentence is cut at a word');
  assert.equal(shortenAnswer('  \n '), '');
  assert.equal(shortenAnswer(null), '');
  for (const text of ['а '.repeat(500), 'Өгүүлбэр. '.repeat(40)]) assert.ok(shortenAnswer(text).length <= 400);
});

test('D23 detectProduct: key, title, synonyms (авто, ипотек, бизнес, хэрэглээ, кредит карт, үл хөдлөх, шугам, зогсоол, итгэлцэл), title words; null otherwise', async () => {
  const all = [
    ...CMS_PRODUCTS,
    { productKey: 'credit_card', title: 'Кредит карт', order: 7, isActive: true },
    { productKey: 're_loan', title: 'Үл хөдлөх барьцаалсан зээл', order: 8, isActive: true },
    { productKey: 'line_loan', title: 'Зээлийн шугам', order: 9, isActive: true },
    { productKey: 'mortgage', title: 'Орон сууцны зээл', order: 10, isActive: true },
  ];
  const ctx = ctxOf({ products: all });
  const key = async text => (await detectProduct(text, ctx))?.productKey ?? null;
  assert.equal(await key('Машин авах зээл хэд вэ'), 'car_loan');
  assert.equal(await key('авто зээл авмаар байна'), 'car_loan');
  assert.equal(await key('Ипотекийн зээл байна уу'), 'mortgage');
  assert.equal(await key('орон сууц авъя'), 'mortgage');
  assert.equal(await key('бизнесээ тэлэх'), 'biz_loan');
  assert.equal(await key('хэрэглээний зээлийн хүү'), 'cons_loan');
  assert.equal(await key('кредит карт'), 'credit_card');
  assert.equal(await key('үл хөдлөх хөрөнгө барьцаалж'), 're_loan');
  assert.equal(await key('зээлийн шугам'), 'line_loan');
  assert.equal(await key('Дулаан зогсоол авах'), 'heated_parking');
  assert.equal(await key('итгэлцэл гэж юу вэ'), 'trust');
  assert.equal(await key('heated_parking'), 'heated_parking', 'productKey in the text');
  assert.equal(await key('Сайн байна уу'), null);
  assert.equal(await key('зээл авмаар байна'), null, 'generic word does not select a product');
  assert.equal(await key('   '), null);
  const noMortgage = ctxOf({ products: PRODUCTS });
  assert.equal(await detectProduct('ипотек', noMortgage), null, 'synonym only matches an existing active product');
  assert.equal(await detectProduct('хуучин', noMortgage), null, 'inactive product never matches');
});

test('D23 buildSteeringNode: detected product -> its card with [Нөхцөл][Хүсэлт гаргах web_url][Тооцоолуур]; none -> loans carousel; quick replies [Зээл][Итгэлцэл][Цэс]', async () => {
  const single = await buildSteeringNode('Машин авах зээл', ctxOf({ channel: 'messenger' }));
  assertNodeShape(single);
  assert.equal(single.cards.length, 1);
  assert.equal(single.cards[0].title, 'Автомашины зээл');
  assert.deepEqual(single.cards[0].buttons.map(button => [button.title, button.payload || button.url]), [
    ['Нөхцөл, шаардлага', 'terms:car_loan'], ['Хүсэлт гаргах', 'https://www.scm.mn/loan-request?product=car_loan&source=messenger'], ['Тооцоолуур', 'https://www.scm.mn/calculator?product=car_loan&source=messenger'],
  ]);
  assert.deepEqual(quickPayloads(single), ['loans', 'trust', 'restart']);
  const parking = await buildSteeringNode('дулаан зогсоол', ctxOf({ products: CMS_PRODUCTS, channel: 'messenger' }));
  assert.equal(parking.cards[0].buttons[1].url, 'https://www.scm.mn/loan-request?product=heated_parking&source=messenger');
  const trust = await buildSteeringNode('итгэлцэл', ctxOf({ channel: 'messenger' }));
  assert.ok(trust.cards[0].buttons.some(button => button.url === 'https://www.scm.mn/trust-request?source=messenger'));
  const carousel = await buildSteeringNode('Сайн байна уу', ctxOf({ channel: 'messenger' }));
  assertNodeShape(carousel);
  assert.deepEqual(carousel.cards.map(item => item.title), ['Бизнесийн зээл', 'Автомашины зээл', 'Хэрэглээний зээл']);
  assert.ok(carousel.cards.every(item => item.buttons.some(button => /\/loan-request\?product=/.test(button.url || ''))), 'every card shows the apply link');
  assert.deepEqual(quickPayloads(carousel), ['loans', 'trust', 'restart']);
  // A stored card without an apply button still shows one (replaced into the 3-button limit).
  const stripped = { bot_cards: { version: 1, sections: { loans: [{ id: 'l1', title: 'Бизнес', productKey: 'biz_loan', active: true, buttons: [{ type: 'terms', title: 'Нөхцөл', value: 'biz_loan' }, { type: 'calculator', title: 'Тооцоо', value: 'biz_loan' }, { type: 'node', title: 'Цэс', value: 'restart' }] }] } } };
  const forced = await buildSteeringNode('бизнес', ctxOf({ settings: stripped, channel: 'messenger' }));
  assert.equal(forced.cards[0].buttons.length, 3);
  assert.equal(forced.cards[0].buttons[2].url, 'https://www.scm.mn/loan-request?product=biz_loan&source=messenger');
});

test('D23 buildSteeringNode never fails: no active products or loader errors still give an apply button', async () => {
  const empty = await buildSteeringNode('Сайн байна уу', ctxOf({ products: [], channel: 'messenger' }));
  assert.equal(empty.buttons[0].url, 'https://www.scm.mn/loan-request?source=messenger');
  assert.deepEqual(quickPayloads(empty), ['loans', 'trust', 'restart']);
  const broken = await buildSteeringNode('машин', { loadProducts: async () => { throw new Error('db'); }, loadSetting: async () => { throw new Error('db'); }, channel: 'messenger' });
  assert.equal(broken.buttons[0].url, 'https://www.scm.mn/loan-request?source=messenger');
  const apply = buildApplyNode('car_loan', { channel: 'messenger' }, { title: 'Автомашины зээл' });
  assert.match(apply.text, /Автомашины зээл/);
  assert.deepEqual(apply.buttons, [{ kind: 'url', title: 'Хүсэлт гаргах', url: 'https://www.scm.mn/loan-request?product=car_loan&source=messenger' }]);
});
