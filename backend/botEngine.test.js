import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNode, formatTerms, sanitizeAccounts, validateBotContent, createBotContentSource, registerBotRoutes, isNodeId,
  DEFAULT_WELCOME, MAX_CARDS,
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
    assert.ok(cardItem.buttons.length >= 1 && cardItem.buttons.length <= 3);
    for (const button of cardItem.buttons) {
      assert.ok(button.title.length <= 20);
      assert.ok(button.kind === 'postback' ? typeof button.payload === 'string' : /^https:\/\/www\.scm\.mn\//.test(button.url) || /^https:\/\//.test(button.url));
    }
    if (cardItem.imageUrl) assert.match(cardItem.imageUrl, /^https:\/\//);
  }
  assert.ok((node.quickReplies || []).length <= 13);
  for (const reply of node.quickReplies || []) assert.ok(reply.title.length <= 20 && reply.payload);
}

test('restart: default welcome, admin welcome from bot_welcome_text, 4 menu quick replies', async () => {
  const node = await buildNode('restart', ctxOf());
  assert.equal(node.text, DEFAULT_WELCOME);
  assert.deepEqual(node.quickReplies.map(reply => [reply.title, reply.payload]), [['Зээл', 'loans'], ['Итгэлцэл', 'trust'], ['Идэвхтэй зээлийн зар', 'ads'], ['Төлөлт хийх', 'payment']]);
  assertNodeShape(node);
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
  assert.equal(node.cards[0].imageUrl, undefined, 'non-https image dropped');
  assert.deepEqual(cons.buttons, [
    { kind: 'postback', title: 'Нөхцөл, шаардлага', payload: 'terms:cons_loan' },
    { kind: 'postback', title: 'Хүсэлт гаргах', payload: 'apply:cons_loan' },
    { kind: 'url', title: 'Тооцоолуур', url: 'https://www.scm.mn/calculator?product=cons_loan&source=messenger' },
  ]);
  assert.ok(node.cards.every(item => item.buttons[1].payload !== 'apply:trust'));
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
  assert.match(biz.text, /^Бизнесийн зээл\n\nИргэн\nНөхцөл:\n• Хүү 2%\n• Хугацаа 12 сар\nШаардлага:\n• 18 нас хүрсэн\n\nБайгууллага\nНөхцөл:\n• Хүү 3%/);
  assert.deepEqual(quickPayloads(biz), ['apply:biz_loan', 'calc:biz_loan', 'loans', 'restart']);
  const cons = await buildNode('terms:cons_loan', ctxOf());
  assert.ok(!cons.text.includes('Байгууллага'), 'organization block omitted when absent');
  const car = await buildNode('terms:car_loan', ctxOf());
  assert.match(car.text, /Худалдан авах — Иргэн/);
  assert.match(car.text, /Худалдан авах — Байгууллага/);
  assert.match(car.text, /Барьцаалсан — Иргэн/);
  assert.ok(!car.text.includes('Барьцаалсан — Байгууллага'));
  assert.ok(car.text.indexOf('Худалдан авах — Иргэн') < car.text.indexOf('Барьцаалсан — Иргэн'));
  const huge = { productKey: 'h', title: 'Том', individual: { conditions: Array.from({ length: 200 }, () => 'я'.repeat(300)), requirements: [] } };
  assert.ok(formatTerms(huge).length <= 8000);
  assert.match(formatTerms({ title: 'Хоосон' }), /одоогоор оруулаагүй/);
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
  assert.equal(bare.cards[0].imageUrl, undefined);
  assert.equal((await buildNode('trust', ctxOf({ channel: 'web' }))).cards[0].buttons[0].url, 'https://www.scm.mn/trust-request?source=web');
});

test('ads: last 6 posts, permalink + apply:post:<id> buttons, junk skipped, empty/failed Graph -> text', async () => {
  const posts = Array.from({ length: 9 }, (_, i) => ({ id: `p_${i}`, message: `Гарчиг ${i}\n${'Тайлбар '.repeat(30)}`, full_picture: 'https://fb/img.jpg', permalink_url: `https://www.facebook.com/p/${i}` }));
  posts.splice(2, 0, { id: 'x' }, { message: 'no id' });
  const node = await buildNode('ads', ctxOf({ posts }));
  assertNodeShape(node);
  assert.equal(node.cards.length, 6);
  assert.equal(node.cards[0].title, 'Гарчиг 0');
  assert.equal(node.cards[0].subtitle.length, 80);
  assert.deepEqual(node.cards[0].buttons.map(button => button.payload || button.url), ['https://www.facebook.com/p/0', 'apply:post:p_0']);
  const noLink = await buildNode('ads', ctxOf({ posts: [{ id: 'p_1', message: 'Зар', permalink_url: 'javascript:alert(1)' }] }));
  assert.deepEqual(noLink.cards[0].buttons.map(button => button.payload), ['apply:post:p_1']);
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
function harness({ docs = {}, limiter, logs = [] } = {}) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'put'].map(method => [method, (path, ...handlers) => routes.set(`${method}:${path}`, handlers)]));
  const updates = [];
  const SiteConfig = {
    findOne: ({ key }) => ({ lean: async () => (docs[key] === undefined ? null : { value: docs[key] }) }),
    findOneAndUpdate: async (filter, update) => { updates.push({ filter, update }); docs[filter.key] = update.$set.value; },
  };
  let invalidated = 0;
  const content = { loadProducts: async () => PRODUCTS, loadSetting: async key => docs[key], invalidate: () => { invalidated += 1; } };
  registerBotRoutes({
    app, source: content, SiteConfig, getPosts: async () => [{ id: 'p_1', message: 'Зар' }], limiter,
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
  return { invoke, updates, docs, logs, invalidated: () => invalidated };
}

test('GET /api/bot/node/:id: public, node JSON with web urls, 404 for unknown/oversized ids, rate limited, no secrets', async () => {
  const h = harness({ docs: { payment_accounts: ACCOUNTS } });
  const loans = await h.invoke('get', '/api/bot/node/:id', { user: undefined, params: { id: 'loans' } });
  assert.equal(loans.code, 200);
  assert.equal(loans.headers['Cache-Control'], 'public, max-age=30');
  assert.equal(loans.data.cards[0].buttons[2].url, 'https://www.scm.mn/calculator?product=biz_loan&source=web');
  assert.equal((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'terms:cons_loan' } })).code, 200);
  assert.match((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'payment' } })).data.text, /5000123456/);
  assert.equal((await h.invoke('get', '/api/bot/node/:id', { params: { id: 'ads' } })).data.cards[0].buttons[0].payload, 'apply:post:p_1');
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
