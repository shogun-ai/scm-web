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
export const CARDS_KEY = 'bot_cards'; // D21: { version, sections: { menu|loans|trust|payment|contact: [Card] } }
export const DEFAULT_IMAGE_KEY = 'bot_default_image_url';
export const FALLBACK_IMAGE_URL = `${SITE_URL}/bot/default-card.jpg`; // committed 1.91:1 logo card (frontend/public/bot), used when no admin default image is set
export const CARDS_VERSION = 1;
export const CARD_SECTIONS = ['menu', 'loans', 'trust', 'payment', 'contact'];
export const BUTTON_TYPES = ['node', 'terms', 'apply', 'calculator', 'url', 'call', 'post'];
export const MAX_BUTTON_TITLE = 20;
export const MAX_CARD_TITLE = 80;
export const TERMS_TEXT_MAX = 640;
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
// ctx.defaultImage (resolved once per buildNode) fills cards that have no (valid https) image (D21 #7).
const card = ({ title, subtitle, imageUrl, text, buttons }, ctx) => {
  const out = { title: clean(title, 80) || 'Солонго Капитал' };
  const sub = clean(subtitle, 80);
  if (sub) out.subtitle = sub;
  if (typeof text === 'string' && text) out.text = text;
  else { const image = httpsUrl(imageUrl) || ctx?.defaultImage || ''; if (image) out.imageUrl = image; }
  out.buttons = (buttons || []).slice(0, 3).map(button => ({ ...button, title: clean(button.title, 20) }));
  return out;
};
async function resolveDefaultImage(ctx) {
  try { return httpsUrl(await ctx.loadSetting?.(DEFAULT_IMAGE_KEY)) || FALLBACK_IMAGE_URL; } catch { return FALLBACK_IMAGE_URL; }
}
// scm.mn links without a `source` get the channel's source (so card buttons stay channel-correct).
function withSource(href, ctx) {
  try {
    const parsed = new URL(href);
    if (parsed.origin === SITE_URL && !parsed.searchParams.has('source')) { parsed.searchParams.set('source', sourceOf(ctx)); return parsed.href; }
  } catch { /* keep as is */ }
  return href;
}
const POST_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

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

// ---------- bot cards (D21) ----------
const bad = message => ({ ok: false, message });
const str = (value, max) => (typeof value === 'string' && value.trim().length <= max ? value.trim() : null);

// -> { ok:true, button } | { ok:false, message }. Button = { type, title<=20, value }.
function checkButton(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('Товч буруу байна.');
  if (!BUTTON_TYPES.includes(raw.type)) return bad('Товчны төрөл буруу байна.');
  const title = str(raw.title, MAX_BUTTON_TITLE);
  if (!title) return bad(`Товчны гарчиг 1–${MAX_BUTTON_TITLE} тэмдэгт байна.`);
  const value = str(raw.value ?? '', 500);
  if (value === null) return bad('Товчны утга буруу байна.');
  const out = { type: raw.type, title, value };
  switch (raw.type) {
    case 'node': if (!isNodeId(value)) return bad('Товчны цэсийн утга буруу байна.'); break;
    case 'terms': case 'apply': if (!KEY_RE.test(value)) return bad('Бүтээгдэхүүн сонгоно уу.'); break;
    case 'calculator': if (value && !KEY_RE.test(value)) return bad('Тооцоолуурын бүтээгдэхүүн буруу байна.'); break;
    case 'url': { const href = httpsUrl(value); if (!href) return bad('Холбоос https:// хэлбэртэй байх ёстой.'); out.value = href; break; }
    case 'call': if (!normalizePhone(value) || value.length > 40) return bad('Утасны дугаар буруу байна.'); break;
    default: if (!POST_ID_RE.test(value)) return bad('Постын ID буруу байна.'); // post
  }
  return { ok: true, button: out };
}

// -> { ok:true, card } | { ok:false, message }. Card = { id, title<=80, subtitle<=80, imageUrl, productKey|null, active, buttons[<=3] }.
export function checkCard(raw, fallbackId = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('Карт буруу байна.');
  const id = raw.id === undefined || raw.id === '' ? fallbackId : raw.id;
  if (typeof id !== 'string' || !KEY_RE.test(id)) return bad('Картын ID буруу байна.');
  const title = str(raw.title, MAX_CARD_TITLE);
  if (!title) return bad(`Картын гарчиг 1–${MAX_CARD_TITLE} тэмдэгт байна.`);
  const subtitle = str(raw.subtitle ?? '', MAX_CARD_TITLE);
  if (subtitle === null) return bad(`Картын тайлбар ${MAX_CARD_TITLE} тэмдэгтээс ихгүй байна.`);
  const imageRaw = str(raw.imageUrl ?? '', 500);
  if (imageRaw === null || (imageRaw && !httpsUrl(imageRaw))) return bad('Зургийн холбоос https:// хэлбэртэй байх ёстой.');
  const productRaw = raw.productKey === undefined || raw.productKey === null || raw.productKey === '' ? null : raw.productKey;
  if (productRaw !== null && (typeof productRaw !== 'string' || !KEY_RE.test(productRaw))) return bad('Картын бүтээгдэхүүний key буруу байна (англи үсэг, тоо, "_" байх ёстой). Контент засах хэсэгт бүтээгдэхүүний key-г засаад дахин холбоно уу, эсвэл картын бүтээгдэхүүнийг хоосон болгоно уу.');
  if (raw.active !== undefined && typeof raw.active !== 'boolean') return bad('Картын идэвхтэй төлөв буруу байна.');
  const rawButtons = raw.buttons === undefined ? [] : raw.buttons;
  if (!Array.isArray(rawButtons) || rawButtons.length > 3) return bad('Картад 3 хүртэл товч байна.');
  const buttons = [];
  for (const item of rawButtons) { const checked = checkButton(item); if (!checked.ok) return checked; buttons.push(checked.button); }
  return { ok: true, card: { id, title, subtitle, imageUrl: imageRaw ? httpsUrl(imageRaw) : '', productKey: productRaw, active: raw.active !== false, buttons } };
}

const sectionList = value => (Array.isArray(value) ? value : (value && Array.isArray(value.cards) ? value.cards : null));

// Validates a PUT /api/admin/bot-cards body: { sections?: { <section>: [Card] | { cards:[Card] } }, defaultImageUrl?: string }.
// -> { ok:true, value:{ sections, defaultImageUrl|null } } | { ok:false, message }
export function validateBotCards(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const sections = {};
  if (source.sections !== undefined) {
    if (!source.sections || typeof source.sections !== 'object' || Array.isArray(source.sections)) return bad('Хэсгүүд буруу байна.');
    for (const [name, raw] of Object.entries(source.sections)) {
      if (!CARD_SECTIONS.includes(name)) return bad('Үл мэдэгдэх хэсэг байна.');
      const cards = sectionList(raw);
      if (!cards || cards.length > MAX_CARDS) return bad(`Хэсэг бүрд ${MAX_CARDS} хүртэл карт байна.`);
      const seen = new Set();
      const out = [];
      for (let index = 0; index < cards.length; index += 1) {
        const checked = checkCard(cards[index], `${name}_${index + 1}`);
        if (!checked.ok) return bad(`${index + 1}-р карт: ${checked.message}`);
        if (seen.has(checked.card.id)) return bad('Картын ID давхардсан байна.');
        seen.add(checked.card.id);
        out.push(checked.card);
      }
      sections[name] = out;
    }
  }
  let defaultImageUrl = null;
  if (source.defaultImageUrl !== undefined) {
    const value = typeof source.defaultImageUrl === 'string' ? source.defaultImageUrl.trim() : null;
    if (value === null || value.length > 500 || (value && !httpsUrl(value))) return bad('Үндсэн зураг https:// холбоос байх ёстой.');
    defaultImageUrl = value ? httpsUrl(value) : '';
  }
  if (!Object.keys(sections).length && defaultImageUrl === null) return bad('Хадгалах өгөгдөл алга.');
  return { ok: true, value: { sections, defaultImageUrl } };
}

const readSection = (stored, section) => {
  const raw = stored && typeof stored === 'object' && stored.sections && typeof stored.sections === 'object' ? stored.sections[section] : undefined;
  const list = sectionList(raw);
  if (!list) return null;
  const cards = [];
  const seen = new Set();
  list.slice(0, MAX_CARDS).forEach((item, index) => {
    const checked = checkCard(item, `${section}_${index + 1}`);
    if (checked.ok && !seen.has(checked.card.id)) { seen.add(checked.card.id); cards.push(checked.card); }
  });
  return cards;
};

const btn = (type, title, value = '') => ({ type, title, value });
const idOf = value => String(value).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50) || 'card';

// Defaults derived from current content (ProductContent incl. CMS-only products, current nodes). Never stored until an admin saves.
export async function defaultCards(section, ctx) {
  const read = async (key, limit) => { try { return clean(await ctx.loadSetting?.(key), limit); } catch { return ''; } };
  if (section === 'menu') {
    return [
      { id: 'menu_loans', title: 'Зээл', subtitle: 'Зээлийн бүтээгдэхүүн, нөхцөл', node: 'loans' },
      { id: 'menu_trust', title: 'Итгэлцэл', subtitle: 'Хөрөнгөө ашигтайгаар өсгөх', node: 'trust' },
      { id: 'menu_ads', title: 'Идэвхтэй зээлийн зар', subtitle: 'Сүүлийн зар, мэдээ', node: 'ads' },
      { id: 'menu_payment', title: 'Төлөлт хийх', subtitle: 'Төлбөрийн дансны мэдээлэл', node: 'payment' },
      { id: 'menu_contact', title: 'Холбоо барих', subtitle: 'Утас, имэйл, хаяг, ажлын цаг', node: 'contact' },
    ].map(item => ({ id: item.id, title: item.title, subtitle: item.subtitle, imageUrl: '', productKey: null, active: true, buttons: [btn('node', 'Нээх', item.node)] }));
  }
  if (section === 'loans') {
    // Products with an invalid key (e.g. a Mongolian title saved as key) cannot be linked in payloads; skip them.
    return (await activeLoans(ctx)).filter(product => KEY_RE.test(String(product.productKey || ''))).slice(0, MAX_CARDS).map(product => ({
      id: idOf(`loan_${product.productKey}`), title: clean(product.title, MAX_CARD_TITLE) || product.productKey, subtitle: clean(product.shortDesc, MAX_CARD_TITLE),
      imageUrl: httpsUrl(product.bgImageUrl) || httpsUrl(product.headerImageUrl) || '', productKey: product.productKey, active: true,
      buttons: [btn('terms', 'Нөхцөл, шаардлага', product.productKey), btn('apply', 'Хүсэлт гаргах', product.productKey), btn('calculator', 'Тооцоолуур', product.productKey)],
    }));
  }
  if (section === 'trust') {
    const products = await ctx.loadProducts();
    const trust = (Array.isArray(products) ? products : []).find(item => item?.productKey === TRUST_KEY && item.isActive !== false);
    return [{
      id: 'trust', title: clean(trust?.title, MAX_CARD_TITLE) || 'Итгэлцэл', subtitle: clean(trust?.shortDesc, MAX_CARD_TITLE) || 'Таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ',
      imageUrl: httpsUrl(trust?.bgImageUrl) || httpsUrl(trust?.headerImageUrl) || '', productKey: trust ? TRUST_KEY : null, active: true,
      buttons: [btn('url', 'Хүсэлт гаргах', `${SITE_URL}${SITE_PATHS.trustRequest}`), btn('calculator', 'Тооцоолуур', TRUST_KEY)],
    }];
  }
  if (section === 'payment') return []; // the payment node is the accounts text; admin-added cards are appended below it
  const phone = normalizePhone((await read(CONTACT_KEYS.phone, 100)) || CONTACT_PHONE); // invalid configured phone -> no call button
  return [{
    id: 'contact', title: 'Холбоо барих', subtitle: 'Утас, имэйл, хаяг, ажлын цаг', imageUrl: '', productKey: null, active: true,
    buttons: [...(phone ? [btn('call', 'Залгах', phone)] : []), btn('url', 'Вэбсайт', SITE_URL), btn('node', 'Зээл', 'loans')],
  }];
}

// { isDefault, cards:[Card] } for one section (stored, else defaults).
export async function sectionCards(section, ctx) {
  let stored;
  try { stored = await ctx.loadSetting?.(CARDS_KEY); } catch { stored = undefined; }
  const cards = readSection(stored, section);
  return cards ? { isDefault: false, cards } : { isDefault: true, cards: await defaultCards(section, ctx) };
}

function resolveButton(button, ctx) {
  const title = clean(button?.title, MAX_BUTTON_TITLE);
  const value = String(button?.value ?? '').trim();
  if (!title) return null;
  switch (button?.type) {
    case 'node': return isNodeId(value) ? postback(title, value) : null;
    case 'terms': return KEY_RE.test(value) ? postback(title, `terms:${value}`) : null;
    case 'apply': return KEY_RE.test(value) ? postback(title, `apply:${value}`) : null;
    case 'calculator':
      if (value === TRUST_KEY) return url(title, trustCalculatorUrl(ctx));
      return !value || KEY_RE.test(value) ? url(title, calculatorUrl(value, ctx)) : null;
    case 'url': { const href = httpsUrl(value); return href ? url(title, href === `${SITE_URL}/` ? SITE_URL : withSource(href, ctx)) : null; }
    case 'call': { const phone = normalizePhone(value); return phone ? { kind: 'call', title, phone } : null; }
    case 'post': return POST_ID_RE.test(value) ? postback(title, `post:${value}`) : null;
    default: return null;
  }
}

// Active cards -> node cards. A card linked to a product is hidden when that product is no longer active; blank image falls back to the product's.
function renderCards(cards, products, ctx) {
  const list = Array.isArray(products) ? products : [];
  const out = [];
  for (const item of cards) {
    if (item.active === false) continue;
    const product = item.productKey ? list.find(entry => entry?.productKey === item.productKey && entry.isActive !== false) : null;
    if (item.productKey && !product) continue;
    out.push(card({
      title: item.title, subtitle: item.subtitle, imageUrl: item.imageUrl || product?.bgImageUrl || product?.headerImageUrl,
      buttons: item.buttons.map(button => resolveButton(button, ctx)).filter(Boolean),
    }, ctx));
    if (out.length >= MAX_CARDS) break;
  }
  return out;
}
async function cardsFor(section, ctx) {
  const [{ cards }, products] = await Promise.all([sectionCards(section, ctx), ctx.loadProducts()]);
  return renderCards(cards, products, ctx);
}

// ---------- nodes ----------
const mainReplies = () => MENU_REPLIES.map(reply => ({ ...reply }));
const fallbackNode = () => ({ text: `Уучлаарай, энэ сонголтыг олсонгүй. Доорх цэснээс сонгоно уу эсвэл ${CONTACT_PHONE} дугаарт холбогдоно уу.`, quickReplies: mainReplies() });

// restart = welcome text + menu cards carousel (D21 #3); with no active menu card the quick replies keep the menu reachable.
async function restartNode(ctx) {
  let welcome = '';
  try { welcome = clean(await ctx.loadSetting(WELCOME_KEY), MAX_WELCOME); } catch { /* default */ }
  let cards = [];
  try { cards = await cardsFor('menu', ctx); } catch { cards = []; }
  return { text: welcome || DEFAULT_WELCOME, ...(cards.length ? { cards } : { quickReplies: mainReplies() }) };
}

async function loansNode(ctx) {
  const cards = await cardsFor('loans', ctx);
  if (!cards.length) return { text: `Одоогоор идэвхтэй зээлийн бүтээгдэхүүн алга байна. Лавлах утас: ${CONTACT_PHONE}`, quickReplies: [MENU_REPLY] };
  return { cards, quickReplies: [{ title: 'Итгэлцэл', payload: 'trust' }, MENU_REPLY] };
}

// Splits text on line boundaries into chunks <= max (over-long single lines are cut).
export function chunkLines(text, max = TERMS_TEXT_MAX) {
  const chunks = [];
  let current = '';
  for (const rawLine of String(text || '').split('\n')) {
    let line = rawLine;
    while (line.length > max) {
      if (current) { chunks.push(current); current = ''; }
      chunks.push(line.slice(0, max));
      line = line.slice(max);
    }
    if (current && current.length + 1 + line.length > max) { chunks.push(current); current = ''; }
    current = current ? `${current}\n${line}` : line;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

// terms:<key> -> one "card" per block (Иргэн / Байгууллага / car variants): { title, text<=640, buttons }; long blocks are split and the
// buttons ride on the last part. Messenger sends each as a button template (plain text for parts without buttons).
async function termsNode(key, ctx) {
  if (!KEY_RE.test(key)) return fallbackNode();
  const product = (await activeLoans(ctx)).find(item => item.productKey === key);
  if (!product) return { text: 'Энэ бүтээгдэхүүний мэдээлэл олдсонгүй.', quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
  const buttons = [postback('Хүсэлт гаргах', `apply:${key}`), url('Тооцоолуур', calculatorUrl(key, ctx)), postback('Буцах', 'loans')];
  const title = clean(product.title, MAX_CARD_TITLE);
  const blocks = [];
  if (product.purchase || product.collateral) {
    if (product.purchase) blocks.push(...variantBlocks(clean(product.purchase.label, 60) || 'Худалдан авах', product.purchase));
    if (product.collateral) blocks.push(...variantBlocks(clean(product.collateral.label, 60) || 'Барьцаалсан', product.collateral));
  } else blocks.push(...variantBlocks('', product));
  const filled = blocks.filter(Boolean);
  const items = filled.length
    ? filled.map((block, index) => ({ label: block.split('\n')[0], text: index === 0 ? `${title}\n\n${block}` : block }))
    : [{ label: title, text: `${title}\n\nНөхцөл, шаардлагын мэдээлэл одоогоор оруулаагүй байна. Лавлах утас: ${CONTACT_PHONE}` }];
  const cards = [];
  for (const item of items) {
    const parts = chunkLines(item.text, TERMS_TEXT_MAX);
    parts.forEach((part, index) => cards.push(card({ title: index === 0 ? item.label : `${item.label} (${index + 1})`, text: part, buttons: index === parts.length - 1 ? buttons : [] }, ctx)));
  }
  return { cards: cards.slice(0, 20), quickReplies: [MENU_REPLY] };
}

// calc:<key> (quick-reply friendly): a single card holding the calculator url button.
async function calcNode(key, ctx) {
  const loans = await activeLoans(ctx);
  const product = KEY_RE.test(key) ? loans.find(item => item.productKey === key) : null;
  return {
    cards: [card({ title: product ? `${product.title} — тооцоолуур` : 'Зээлийн тооцоолуур', subtitle: 'Сар бүрийн төлбөрөө тооцоолоорой', imageUrl: product?.bgImageUrl,
      buttons: [url('Тооцоолуур нээх', calculatorUrl(product?.productKey, ctx))] }, ctx)],
    quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY],
  };
}

async function trustNode(ctx) {
  const cards = await cardsFor('trust', ctx);
  if (!cards.length) return { text: `Итгэлцлийн мэдээлэл одоогоор алга байна. Лавлах утас: ${CONTACT_PHONE}`, quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
  return { cards, quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
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
const sanitizeMeta = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

// { category, productKey } for a post: admin meta wins over the keyword suggestion; productKey only for an active loan product.
function postChoice(post, meta, loans) {
  const category = POST_CATEGORIES.includes(meta?.category) ? meta.category : suggestCategory(post?.message);
  const productKey = category === 'loan' && meta?.productKey && loans.some(item => item.productKey === meta.productKey) ? meta.productKey : '';
  return { category, productKey };
}

// -> [{ kind, title, payload|url }] (<=3). `meta` = admin override | undefined; `loans` = active loan products.
// "Пост үзэх" opens the post inside Messenger (postback post:<id>, D21 #6).
export function postButtons(post, meta, loans, ctx) {
  const id = String(post?.id || '');
  const permalink = httpsUrl(post?.permalink_url);
  const { category, productKey } = postChoice(post, meta, loans);
  const view = POST_ID_RE.test(id) ? [postback('Пост үзэх', `post:${id}`)] : (permalink ? [url('Пост үзэх', permalink)] : []);
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
    return card({ title: first, subtitle: rest.join(' '), imageUrl: post.full_picture, buttons: postButtons(post, meta, loans, ctx) }, ctx);
  });
  if (!cards.length) return { text: 'Одоогоор идэвхтэй зар алга байна.', quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
  return { cards, quickReplies: [{ title: 'Зээл', payload: 'loans' }, MENU_REPLY] };
}

// post:<id> -> the post inside Messenger: image + full text + buttons [apply/contact][Facebook-т нээх][Буцах -> ads] (D21 #6).
async function postNode(id, ctx) {
  if (!POST_ID_RE.test(id)) return fallbackNode();
  let posts = [];
  try { posts = ctx.getPosts ? await ctx.getPosts() : []; } catch { posts = []; }
  const post = (Array.isArray(posts) ? posts : []).find(item => String(item?.id) === id);
  if (!post) return { text: 'Энэ пост олдсонгүй.', quickReplies: [{ title: 'Зар', payload: 'ads' }, MENU_REPLY] };
  let metas = {};
  try { metas = sanitizeMeta(await ctx.loadSetting(POST_META_KEY)); } catch { metas = {}; }
  let loans = [];
  try { loans = await activeLoans(ctx); } catch { loans = []; }
  const meta = Object.prototype.hasOwnProperty.call(metas, id) ? metas[id] : undefined;
  const { category, productKey } = postChoice(post, meta, loans);
  const permalink = httpsUrl(post.permalink_url);
  const buttons = [
    category === 'loan' ? postback('Хүсэлт гаргах', productKey ? `apply:${productKey}` : `apply:post:${id}`) : postback('Холбоо барих', 'contact'),
    ...(permalink ? [url('Facebook-т нээх', permalink)] : []),
    postback('Буцах', 'ads'),
  ];
  const image = httpsUrl(post.full_picture);
  return { text: cleanLines(post.message, MAX_TEXT) || 'Зар', ...(image ? { imageUrl: image } : {}), buttons, quickReplies: [MENU_REPLY] };
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
  // Buttons come from the first active card of the "contact" section (D21); the built-in set is the fallback.
  let buttons = [];
  try {
    const { cards } = await sectionCards('contact', ctx);
    const first = cards.find(item => item.active !== false);
    buttons = (first?.buttons || []).map(button => resolveButton(button, ctx)).filter(Boolean).slice(0, 3);
  } catch { buttons = []; }
  if (!buttons.length) {
    const e164 = normalizePhone(phone || CONTACT_PHONE);
    buttons = [...(e164 ? [{ kind: 'call', title: 'Залгах', phone: e164 }] : []), url('Вэбсайт', SITE_URL), postback('Зээл', 'loans')];
  }
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
  let cards = [];
  try { cards = await cardsFor('payment', ctx); } catch { cards = []; }
  return { text: text.slice(0, MAX_TEXT), ...(cards.length ? { cards } : {}), quickReplies: [MENU_REPLY] };
}

export async function buildNode(nodeId, rawCtx = {}) {
  const id = String(nodeId ?? '').trim();
  try {
    const ctx = { ...rawCtx, defaultImage: await resolveDefaultImage(rawCtx) };
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
    if (id.startsWith('post:')) return await postNode(id.slice(5), ctx);
  } catch {
    return { text: `Уучлаарай, мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу эсвэл ${CONTACT_PHONE} дугаарт холбогдоно уу.`, quickReplies: [MENU_REPLY] };
  }
  return fallbackNode();
}

export const NODE_IDS = ['restart', 'loans', 'trust', 'ads', 'payment', 'contact', 'language'];
export const isNodeId = id => NODE_IDS.includes(id) || id === 'menu' || id === 'calc' || id === 'lang:mn' || id === 'lang:en' || /^(terms|calc):[A-Za-z0-9_-]{1,50}$/.test(String(id || '')) || /^post:[A-Za-z0-9_-]{1,100}$/.test(String(id || ''));

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
  // greetingText was removed in D21 (Meta no longer supports the Messenger greeting API): old clients may still send it; it is ignored.
  return { ok: true, value: { welcomeText, paymentAccounts: accounts } };
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
export function registerBotRoutes({ app, authenticateUser, requireAdmin, source, getPosts, SiteConfig, limiter = (_req, _res, next) => next(), createLog = async () => {} }) {
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
      const [welcome, accounts, legacy] = await Promise.all([
        SiteConfig.findOne({ key: WELCOME_KEY }).lean(), SiteConfig.findOne({ key: PAYMENT_KEY }).lean(), SiteConfig.findOne({ key: LEGACY_PAYMENT_TEXT_KEY }).lean(),
      ]);
      res.set?.('Cache-Control', 'no-store');
      return res.json({
        welcomeText: typeof welcome?.value === 'string' ? welcome.value : '', defaultWelcomeText: DEFAULT_WELCOME,
        paymentAccounts: sanitizeAccounts(accounts?.value),
        legacyPaymentText: typeof legacy?.value === 'string' ? legacy.value.slice(0, MAX_TEXT) : '',
      });
    } catch { return res.status(500).json({ message: 'Ботын агуулгыг ачаалж чадсангүй.' }); }
  });

  app.put('/api/admin/bot-content', authenticateUser, requireAdmin, async (req, res) => {
    const checked = validateBotContent(req.body);
    if (!checked.ok) return res.status(400).json({ message: checked.message });
    try {
      const { welcomeText, paymentAccounts } = checked.value;
      await SiteConfig.findOneAndUpdate({ key: WELCOME_KEY }, { $set: { value: welcomeText, updatedAt: new Date() }, $setOnInsert: { label: 'Ботын мэндчилгээ', group: 'chatbot' } }, { upsert: true });
      await SiteConfig.findOneAndUpdate({ key: PAYMENT_KEY }, { $set: { value: paymentAccounts, updatedAt: new Date() }, $setOnInsert: { label: 'Төлбөр хүлээн авах данснууд', group: 'chatbot' } }, { upsert: true });
      source.invalidate();
      await createLog(req.user, 'bot_content_update', `accounts:${paymentAccounts.length}`);
      return res.json({ ok: true, welcomeText, paymentAccounts });
    } catch { return res.status(500).json({ message: 'Хадгалахад алдаа гарлаа.' }); }
  });

  // ---- D21: bot cards (admin only) ----
  const cardCtx = () => ({ loadProducts: source.loadProducts, loadSetting: source.loadSetting, channel: 'web' });
  const readStored = async () => { const value = (await SiteConfig.findOne({ key: CARDS_KEY }).lean())?.value; return value && typeof value === 'object' && !Array.isArray(value) ? value : { version: CARDS_VERSION, sections: {} }; };
  const writeSetting = (key, value, label) => SiteConfig.findOneAndUpdate({ key }, { $set: { value, updatedAt: new Date() }, $setOnInsert: { label, group: 'chatbot' } }, { upsert: true });
  const readDefaultImage = async () => { const value = (await SiteConfig.findOne({ key: DEFAULT_IMAGE_KEY }).lean())?.value; return httpsUrl(value) || ''; };

  app.get('/api/admin/bot-cards', authenticateUser, requireAdmin, async (_req, res) => {
    try {
      const ctx = cardCtx();
      const stored = await readStored();
      const sections = {};
      for (const name of CARD_SECTIONS) {
        const readCards = readSection(stored, name);
        sections[name] = readCards ? { isDefault: false, cards: readCards } : { isDefault: true, cards: await defaultCards(name, ctx) };
      }
      let products = [];
      try { products = ((await source.loadProducts()) || []).filter(item => item?.productKey && item.isActive !== false).map(item => ({ productKey: item.productKey, title: clean(item.title, MAX_CARD_TITLE), isTrust: item.productKey === TRUST_KEY })); } catch { products = []; }
      res.set?.('Cache-Control', 'no-store');
      return res.json({ version: CARDS_VERSION, sections, defaultImageUrl: await readDefaultImage(), fallbackImageUrl: FALLBACK_IMAGE_URL, products });
    } catch { return res.status(500).json({ message: 'Ботын картыг ачаалж чадсангүй.' }); }
  });

  app.put('/api/admin/bot-cards', authenticateUser, requireAdmin, async (req, res) => {
    const checked = validateBotCards(req.body);
    if (!checked.ok) return res.status(400).json({ message: checked.message });
    try {
      const { sections, defaultImageUrl } = checked.value;
      const saved = Object.keys(sections);
      if (saved.length) {
        const stored = await readStored();
        await writeSetting(CARDS_KEY, { version: CARDS_VERSION, sections: { ...(stored.sections && typeof stored.sections === 'object' ? stored.sections : {}), ...sections } }, 'Ботын картууд');
      }
      if (defaultImageUrl !== null) await writeSetting(DEFAULT_IMAGE_KEY, defaultImageUrl, 'Ботын үндсэн зураг');
      source.invalidate();
      await createLog(req.user, 'bot_cards_update', `sections:${saved.join(',') || '-'}${defaultImageUrl !== null ? ' default_image' : ''}`);
      return res.json({
        ok: true, version: CARDS_VERSION, saved, sections: Object.fromEntries(saved.map(name => [name, { isDefault: false, cards: sections[name] }])),
        ...(defaultImageUrl !== null ? { defaultImageUrl } : {}),
      });
    } catch { return res.status(500).json({ message: 'Хадгалахад алдаа гарлаа.' }); }
  });

  app.post('/api/admin/bot-cards/reset/:section', authenticateUser, requireAdmin, async (req, res) => {
    const section = String(req.params?.section || '');
    if (!CARD_SECTIONS.includes(section)) return res.status(400).json({ message: 'Хэсэг буруу байна.' });
    try {
      const stored = await readStored();
      const rest = { ...(stored.sections && typeof stored.sections === 'object' ? stored.sections : {}) };
      delete rest[section];
      await writeSetting(CARDS_KEY, { version: CARDS_VERSION, sections: rest }, 'Ботын картууд');
      source.invalidate();
      await createLog(req.user, 'bot_cards_reset', `section:${section}`);
      return res.json({ ok: true, section, isDefault: true, cards: await defaultCards(section, cardCtx()) });
    } catch { return res.status(500).json({ message: 'Анхны тохиргоонд буцаахад алдаа гарлаа.' }); }
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
