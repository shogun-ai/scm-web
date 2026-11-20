// SCM (Solongo Capital) Facebook Messenger integration (design: docs/design/loan-task-management.md §18, D18/D18.2).
// READ-ONLY toward the Facebook Page: this module never publishes or creates posts. The only Graph writes are
// `me/messages` (replies) and `me/messenger_profile` (menu). Page posts are read with GET `me/posts`.
// Dependencies are injected (axios, session store, request creator, clock) so everything is testable without Meta/Mongo.
import crypto from 'node:crypto';
import { LOAN_PRODUCTS, PRODUCTS_MAP } from '../shared/loanFormConfig.js';
import { buildNode, SITE_URL, CONTACT_PHONE, MENU_REPLY } from './botEngine.js';

export { SITE_URL, CONTACT_PHONE };
export const LOAN_REQUEST_URL = `${SITE_URL}/loan-request`;
export const DEFAULT_EXPECTED_PAGE = 'Solongo.Capital';
export const POSTS_CACHE_MS = 5 * 60 * 1000;
export const SESSION_TTL_SECONDS = 24 * 3600;
export const REQUESTS_PER_HOUR = 3;
export const SHARED_WEBHOOK_PATH = '/api/zentro/facebook/webhook';
export const LEGACY_WEBHOOK_PATH = '/api/messenger/webhook';
const MAX_AMOUNT = 1e10;
const MIN_AMOUNT = 50000;
const FALLBACK_REPLY = `Уучлаарай, чатбот түр саатлаа. Та дахин бичнэ үү эсвэл ${CONTACT_PHONE} дугаараар холбогдоно уу.`;

// ---------- Pure helpers ----------
// X-Hub-Signature-256 over the RAW body. Missing secret / header / body -> false.
export function verifySignature(rawBody, header, appSecret) {
  const signature = String(header || '');
  if (!appSecret || !rawBody || !signature.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signature.slice(7);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

const compact = (text, limit) => String(text || '').replace(/\[OPTIONS:\s*.*?\]/gi, '').replace(/\[ACTION:\s*.*?\]/gi, '').replace(/\s+/g, ' ').trim().slice(0, limit);
const httpsUrl = value => { try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
export const toAbsoluteScmUrl = (url = '') => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? `${SITE_URL}${value}` : `${SITE_URL}/${value}`;
};

export function stripChatControlTokens(reply = '') {
  const optionsMatch = String(reply).match(/\[OPTIONS:\s*(.*?)\]/i);
  const actionMatch = String(reply).match(/\[ACTION:\s*(.*?)\]/i);
  const cleanText = [optionsMatch?.[0], actionMatch?.[0]].filter(Boolean).reduce((text, token) => text.replace(token, ''), String(reply)).trim();
  const options = optionsMatch ? optionsMatch[1].split(',').map(option => option.trim()).filter(Boolean) : [];
  return { cleanText, options, action: actionMatch?.[1]?.trim() || '' };
}

export const buildQuickReplies = (items = []) => items.slice(0, 13).map(item => ({
  content_type: 'text', title: String(item.title).slice(0, 20), payload: String(item.payload ?? item.title).slice(0, 1000),
}));

// Chunks <= max chars, preferring paragraph/line/space boundaries; at most maxChunks.
export function splitText(text, max = 2000, maxChunks = 5) {
  let rest = String(text || '').trim();
  const chunks = [];
  while (rest && chunks.length < maxChunks) {
    if (rest.length <= max) { chunks.push(rest); rest = ''; break; }
    let cut = Math.max(rest.lastIndexOf('\n\n', max), rest.lastIndexOf('\n', max), rest.lastIndexOf(' ', max));
    if (cut < max / 2) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}

// One carousel element per Page post (§18): image, title = first line, [Дэлгэрэнгүй | Зээлийн хүсэлт | Facebook-т үзэх].
export function buildPostElement(post) {
  const id = String(post?.id || '');
  const message = String(post?.message || '').trim();
  const [firstLine = '', ...restLines] = message.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const permalink = httpsUrl(post?.permalink_url);
  const image = httpsUrl(post?.full_picture);
  const buttons = [
    { type: 'postback', title: 'Дэлгэрэнгүй', payload: `detail:${id}`.slice(0, 1000) },
    { type: 'postback', title: 'Зээлийн хүсэлт', payload: `apply:${id}`.slice(0, 1000) },
  ];
  if (permalink) buttons.push({ type: 'web_url', title: 'Facebook-т үзэх', url: permalink, webview_height_ratio: 'full' });
  const element = { title: compact(firstLine, 80) || 'Солонго Капитал', buttons };
  const subtitle = compact(restLines.join(' '), 80);
  if (subtitle) element.subtitle = subtitle;
  if (image) element.image_url = image;
  if (permalink) element.default_action = { type: 'web_url', url: permalink, webview_height_ratio: 'full' };
  return element;
}
export function buildPostsCarousel(posts = []) {
  return (Array.isArray(posts) ? posts : []).filter(post => post?.id && (post.message || post.full_picture)).slice(0, 10).map(buildPostElement);
}

// Persistent menu + get started (§19). Messenger shows the first 3 items in the composer; the rest sit under "more".
export function buildMessengerProfile() {
  return {
    get_started: { payload: 'restart' },
    persistent_menu: [{
      locale: 'default', composer_input_disabled: false,
      call_to_actions: [
        { type: 'postback', title: 'Дахин эхлүүлэх', payload: 'restart' },
        { type: 'postback', title: 'Зээл', payload: 'loans' },
        { type: 'postback', title: 'Итгэлцэл', payload: 'trust' },
        { type: 'postback', title: 'Идэвхтэй зээлийн зар', payload: 'ads' },
        { type: 'postback', title: 'Төлөлт хийх', payload: 'payment' },
      ],
    }],
  };
}

// Node (botEngine) -> ordered Messenger messages: text chunks, one generic template (<=10 cards, <=3 buttons, title/subtitle <=80),
// quick replies (<=13, title <=20) attached to the last message. Messenger forbids text + template in one message.
export function nodeToMessengerMessages(node = {}) {
  const messages = [];
  for (const chunk of splitText(node.text || '', 1900, 5)) messages.push({ text: chunk });
  const elements = (Array.isArray(node.cards) ? node.cards : []).slice(0, 10).map(cardItem => {
    const buttons = (Array.isArray(cardItem.buttons) ? cardItem.buttons : []).slice(0, 3).map(button => (button.kind === 'url'
      ? { type: 'web_url', title: String(button.title).slice(0, 20), url: String(button.url), webview_height_ratio: 'full' }
      : { type: 'postback', title: String(button.title).slice(0, 20), payload: String(button.payload).slice(0, 1000) }));
    const element = { title: String(cardItem.title || 'Солонго Капитал').slice(0, 80) };
    if (cardItem.subtitle) element.subtitle = String(cardItem.subtitle).slice(0, 80);
    if (cardItem.imageUrl) element.image_url = cardItem.imageUrl;
    if (buttons.length) element.buttons = buttons;
    return element;
  });
  if (elements.length) messages.push({ attachment: { type: 'template', payload: { template_type: 'generic', elements } } });
  if (!messages.length) messages.push({ text: FALLBACK_REPLY });
  const replies = (Array.isArray(node.quickReplies) ? node.quickReplies : []).slice(0, 13);
  if (replies.length) messages[messages.length - 1].quick_replies = buildQuickReplies(replies);
  return messages;
}

// ---------- In-chat application: validation ----------
export function parsePhone(text) {
  let digits = String(text || '').replace(/[\s()\-.]/g, '');
  if (/^\+?976\d{8}$/.test(digits)) digits = digits.replace(/^\+?976/, '');
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function parseAmount(text) {
  const raw = String(text || '').toLowerCase().replace(/[\s₮]|төгрөг|төг/g, '');
  let value;
  if (/^\d{1,3}(?:[,'’.]\d{3})+$/.test(raw)) value = Number(raw.replace(/[,'’.]/g, ''));
  else {
    const match = /^(\d+(?:[.,]\d+)?)(сая|мянга|mln|m|k)?$/.exec(raw);
    if (!match) return null;
    const multiplier = { сая: 1e6, mln: 1e6, m: 1e6, мянга: 1e3, k: 1e3 }[match[2]] || 1;
    value = Math.round(Number(match[1].replace(',', '.')) * multiplier);
  }
  return Number.isSafeInteger(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT ? value : null;
}

export function parseTerm(text) {
  const match = /^(\d{1,3})\s*(сар|сартай|month|months|жил|жилийн)?$/i.exec(String(text || '').trim());
  if (!match) return null;
  const years = ['жил', 'жилийн'].includes(String(match[2] || '').toLowerCase());
  const months = Number(match[1]) * (years ? 12 : 1);
  return Number.isInteger(months) && months >= 1 && months <= 120 ? months : null;
}

// "Овог Нэр" -> { lastname, firstname }; needs at least two parts (space or dot separated), letters only.
export function parseName(text) {
  const name = String(text || '').replace(/\s+/g, ' ').trim();
  if (name.length < 3 || name.length > 80 || !/^[\p{L}][\p{L} .'-]*$/u.test(name)) return null;
  const parts = name.split(/[\s.]+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { lastname: parts[0], firstname: parts.slice(1).join(' ') };
}

// ---------- In-chat application: conversation state machine (pure) ----------
const STATES = ['product', 'name', 'phone', 'amount', 'term', 'confirm'];
const SHORT_PRODUCT_TITLES = {
  biz_loan: 'Бизнесийн зээл', car_purchase_loan: 'Авто худалдан авах', car_coll_loan: 'Авто барьцаалсан', cons_loan: 'Хэрэглээний зээл',
  credit_card: 'Кредит карт', re_loan: 'Үл хөдлөх барьцаа', line_loan: 'Зээлийн шугам', mortgage: 'Орон сууцны зээл',
};
const CANCEL_REPLY = { title: 'Цуцлах', payload: 'cancel' };
const money = value => Number(value).toLocaleString('en-US');

const productReplies = () => [...LOAN_PRODUCTS.map(product => ({ title: SHORT_PRODUCT_TITLES[product.id] || product.name, payload: `product:${product.id}` })), CANCEL_REPLY];
const prompts = {
  product: () => ({ text: 'Ямар зээл авах вэ? Доорх сонголтоос сонгоно уу.', quickReplies: productReplies() }),
  name: () => ({ text: 'Овог нэрээ бичнэ үү. Жишээ: Бат Болд', quickReplies: [CANCEL_REPLY] }),
  phone: () => ({ text: 'Холбоо барих утасны дугаараа бичнэ үү (8 оронтой). Жишээ: 99001234', quickReplies: [CANCEL_REPLY] }),
  amount: () => ({ text: 'Хүссэн зээлийн дүнгээ бичнэ үү. Жишээ: 5000000 эсвэл 5 сая', quickReplies: [CANCEL_REPLY] }),
  term: () => ({ text: 'Хэдэн сарын хугацаатай авах вэ? (1–120 сар). Жишээ: 12', quickReplies: [CANCEL_REPLY] }),
  confirm: draft => ({
    text: [
      'Хүсэлтээ шалгана уу:',
      `Бүтээгдэхүүн: ${PRODUCTS_MAP[draft.productKey] || draft.productKey}`,
      `Нэр: ${[draft.lastname, draft.firstname].filter(Boolean).join(' ')}`,
      `Утас: ${draft.phone}`,
      `Дүн: ${money(draft.amount)}₮`,
      `Хугацаа: ${draft.term} сар`,
      '',
      'Баталгаажуулснаар таны мэдээллийг зээлийн хүсэлт хянан шийдвэрлэх зорилгоор боловсруулахыг зөвшөөрч байна.',
    ].join('\n'),
    quickReplies: [{ title: 'Баталгаажуулах', payload: 'confirm' }, { title: 'Засах', payload: 'edit' }, CANCEL_REPLY],
  }),
};
const errorText = {
  product: 'Доорх сонголтоос зээлийн төрлөө сонгоно уу.',
  name: 'Овог, нэрээ хоёуланг нь үсгээр бичнэ үү. Жишээ: Бат Болд',
  phone: 'Утасны дугаар 8 оронтой байх ёстой. Жишээ: 99001234',
  amount: `Дүн буруу байна. ${money(MIN_AMOUNT)}₮-өөс ${money(MAX_AMOUNT)}₮ хүртэл тоо бичнэ үү. Жишээ: 5000000 эсвэл 5 сая`,
  term: 'Хугацаа 1–120 сар байна. Жишээ: 12',
  confirm: 'Доорх товчоор баталгаажуулах, засах эсвэл цуцлах сонголтоо хийнэ үү.',
};

const POST_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
// ProductContent keys differ from the in-chat product ids for car_loan (purchase/collateral variants): default to purchase.
const PRODUCT_KEY_ALIASES = { car_loan: 'car_purchase_loan' };
export const resolveProductKey = key => { const value = PRODUCT_KEY_ALIASES[key] || key; return PRODUCTS_MAP[value] ? value : ''; };

// { postId?, productKey? }: a valid productKey skips the product step.
export const startApplication = ({ postId = '', productKey = '' } = {}) => {
  const session = { state: 'product', draft: {}, postId: POST_ID_RE.test(postId) ? postId : '' };
  const key = resolveProductKey(productKey);
  const intro = { text: 'Зээлийн хүсэлтийг энд товч бөглөж болно. Баримтаа дараа нь сайт дээр нэмнэ.' };
  if (!key) return { session, messages: [intro, prompts.product()], action: null };
  session.state = 'name';
  session.draft = { productKey: key };
  return { session, messages: [intro, { text: `Бүтээгдэхүүн: ${PRODUCTS_MAP[key]}` }, prompts.name()], action: null };
};

// advance(session, { payload?, text? }) -> { session|null, messages, action: null|'submit'|'cancel' }
// Never mutates the input session. A null session means the conversation ended.
export function advance(session, input = {}) {
  const payload = typeof input.payload === 'string' ? input.payload : '';
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const state = session?.state;
  if (!STATES.includes(state)) return { session: null, messages: [], action: null };
  const draft = { ...(session.draft || {}) };
  const next = (to, patch = {}) => {
    const merged = { ...draft, ...patch };
    return { session: { ...session, state: to, draft: merged }, messages: [prompts[to](merged)], action: null };
  };
  const retry = () => ({ session: { ...session, draft }, messages: [{ text: errorText[state], quickReplies: prompts[state](draft).quickReplies }], action: null });

  const lowered = (payload || text).toLowerCase();
  if (payload === 'cancel' || ['цуцлах', 'cancel'].includes(lowered)) {
    return { session: null, messages: [{ text: 'Хүсэлтийг цуцаллаа. Дахин хүсвэл "Зээлийн хүсэлт" гэж бичнэ үү.', quickReplies: [MENU_REPLY] }], action: 'cancel' };
  }
  if (payload === 'back' || lowered === 'буцах') {
    const index = STATES.indexOf(state);
    if (index <= 0) return { session: null, messages: [{ text: 'Хүсэлтийг цуцаллаа.', quickReplies: [MENU_REPLY] }], action: 'cancel' };
    return next(STATES[index - 1]);
  }

  switch (state) {
    case 'product': {
      const key = payload.startsWith('product:') ? payload.slice(8) : (LOAN_PRODUCTS.find(product => product.name.toLowerCase() === lowered || (SHORT_PRODUCT_TITLES[product.id] || '').toLowerCase() === lowered)?.id || '');
      return PRODUCTS_MAP[key] ? next('name', { productKey: key }) : retry();
    }
    case 'name': { const name = payload ? null : parseName(text); return name ? next('phone', name) : retry(); }
    case 'phone': { const phone = payload ? null : parsePhone(text); return phone ? next('amount', { phone }) : retry(); }
    case 'amount': { const amount = payload ? null : parseAmount(text); return amount ? next('term', { amount }) : retry(); }
    case 'term': { const term = payload ? null : parseTerm(text); return term ? next('confirm', { term }) : retry(); }
    default: { // confirm
      if (payload === 'confirm') return { session: { ...session, draft }, messages: [], action: 'submit' };
      if (payload === 'edit' || payload === 'restart') return next('product', { productKey: undefined });
      return retry();
    }
  }
}

// ---------- Rate limit (per PSID, in memory) ----------
export function createPsidLimiter({ max = REQUESTS_PER_HOUR, windowMs = 3600 * 1000, now = Date.now, cap = 20000 } = {}) {
  const hits = new Map();
  return {
    // Consumes one slot; false when the PSID already used `max` slots inside the window.
    take(psid) {
      const time = now();
      for (const [key, value] of hits) if (value.reset <= time) hits.delete(key);
      const current = hits.get(psid) || { count: 0, reset: time + windowMs };
      if (current.count >= max || (!hits.has(psid) && hits.size >= cap)) return false;
      current.count += 1;
      hits.set(psid, current);
      return true;
    },
  };
}

// ---------- Graph client ----------
export class GraphError extends Error {
  constructor({ status = 0, code = 0, subcode = 0, type = '' } = {}) {
    super(`Graph API error status=${status} code=${code}`);
    this.name = 'GraphError';
    this.status = status; this.fbCode = code; this.fbSubcode = subcode; this.fbType = type;
  }
}

export function createGraphClient({ axios, env = process.env } = {}) {
  const token = () => env.FB_PAGE_ACCESS_TOKEN || env.MESSENGER_PAGE_ACCESS_TOKEN || '';
  const base = () => `https://graph.facebook.com/${env.FB_GRAPH_VERSION || 'v20.0'}`;
  const wrap = error => {
    const fb = error?.response?.data?.error || {};
    return new GraphError({ status: error?.response?.status || 0, code: fb.code || 0, subcode: fb.error_subcode || 0, type: fb.type || '' });
  };
  return {
    tokenConfigured: () => Boolean(token()),
    async get(path, params = {}) {
      try { return (await axios.get(`${base()}/${path}`, { params: { ...params, access_token: token() }, timeout: 15000 })).data; } catch (error) { throw wrap(error); }
    },
    // Writes are limited to Messenger replies and the Messenger profile; nothing here can publish to the Page feed.
    async post(path, data) {
      if (path !== 'me/messages' && path !== 'me/messenger_profile') throw new GraphError({ type: 'BlockedPath' });
      try { return (await axios.post(`${base()}/${path}`, data, { params: { access_token: token() }, timeout: 15000 })).data; } catch (error) { throw wrap(error); }
    },
  };
}

// ---------- Mongo session store (TTL 24h) ----------
export function createMongoSessionStore(mongoose) {
  const Model = mongoose.models.ScmMessengerSession || mongoose.model('ScmMessengerSession', new mongoose.Schema({
    psid: { type: String, required: true, unique: true },
    state: { type: String, default: 'idle' },
    draft: { type: mongoose.Schema.Types.Mixed, default: {} },
    postId: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now, expires: SESSION_TTL_SECONDS },
  }));
  return {
    async get(psid) {
      const doc = await Model.findOne({ psid }).lean();
      return doc ? { state: doc.state, draft: doc.draft || {}, postId: doc.postId || '' } : null;
    },
    async save(psid, session) {
      await Model.findOneAndUpdate({ psid }, { $set: { state: session.state, draft: session.draft || {}, postId: session.postId || '', updatedAt: new Date() } }, { upsert: true });
    },
    async clear(psid) { await Model.deleteOne({ psid }); },
  };
}

// ---------- Messenger service ----------
const GLOBAL_LEGACY = new Set(['back', 'contact']);
const NODE_VALUES = new Set(['restart', 'menu', 'loans', 'trust', 'ads', 'payment']);
// Typed text equal to a menu title behaves like the button (only outside the in-chat application).
const NODE_TEXTS = new Map([['зээл', 'loans'], ['итгэлцэл', 'trust'], ['идэвхтэй зээлийн зар', 'ads'], ['төлөлт хийх', 'payment'], ['дахин эхлүүлэх', 'restart'], ['цэс', 'restart'], ['start', 'restart']]);
export const FREE_TEXT_MAX = 600;
const FREE_TEXT_REPLIES = [{ title: 'Зээл', payload: 'loans' }, { title: 'Итгэлцэл', payload: 'trust' }, MENU_REPLY];
const APPLY_TEXTS = new Set(['зээлийн хүсэлт', 'зээлийн хүсэлт өгөх', 'apply', 'хүсэлт өгөх']);

export function createScmMessenger({
  axios, env = process.env, sessionStore, createRequest, content = {}, rateLimiter = createPsidLimiter(), now = Date.now, logger = console,
} = {}) {
  const graph = createGraphClient({ axios, env });
  // ZENTRO_FB_PAGE_ID_FOR_LEGACY_GUARD: events of the Zentro Page are never handled by SCM logic.
  const guardPageId = () => String(env.ZENTRO_FB_PAGE_ID || '');
  const expectedPage = () => String(env.FB_EXPECTED_PAGE || DEFAULT_EXPECTED_PAGE);
  const verifyToken = () => env.FB_VERIFY_TOKEN || env.MESSENGER_VERIFY_TOKEN || '';
  const appSecret = () => env.FB_APP_SECRET || '';
  const baseUrlOf = ctx => env.PUBLIC_API_BASE_URL || ctx?.baseUrl || '';
  let postsCache = { at: 0, posts: null };
  const seenMids = new Map();
  let pageCache = null;

  // --- sending ---
  const send = (psid, message) => graph.post('me/messages', { recipient: { id: psid }, messaging_type: 'RESPONSE', message });
  const sendText = (psid, text, quickReplies) => send(psid, { text: String(text || FALLBACK_REPLY).slice(0, 1900), ...(quickReplies?.length ? { quick_replies: buildQuickReplies(quickReplies) } : {}) });
  const sendButtons = (psid, text, buttons) => send(psid, { attachment: { type: 'template', payload: { template_type: 'button', text: String(text).slice(0, 640), buttons } } });
  const sendGeneric = (psid, elements) => send(psid, { attachment: { type: 'template', payload: { template_type: 'generic', elements } } });
  const deliver = async (psid, messages) => { for (const message of messages) await sendText(psid, message.text, message.quickReplies); };

  // --- Page posts (read-only, cached 5 minutes; stale copy served if Graph fails) ---
  async function getPosts() {
    if (postsCache.posts && now() - postsCache.at < POSTS_CACHE_MS) return postsCache.posts;
    try {
      const data = await graph.get('me/posts', { fields: 'id,message,full_picture,permalink_url,created_time', limit: 25 });
      const posts = (Array.isArray(data?.data) ? data.data : []).filter(post => post?.id && (post.message || post.full_picture)).slice(0, 10);
      postsCache = { at: now(), posts };
      return posts;
    } catch (error) {
      if (postsCache.posts) return postsCache.posts;
      throw error;
    }
  }

  async function showPosts(psid) {
    const elements = buildPostsCarousel(await getPosts());
    if (!elements.length) return sendText(psid, 'Одоогоор шинэ мэдээ алга байна.', [{ title: 'Зээлийн хүсэлт', payload: 'apply' }, MENU_REPLY]);
    return sendGeneric(psid, elements);
  }

  async function showDetail(psid, postId) {
    const post = (await getPosts()).find(item => item.id === postId);
    if (!post?.message) return sendText(psid, 'Энэ пост олдсонгүй.', [{ title: 'Сүүлийн мэдээ', payload: 'posts' }, { title: 'Цэс', payload: 'menu' }]);
    const chunks = splitText(post.message, 2000);
    for (let index = 0; index < chunks.length; index += 1) {
      const last = index === chunks.length - 1;
      await sendText(psid, chunks[index], last ? [{ title: 'Зээлийн хүсэлт өгөх', payload: `apply:${postId}` }, { title: 'Сайт дээр бөглөх', payload: 'site' }, { title: 'Цэс', payload: 'menu' }] : undefined);
    }
    return undefined;
  }

  // --- legacy chatbot (/api/chat) path, unchanged behaviour ---
  // Free text goes to the legacy chatbot, but only its short text is relayed (<=600 chars) + quick replies; no product carousels (§19).
  async function legacyChat(psid, text, ctx) {
    const response = await axios.post(`${baseUrlOf(ctx)}/api/chat`, { sessionId: `fb_${psid}`, message: text, history: [] }, { headers: { 'x-session-id': `fb_${psid}` }, timeout: 30000 });
    const chat = response.data || { reply: '' };
    const { cleanText, action } = stripChatControlTokens(chat.reply || '');
    const suffix = action === 'loan_request' ? `

Зээлийн хүсэлт: ${LOAN_REQUEST_URL}` : '';
    const base = String(cleanText || chat.productCard?.title || '').trim();
    const body = `${base.length + suffix.length > FREE_TEXT_MAX ? `${base.slice(0, Math.max(0, FREE_TEXT_MAX - suffix.length - 1)).trimEnd()}…` : base}${suffix}`.trim();
    return sendText(psid, body || 'Та дараах сонголтуудаас сонгож үйлчилгээгээ авна уу.', FREE_TEXT_REPLIES);
  }

  // --- bot nodes (botEngine, §19) ---
  const nodeCtx = () => ({ loadProducts: content.loadProducts || (async () => []), loadSetting: content.loadSetting || (async () => undefined), getPosts: () => getPosts(), channel: 'messenger' });
  async function sendNode(psid, nodeId) {
    for (const message of nodeToMessengerMessages(await buildNode(nodeId, nodeCtx()))) await send(psid, message);
  }

  // --- in-chat application ---
  async function runApplicationStep(psid, session, input) {
    const result = advance(session, input);
    if (result.action === 'submit') return submitApplication(psid, result.session);
    if (!result.session) await sessionStore.clear(psid);
    else await sessionStore.save(psid, result.session);
    return deliver(psid, result.messages);
  }

  async function submitApplication(psid, session) {
    if (!rateLimiter.take(psid)) {
      await sessionStore.clear(psid);
      return sendText(psid, `Нэг цагт илгээх хүсэлтийн хязгаарт хүрсэн байна. Түр хүлээгээд дахин оролдоно уу эсвэл ${CONTACT_PHONE} дугаарт холбогдоно уу.`, [{ title: 'Цэс', payload: 'menu' }]);
    }
    const { draft } = session;
    let result;
    try {
      result = await createRequest({ productKey: draft.productKey, lastname: draft.lastname || '', firstname: draft.firstname, phone: draft.phone, amount: draft.amount, term: draft.term, psid, postId: session.postId || '' });
    } catch (error) {
      logger.error?.(`[scm-messenger] request creation failed code=${error?.code || error?.status || 'unknown'}`);
      await sessionStore.save(psid, { ...session, state: 'confirm' });
      return sendText(psid, `Хүсэлтийг бүртгэж чадсангүй. Дахин оролдох уу эсвэл ${LOAN_REQUEST_URL}?source=messenger хаягаар / ${CONTACT_PHONE} дугаараар хандана уу.`, [{ title: 'Баталгаажуулах', payload: 'confirm' }, CANCEL_REPLY]);
    }
    await sessionStore.clear(psid);
    await sendText(psid, `Таны хүсэлтийг хүлээн авлаа. Хүсэлтийн дугаар: ${result.applicationReference}. Манай ажилтан тантай удахгүй холбогдоно.`);
    return sendButtons(psid, 'Шаардлагатай баримтаа сайт дээр нэмж оруулж болно.', [{
      type: 'web_url', title: 'Баримтаа нэмэх', url: `${LOAN_REQUEST_URL}?product=${encodeURIComponent(draft.productKey)}&source=messenger`, webview_height_ratio: 'full',
    }]);
  }

  async function startFlow(psid, options = {}) {
    const started = startApplication(options);
    await sessionStore.save(psid, started.session);
    return deliver(psid, started.messages);
  }

  // --- event routing ---
  async function processEvent(event, ctx) {
    const psid = String(event?.sender?.id || '');
    if (!/^\d{5,30}$/.test(psid) || event.message?.is_echo) return;
    const mid = event.message?.mid || event.postback?.mid;
    if (mid) {
      const time = now();
      for (const [key, at] of seenMids) if (time - at > 10 * 60 * 1000 || seenMids.size > 2000) seenMids.delete(key);
      if (seenMids.has(mid)) return;
      seenMids.set(mid, time);
    }
    const payload = event.message?.quick_reply?.payload || event.postback?.payload || '';
    const text = event.message?.text || '';
    const value = String(payload || text || '').trim();
    if (!value) return;
    try {
      const session = await sessionStore.get(psid);
      const inFlow = Boolean(session && STATES.includes(session.state));
      const lowered = value.toLowerCase();
      const nodeValue = NODE_VALUES.has(value) || /^(terms|calc):/.test(value) ? value : (!payload && !inFlow ? NODE_TEXTS.get(lowered) : '');
      const isApply = value === 'apply' || value.startsWith('apply:') || (!payload && !inFlow && APPLY_TEXTS.has(lowered));
      // Menu / node / apply payloads interrupt a running application (e.g. persistent menu); anything else continues it.
      const interrupts = nodeValue || value === 'contact' || (payload && isApply);
      if (inFlow && interrupts) await sessionStore.clear(psid);
      else if (inFlow) return await runApplicationStep(psid, session, payload ? { payload } : { text });
      if (nodeValue) {
        if (nodeValue === 'restart' || nodeValue === 'menu') await sessionStore.clear(psid);
        return await sendNode(psid, nodeValue);
      }
      if (GLOBAL_LEGACY.has(value)) return await legacyChat(psid, value, ctx);
      if (value === 'posts') return await showPosts(psid);
      if (value === 'site') return await sendButtons(psid, 'Сайт дээр дэлгэрэнгүй бөглөнө үү.', [{ type: 'web_url', title: 'Хүсэлт бөглөх', url: `${LOAN_REQUEST_URL}?source=messenger`, webview_height_ratio: 'full' }]);
      if (value.startsWith('detail:')) return await showDetail(psid, value.slice(7));
      if (isApply) {
        const arg = value.startsWith('apply:') ? value.slice(6) : '';
        if (arg.startsWith('post:')) return await startFlow(psid, { postId: arg.slice(5) });
        if (resolveProductKey(arg)) return await startFlow(psid, { productKey: arg });
        return await startFlow(psid, { postId: arg }); // legacy apply:<postId>; invalid ids are dropped
      }
      return await legacyChat(psid, value, ctx);
    } catch (error) {
      logger.error?.(`[scm-messenger] event failed ${error?.name || 'Error'} code=${error?.fbCode || error?.status || 'n/a'}`);
      try { await sendText(psid, FALLBACK_REPLY); } catch { logger.error?.('[scm-messenger] fallback send failed'); }
    }
  }

  // Entry (one Page of a webhook payload). Pages other than SCM's own are the caller's concern; the Zentro Page is skipped here.
  async function handleEntry(entry, ctx = {}) {
    if (guardPageId() && String(entry?.id || '') === guardPageId()) return;
    for (const event of Array.isArray(entry?.messaging) ? entry.messaging : []) await processEvent(event, ctx);
  }

  // --- Page / profile / status ---
  async function getPage() {
    if (!graph.tokenConfigured()) return null;
    if (!pageCache) pageCache = graph.get('me', { fields: 'id,name,username' }).catch(error => { pageCache = null; throw error; });
    return pageCache;
  }

  async function configureProfile() {
    if (!graph.tokenConfigured()) return { ok: false, skipped: true, reason: 'TOKEN_MISSING' };
    let page;
    try { page = await getPage(); } catch { page = null; }
    if (guardPageId() && String(page?.id || '') === guardPageId()) return { ok: false, skipped: true, reason: 'ZENTRO_PAGE' };
    try { await graph.post('me/messenger_profile', buildMessengerProfile()); return { ok: true }; } catch (error) { return { ok: false, reason: 'GRAPH_ERROR', fbCode: error.fbCode || 0 }; }
  }

  async function status() {
    const out = {
      tokenConfigured: graph.tokenConfigured(), verifyTokenConfigured: Boolean(verifyToken()), appSecretConfigured: Boolean(appSecret()),
      expectedPage: expectedPage(), page: null, matchesExpected: false, isZentroPage: false,
      webhookSubscribed: false, subscribedFields: [], messengerProfileOk: false,
      callback: {
        expectedPath: SHARED_WEBHOOK_PATH, expectedUrl: `${env.PUBLIC_API_BASE_URL || ''}${SHARED_WEBHOOK_PATH}`, legacyPath: LEGACY_WEBHOOK_PATH,
        note: 'Meta app-ийн нэг callback URL байдаг тул SCM page-ийн үйл явдал Zentro webhook-оор ирж SCM handler руу дамжина.',
        sharedSecretConfigured: Boolean(env.ZENTRO_META_APP_SECRET),
      },
      error: null,
    };
    if (!out.tokenConfigured) return out;
    const [pageResult, subsResult, profileResult] = await Promise.allSettled([
      graph.get('me', { fields: 'id,name,username' }), graph.get('me/subscribed_apps'), graph.get('me/messenger_profile', { fields: 'get_started,persistent_menu' }),
    ]);
    if (pageResult.status === 'fulfilled') {
      const page = pageResult.value || {};
      out.page = { id: String(page.id || ''), name: String(page.name || '') };
      const expected = expectedPage().toLowerCase();
      out.matchesExpected = [page.username, page.id].some(value => value && String(value).toLowerCase() === expected);
      out.isZentroPage = Boolean(guardPageId() && String(page.id) === guardPageId());
      if (out.isZentroPage) out.matchesExpected = false;
    } else out.error = pageResult.reason?.fbCode === 190 ? 'TOKEN_INVALID' : 'GRAPH_ERROR';
    if (subsResult.status === 'fulfilled') {
      const apps = Array.isArray(subsResult.value?.data) ? subsResult.value.data : [];
      out.subscribedFields = [...new Set(apps.flatMap(app => (Array.isArray(app.subscribed_fields) ? app.subscribed_fields : [])))];
      out.webhookSubscribed = out.subscribedFields.includes('messages');
    }
    if (profileResult.status === 'fulfilled') {
      const profile = Array.isArray(profileResult.value?.data) ? profileResult.value.data[0] : null;
      const first = profile?.persistent_menu?.[0]?.call_to_actions?.[0];
      out.messengerProfileOk = Boolean(profile?.get_started?.payload === 'restart' && first?.type === 'postback' && first.payload === 'restart');
    }
    return out;
  }

  return {
    handleEntry, handleScmMessengerEntry: handleEntry, processEvent, configureProfile, status, getPosts,
    verifyChallenge: query => (query?.['hub.mode'] === 'subscribe' && query['hub.verify_token'] && query['hub.verify_token'] === verifyToken() ? String(query['hub.challenge'] ?? '') : null),
    signatureRequired: appSecret,
    verifyRequest: req => verifySignature(req.rawBody, req.get?.('x-hub-signature-256') ?? req.headers?.['x-hub-signature-256'], appSecret()),
  };
}

function legacyProductButtons(card = {}) {
  const buttons = [
    { type: 'web_url', title: 'Хүсэлт өгөх', url: LOAN_REQUEST_URL, webview_height_ratio: 'full' },
    { type: 'web_url', title: 'Дэлгэрэнгүй', url: toAbsoluteScmUrl(card.productUrl), webview_height_ratio: 'full' },
  ];
  buttons.unshift(card.hasUserTypeDocs ? { type: 'postback', title: 'Материал', payload: 'documents' } : { type: 'postback', title: 'Тооцоолол', payload: 'Тооцоолол' });
  return buttons.slice(0, 3);
}
function legacyProductElement(card, summaryText = '') {
  const element = {
    title: compact(card.title || 'Солонго Капитал', 80), image_url: toAbsoluteScmUrl(card.imageUrl), subtitle: compact(summaryText || card.subtitle, 80),
    default_action: { type: 'web_url', url: toAbsoluteScmUrl(card.productUrl), webview_height_ratio: 'full' }, buttons: legacyProductButtons(card),
  };
  if (!element.image_url) delete element.image_url;
  return element;
}
function legacyCardButtons(card = {}) {
  if (card.navigationOnly) return [{ type: 'postback', title: 'Сонгох', payload: String(card.command || card.title || 'menu').slice(0, 1000) }];
  if (card.productUrl) return legacyProductButtons(card);
  if (Array.isArray(card.buttons) && card.buttons.length) {
    return card.buttons.slice(0, 3).map(button => (button.url
      ? { type: 'web_url', title: String(button.title || 'Харах').slice(0, 20), url: toAbsoluteScmUrl(button.url), webview_height_ratio: 'full' }
      : { type: 'postback', title: String(button.title || 'Сонгох').slice(0, 20), payload: String(button.command || button.title || 'menu').slice(0, 1000) }));
  }
  return [{ type: 'postback', title: 'Сонгох', payload: String(card.command || card.title || 'menu').slice(0, 1000) }];
}
function legacyCardElement(card, summaryText = '') {
  const productUrl = card.navigationOnly ? '' : toAbsoluteScmUrl(card.linkUrl || card.productUrl || '');
  const element = { title: compact(card.title || 'Солонго Капитал', 80), image_url: toAbsoluteScmUrl(card.imageUrl), subtitle: compact(card.subtitle || summaryText, 80), buttons: legacyCardButtons(card) };
  if (productUrl) element.default_action = { type: 'web_url', url: productUrl, webview_height_ratio: 'full' };
  if (!element.image_url) delete element.image_url;
  return element;
}

// ---------- Shared Meta app callback (D18.2) ----------
// One Meta app has ONE webhook callback URL (currently the Zentro one). Entries whose entry.id is not the Zentro Page id
// belong to another Page of the same app (SCM) and are handled here. No Zentro Page id configured / entry without id -> stays with Zentro.
export function partitionEntries(entries = [], zentroPageId = '') {
  const list = Array.isArray(entries) ? entries : [];
  const pageId = String(zentroPageId || '');
  if (!pageId) return { own: list, foreign: [] };
  const own = [];
  const foreign = [];
  for (const entry of list) {
    const id = String(entry?.id || '');
    (id && id !== pageId ? foreign : own).push(entry);
  }
  return { own, foreign };
}

// Express middleware to mount BEFORE the Zentro webhook handler (same path). It only acts on correctly signed
// payloads (same app secret as Zentro: ZENTRO_META_APP_SECRET); SCM entries are forwarded to the SCM handler in the
// background and removed from req.body.entry, so the Zentro handler sees exactly what it saw before for its own Page.
export function createSharedWebhookForwarder({ messenger, env = process.env, logger = console }) {
  return (req, _res, next) => {
    const pageId = String(env.ZENTRO_FB_PAGE_ID || '');
    const header = req.get?.('x-hub-signature-256') ?? req.headers?.['x-hub-signature-256'];
    if (!pageId || req.body?.object !== 'page' || !verifySignature(req.rawBody, header, env.ZENTRO_META_APP_SECRET || '')) return next();
    const { own, foreign } = partitionEntries(req.body.entry, pageId);
    if (!foreign.length) return next();
    const ctx = { baseUrl: `${req.protocol}://${req.get?.('host') || ''}` };
    void (async () => {
      for (const entry of foreign) {
        try { await messenger.handleEntry(entry, ctx); } catch { logger.error?.('[scm-messenger] forwarded entry failed'); }
      }
    })();
    req.body = { ...req.body, entry: own };
    return next();
  };
}

// ---------- Routes ----------
// Legacy/direct webhook (/api/messenger/webhook) + admin status/profile endpoints. rawBody must be captured by the JSON parser.
export function registerScmMessengerRoutes({ app, authenticateUser, requireAdmin, createLog = async () => {}, messenger, logger = console }) {
  app.get(LEGACY_WEBHOOK_PATH, (req, res) => {
    const challenge = messenger.verifyChallenge(req.query);
    return challenge === null ? res.sendStatus(403) : res.status(200).send(challenge);
  });

  app.post(LEGACY_WEBHOOK_PATH, async (req, res) => {
    // With FB_APP_SECRET set the signature is mandatory; without it the legacy behaviour (unsigned) is kept.
    if (messenger.signatureRequired() && !messenger.verifyRequest(req)) return res.status(401).send('INVALID_SIGNATURE');
    if (req.body?.object !== 'page') return res.sendStatus(404);
    res.sendStatus(200);
    const ctx = { baseUrl: `${req.protocol}://${req.get?.('host') || ''}` };
    for (const entry of Array.isArray(req.body.entry) ? req.body.entry : []) {
      try { await messenger.handleEntry(entry, ctx); } catch { logger.error?.('[scm-messenger] entry failed'); }
    }
  });

  app.get('/api/admin/facebook/status', authenticateUser, requireAdmin, async (_req, res) => {
    try { res.set?.('Cache-Control', 'no-store'); res.json(await messenger.status()); } catch { res.status(500).json({ message: 'Төлөв шалгахад алдаа гарлаа.' }); }
  });

  app.post('/api/admin/facebook/messenger-profile', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const result = await messenger.configureProfile();
      await createLog(req.user, 'facebook_messenger_profile', result.ok ? 'ok' : `failed:${result.reason || 'unknown'}`);
      if (result.ok) return res.json({ ok: true });
      const messages = { TOKEN_MISSING: 'FB_PAGE_ACCESS_TOKEN тохируулагдаагүй байна.', ZENTRO_PAGE: 'Энэ token Zentro page-ийнх тул цэс тохируулсангүй.', GRAPH_ERROR: 'Meta руу цэс илгээж чадсангүй. Token болон эрхийг шалгана уу.' };
      return res.status(result.reason === 'TOKEN_MISSING' ? 503 : 502).json({ ok: false, code: result.reason, message: messages[result.reason] || 'Алдаа гарлаа.' });
    } catch { res.status(500).json({ ok: false, message: 'Алдаа гарлаа.' }); }
  });
}
