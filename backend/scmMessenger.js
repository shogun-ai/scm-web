// SCM (Solongo Capital) Facebook Messenger integration (design: docs/design/loan-task-management.md §18, D18/D18.2).
// READ-ONLY toward the Facebook Page: this module never publishes or creates posts. The only Graph writes are
// `me/messages` (replies) and `me/messenger_profile` (menu). Page posts are read with GET `me/posts`.
// Dependencies are injected (axios, session store, request creator, clock) so everything is testable without Meta/Mongo.
import crypto from 'node:crypto';
import { PRODUCTS_MAP } from '../shared/loanFormConfig.js';
import { buildNode, buildApplyNode, buildSteeringNode, detectProduct, shortenAnswer, SITE_URL, CONTACT_PHONE, MENU_REPLY, TRUST_KEY } from './botEngine.js';

export { SITE_URL, CONTACT_PHONE };
export const LOAN_REQUEST_URL = `${SITE_URL}/loan-request`;
export const DEFAULT_EXPECTED_PAGE = 'Solongo.Capital';
export const POSTS_CACHE_MS = 5 * 60 * 1000;
export const SESSION_TTL_SECONDS = 24 * 3600;
export const CHAT_REQUESTS_PER_HOUR = 30; // D23: free-text AI answers per PSID (applications now happen on the web form)
export const SHARED_WEBHOOK_PATH = '/api/zentro/facebook/webhook';
export const LEGACY_WEBHOOK_PATH = '/api/messenger/webhook';
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

// Persistent menu + get started (§19, §21 #2). Messenger shows the first 3 items in the composer; the rest sit under "more".
// No greeting / ice_breakers: Meta no longer supports the greeting API (D21 #8).
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
        { type: 'postback', title: 'Холбоо барих', payload: 'contact' },
        { type: 'postback', title: 'Хэл / Language', payload: 'language' },
      ],
    }],
  };
}

// Node (botEngine) -> ordered Messenger messages: text chunks, one generic template (<=10 cards, <=3 buttons, title/subtitle <=80),
// quick replies (<=13, title <=20) attached to the last message. Messenger forbids text + template in one message.
export function toMessengerButtons(list) {
  return (Array.isArray(list) ? list : []).slice(0, 3).map(button => {
    const title = String(button.title).slice(0, 20);
    if (button.kind === 'call') return /^\+976\d{8}$/.test(String(button.phone)) ? { type: 'phone_number', title, payload: String(button.phone) } : null;
    if (button.kind === 'url') return { type: 'web_url', title, url: String(button.url), webview_height_ratio: 'full' };
    return { type: 'postback', title, payload: String(button.payload).slice(0, 1000) };
  }).filter(Boolean);
}

const buttonTemplate = (text, buttons) => ({ attachment: { type: 'template', payload: { template_type: 'button', text: String(text).slice(0, 640), buttons } } });

export function nodeToMessengerMessages(node = {}) {
  const messages = [];
  // node.imageUrl (post view) -> an image attachment first.
  const image = httpsUrl(node.imageUrl);
  if (image) messages.push({ attachment: { type: 'image', payload: { url: image, is_reusable: true } } });
  const nodeButtons = toMessengerButtons(node.buttons);
  // Node-level buttons (contact, post view) -> a button template. Its text is the last chunk when that fits 640 chars, else a short prompt.
  const chunks = splitText(node.text || '', 1900, 5);
  let buttonText = '';
  if (nodeButtons.length) buttonText = chunks.length && chunks[chunks.length - 1].length <= 640 ? chunks.pop() : 'Доорх сонголтоос сонгоно уу.';
  for (const chunk of chunks) messages.push({ text: chunk });
  if (nodeButtons.length) messages.push(buttonTemplate(buttonText, nodeButtons));
  // Cards: consecutive element cards form one generic template (<=10); cards carrying `text` (terms) are button templates / plain text in order.
  let elements = [];
  const flush = () => {
    if (elements.length) messages.push({ attachment: { type: 'template', payload: { template_type: 'generic', elements } } });
    elements = [];
  };
  for (const cardItem of (Array.isArray(node.cards) ? node.cards : []).slice(0, 20)) {
    const buttons = toMessengerButtons(cardItem.buttons);
    if (typeof cardItem.text === 'string' && cardItem.text) {
      flush();
      messages.push(buttons.length ? buttonTemplate(cardItem.text, buttons) : { text: cardItem.text.slice(0, 1900) });
      continue;
    }
    if (elements.length >= 10) continue;
    const element = { title: String(cardItem.title || 'Солонго Капитал').slice(0, 80) };
    if (cardItem.subtitle) element.subtitle = String(cardItem.subtitle).slice(0, 80);
    if (cardItem.imageUrl) element.image_url = cardItem.imageUrl;
    if (buttons.length) element.buttons = buttons;
    elements.push(element);
  }
  flush();
  if (!messages.length) messages.push({ text: FALLBACK_REPLY });
  const replies = (Array.isArray(node.quickReplies) ? node.quickReplies : []).slice(0, 13);
  if (replies.length) messages[messages.length - 1].quick_replies = buildQuickReplies(replies);
  return messages;
}

// ---------- Rate limit (per PSID, in memory) ----------
export function createPsidLimiter({ max = CHAT_REQUESTS_PER_HOUR, windowMs = 3600 * 1000, now = Date.now, cap = 20000 } = {}) {
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
const GLOBAL_LEGACY = new Set(['back']); // old "back" postback of the removed in-chat flow -> welcome menu
const NODE_VALUES = new Set(['restart', 'menu', 'loans', 'trust', 'ads', 'payment', 'contact', 'language', 'lang:mn', 'lang:en']);
// Typed text equal to a menu title behaves like the button (only outside the in-chat application).
const IDLE_SESSION = { state: 'idle', draft: {}, postId: '' }; // "seen" marker: a PSID without any session is a first contact (D21 #1)
const LABEL_RE = /^[a-z]+(?::[A-Za-z0-9_-]{1,100}){0,2}$/;
const logLabel = value => (LABEL_RE.test(String(value)) ? String(value) : 'other'); // never log typed text
const NODE_TEXTS = new Map([['зээл', 'loans'], ['итгэлцэл', 'trust'], ['идэвхтэй зээлийн зар', 'ads'], ['төлөлт хийх', 'payment'], ['дахин эхлүүлэх', 'restart'], ['цэс', 'restart'], ['start', 'restart']]);
const CMS_KEY_RE = /^[A-Za-z0-9_-]{1,50}$/;
const APPLY_TEXTS = new Set(['зээлийн хүсэлт', 'зээлийн хүсэлт өгөх', 'apply', 'хүсэлт өгөх']);
const APPLY_INTENT_RE = /хүсэлт\s*(гаргах|өгөх|илгээх|бөглөх)|өргөдөл|бөглөх|\bapply\b/i;
const isApplyIntent = text => { const value = String(text || '').trim(); return value.length > 0 && value.length <= 80 && APPLY_INTENT_RE.test(value); };

export function createScmMessenger({
  axios, env = process.env, sessionStore, content = {}, rateLimiter = createPsidLimiter(), now = Date.now, logger = console,
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

  // --- Page posts (read-only, cached 5 minutes; stale copy served if Graph fails) ---
  async function getPosts() {
    if (postsCache.posts && now() - postsCache.at < POSTS_CACHE_MS) return postsCache.posts;
    try {
      const data = await graph.get('me/posts', { fields: 'id,message,full_picture,permalink_url,created_time', limit: 25 });
      const posts = (Array.isArray(data?.data) ? data.data : []).filter(post => post?.id && (post.message || post.full_picture)).slice(0, 20);
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

  // --- free text (D23): a short AI answer (<=3 sentences, <=400 chars) + a steering node (product card / loans carousel) ---
  // The bot never collects applications in chat; every apply path ends in a web_url button to the web form.
  async function aiAnswer(psid, text, ctx) {
    const response = await axios.post(`${baseUrlOf(ctx)}/api/chat`, { sessionId: `fb_${psid}`, message: text, history: [] }, { headers: { 'x-session-id': `fb_${psid}` }, timeout: 30000 });
    const chat = response.data || { reply: '' };
    const { cleanText } = stripChatControlTokens(chat.reply || '');
    return shortenAnswer(String(cleanText || chat.productCard?.title || '').replace(/https?:\/\/\S+/g, '').trim());
  }

  // --- bot nodes (botEngine, §19) ---
  const nodeCtx = () => ({ loadProducts: content.loadProducts || (async () => []), loadSetting: content.loadSetting || (async () => undefined), getPosts: () => getPosts(), channel: 'messenger' });
  async function sendBuilt(psid, node) {
    for (const message of nodeToMessengerMessages(node)) await send(psid, message);
  }
  const sendNode = async (psid, nodeId) => sendBuilt(psid, await buildNode(nodeId, nodeCtx()));
  // Marks the PSID as seen (idle). Also ends any stale session of the removed in-chat application flow (D23).
  const endFlow = psid => sessionStore.save(psid, IDLE_SESSION);

  async function steer(psid, text, ctx) {
    let reply = '';
    // Chat rate limit: over the limit the AI is skipped, the steering cards still go out.
    if (rateLimiter.take(psid)) {
      try { reply = await aiAnswer(psid, text, ctx); } catch { logger.error?.('[scm-messenger] ai answer failed'); }
    }
    if (reply) await sendText(psid, reply);
    await sendBuilt(psid, await buildSteeringNode(text, nodeCtx()));
  }

  // ProductContent is the product source: apply key -> { productKey, title } for LOAN_PRODUCTS ids, car_loan (the web form offers the
  // purchase/collateral choice), trust and active CMS-only products. Unknown keys (e.g. an old post id) -> null (generic link).
  async function resolveApplyKey(key) {
    if (!key) return null;
    if (key === TRUST_KEY) return { productKey: TRUST_KEY, title: 'Итгэлцэл' };
    if (key === 'car_loan') return { productKey: key, title: 'Автомашины зээл' }; // the web form asks purchase vs collateral
    if (PRODUCTS_MAP[key]) return { productKey: key, title: PRODUCTS_MAP[key] };
    if (!CMS_KEY_RE.test(key)) return null;
    let products = [];
    try { products = (await content.loadProducts?.()) || []; } catch { products = []; }
    const product = (Array.isArray(products) ? products : []).find(item => item?.productKey === key && item.isActive !== false);
    if (!product) return null;
    return { productKey: key, title: String(product.title || '').replace(/\s+/g, ' ').trim().slice(0, 80) };
  }
  const sendApply = (psid, product) => sendBuilt(psid, buildApplyNode(product?.productKey || '', nodeCtx(), { title: product?.title || '' }));

  // --- event routing ---
  // Every handled event logs one PII-free line: kind (message|postback|referral|optin), node label (never typed text), result.
  const logEvent = (kind, label, result) => (logger.info || logger.log)?.call(logger, `[scm-messenger] event kind=${kind} node=${logLabel(label)} result=${result}`);

  async function processEvent(event, ctx) {
    const psid = String(event?.sender?.id || '');
    if (!/^\d{5,30}$/.test(psid) || event.message?.is_echo) return;
    const referral = Boolean(event.referral || event.postback?.referral);
    const kind = event.optin ? 'optin' : (referral ? 'referral' : (event.postback ? 'postback' : (event.message ? 'message' : '')));
    if (!kind) return;
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
    let label = 'none';
    try {
      // Standalone referral (m.me ref / button under a post) and opt-in -> restart: welcome + menu cards.
      if (event.optin || (event.referral && !event.postback && !event.message)) {
        label = 'restart';
        await endFlow(psid);
        await sendNode(psid, 'restart');
        return logEvent(kind, label, 'sent');
      }
      if (!value) return;
      const session = await sessionStore.get(psid);
      const firstContact = !session;
      // D23: a session left in the removed in-chat application flow is stale -> treated as idle (the old quick replies still answer below).
      if (session && session.state !== 'idle') await endFlow(psid);
      const lowered = value.toLowerCase();
      const nodeValue = NODE_VALUES.has(value) || /^(terms|calc|post):/.test(value) ? value : (!payload ? NODE_TEXTS.get(lowered) : '');
      const isApply = value === 'apply' || value.startsWith('apply:') || value.startsWith('product:') || (!payload && (APPLY_TEXTS.has(lowered) || isApplyIntent(text)));
      // First contact (no session at all) with plain typed text -> restart, whatever was typed.
      if (firstContact && !payload && !nodeValue && !isApply) {
        label = 'restart';
        await endFlow(psid);
        await sendNode(psid, 'restart');
        return logEvent(kind, label, 'sent');
      }
      if (firstContact) await endFlow(psid);
      if (nodeValue) {
        label = nodeValue;
        await sendNode(psid, nodeValue);
        return logEvent(kind, label, 'sent');
      }
      if (GLOBAL_LEGACY.has(value)) { label = 'back'; await sendNode(psid, 'restart'); return logEvent(kind, label, 'sent'); }
      if (value === 'posts') { label = 'posts'; await showPosts(psid); return logEvent(kind, label, 'sent'); }
      if (value === 'site') { label = 'site'; await sendButtons(psid, 'Сайт дээр дэлгэрэнгүй бөглөнө үү.', [{ type: 'web_url', title: 'Хүсэлт бөглөх', url: `${LOAN_REQUEST_URL}?source=messenger`, webview_height_ratio: 'full' }]); return logEvent(kind, label, 'sent'); }
      if (value.startsWith('detail:')) { label = 'detail'; await showDetail(psid, value.slice(7)); return logEvent(kind, label, 'sent'); }
      // Old quick replies of the removed in-chat flow (cancel / confirm / edit) and every apply action -> short text + web form button.
      if (payload === 'cancel') { label = 'cancel'; await sendText(psid, 'Сайн байна уу. Хүсвэл доорх цэснээс үргэлжлүүлнэ үү.', [MENU_REPLY]); return logEvent(kind, label, 'sent'); }
      if (isApply || payload === 'confirm' || payload === 'edit') {
        label = 'apply';
        let product = null;
        if (value.startsWith('apply:') || value.startsWith('product:')) {
          const arg = value.slice(value.indexOf(':') + 1);
          product = arg.startsWith('post:') ? null : await resolveApplyKey(arg.split(':')[0]); // apply:<productKey>[:post:<id>] | apply:post:<id> | legacy apply:<postId>
        } else if (!payload && text) {
          let hit = null;
          try { hit = await detectProduct(text, nodeCtx()); } catch { hit = null; }
          if (hit) product = await resolveApplyKey(hit.productKey);
        }
        await sendApply(psid, product);
        return logEvent(kind, label, 'sent');
      }
      label = 'chat';
      await steer(psid, value, ctx);
      return logEvent(kind, label, 'sent');
    } catch (error) {
      logger.error?.(`[scm-messenger] event kind=${kind} node=${logLabel(label)} result=failed code=${error?.fbCode || error?.status || 'n/a'} (${error?.name || 'Error'})`);
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
      const items = Array.isArray(profile?.persistent_menu?.[0]?.call_to_actions) ? profile.persistent_menu[0].call_to_actions : [];
      out.messengerProfileOk = Boolean(profile?.get_started?.payload === 'restart' && first?.type === 'postback' && first.payload === 'restart' && items.some(item => item?.payload === 'contact'));
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
