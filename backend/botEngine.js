// Shared bot engine (design: docs/design/loan-task-management.md §19, D19, WP-A6).
// One content source, two windows: the Messenger bot (scmMessenger.js adapter) and the website chatbot (GET /api/bot/node/:id).
// buildNode(nodeId, ctx) is pure apart from the injected loaders; it never writes anything and never touches Facebook publishing.
//   ctx = { loadProducts(): Promise<ProductContent[]>, loadSetting(key): Promise<any>, getPosts?(): Promise<Post[]>, channel?: 'messenger'|'web' }
// Node  = { text?, cards?: [{ title, subtitle?, imageUrl?, buttons: [{ kind:'postback'|'url', title, payload|url }] }], quickReplies?: [{ title, payload }] }

export const SITE_URL = 'https://www.scm.mn';
export const CONTACT_PHONE = '7599-1919';
export const TRUST_KEY = 'trust';
export const DEFAULT_WELCOME = 'Сайн байна уу! Солонго Капитал ББСБ. Танд юугаар туслах вэ?';
export const WELCOME_KEY = 'bot_welcome_text';
export const PAYMENT_KEY = 'payment_accounts';
export const LEGACY_PAYMENT_TEXT_KEY = 'chatbot_repayment_text'; // AdminPanel "Банк, дансны дугаар, дансны нэр" field (read-only fallback)
export const GREETING_KEY = 'bot_greeting_text';
export const DEFAULT_GREETING = 'Сайн байна уу! Солонго Капитал ББСБ. Зээл, итгэлцэл, төлөлтийн мэдээллийг доорх цэснээс аваарай.';
export const MAX_GREETING = 160;
export const MAX_WELCOME = 500;
export const MAX_ACCOUNTS = 10;
export const MAX_CARDS = 10;
export const MAX_POSTS = 6;
export const MAX_TEXT = 8000;
export const SITE_PATHS = { calculator: '/calculator', trustCalculator: '/trust-calculator', trustRequest: '/trust-request' };
export const POST_META_KEY = 'bot_post_meta';
export const POST_CATEGORIES = ['loan', 'safety', 'news'];
export const MAX_ADMIN_POSTS = 20;
export const MAX_POST_META = 300;
export const CONTACT_KEYS = { phone: 'contact_phone', email: 'contact_email', address: 'contact_address', hours: 'contact_hours' };
export const DEFAULT_HOURS = 'Даваа–Баасан 09:00–18:00';
export const CONTENT_CACHE_MS = 60 * 1000;
const KEY_RE = /^[A-Za-z0-9_-]{1,50}$/;

export const MENU_REPLIES = [
  { title: 'Зээл', payload: 'loans' },
  { title: 'Итгэлцэл', payload: 'trust' },
  { title: 'Идэвхтэй зээлийн зар', payload: 'ads' },
  { title: 'Төлөлт хийх', payload: 'payment' },
];
export const MENU_REPLY = { title: 'Цэс', payload: 'restart' };

// ---------- helpers ----------
const clean = (value, limit) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
const cleanLines = (value, limit) => String(value ?? '').replace(/\r/g, '').split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n').slice(0, limit);
const httpsUrl = value => { try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
const withQuery = (path, params) => {
  const query = Object.entries(params).filter(([, value]) => value).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${SITE_URL}${path}${query ? `?${query}` : ''}`;
};
const sourceOf = ctx => (ctx?.channel === 'web' ? 'web' : 'messenger');
export const calculatorUrl = (productKey, ctx) => withQuery(SITE_PATHS.calculator, { product: productKey, source: sourceOf(ctx) });
export const trustCalculatorUrl = ctx => withQuery(SITE_PATHS.trustCalculator, { source: sourceOf(ctx) });
export const trustRequestUrl = ctx => withQuery(SITE_PATHS.trustRequest, { source: sourceOf(ctx) });

const url = (title, href) => ({ kind: 'url', title, url: href });
const postback = (title, payload) => ({ kind: 'postback', title, payload });
const card = ({ title, subtitle, imageUrl, buttons }) => {
  const out = { title: clean(title, 80) || 'Солонго Капитал' };
  const sub = clean(subtitle, 80);
  if (sub) out.subtitle = sub;
  const image = httpsUrl(imageUrl);
  if (image) out.imageUrl = image;
  out.buttons = (buttons || []).slice(0, 3).map(button => ({ ...button, title: clean(button.title, 20) }));
  return out;
};

const isLoanProduct = product => product && product.productKey && product.productKey !== TRUST_KEY && product.isActive !== false;
const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);

async function activeLoans(ctx) {
  const products = await ctx.loadProducts();
  return (Array.isArray(products) ? products : []).filter(isLoanProduct).sort(byOrder);
}

// ---------- terms formatting ----------
const list = items => (Array.isArray(items) ? items : []).map(item => clean(item, 400)).filter(Boolean);
function userTypeBlock(label, block) {
  const conditions = list(block?.conditions);
  const requirements = list(block?.requirements);
  if (!conditions.length && !requirements.length) return '';
  const parts = [`${label}`];
  if (conditions.length) parts.push('Нөхцөл:', ...conditions.map(item => `• ${item}`));
  if (requirements.length) parts.push('Шаардлага:', ...requirements.map(item => `• ${item}`));
  return parts.join('\n');
}
const variantBlocks = (heading, source) => [
  userTypeBlock(heading ? `${heading} — Иргэн` : 'Иргэн', source?.individual),
  userTypeBlock(heading ? `${heading} — Байгууллага` : 'Байгууллага', source?.organization),
];

export function formatTerms(product) {
  const blocks = [];
  if (product.purchase || product.collateral) { // car_loan: purchase / collateral variants
    if (product.purchase) blocks.push(...variantBlocks(clean(product.purchase.label, 60) || 'Худалдан авах', product.purchase));
    if (product.collateral) blocks.push(...variantBlocks(clean(product.collateral.label, 60) || 'Барьцаалсан', product.collateral));
  } else blocks.push(...variantBlocks('', product));
  const body = blocks.filter(Boolean).join('\n\n');
  const title = clean(product.title, 80);
  return (body ? `${title}\n\n${body}` : `${title}\n\nНөхцөл, шаардлагын мэдээлэл одоогоор оруулаагүй байна. Лавлах утас: ${CONTACT_PHONE}`).slice(0, MAX_TEXT);
}

// ---------- payment ----------
export function sanitizeAccounts(value) {
  return (Array.isArray(value) ? value : []).slice(0, MAX_ACCOUNTS).map(item => ({
    bank: clean(item?.bank, 80), accountNumber: clean(item?.accountNumber, 40), accountName: clean(item?.accountName, 120),
    iban: clean(item?.iban, 40), note: clean(item?.note, 200),
  })).filter(item => item.bank && item.accountNumber && item.accountName);
}
export function formatAccounts(accounts) {
  return accounts.map((a, index) => [
    `${index + 1}. ${a.bank}`, `Дансны дугаар: ${a.accountNumber}`, `Хүлээн авагч: ${a.accountName}`,
    ...(a.iban ? [`IBAN: ${a.iban}`] : []), ...(a.note ? [`Гүйлгээний утга: ${a.note}`] : []),
  ].join('\n')).join('\n\n');
}

// ---------- nodes ----------
const mainReplies = () => MENU_REPLIES.map(reply => ({ ...reply }));
const fallbackNode = () => ({ text: `Уучлаарай, энэ сонголтыг олсонгүй. Доорх цэснээс сонгоно уу эсвэл ${CONTACT_PHONE} дугаарт холбогдоно уу.`, quickReplies: mainReplies() });

async function restartNode(ctx) {
  let welcome = '';
  try { welcome = clean(await ctx.loadSetting(WELCOME_KEY), MAX_WELCOME); } catch { /* default */ }
  return { text: welcome || DEFAULT_WELCOME, quickReplies: mainReplies() };
}

async function loansNode(ctx) {
  const loans = await activeLoans(ctx);
  if (!loans.length) return { text: `Одоогоор идэвхтэй зээлийн бүтээгдэхүүн алга байна. Лавлах утас: ${CONTACT_PHONE}`, quickReplies: [MENU_REPLY] };
  return {
    cards: loans.slice(0, MAX_CARDS).map(product => card({
      title: product.title, subtitle: product.shortDesc, imageUrl: product.bgImageUrl || product.headerImageUrl,
      buttons: [postback('Нөхцөл, шаардлага', `terms:${product.productKey}`), postback('Хүсэлт гаргах', `apply:${product.productKey}`), url('Тооцоолуур', calculatorUrl(product.productKey, ctx))],
    })),
    quickReplies: [{ title: 'Итгэлцэл', payload: 'trust' }, MENU_REPLY],
  };
}

async function termsNode(key, ctx) {
  if (!KEY_RE.test(key)) return fallbackNode();
  const product = (await activeLoans(ctx)).find(item => item.productKey === key);
  if (!product) return { text: 'Энэ бүтээгдэхүүний мэдээлэл олдсонгүй.', quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
  return {
    text: formatTerms(product),
    quickReplies: [{ title: 'Хүсэлт гаргах', payload: `apply:${key}` }, { title: 'Тооцоолуур', payload: `calc:${key}` }, { title: 'Зээл', payload: 'loans' }, MENU_REPLY],
  };
}

// calc:<key> (quick-reply friendly): a single card holding the calculator url button.
async function calcNode(key, ctx) {
  const loans = await activeLoans(ctx);
  const product = KEY_RE.test(key) ? loans.find(item => item.productKey === key) : null;
  return {
    cards: [card({ title: product ? `${product.title} — тооцоолуур` : 'Зээлийн тооцоолуур', subtitle: 'Сар бүрийн төлбөрөө тооцоолоорой', imageUrl: product?.bgImageUrl,
      buttons: [url('Тооцоолуур нээх', calculatorUrl(product?.productKey, ctx))] })],
    quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY],
  };
}

async function trustNode(ctx) {
  const products = await ctx.loadProducts();
  const trust = (Array.isArray(products) ? products : []).find(item => item?.productKey === TRUST_KEY);
  return {
    cards: [card({
      title: trust?.title || 'Итгэлцэл', subtitle: trust?.shortDesc || 'Таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ', imageUrl: trust?.bgImageUrl || trust?.headerImageUrl,
      buttons: [url('Хүсэлт гаргах', trustRequestUrl(ctx)), url('Тооцоолуур', trustCalculatorUrl(ctx))],
    })],
    quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY],
  };
}

// ---------- post categories (D20) ----------
const LOAN_WORDS = /зээл|хүү|олгож|барьцаа|шугам|лизинг/i;
const SAFETY_WORDS = /сэрэмж|залилан|залилуул|анхаар|аюулгүй/i;
export function suggestCategory(message) {
  const text = String(message || '');
  if (SAFETY_WORDS.test(text)) return 'safety';
  if (LOAN_WORDS.test(text)) return 'loan';
  return 'news';
}
const POST_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const sanitizeMeta = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

// -> [{ kind, title, payload|url }] (<=3). `meta` = admin override | undefined; `loans` = active loan products.
export function postButtons(post, meta, loans, ctx) {
  const id = String(post?.id || '');
  const permalink = httpsUrl(post?.permalink_url);
  const category = POST_CATEGORIES.includes(meta?.category) ? meta.category : suggestCategory(post?.message);
  const productKey = category === 'loan' && meta?.productKey && loans.some(item => item.productKey === meta.productKey) ? meta.productKey : '';
  const view = permalink ? [url('Пост үзэх', permalink)] : [];
  const contact = postback('Холбоо барих', 'contact');
  if (category === 'loan' && productKey) {
    return [postback('Хүсэлт гаргах', `apply:${productKey}`), postback('Нөхцөл, шаардлага', `terms:${productKey}`), url('Тооцоолуур', calculatorUrl(productKey, ctx))];
  }
  if (category === 'loan') return [...(POST_ID_RE.test(id) ? [postback('Хүсэлт гаргах', `apply:post:${id}`)] : []), ...view, contact].slice(0, 3);
  return [...view, contact];
}

async function adsNode(ctx) {
  let posts = [];
  try { posts = ctx.getPosts ? await ctx.getPosts() : []; } catch { posts = []; }
  let metas = {};
  try { metas = sanitizeMeta(await ctx.loadSetting(POST_META_KEY)); } catch { metas = {}; }
  let loans = [];
  try { loans = await activeLoans(ctx); } catch { loans = []; }
  const cards = (Array.isArray(posts) ? posts : []).filter(post => post?.id && (post.message || post.full_picture)).slice(0, MAX_POSTS).map(post => {
    const [first = '', ...rest] = String(post.message || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const meta = Object.prototype.hasOwnProperty.call(metas, String(post.id)) ? metas[String(post.id)] : undefined;
    return card({ title: first, subtitle: rest.join(' '), imageUrl: post.full_picture, buttons: postButtons(post, meta, loans, ctx) });
  });
  if (!cards.length) return { text: 'Одоогоор идэвхтэй зар алга байна.', quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
  return { cards, quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
}

// "75991919, 75999191" | "7599-1919" | "+976 7599 1919" -> "+97675991919" (first valid number) | ''
export function normalizePhone(value) {
  const toE164 = raw => {
    const digits = String(raw || '').replace(/[\s()\-.]/g, '');
    if (/^\+?976\d{8}$/.test(digits)) return `+976${digits.slice(-8)}`;
    if (/^\d{8}$/.test(digits)) return `+976${digits}`;
    return '';
  };
  for (const part of String(value ?? '').split(/[,;/]/)) {
    const whole = toE164(part);
    if (whole) return whole;
    for (const token of part.split(/\s+/)) { const hit = toE164(token); if (hit) return hit; }
  }
  return '';
}

async function contactNode(ctx) {
  const read = async (key, limit) => { try { return clean(await ctx.loadSetting(key), limit); } catch { return ''; } };
  const [phone, email, address, hours] = await Promise.all([read(CONTACT_KEYS.phone, 100), read(CONTACT_KEYS.email, 100), read(CONTACT_KEYS.address, 300), read(CONTACT_KEYS.hours, 100)]);
  const lines = ['Солонго Капитал ББСБ — холбоо барих', `Утас: ${phone || CONTACT_PHONE}`];
  if (email) lines.push(`Имэйл: ${email}`);
  if (address) lines.push(`Хаяг: ${address}`);
  lines.push(`Ажлын цаг: ${hours || DEFAULT_HOURS}`);
  const e164 = normalizePhone(phone || CONTACT_PHONE);
  const buttons = [...(e164 ? [{ kind: 'call', title: 'Залгах', phone: e164 }] : []), url('Вэбсайт', SITE_URL), postback('Зээл', 'loans')];
  return { text: lines.join('\n'), buttons, quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
}

function languageNode() {
  return { text: 'Хэлээ сонгоно уу / Choose your language', quickReplies: [{ title: 'Монгол', payload: 'lang:mn' }, { title: 'English', payload: 'lang:en' }] };
}
// No language preference is stored yet (D20); English is a placeholder message.
function englishNode() {
  return {
    text: 'English version is coming soon. For now, please continue in Mongolian.\nАнгли хувилбар одоогоор хийгдэж байна. Түр монголоор үргэлжлүүлнэ үү.',
    quickReplies: [{ title: 'Монголоор үргэлжлүүлэх', payload: 'restart' }],
  };
}

async function paymentNode(ctx) {
  let accounts = [];
  try { accounts = sanitizeAccounts(await ctx.loadSetting(PAYMENT_KEY)); } catch { accounts = []; }
  let text = accounts.length ? `Төлбөр хүлээн авах данснууд:\n\n${formatAccounts(accounts)}` : '';
  if (!text) {
    let legacy = '';
    try { legacy = cleanLines(await ctx.loadSetting(LEGACY_PAYMENT_TEXT_KEY), MAX_TEXT); } catch { /* none */ }
    text = legacy || `Төлбөрийн дансны мэдээлэл одоогоор тохируулаагүй байна. Лавлах утас: ${CONTACT_PHONE}`;
  }
  return { text: text.slice(0, MAX_TEXT), quickReplies: [MENU_REPLY] };
}

export async function buildNode(nodeId, ctx = {}) {
  const id = String(nodeId ?? '').trim();
  try {
    if (id === 'restart' || id === 'menu') return await restartNode(ctx);
    if (id === 'loans') return await loansNode(ctx);
    if (id === 'trust') return await trustNode(ctx);
    if (id === 'ads') return await adsNode(ctx);
    if (id === 'payment') return await paymentNode(ctx);
    if (id === 'contact') return await contactNode(ctx);
    if (id === 'language') return languageNode();
    if (id === 'lang:mn') return await restartNode(ctx);
    if (id === 'lang:en') return englishNode();
    if (id === 'calc') return await calcNode('', ctx);
    if (id.startsWith('terms:')) return await termsNode(id.slice(6), ctx);
    if (id.startsWith('calc:')) return await calcNode(id.slice(5), ctx);
  } catch {
    return { text: `Уучлаарай, мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу эсвэл ${CONTACT_PHONE} дугаарт холбогдоно уу.`, quickReplies: [MENU_REPLY] };
  }
  return fallbackNode();
}

export const NODE_IDS = ['restart', 'loans', 'trust', 'ads', 'payment', 'contact', 'language'];
export const isNodeId = id => NODE_IDS.includes(id) || id === 'menu' || id === 'calc' || id === 'lang:mn' || id === 'lang:en' || /^(terms|calc):[A-Za-z0-9_-]{1,50}$/.test(String(id || ''));

// ---------- admin bot content validation ----------
// -> { ok:true, value:{welcomeText, paymentAccounts} } | { ok:false, message }
export function validateBotContent(body) {
  const welcomeText = typeof body?.welcomeText === 'string' ? body.welcomeText.trim() : null;
  if (welcomeText === null || welcomeText.length > MAX_WELCOME) return { ok: false, message: `Мэндчилгээний текст заавал байх ба ${MAX_WELCOME} тэмдэгтээс ихгүй байна.` };
  if (!Array.isArray(body?.paymentAccounts) || body.paymentAccounts.length > MAX_ACCOUNTS) return { ok: false, message: `Төлбөрийн данс ${MAX_ACCOUNTS}-аас ихгүй жагсаалт байна.` };
  const limits = { bank: 80, accountNumber: 40, accountName: 120, iban: 40, note: 200 };
  const accounts = [];
  for (const raw of body.paymentAccounts) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, message: 'Дансны мэдээлэл буруу байна.' };
    const account = {};
    for (const [field, max] of Object.entries(limits)) {
      const value = raw[field] ?? '';
      if (typeof value !== 'string' || value.trim().length > max) return { ok: false, message: `"${field}" талбар буруу эсвэл ${max} тэмдэгтээс урт байна.` };
      account[field] = value.trim();
    }
    if (!account.bank || !account.accountNumber || !account.accountName) return { ok: false, message: 'Банк, дансны дугаар, хүлээн авагч заавал бөглөнө.' };
    accounts.push(account);
  }
  // greetingText (Messenger Get Started greeting) is optional for backward compatibility: absent -> left unchanged (null).
  let greetingText = null;
  if (body.greetingText !== undefined) {
    if (typeof body.greetingText !== 'string' || body.greetingText.trim().length > MAX_GREETING) return { ok: false, message: `Messenger мэндчилгээ ${MAX_GREETING} тэмдэгтээс ихгүй байна.` };
    greetingText = body.greetingText.trim();
  }
  return { ok: true, value: { welcomeText, paymentAccounts: accounts, greetingText } };
}

// ---------- cached content source (Mongo-backed in server.js, fakes in tests) ----------
export function createBotContentSource({ ProductContent, SiteConfig, now = Date.now, ttlMs = CONTENT_CACHE_MS } = {}) {
  let products = { at: 0, value: null };
  const settings = new Map();
  return {
    async loadProducts() {
      if (products.value && now() - products.at < ttlMs) return products.value;
      const value = await ProductContent.find({ isActive: true }).sort({ order: 1 }).limit(50).lean();
      products = { at: now(), value };
      return value;
    },
    async loadSetting(key) {
      const hit = settings.get(key);
      if (hit && now() - hit.at < ttlMs) return hit.value;
      const doc = await SiteConfig.findOne({ key }).lean();
      settings.set(key, { at: now(), value: doc?.value });
      return doc?.value;
    },
    invalidate() { products = { at: 0, value: null }; settings.clear(); },
  };
}

// ---------- routes ----------
// `limiter` is an Express middleware (rate limit) for the public endpoint. Admin routes: authenticateUser + requireAdmin.
export function registerBotRoutes({ app, authenticateUser, requireAdmin, source, getPosts, SiteConfig, configureProfile = async () => ({ ok: false, skipped: true }), limiter = (_req, _res, next) => next(), createLog = async () => {} }) {
  app.get('/api/bot/node/:id', limiter, async (req, res) => {
    const id = String(req.params.id || '');
    if (id.length > 80 || !isNodeId(id)) return res.status(404).json({ message: 'Node олдсонгүй.' });
    try {
      const node = await buildNode(id, { loadProducts: source.loadProducts, loadSetting: source.loadSetting, getPosts, channel: 'web' });
      res.set?.('Cache-Control', 'public, max-age=30');
      return res.json(node);
    } catch { return res.status(500).json({ message: 'Алдаа гарлаа.' }); }
  });

  app.get('/api/admin/bot-content', authenticateUser, requireAdmin, async (_req, res) => {
    try {
      const [welcome, accounts, legacy, greeting] = await Promise.all([
        SiteConfig.findOne({ key: WELCOME_KEY }).lean(), SiteConfig.findOne({ key: PAYMENT_KEY }).lean(), SiteConfig.findOne({ key: LEGACY_PAYMENT_TEXT_KEY }).lean(), SiteConfig.findOne({ key: GREETING_KEY }).lean(),
      ]);
      res.set?.('Cache-Control', 'no-store');
      return res.json({
        welcomeText: typeof welcome?.value === 'string' ? welcome.value : '', defaultWelcomeText: DEFAULT_WELCOME,
        greetingText: typeof greeting?.value === 'string' ? greeting.value.slice(0, MAX_GREETING) : '', defaultGreetingText: DEFAULT_GREETING,
        paymentAccounts: sanitizeAccounts(accounts?.value),
        legacyPaymentText: typeof legacy?.value === 'string' ? legacy.value.slice(0, MAX_TEXT) : '',
      });
    } catch { return res.status(500).json({ message: 'Ботын агуулгыг ачаалж чадсангүй.' }); }
  });

  app.put('/api/admin/bot-content', authenticateUser, requireAdmin, async (req, res) => {
    const checked = validateBotContent(req.body);
    if (!checked.ok) return res.status(400).json({ message: checked.message });
    try {
      const { welcomeText, paymentAccounts, greetingText } = checked.value;
      await SiteConfig.findOneAndUpdate({ key: WELCOME_KEY }, { $set: { value: welcomeText, updatedAt: new Date() }, $setOnInsert: { label: 'Ботын мэндчилгээ', group: 'chatbot' } }, { upsert: true });
      await SiteConfig.findOneAndUpdate({ key: PAYMENT_KEY }, { $set: { value: paymentAccounts, updatedAt: new Date() }, $setOnInsert: { label: 'Төлбөр хүлээн авах данснууд', group: 'chatbot' } }, { upsert: true });
      if (greetingText !== null) await SiteConfig.findOneAndUpdate({ key: GREETING_KEY }, { $set: { value: greetingText, updatedAt: new Date() }, $setOnInsert: { label: 'Messenger мэндчилгээ', group: 'chatbot' } }, { upsert: true });
      source.invalidate();
      await createLog(req.user, 'bot_content_update', `accounts:${paymentAccounts.length}`);
      let profile = null;
      if (greetingText !== null) { try { profile = await configureProfile(); } catch { profile = { ok: false }; } } // Messenger greeting refresh (best effort)
      return res.json({ ok: true, welcomeText, paymentAccounts, ...(greetingText !== null ? { greetingText, profile: { ok: Boolean(profile?.ok) } } : {}) });
    } catch { return res.status(500).json({ message: 'Хадгалахад алдаа гарлаа.' }); }
  });

  // ---- D20: post categories (admin only) ----
  const readMetas = async () => sanitizeMeta((await SiteConfig.findOne({ key: POST_META_KEY }).lean())?.value);
  const writeMetas = async metas => {
    const entries = Object.entries(metas).sort((a, b) => String(b[1]?.updatedAt || '').localeCompare(String(a[1]?.updatedAt || ''))).slice(0, 200);
    await SiteConfig.findOneAndUpdate({ key: POST_META_KEY }, { $set: { value: Object.fromEntries(entries), updatedAt: new Date() }, $setOnInsert: { label: 'Ботын пост ангилал', group: 'chatbot' } }, { upsert: true });
    source.invalidate();
  };
  const actorOf = user => clean(user?.username || user?.email || user?.name || user?._id || user?.id || '', 80);

  app.get('/api/admin/bot-posts', authenticateUser, requireAdmin, async (_req, res) => {
    try {
      let posts = [];
      try { posts = await getPosts(); } catch { posts = []; }
      const metas = await readMetas();
      const items = (Array.isArray(posts) ? posts : []).filter(post => post?.id).slice(0, MAX_ADMIN_POSTS).map(post => {
        const id = String(post.id);
        const meta = Object.prototype.hasOwnProperty.call(metas, id) ? metas[id] : null;
        return {
          id, createdTime: post.created_time || '', message: String(post.message || '').slice(0, MAX_POST_META), imageUrl: httpsUrl(post.full_picture) || '', permalink: httpsUrl(post.permalink_url) || '',
          meta: meta && POST_CATEGORIES.includes(meta.category) ? { category: meta.category, productKey: meta.productKey || null } : null,
          suggested: { category: suggestCategory(post.message) },
        };
      });
      let products = [];
      try { products = (await activeLoans({ loadProducts: source.loadProducts })).map(item => ({ productKey: item.productKey, title: clean(item.title, 80) })); } catch { products = []; }
      res.set?.('Cache-Control', 'no-store');
      return res.json({ posts: items, products });
    } catch { return res.status(500).json({ message: 'Постын жагсаалтыг ачаалж чадсангүй.' }); }
  });

  app.put('/api/admin/bot-posts/:postId', authenticateUser, requireAdmin, async (req, res) => {
    const postId = String(req.params?.postId || '');
    if (!POST_ID_RE.test(postId)) return res.status(400).json({ message: 'Постын ID буруу байна.' });
    const category = req.body?.category;
    if (!POST_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Ангилал буруу байна.' });
    let productKey = null;
    try {
      if (category === 'loan' && req.body?.productKey) {
        const key = String(req.body.productKey);
        const loans = await activeLoans({ loadProducts: source.loadProducts });
        if (!KEY_RE.test(key) || !loans.some(item => item.productKey === key)) return res.status(400).json({ message: 'Идэвхтэй зээлийн бүтээгдэхүүн сонгоно уу.' });
        productKey = key;
      }
      const metas = await readMetas();
      metas[postId] = { category, productKey, updatedAt: new Date().toISOString(), updatedBy: actorOf(req.user) };
      await writeMetas(metas);
      await createLog(req.user, 'bot_post_meta_update', `post:${postId} ${category}${productKey ? `:${productKey}` : ''}`);
      return res.json({ ok: true, postId, meta: { category, productKey } });
    } catch { return res.status(500).json({ message: 'Хадгалахад алдаа гарлаа.' }); }
  });

  app.delete('/api/admin/bot-posts/:postId', authenticateUser, requireAdmin, async (req, res) => {
    const postId = String(req.params?.postId || '');
    if (!POST_ID_RE.test(postId)) return res.status(400).json({ message: 'Постын ID буруу байна.' });
    try {
      const metas = await readMetas();
      delete metas[postId];
      await writeMetas(metas);
      await createLog(req.user, 'bot_post_meta_clear', `post:${postId}`);
      return res.json({ ok: true, postId, meta: null });
    } catch { return res.status(500).json({ message: 'Устгахад алдаа гарлаа.' }); }
  });
}
