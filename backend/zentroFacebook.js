import crypto from 'crypto';
import axios from 'axios';
import cron from 'node-cron';
import mongoose from 'mongoose';

const WEBSITE_URL = 'https://zentrocapitalgroup.com';
const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';
const FACEBOOK_POST_CTA_TYPES = new Set(['NONE', 'MESSAGE_PAGE', 'APPLY_NOW']);
const DEFAULT_POST_TEMPLATES = [
  '{{product}}\n\n{{description}}\n\nХүү: {{rate}}\nХугацаа: {{term}}\nЗээлийн хэмжээ: {{amount}}\n\nХүсэлтээ Messenger чатаар шууд өгнө үү.\n\nЗээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна. #ZentroPrimeCapital #ШуурхайЗээл',
  'Санхүүгийн хэрэгцээгээ цөөн алхмаар шийдээрэй.\n\n{{product}}\n{{description}}\n\nХүсэлтээ Messenger чатаар шууд өгнө үү.\nХолбоо барих: {{phone}}\n\n#ZentroPrimeCapital #АвтомашиныЗээл',
  'Машинаа унаад зээлээ авах боломжийг Zentro Prime Capital-аас.\n\nӨнөөдрийн онцлох шийдэл: {{product}}\nХэмжээ: {{amount}}\nХугацаа: {{term}}\n\nХүсэлтээ Messenger чатаар шууд өгнө үү.\n\nЗээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.',
];

const DEFAULT_SOCIAL = {
  facebookPageUrl: '',
  messengerUrl: '',
  autoReplyEnabled: true,
  requestIntakeEnabled: true,
  carWelcomeMessage: 'Автомашины талаар мэдээлэл авахын тулд сонирхож буй марк, загвар, он, төсвөө бичнэ үү. Auto Market Mongolia-ийн ажилтан энэ чатад үргэлжлүүлэн хариулна.',
  loanWelcomeMessage: 'Зээлийн мэдээллээс сонгоно уу.',
  dailyPostEnabled: false,
  postTime: '10:00',
  postTimezone: DEFAULT_TIMEZONE,
  postUseProductImage: true,
  postLinkToMessenger: true,
  postCtaType: 'MESSAGE_PAGE',
  postDefaultTopic: 'loan',
  metaPixelId: '',
  profileGreeting: 'Сайн байна уу, {{user_first_name}}! Машины мэдээлэл эсвэл зээлийн хүсэлтээр танд тусалъя.',
  welcomeMessage: 'Сайн байна уу? Zentro Prime Capital-д тавтай морил. Та ямар мэдээлэл авах вэ?',
  businessHours: 'Даваа-Баасан 09:00-18:00',
  postTemplates: DEFAULT_POST_TEMPLATES,
  faqItems: [],
};

const MessengerSessionSchema = new mongoose.Schema({
  senderId: { type: String, required: true, unique: true, index: true },
  state: { type: String, default: 'idle' },
  draft: { type: mongoose.Schema.Types.Mixed, default: {} },
  processedMessageIds: { type: [String], default: [] },
  topic: { type: String, enum: ['', 'car', 'loan', 'general'], default: '' },
  referralCode: { type: String, default: '' },
  sourcePostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroFacebookPost' },
  lastInteractionAt: { type: Date, default: Date.now },
  completedRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroLoanRequest' },
}, { timestamps: true });

const FacebookPostSchema = new mongoose.Schema({
  scheduleKey: { type: String, unique: true, sparse: true },
  dateKey: { type: String, default: '' },
  source: { type: String, enum: ['automatic', 'manual'], default: 'manual' },
  status: { type: String, enum: ['publishing', 'published', 'failed', 'deleted'], default: 'publishing' },
  message: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imageUrls: { type: [String], default: [] },
  productName: { type: String, default: '' },
  topic: { type: String, enum: ['car', 'loan', 'general'], default: 'loan' },
  listingActive: { type: Boolean, default: true },
  listingFeatureVersion: { type: Number, default: 0 },
  messengerLinked: { type: Boolean, default: false },
  referralCode: { type: String, default: '' },
  messengerUrl: { type: String, default: '' },
  ctaType: { type: String, enum: ['NONE', 'MESSAGE_PAGE', 'APPLY_NOW'], default: 'NONE' },
  ctaUrl: { type: String, default: '' },
  ctaApplied: { type: Boolean, default: false },
  ctaError: { type: String, default: '' },
  chatStarts: { type: Number, default: 0 },
  insights: { type: mongoose.Schema.Types.Mixed, default: {} },
  insightsUpdatedAt: Date,
  insightsError: { type: String, default: '' },
  metaPostId: { type: String, default: '' },
  permalinkUrl: { type: String, default: '' },
  error: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  publishedAt: Date,
  deletedAt: Date,
}, { timestamps: true });

const FacebookPostPlanSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, index: true },
  slot: { type: Number, min: 1, max: 3, required: true },
  status: {
    type: String,
    enum: ['draft', 'approved', 'publishing', 'published', 'failed', 'cancelled'],
    default: 'draft',
    index: true,
  },
  subject: { type: String, default: '' },
  objective: { type: String, default: '' },
  audience: { type: String, default: '' },
  requirements: { type: String, default: '' },
  contentStyle: { type: String, default: 'professional' },
  visualType: { type: String, enum: ['photo', 'infographic'], default: 'photo' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  visualHeadline: { type: String, default: '' },
  visualSubheadline: { type: String, default: '' },
  imageUrls: { type: [String], default: [] },
  productIndex: { type: Number, default: 0 },
  productName: { type: String, default: '' },
  templateIndex: { type: Number, default: 0 },
  topic: { type: String, enum: ['car', 'loan', 'general'], default: 'loan' },
  ctaType: { type: String, enum: ['NONE', 'MESSAGE_PAGE', 'APPLY_NOW'], default: 'MESSAGE_PAGE' },
  listingActive: { type: Boolean, default: true },
  scheduledTime: { type: String, default: '' },
  generatedBy: { type: String, enum: ['ai', 'fallback', 'manual'], default: 'fallback' },
  generationWarning: { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  publishedPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroFacebookPost' },
  attempts: { type: Number, default: 0 },
  error: { type: String, default: '' },
}, { timestamps: true });

FacebookPostPlanSchema.index({ dateKey: 1, slot: 1, createdAt: -1 });

const MessengerSession = mongoose.models.ZentroMessengerSession
  || mongoose.model('ZentroMessengerSession', MessengerSessionSchema);
const FacebookPost = mongoose.models.ZentroFacebookPost
  || mongoose.model('ZentroFacebookPost', FacebookPostSchema);
const FacebookPostPlan = mongoose.models.ZentroFacebookPostPlan
  || mongoose.model('ZentroFacebookPostPlan', FacebookPostPlanSchema);

let activeListingsCache = {
  car: { expiresAt: 0, listings: [] },
  loan: { expiresAt: 0, listings: [] },
  all: { expiresAt: 0, listings: [] },
};

function facebookEnv() {
  return {
    graphVersion: process.env.ZENTRO_FB_GRAPH_VERSION || 'v25.0',
    verifyToken: process.env.ZENTRO_FB_VERIFY_TOKEN || '',
    pageAccessToken: process.env.ZENTRO_FB_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.ZENTRO_FB_PAGE_ID || '',
    appId: process.env.ZENTRO_META_APP_ID || '',
    appSecret: process.env.ZENTRO_META_APP_SECRET || '',
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function validTimezone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function normalizeZentroSocial(value = {}) {
  const postTemplates = safeArray(value.postTemplates)
    .map(template => String(template || '').trim())
    .filter(Boolean)
    .slice(0, 12);
  const faqItems = safeArray(value.faqItems)
    .filter(item => item && item.enabled !== false && item.answer)
    .slice(0, 20);
  const legacyCtaType = value.postLinkToMessenger === false ? 'NONE' : DEFAULT_SOCIAL.postCtaType;
  const postCtaType = normalizeFacebookPostCtaType(value.postCtaType, legacyCtaType);
  return {
    ...DEFAULT_SOCIAL,
    ...value,
    postDefaultTopic: ['car', 'loan', 'general'].includes(value.postDefaultTopic) ? value.postDefaultTopic : DEFAULT_SOCIAL.postDefaultTopic,
    postTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.postTime || '')) ? value.postTime : DEFAULT_SOCIAL.postTime,
    postTimezone: validTimezone(value.postTimezone || DEFAULT_TIMEZONE),
    postCtaType,
    postLinkToMessenger: postCtaType === 'MESSAGE_PAGE',
    metaPixelId: /^\d{5,30}$/.test(String(value.metaPixelId || '').trim()) ? String(value.metaPixelId).trim() : '',
    postTemplates: postTemplates.length ? postTemplates : DEFAULT_POST_TEMPLATES,
    faqItems,
  };
}

export function normalizeFacebookPostCtaType(value, fallback = 'NONE') {
  const normalized = String(value || '').trim().toUpperCase();
  if (FACEBOOK_POST_CTA_TYPES.has(normalized)) return normalized;
  const normalizedFallback = String(fallback || '').trim().toUpperCase();
  return FACEBOOK_POST_CTA_TYPES.has(normalizedFallback) ? normalizedFallback : 'NONE';
}

function cleanMetaError(error) {
  const meta = error.response?.data?.error;
  return String(meta?.message || error.response?.data?.message || error.message || 'Meta API алдаа').slice(0, 500);
}

function graphUrl(pathname) {
  const { graphVersion } = facebookEnv();
  return `https://graph.facebook.com/${graphVersion}/${String(pathname).replace(/^\//, '')}`;
}

async function graphGet(pathname, params = {}) {
  const { pageAccessToken } = facebookEnv();
  return axios.get(graphUrl(pathname), {
    params: { ...params, access_token: pageAccessToken },
    timeout: 20000,
  });
}

async function graphPost(pathname, data = {}, params = {}) {
  const { pageAccessToken } = facebookEnv();
  return axios.post(graphUrl(pathname), data, {
    params: { ...params, access_token: pageAccessToken },
    timeout: 30000,
  });
}

async function graphDelete(pathname, params = {}) {
  const { pageAccessToken } = facebookEnv();
  return axios.delete(graphUrl(pathname), {
    params: { ...params, access_token: pageAccessToken },
    timeout: 30000,
  });
}

async function graphPostWithToken(pathname, data = {}, accessToken = '') {
  return axios.post(graphUrl(pathname), data, {
    params: { access_token: accessToken },
    timeout: 30000,
  });
}

export function isMissingMetaPostError(error) {
  const meta = error?.response?.data?.error || {};
  const message = String(meta.message || '').toLowerCase();
  return Number(error?.response?.status || 0) === 400
    && [100, 803].includes(Number(meta.code))
    && (
      message.includes('does not exist')
      || message.includes('cannot be loaded')
      || message.includes('unsupported get request')
      || message.includes('unsupported post request')
      || message.includes('unknown path components')
    );
}

// Meta органик Page постод CTA товч нэмэх боломжийг хаасан. `call_to_action` нь
// attached_media-г Messenger link preview-ээр сольж болдог тул органик publish
// payload-д CTA төрлийн ямар ч field дамжуулахгүй.
export const FACEBOOK_ORGANIC_CTA_NOTE = 'Meta органик пост дээр товч зөвшөөрдөггүй. Send Message товч зөвхөн энэ постыг зар (boost) болгосон үед харагдана.';

export function buildFacebookOrganicPostPayload(payload = {}) {
  const organicPayload = { ...payload, published: true };
  delete organicPayload.call_to_action;
  delete organicPayload.cta_type;
  delete organicPayload.cta_link;
  return organicPayload;
}

async function publishPageFeed(pageId, payload) {
  return {
    response: await graphPost(`${pageId}/feed`, buildFacebookOrganicPostPayload(payload)),
    ctaError: '',
  };
}

// Meta танихгүй параметрийг алдаа буцаалгүй чимээгүй хаядаг тул нийтэлсэн
// постоос call_to_action-ыг буцааж уншиж, товч үнэхээр тавигдсан эсэхийг шалгана.
export async function verifyPostCta(metaPostId) {
  if (!metaPostId) return { applied: false, error: '' };
  try {
    const response = await graphGet(metaPostId, { fields: 'call_to_action' });
    return { applied: Boolean(response.data?.call_to_action?.type), error: '' };
  } catch (error) {
    return { applied: false, error: cleanMetaError(error) };
  }
}

export function verifyZentroWebhookSignature(rawBody, header, appSecret) {
  const signature = String(header || '');
  if (!appSecret || !rawBody || !signature.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signature.slice(7);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function verifyWebhookSignature(req) {
  const { appSecret } = facebookEnv();
  return verifyZentroWebhookSignature(req.rawBody, req.get('x-hub-signature-256'), appSecret);
}

function quickReplies(options = []) {
  return options.slice(0, 11).map(option => ({
    content_type: 'text',
    title: String(option.title || '').slice(0, 20),
    payload: String(option.payload || option.title || '').slice(0, 1000),
  }));
}

async function sendMessage(senderId, text, options = []) {
  const { pageAccessToken, pageId } = facebookEnv();
  if (!pageAccessToken) throw new Error('ZENTRO_FB_PAGE_ACCESS_TOKEN тохируулагдаагүй байна.');
  const message = { text: String(text || '').trim().slice(0, 1900) };
  const replies = quickReplies(options);
  if (replies.length) message.quick_replies = replies;
  await graphPost(`${pageId || 'me'}/messages`, {
    recipient: { id: senderId },
    messaging_type: 'RESPONSE',
    message,
  });
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function listingTitle(message, fallback = 'Автомашины зар') {
  const firstLine = String(message || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || fallback;
  return firstLine.slice(0, 80);
}

function isClosedListing(message) {
  const text = normalizedText(message);
  return ['зарагдсан', 'борлуулагдсан', 'идэвхгүй', 'зар хаагдсан', 'sold'].some(term => text.includes(term));
}

export function isMessengerListingCandidate(value = {}) {
  const message = String(value.message || value.description || '').replace(/\s+/g, ' ').trim();
  const imageUrl = safeHttpsUrl(value.full_picture || value.imageUrl || safeArray(value.imageUrls)[0]);
  return message.length >= 10 && Boolean(imageUrl) && !isClosedListing(message);
}

function normalizeListing(value = {}) {
  const message = String(value.message || '');
  const sourcePostId = String(value._id || value.sourcePostId || '');
  const metaPostId = String(value.metaPostId || value.id || '');
  const id = sourcePostId || metaPostId;
  return {
    id,
    sourcePostId,
    metaPostId,
    topic: normalizePostTopic(value.topic, 'car'),
    productName: String(value.productName || ''),
    title: listingTitle(message, value.productName || (value.topic === 'loan' ? 'Зээлийн санал' : 'Автомашины зар')),
    description: message.replace(/\s+/g, ' ').trim().slice(0, 80),
    imageUrl: safeHttpsUrl(value.full_picture || value.imageUrl || safeArray(value.imageUrls)[0]),
    permalinkUrl: safeHttpsUrl(value.permalink_url || value.permalinkUrl),
    createdAt: value.created_time || value.publishedAt || value.createdAt || null,
  };
}

export function sortListingsNewestFirst(listings = []) {
  return [...safeArray(listings)].sort((left, right) => {
    const rightTime = Date.parse(right?.createdAt || '') || 0;
    const leftTime = Date.parse(left?.createdAt || '') || 0;
    return rightTime - leftTime;
  });
}

export function buildMessengerListingElements(listings = []) {
  return safeArray(listings).filter(listing => listing?.id).slice(0, 10).map(listing => {
    const id = String(listing.id).slice(0, 700);
    const loanOffer = listing.topic === 'loan';
    const buttons = [];
    const permalinkUrl = safeHttpsUrl(listing.permalinkUrl);
    if (permalinkUrl) buttons.push({ type: 'web_url', url: permalinkUrl, title: loanOffer ? 'Нийтлэл үзэх' : 'Зарыг үзэх' });
    if (loanOffer) {
      buttons.push({ type: 'postback', title: 'Нөхцөл асуух', payload: `ZENTRO_LOAN_OFFER_${id}` });
      buttons.push({ type: 'postback', title: 'Хүсэлт өгөх', payload: `ZENTRO_LOAN_OFFER_APPLY_${id}` });
    } else {
      buttons.push({ type: 'postback', title: 'Энэ зарыг асуух', payload: `ZENTRO_LISTING_${id}` });
      buttons.push({ type: 'postback', title: 'Зээлээр авах', payload: `ZENTRO_LISTING_LOAN_${id}` });
    }
    return {
      title: String(listing.title || (loanOffer ? 'Зээлийн санал' : 'Автомашины зар')).slice(0, 80),
      subtitle: String(listing.description || 'Дэлгэрэнгүй мэдээллийг сонгоно уу.').slice(0, 80),
      ...(safeHttpsUrl(listing.imageUrl) ? { image_url: safeHttpsUrl(listing.imageUrl) } : {}),
      buttons: buttons.slice(0, 3),
    };
  });
}

async function sendListingCarousel(senderId, listings = []) {
  const { pageAccessToken, pageId } = facebookEnv();
  if (!pageAccessToken) throw new Error('ZENTRO_FB_PAGE_ACCESS_TOKEN тохируулагдаагүй байна.');
  const elements = buildMessengerListingElements(listings);
  if (!elements.length) return false;
  await graphPost(`${pageId || 'me'}/messages`, {
    recipient: { id: senderId },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: { template_type: 'generic', elements },
      },
    },
  });
  return true;
}

function clearActiveListingsCache() {
  activeListingsCache = {
    car: { expiresAt: 0, listings: [] },
    loan: { expiresAt: 0, listings: [] },
    all: { expiresAt: 0, listings: [] },
  };
}

async function fetchActivePageListings(limit = 10, topic = 'all', offset = 0) {
  const finalTopic = ['car', 'loan'].includes(topic) ? topic : 'all';
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const now = Date.now();
  const cache = activeListingsCache[finalTopic];
  if (cache.expiresAt > now) return cache.listings.slice(safeOffset, safeOffset + safeLimit);
  const records = await FacebookPost.find({ status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(200)
    .lean();
  const managedMetaIds = new Set(records
    .map(record => String(record.metaPostId || ''))
    .filter(Boolean));
  const tracked = records
    .filter(record => {
      if (!['car', 'loan'].includes(record.topic) || record.listingActive === false || isClosedListing(record.message)) return false;
      if (finalTopic !== 'all' && record.topic !== finalTopic) return false;
      return record.topic === 'loan'
        ? String(record.message || '').replace(/\s+/g, ' ').trim().length >= 10
        : isMessengerListingCandidate(record);
    })
    .map(normalizeListing);
  let live = [];
  if (finalTopic !== 'loan') {
    try {
      const { pageId } = facebookEnv();
      const response = await graphGet(`${pageId}/published_posts`, {
        fields: 'id,message,full_picture,permalink_url,created_time',
        limit: 100,
      });
      live = safeArray(response.data?.data)
        .filter(post => !managedMetaIds.has(String(post.id || '')) && isMessengerListingCandidate(post))
        .map(normalizeListing);
    } catch (error) {
      console.error('Zentro active Page listings error:', cleanMetaError(error));
    }
  }
  const unique = [];
  const seen = new Set();
  for (const listing of sortListingsNewestFirst([...tracked, ...live])) {
    if (!listing.id || seen.has(listing.id)) continue;
    seen.add(listing.id);
    unique.push(listing);
  }
  activeListingsCache[finalTopic] = { expiresAt: now + 5 * 60 * 1000, listings: unique.slice(0, 200) };
  return activeListingsCache[finalTopic].listings.slice(safeOffset, safeOffset + safeLimit);
}

function normalizePostTopic(value, fallback = 'loan') {
  return ['car', 'loan', 'general'].includes(value) ? value : fallback;
}

export function normalizeFacebookPostImages(imageUrls = [], imageUrl = '', generatedImage = '') {
  return [...new Set([
    ...safeArray(imageUrls),
    imageUrl,
    generatedImage,
  ].map(safeHttpsUrl).filter(Boolean))].slice(0, 5);
}

export function resolveFacebookPostImages(imageUrls = [], imageUrl = '', generatedImage = '') {
  const selectedImages = normalizeFacebookPostImages(imageUrls, imageUrl);
  return selectedImages.length
    ? selectedImages
    : normalizeFacebookPostImages([], '', generatedImage);
}

function entryOptions() {
  return [
    { title: 'Идэвхтэй зар', payload: 'ZENTRO_LISTINGS' },
    { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
  ];
}

function loanMenuOptions(social) {
  const options = [
    { title: 'Идэвхтэй зар', payload: 'ZENTRO_LISTINGS' },
    { title: 'Зээлийн нөхцөл', payload: 'ZENTRO_PRODUCTS' },
    { title: 'Холбоо барих', payload: 'ZENTRO_CONTACT' },
    { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
  ];
  if (social.requestIntakeEnabled) options.splice(2, 0, { title: 'Хүсэлт өгөх', payload: 'ZENTRO_APPLY' });
  return options;
}

function productOptions(products = []) {
  return products.slice(0, 10).map((product, index) => ({
    title: `${index + 1}. ${product.name || 'Зээл'}`.slice(0, 20),
    payload: `ZENTRO_PRODUCT_${index}`,
  }));
}

function productSummary(products = []) {
  return products.slice(0, 8).map((product, index) => [
    `${index + 1}. ${product.name || 'Зээлийн бүтээгдэхүүн'}`,
    product.rate ? `Хүү: ${product.rate}` : '',
    product.term ? `Хугацаа: ${product.term}` : '',
    product.amount ? `Хэмжээ: ${product.amount}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
}

function normalizedText(value) {
  return String(value || '').trim().toLowerCase();
}

function isAny(text, terms) {
  return terms.some(term => text.includes(term));
}

export function parseZentroAmount(value) {
  const text = normalizedText(value).replace(/,/g, '');
  const number = Number((text.match(/[0-9]+(?:\.[0-9]+)?/) || [])[0]);
  if (!Number.isFinite(number) || number <= 0) return Number.NaN;
  if (text.includes('тэрбум')) return Math.round(number * 1_000_000_000);
  if (text.includes('сая')) return Math.round(number * 1_000_000);
  if (text.includes('мянга')) return Math.round(number * 1_000);
  return Math.round(number);
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('mn-MN');
}

function customFaqReply(text, social) {
  return social.faqItems.find(item => {
    const keywords = Array.isArray(item.keywords)
      ? item.keywords
      : String(item.keywords || '').split(',');
    return keywords.map(normalizedText).filter(Boolean).some(keyword => text.includes(keyword));
  })?.answer || '';
}

async function saveMessageId(session, messageId) {
  if (!messageId) return;
  session.processedMessageIds = [...safeArray(session.processedMessageIds), messageId].slice(-30);
}

async function showActiveListings(session, senderId, social, {
  fetchListings,
  sendListings,
  send = sendMessage,
} = {}, offset = 0) {
  if (typeof fetchListings !== 'function' || typeof sendListings !== 'function') return;
  session.state = 'idle';
  session.topic = '';
  session.draft = {};
  await session.save();
  const pageOffset = Math.max(Number(offset) || 0, 0);
  const page = await fetchListings(11, pageOffset);
  const listings = page.slice(0, 10);
  const hasMore = page.length > 10;
  if (!listings.length) {
    await send(senderId, pageOffset > 0 ? 'Үүнээс цааш идэвхтэй зар алга байна.' : 'Одоогоор харуулах идэвхтэй зар олдсонгүй.', [
      ...(pageOffset > 0 ? [{ title: 'Эхнээс харах', payload: 'ZENTRO_LISTINGS' }] : []),
      { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
      { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
    ]);
    return;
  }
  try {
    await sendListings(senderId, listings);
  } catch (error) {
    console.error('Zentro Messenger listing carousel error:', cleanMetaError(error));
    const fallback = listings.map((listing, index) => (
      `${pageOffset + index + 1}. ${listing.title}${listing.permalinkUrl ? `\n${listing.permalinkUrl}` : ''}`
    )).join('\n\n');
    await send(senderId, `Идэвхтэй зарууд:\n\n${fallback}`);
  }
  await send(senderId, `${pageOffset + 1}-${pageOffset + listings.length} дэх идэвхтэй зарууд.`, [
    ...(hasMore ? [{ title: 'Илүү их', payload: `ZENTRO_LISTINGS_MORE_${pageOffset + 10}` }] : []),
    ...(pageOffset > 0 ? [{ title: 'Эхнээс харах', payload: 'ZENTRO_LISTINGS' }] : []),
    { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
    { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
  ]);
}

async function showEntryMenu(session, senderId, social, send = sendMessage, listingTools = {}, preserveSource = false) {
  session.state = 'idle';
  session.topic = '';
  session.draft = {};
  if (!preserveSource) {
    session.referralCode = '';
    session.sourcePostId = null;
  }
  await session.save();
  await send(senderId, social.welcomeMessage, entryOptions());
  await showActiveListings(session, senderId, social, { ...listingTools, send });
}

async function startCarInquiry(session, senderId, social, send = sendMessage, initialDraft = {}) {
  session.state = 'await_car_inquiry';
  session.topic = 'car';
  session.draft = { ...initialDraft };
  await session.save();
  const selected = initialDraft.listingTitle ? `Сонгосон зар: ${initialDraft.listingTitle}\n\n` : '';
  await send(senderId, `${selected}${social.carWelcomeMessage}`, [
    { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
    { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
  ]);
}

async function showLoanMenu(session, senderId, social, send = sendMessage) {
  session.state = 'idle';
  session.topic = 'loan';
  session.draft = {};
  await session.save();
  await send(senderId, social.loanWelcomeMessage, loanMenuOptions(social));
}

async function startApplication(session, senderId, send = sendMessage, initialDraft = {}) {
  session.state = 'await_name';
  session.topic = 'loan';
  session.draft = { ...initialDraft };
  if (/^[a-f0-9]{24}$/i.test(String(initialDraft.sourcePostId || ''))) {
    session.sourcePostId = initialDraft.sourcePostId;
  }
  session.lastInteractionAt = new Date();
  await session.save();
  await send(senderId, 'Зээлийн хүсэлтийг Messenger-ээр бүртгэе. Үргэлжлүүлснээр мэдээллээ хүсэлт шийдвэрлэх зорилгоор ашиглуулахыг зөвшөөрнө. Эхлээд овог, нэрээ Монгол кириллээр бичнэ үү.', [
    { title: 'Болих', payload: 'ZENTRO_CANCEL' },
  ]);
}

async function completeMessengerApplication({ session, senderId, draft, social, ZentroLoanRequest, send = sendMessage }) {
  const recentRequest = typeof ZentroLoanRequest.findOne === 'function'
    ? await ZentroLoanRequest.findOne({
      source: 'facebook',
      externalUserId: senderId,
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    }).sort({ createdAt: -1 })
    : null;
  if (recentRequest) {
    session.state = 'idle';
    session.draft = {};
    session.referralCode = '';
    session.sourcePostId = null;
    session.completedRequestId = recentRequest._id;
    await session.save();
    await send(senderId, `Таны сүүлийн хүсэлт аль хэдийн бүртгэгдсэн байна. Хүсэлтийн дугаар: ${String(recentRequest._id).slice(-8).toUpperCase()}`, loanMenuOptions(social));
    return true;
  }
  const request = await ZentroLoanRequest.create({
    ...draft,
    register: '',
    email: draft.email || '',
    source: 'facebook',
    externalUserId: senderId,
    status: 'new',
    answers: {
      channel: 'facebook_messenger',
      facebookSenderId: senderId,
      facebookListingId: draft.listingId || '',
      facebookListingUrl: draft.listingUrl || '',
      facebookSourcePostId: String(draft.sourcePostId || session.sourcePostId || ''),
      marketingConsent: draft.marketingConsent === true,
      marketingConsentAt: draft.marketingConsentAt || '',
    },
    notes: draft.listingUrl
      ? `Facebook Messenger-ээс автоматаар бүртгэсэн хүсэлт. Сонгосон зар: ${draft.listingUrl}`
      : 'Facebook Messenger-ээс автоматаар бүртгэсэн хүсэлт.',
  });
  session.state = 'idle';
  session.draft = {};
  session.referralCode = '';
  session.sourcePostId = null;
  session.completedRequestId = request._id;
  await session.save();
  await send(senderId, [
    'Таны хүсэлтийг амжилттай бүртгэлээ.',
    `Хүсэлтийн дугаар: ${String(request._id).slice(-8).toUpperCase()}`,
    `Зээлийн төрөл: ${draft.productType}`,
    `Дүн: ${formatAmount(draft.amount)} ₮`,
    'Манай ажилтан тантай утсаар холбогдоно.',
  ].join('\n'), loanMenuOptions(social));
  return true;
}

async function processActiveApplication({ session, senderId, messageText, payload, config, social, ZentroLoanRequest, send = sendMessage }) {
  if (payload === 'ZENTRO_CANCEL' || isAny(normalizedText(messageText), ['болих', 'цуцлах'])) {
    session.state = 'idle';
    session.draft = {};
    await session.save();
    await send(senderId, 'Хүсэлтийг цуцаллаа.', loanMenuOptions(social));
    return true;
  }

  const draft = { ...(session.draft || {}) };
  if (session.state === 'await_car_inquiry') {
    const inquiry = String(messageText || '').trim();
    if (inquiry.length < 2) {
      await send(senderId, 'Сонирхож буй машины марк, загвар, он эсвэл төсвөө арай дэлгэрэнгүй бичнэ үү.');
      return true;
    }
    session.state = 'car_handoff';
    session.topic = 'car';
    session.draft = { ...draft, carInquiry: inquiry.slice(0, 1500) };
    await session.save();
    await send(senderId, 'Мэдээллийг хүлээн авлаа. Auto Market Mongolia-ийн ажилтан энэ чатад үргэлжлүүлэн хариулна.', [
      { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
      { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
    ]);
    return true;
  }

  if (session.state === 'car_handoff') return true;

  if (session.state === 'await_name') {
    const name = String(messageText || '').trim().replace(/\s+/g, ' ');
    if (!/^[А-Яа-яЁёӨөҮү]+(?:[ -][А-Яа-яЁёӨөҮү]+)*$/.test(name)) {
      await send(senderId, 'Овог, нэрээ зөвхөн Монгол кирилл үсгээр бичнэ үү. Жишээ: Бат Эрдэнэ');
      return true;
    }
    draft.name = name;
    session.state = 'await_phone';
    session.draft = draft;
    await session.save();
    await send(senderId, 'Холбоо барих 8 оронтой утасны дугаараа оруулна уу.');
    return true;
  }

  if (session.state === 'await_phone') {
    const phone = String(messageText || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(phone)) {
      await send(senderId, 'Утасны дугаар яг 8 оронтой байна. Дахин оруулна уу.');
      return true;
    }
    draft.phone = phone;
    session.state = 'await_email';
    session.draft = draft;
    await session.save();
    await send(senderId, 'И-мэйл хаягаа оруулна уу. Заавал биш тул алгасаж болно.', [
      { title: 'Имэйл алгасах', payload: 'ZENTRO_SKIP_EMAIL' },
    ]);
    return true;
  }

  if (session.state === 'await_email') {
    const directProduct = String(payload || '').match(/^ZENTRO_PRODUCT_(\d+)$/);
    if (directProduct) {
      draft.email = '';
      draft.marketingConsent = false;
      session.state = 'await_product';
      session.draft = draft;
      await session.save();
    } else {
      const email = String(messageText || '').trim().toLowerCase();
      const skipped = payload === 'ZENTRO_SKIP_EMAIL' || isAny(normalizedText(messageText), ['алгасах', 'байхгүй', 'үгүй']);
      if (!skipped && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await send(senderId, 'И-мэйл хаяг буруу байна. Жишээ: name@example.com', [
          { title: 'Имэйл алгасах', payload: 'ZENTRO_SKIP_EMAIL' },
        ]);
        return true;
      }
      draft.email = skipped ? '' : email.slice(0, 254);
      session.state = 'await_marketing_consent';
      session.draft = draft;
      await session.save();
      await send(senderId, 'Зээлийн санал, шинэ мэдээллийг Facebook болон холбоо барих сувгаар авахыг зөвшөөрөх үү? Энэ нь хүсэлтэд заавал биш.', [
        { title: 'Тийм, зөвшөөрнө', payload: 'ZENTRO_MARKETING_YES' },
        { title: 'Үгүй', payload: 'ZENTRO_MARKETING_NO' },
      ]);
      return true;
    }
  }

  if (session.state === 'await_marketing_consent') {
    const directProduct = String(payload || '').match(/^ZENTRO_PRODUCT_(\d+)$/);
    if (directProduct) {
      draft.marketingConsent = false;
    } else {
      const text = normalizedText(messageText);
      const accepted = payload === 'ZENTRO_MARKETING_YES' || isAny(text, ['тийм', 'зөвшөөрнө', 'зөвшөөрөх']);
      const declined = payload === 'ZENTRO_MARKETING_NO' || isAny(text, ['үгүй', 'зөвшөөрөхгүй', 'татгалзах']);
      if (!accepted && !declined) {
        await send(senderId, 'Маркетингийн мэдээлэл авах эсэхээ сонгоно уу.', [
          { title: 'Тийм, зөвшөөрнө', payload: 'ZENTRO_MARKETING_YES' },
          { title: 'Үгүй', payload: 'ZENTRO_MARKETING_NO' },
        ]);
        return true;
      }
      draft.marketingConsent = accepted;
      if (accepted) draft.marketingConsentAt = new Date().toISOString();
    }
    session.state = !directProduct && draft.productType ? 'await_amount' : 'await_product';
    session.draft = draft;
    await session.save();
    if (!directProduct) {
      if (draft.productType) {
        await send(senderId, `Сонгосон зээл: ${draft.productType}\n\nХүсэж буй зээлийн дүнгээ оруулна уу. Жишээ: 10000000 эсвэл 10 сая`);
      } else {
        await send(senderId, 'Сонирхож буй зээлийн төрлөө сонгоно уу.', productOptions(config.products));
      }
      return true;
    }
  }

  if (session.state === 'await_product') {
    const payloadMatch = String(payload || '').match(/^ZENTRO_PRODUCT_(\d+)$/);
    let productIndex = payloadMatch ? Number(payloadMatch[1]) : -1;
    if (productIndex < 0) {
      const input = normalizedText(messageText);
      productIndex = config.products.findIndex(product => normalizedText(product.name).includes(input) || input.includes(normalizedText(product.name)));
    }
    const product = config.products[productIndex];
    if (!product) {
      await send(senderId, 'Жагсаалтаас зээлийн төрлөө сонгоно уу.', productOptions(config.products));
      return true;
    }
    draft.productType = product.name;
    session.state = 'await_amount';
    session.draft = draft;
    await session.save();
    await send(senderId, 'Хүсэж буй зээлийн дүнгээ цифрээр оруулна уу. Жишээ: 10000000 эсвэл 10 сая');
    return true;
  }

  if (session.state === 'await_amount') {
    const amount = parseZentroAmount(messageText);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      await send(senderId, 'Зээлийн дүнг зөв оруулна уу. Жишээ: 10000000 эсвэл 10 сая');
      return true;
    }
    draft.amount = amount;
    session.state = 'await_term';
    session.draft = draft;
    await session.save();
    await send(senderId, 'Хүсэж буй хугацааг сараар оруулна уу. Жишээ: 12');
    return true;
  }

  if (session.state === 'await_term') {
    const termMonths = Number(String(messageText || '').match(/\d+/)?.[0]);
    if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 60) {
      await send(senderId, 'Хугацааг 1-60 сарын хооронд цифрээр оруулна уу.');
      return true;
    }
    draft.termMonths = termMonths;
    if (draft.collateral) {
      session.draft = draft;
      await session.save();
      return completeMessengerApplication({ session, senderId, draft, social, ZentroLoanRequest, send });
    }
    session.state = 'await_collateral';
    session.draft = draft;
    await session.save();
    await send(senderId, 'Барьцааны мэдээллээ товч бичнэ үү. Жишээ: Toyota Prius 2018, 1234 УБА');
    return true;
  }

  if (session.state === 'await_collateral') {
    const collateral = String(messageText || '').trim();
    if (collateral.length < 3) {
      await send(senderId, 'Барьцааны мэдээллийг арай дэлгэрэнгүй бичнэ үү.');
      return true;
    }
    draft.collateral = collateral.slice(0, 1000);
    session.draft = draft;
    await session.save();
    return completeMessengerApplication({ session, senderId, draft, social, ZentroLoanRequest, send });
  }

  return false;
}

function referralFromEvent(event = {}) {
  return String(
    event.referral?.ref
    || event.postback?.referral?.ref
    || event.message?.referral?.ref
    || ''
  ).trim();
}

function parsePostReferral(value) {
  const match = String(value || '').match(/^zpc-post-(car|loan|general)-([a-f0-9]{24})$/i);
  return match ? { topic: normalizePostTopic(match[1].toLowerCase()), postId: match[2].toLowerCase() } : null;
}

export async function processZentroMessengerEvent({
  event,
  config,
  ZentroLoanRequest,
  SessionModel = MessengerSession,
  PostModel = FacebookPost,
  send = sendMessage,
  fetchListings,
  sendListings,
}) {
  const senderId = event.sender?.id;
  const payload = event.message?.quick_reply?.payload || event.postback?.payload || '';
  const referralCode = referralFromEvent(event);
  const messageId = event.message?.mid || event.postback?.mid || (referralCode && event.timestamp ? `ref:${referralCode}:${event.timestamp}` : '');
  const messageText = event.message?.text || payload || referralCode;
  if (!senderId || !messageText || event.message?.is_echo) return;

  if (messageId && await SessionModel.exists({ senderId, processedMessageIds: messageId })) return;
  const social = normalizeZentroSocial(config.social);
  const listingTools = { fetchListings, sendListings };
  const session = await SessionModel.findOneAndUpdate(
    { senderId },
    { $setOnInsert: { senderId, state: 'idle', topic: '', draft: {} } },
    { new: true, upsert: true }
  );
  await saveMessageId(session, messageId);
  session.lastInteractionAt = new Date();
  await session.save();

  if (!social.autoReplyEnabled) return;

  const referral = parsePostReferral(referralCode);
  if (referral) {
    session.referralCode = referralCode;
    session.sourcePostId = referral.postId;
    session.topic = referral.topic;
    await session.save();
    if (typeof PostModel?.updateOne === 'function') {
      await PostModel.updateOne({ _id: referral.postId }, { $inc: { chatStarts: 1 } }).catch(() => {});
    }
    if (referral.topic === 'car') await startCarInquiry(session, senderId, social, send);
    else if (referral.topic === 'loan') await showLoanMenu(session, senderId, social, send);
    else await showEntryMenu(session, senderId, social, send, listingTools, true);
    return;
  }

  if (payload === 'ZENTRO_HOME' || payload === 'ZENTRO_GET_STARTED') {
    await showEntryMenu(session, senderId, social, send, listingTools);
    return;
  }

  if (payload === 'ZENTRO_LISTINGS' || payload === 'ZENTRO_CAR') {
    await showActiveListings(session, senderId, social, { ...listingTools, send });
    return;
  }

  const listingsPageMatch = String(payload).match(/^ZENTRO_LISTINGS_MORE_(\d+)$/);
  if (listingsPageMatch) {
    await showActiveListings(session, senderId, social, { ...listingTools, send }, Number(listingsPageMatch[1]));
    return;
  }

  if (payload === 'ZENTRO_LOAN_OFFERS') {
    await showActiveListings(session, senderId, social, { ...listingTools, send });
    return;
  }

  if (payload === 'ZENTRO_CAR_QUESTION') {
    await startCarInquiry(session, senderId, social, send);
    return;
  }

  if (payload === 'ZENTRO_LOAN') {
    await showLoanMenu(session, senderId, social, send);
    return;
  }

  const loanOfferApplyMatch = String(payload).match(/^ZENTRO_LOAN_OFFER_APPLY_(.+)$/);
  const loanOfferQuestionMatch = String(payload).match(/^ZENTRO_LOAN_OFFER_(.+)$/);
  if (loanOfferApplyMatch || loanOfferQuestionMatch) {
    const offerId = String((loanOfferApplyMatch || loanOfferQuestionMatch)[1] || '');
    const offers = typeof fetchListings === 'function' ? await fetchListings(100, 0) : [];
    const offer = offers.find(item => String(item.id) === offerId) || {};
    const offerDraft = {
      listingId: offerId,
      listingTitle: offer.title || 'Facebook зээлийн санал',
      listingUrl: offer.permalinkUrl || '',
      sourcePostId: offer.sourcePostId || (/^[a-f0-9]{24}$/i.test(offerId) ? offerId : ''),
      productType: offer.productName || '',
    };
    if (loanOfferApplyMatch) {
      await startApplication(session, senderId, send, offerDraft);
    } else {
      session.state = 'idle';
      session.topic = 'loan';
      session.draft = offerDraft;
      if (offerDraft.sourcePostId) session.sourcePostId = offerDraft.sourcePostId;
      await session.save();
      await send(senderId, `${offer.title || 'Зээлийн санал'}\n\n${offer.description || 'Дэлгэрэнгүй нөхцөлийг манай ажилтан тайлбарлана.'}`, [
        ...(social.requestIntakeEnabled ? [{ title: 'Хүсэлт өгөх', payload: `ZENTRO_LOAN_OFFER_APPLY_${offerId}` }] : []),
        { title: 'Бүх зар', payload: 'ZENTRO_LISTINGS' },
        { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
      ]);
    }
    return;
  }

  const listingLoanMatch = String(payload).match(/^ZENTRO_LISTING_LOAN_(.+)$/);
  const listingQuestionMatch = String(payload).match(/^ZENTRO_LISTING_(.+)$/);
  if (listingLoanMatch || listingQuestionMatch) {
    const listingId = String((listingLoanMatch || listingQuestionMatch)[1] || '');
    const listings = typeof fetchListings === 'function' ? await fetchListings(100, 0) : [];
    const listing = listings.find(item => String(item.id) === listingId) || {};
    const listingDraft = {
      listingId,
      listingTitle: listing.title || 'Facebook автомашины зар',
      listingUrl: listing.permalinkUrl || '',
      collateral: listing.title || 'Facebook автомашины зар',
    };
    if (listingLoanMatch) await startApplication(session, senderId, send, listingDraft);
    else await startCarInquiry(session, senderId, social, send, listingDraft);
    return;
  }

  const text = normalizedText(messageText);
  if (payload === 'ZENTRO_APPLY' || isAny(text, ['хүсэлт өгөх', 'зээлийн хүсэлт', 'хүсэлт гаргах'])) {
    if (!social.requestIntakeEnabled) {
      await send(senderId, 'Messenger хүсэлт одоогоор түр хаалттай байна. Манай ажилтантай холбогдохыг сонгоно уу.', [
        { title: 'Холбоо барих', payload: 'ZENTRO_CONTACT' },
        { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
      ]);
      return;
    }
    await startApplication(session, senderId, send);
    return;
  }

  if (session.state !== 'idle') {
    await processActiveApplication({ session, senderId, messageText, payload, config, social, ZentroLoanRequest, send });
    return;
  }

  if (payload === 'ZENTRO_PRODUCTS' || isAny(text, ['хүү', 'нөхцөл', 'зээлийн төрөл', 'бүтээгдэхүүн', 'ямар зээл'])) {
    await send(senderId, productSummary(config.products) || 'Зээлийн бүтээгдэхүүний мэдээлэл шинэчлэгдэж байна.', [
      ...productOptions(config.products).slice(0, 8),
      ...(social.requestIntakeEnabled ? [{ title: 'Хүсэлт өгөх', payload: 'ZENTRO_APPLY' }] : []),
      { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
    ]);
    return;
  }

  if (isAny(text, ['зээлийн талаар', 'зээл авах', 'зээл сонирхож', 'санхүүжилт'])) {
    await showLoanMenu(session, senderId, social, send);
    return;
  }

  if (isAny(text, ['машины талаар', 'машин авах', 'машин сонирхож', 'автомашин худалдаа', 'авто маркет'])) {
    await showActiveListings(session, senderId, social, { ...listingTools, send });
    return;
  }

  if (payload === 'ZENTRO_CONTACT' || isAny(text, ['утас', 'хаяг', 'холбоо барих', 'байршил'])) {
    await send(senderId, `Утас: ${config.phone}\nИ-мэйл: ${config.email}\nХаяг: ${config.address}\nАжлын цаг: ${social.businessHours}`, loanMenuOptions(social));
    return;
  }

  if (isAny(text, ['ажлын цаг', 'хэдээс', 'хэдэн цаг'])) {
    await send(senderId, `Манай ажлын цаг: ${social.businessHours}`, loanMenuOptions(social));
    return;
  }

  const faq = customFaqReply(text, social);
  if (faq) {
    await send(senderId, faq, session.topic === 'loan' ? loanMenuOptions(social) : entryOptions());
    return;
  }

  await showEntryMenu(session, senderId, social, send, listingTools);
}

export function buildMessengerProfile(value = {}) {
  const social = normalizeZentroSocial(value);
  const greeting = String(social.profileGreeting || DEFAULT_SOCIAL.profileGreeting).trim().slice(0, 160);
  return {
    greeting: [{ locale: 'default', text: greeting }],
    get_started: { payload: 'ZENTRO_GET_STARTED' },
    ice_breakers: [
      { question: 'Идэвхтэй зар', payload: 'ZENTRO_LISTINGS' },
      { question: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
    ],
    persistent_menu: [{
      locale: 'default',
      composer_input_disabled: false,
      call_to_actions: [
        { type: 'postback', title: 'Идэвхтэй зар', payload: 'ZENTRO_LISTINGS' },
        { type: 'postback', title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
      ],
    }],
  };
}

async function configureMessengerProfile(social = {}) {
  const { pageAccessToken, pageId } = facebookEnv();
  if (!pageAccessToken) throw new Error('Page access token тохируулагдаагүй байна.');
  await graphPost('me/messenger_profile', buildMessengerProfile(social));
}

export function selectMetaWebhookApp(apps = [], preferredId = '') {
  const values = safeArray(apps).filter(app => app?.id);
  if (preferredId) return values.find(app => String(app.id) === String(preferredId)) || null;
  return values.find(app => /\bzpc\b|zentro/i.test(String(app.name || '')))
    || (values.length === 1 ? values[0] : null);
}

async function configureAppWebhook() {
  const env = facebookEnv();
  if (!env.appSecret || !env.verifyToken) throw new Error('Meta App secret болон webhook verify token шаардлагатай.');
  const subscriptions = await graphGet(`${env.pageId}/subscribed_apps`, {
    fields: 'id,name,subscribed_fields',
  });
  const app = selectMetaWebhookApp(subscriptions.data?.data, env.appId);
  if (!app) throw new Error('Meta app-ийг автоматаар тодорхойлж чадсангүй. ZENTRO_META_APP_ID тохируулна уу.');
  const fields = ['messages', 'messaging_postbacks', 'messaging_referrals'];
  const callbackUrl = `${process.env.PUBLIC_API_BASE_URL || 'https://scm-okjs.onrender.com'}/api/zentro/facebook/webhook`;
  const response = await graphPostWithToken(`${app.id}/subscriptions`, {
    object: 'page',
    callback_url: callbackUrl,
    fields: fields.join(','),
    verify_token: env.verifyToken,
  }, `${app.id}|${env.appSecret}`);
  return {
    success: Boolean(response.data?.success ?? true),
    appId: String(app.id),
    appName: String(app.name || ''),
    callbackUrl,
    fields,
  };
}

async function subscribePage(social = {}) {
  const { pageId, pageAccessToken } = facebookEnv();
  if (!pageId || !pageAccessToken) throw new Error('Page ID болон Page access token шаардлагатай.');
  const response = await graphPost(`${pageId}/subscribed_apps`, {}, {
    subscribed_fields: 'messages,messaging_postbacks,messaging_referrals',
  });
  const appWebhook = await configureAppWebhook();
  await configureMessengerProfile(social);
  return { ...response.data, appWebhook };
}

function replaceTemplate(template, values) {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value || '')),
    String(template || '')
  ).trim();
}

export function buildZentroMessengerLink(social = {}, referralCode = '', pageId = '') {
  const configured = String(social.messengerUrl || '').trim();
  const base = configured || (pageId ? `https://m.me/${pageId}` : '');
  if (!base) return '';
  try {
    const url = new URL(base);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  } catch {
    const separator = base.includes('?') ? '&' : '?';
    return referralCode ? `${base}${separator}ref=${encodeURIComponent(referralCode)}` : base;
  }
}

function messengerLinkLabel(topic) {
  if (topic === 'car') return 'Машины талаар Messenger-ээр асуух';
  if (topic === 'loan') return 'Зээлийн хүсэлтээ Messenger-ээр өгөх';
  return 'Messenger-ээр холбогдох';
}

export function removeZentroWebsiteApplicationHandoff(message = '') {
  return String(message)
    .replace(/(?:Дэлгэрэнгүй|Хүсэлт өгөх)\s*:\s*https?:\/\/(?:www\.)?zentrocapitalgroup\.com\/?#apply[^\n]*/giu, '')
    .replace(/https?:\/\/(?:www\.)?zentrocapitalgroup\.com\/?#apply\b/giu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function zonedParts(date = new Date(), timezone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dayNumber: Math.floor(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86400000),
  };
}

export function buildZentroPost(config, date = new Date(), messageOverride = '', productIndex) {
  const social = normalizeZentroSocial(config.social);
  const local = zonedParts(date, social.postTimezone);
  const products = safeArray(config.products);
  const selectedIndex = Number(productIndex);
  const product = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < products.length
    ? products[selectedIndex]
    : (products.length ? products[Math.abs(local.dayNumber) % products.length] : {});
  const templates = social.postTemplates;
  const template = messageOverride || templates[Math.abs(local.dayNumber) % templates.length];
  const values = {
    product: product.name || 'Шуурхай зээлийн шийдэл',
    description: product.description || config.heroText || '',
    rate: product.rate || '',
    term: product.term || '',
    amount: product.amount || '',
    phone: config.phone || '',
    website: WEBSITE_URL,
  };
  const images = safeArray(product.images).filter(Boolean);
  const rendered = replaceTemplate(template, values);
  const legal = config.siteContent?.footerLegal || 'Зээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.';
  const message = rendered.toLowerCase().includes('эцсийн нөхцөл') ? rendered : `${rendered}\n\n${legal}`.trim();
  return {
    dateKey: local.dateKey,
    message,
    imageUrl: social.postUseProductImage ? (images[0] || product.image || product.imageUrl || '') : '',
    productName: product.name || '',
  };
}

const DAILY_PLAN_TIMES = ['09:30', '13:00', '17:30'];

function validDateKey(value, fallback = '') {
  const dateKey = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : fallback;
}

function validPostTime(value, fallback = '') {
  const time = String(value || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : fallback;
}

function cleanPlanValue(value, maxLength = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function withRequiredDisclosure(message, legal) {
  const value = String(message || '').trim();
  if (!value) return legal;
  return value.toLowerCase().includes('эцсийн нөхцөл') ? value : `${value}\n\n${legal}`;
}

function dailyPlanProduct(config, productIndex) {
  const products = safeArray(config.products);
  const index = Math.min(Math.max(Number(productIndex) || 0, 0), Math.max(products.length - 1, 0));
  return { index, product: products[index] || {} };
}

export function buildFallbackDailyPostDrafts(config, input = {}) {
  const social = normalizeZentroSocial(config.social);
  const { index: productIndex, product } = dailyPlanProduct(config, input.productIndex);
  const subject = cleanPlanValue(input.subject, 180) || product.name || 'Шуурхай зээлийн шийдэл';
  const objective = cleanPlanValue(input.objective, 120) || 'Зээлийн бүтээгдэхүүнийг ойлгомжтой танилцуулах';
  const audience = cleanPlanValue(input.audience, 160) || 'Санхүүгийн шуурхай хэрэгцээтэй харилцагч';
  const requirements = cleanPlanValue(input.requirements, 700);
  const legal = config.siteContent?.footerLegal || 'Зээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.';
  const templates = social.postTemplates.length ? social.postTemplates : DEFAULT_POST_TEMPLATES;
  const selectedTemplate = Math.min(Math.max(Number(input.templateIndex) || 0, 0), templates.length - 1);
  const values = {
    product: product.name || subject,
    description: product.description || config.heroText || '',
    rate: product.rate || '',
    term: product.term || '',
    amount: product.amount || '',
    phone: config.phone || '',
    website: WEBSITE_URL,
  };
  const angles = [
    { title: subject, prefix: `${subject}\n\n${objective}.` },
    { title: `${product.name || subject}: үндсэн мэдээлэл`, prefix: `${audience}-д зориулсан товч мэдээлэл.` },
    { title: `${product.name || subject}: хүсэлт өгөх`, prefix: `${subject}-ийн боломжоо өнөөдөр шалгаарай.` },
  ];
  const productImages = safeArray(product.images).filter(Boolean);
  const fallbackImage = productImages[0] || product.image || product.imageUrl || '';
  return angles.map((angle, slotIndex) => {
    const templateIndex = (selectedTemplate + slotIndex) % templates.length;
    const rendered = replaceTemplate(templates[templateIndex], values);
    const requirementBlock = requirements && slotIndex === 1 ? `\n\nАнхаарах зүйл:\n${requirements}` : '';
    const message = withRequiredDisclosure(`${angle.prefix}\n\n${rendered}${requirementBlock}`.trim(), legal);
    const requestedVisual = String(input.visualType || 'mixed');
    const visualType = requestedVisual === 'infographic' || (requestedVisual === 'mixed' && slotIndex === 1)
      ? 'infographic'
      : 'photo';
    return {
      slot: slotIndex + 1,
      title: angle.title,
      message,
      visualHeadline: angle.title,
      visualSubheadline: slotIndex === 1
        ? [product.rate, product.term, product.amount].filter(Boolean).join(' · ')
        : (product.description || objective),
      scheduledTime: DAILY_PLAN_TIMES[slotIndex],
      visualType,
      imageUrls: visualType === 'photo' && fallbackImage ? [fallbackImage] : [],
      productIndex,
      productName: product.name || '',
      templateIndex,
    };
  });
}

function parseGeneratedPlan(value) {
  try {
    const normalized = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

async function generateDailyPostDrafts(openaiClient, config, input = {}) {
  const fallback = buildFallbackDailyPostDrafts(config, input);
  if (!openaiClient) {
    return { drafts: fallback, generatedBy: 'fallback', warning: 'AI тохиргоогүй тул сонгосон загварт суурилсан 3 хувилбар бэлтгэлээ.' };
  }
  const { index: productIndex, product } = dailyPlanProduct(config, input.productIndex);
  const legal = config.siteContent?.footerLegal || 'Зээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.';
  const context = {
    brand: config.brandName || 'Zentro Prime Capital',
    subject: cleanPlanValue(input.subject, 180),
    objective: cleanPlanValue(input.objective, 160),
    audience: cleanPlanValue(input.audience, 180),
    requirements: cleanPlanValue(input.requirements, 1000),
    contentStyle: cleanPlanValue(input.contentStyle, 80) || 'professional',
    visualType: ['photo', 'infographic', 'mixed'].includes(input.visualType) ? input.visualType : 'mixed',
    product: {
      name: product.name || '',
      description: product.description || '',
      rate: product.rate || '',
      term: product.term || '',
      amount: product.amount || '',
    },
    selectedTemplate: replaceTemplate(
      normalizeZentroSocial(config.social).postTemplates[Math.max(0, Number(input.templateIndex) || 0)] || '',
      {
        product: product.name || '',
        description: product.description || '',
        rate: product.rate || '',
        term: product.term || '',
        amount: product.amount || '',
        phone: config.phone || '',
        website: WEBSITE_URL,
      }
    ),
    phone: config.phone || '',
    website: WEBSITE_URL,
    disclosure: legal,
  };
  try {
    const response = await openaiClient.responses.create({
      model: process.env.OPENAI_SOCIAL_MODEL || process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
      temperature: 0.65,
      instructions: [
        'Та Zentro Prime Capital-ийн Монгол хэл дээрх Facebook контент стратегич.',
        'Өглөө, өдөр, оройн 3 өөр өнцөгтэй пост бэлтгэ. Бүх текст Монгол кириллээр байна.',
        'Баталгаатай зээл, шууд олгоно, хүн бүрт олгоно гэх мэт нотлогдоогүй амлалт бүү өг.',
        'Хүү, хугацаа, хэмжээ зэрэг тоог зөвхөн өгсөн бүтээгдэхүүний мэдээллээс ашигла.',
        'Пост бүр CTA, 2-4 hashtag болон өгсөн disclosure өгүүлбэртэй байна.',
        'visualHeadline нь зураг дээр шууд тавих 5-10 үгтэй, visualSubheadline нь богино байна.',
        'JSON schema-гаас өөр зүйл бүү буцаа.',
      ].join(' '),
      input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(context) }] }],
      text: {
        format: {
          type: 'json_schema',
          name: 'zentro_daily_facebook_plan',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['drafts'],
            properties: {
              drafts: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['title', 'message', 'visualHeadline', 'visualSubheadline', 'suggestedTime', 'visualType'],
                  properties: {
                    title: { type: 'string' },
                    message: { type: 'string' },
                    visualHeadline: { type: 'string' },
                    visualSubheadline: { type: 'string' },
                    suggestedTime: { type: 'string' },
                    visualType: { type: 'string', enum: ['photo', 'infographic'] },
                  },
                },
              },
            },
          },
        },
      },
    });
    const parsed = parseGeneratedPlan(response.output_text);
    if (!Array.isArray(parsed?.drafts) || parsed.drafts.length !== 3) throw new Error('AI 3 пост буцаасангүй.');
    const drafts = parsed.drafts.map((draft, index) => {
      const visualType = context.visualType === 'photo'
        ? 'photo'
        : context.visualType === 'infographic'
          ? 'infographic'
          : draft.visualType === 'infographic' ? 'infographic' : 'photo';
      return {
        ...fallback[index],
        title: cleanPlanValue(draft.title, 180) || fallback[index].title,
        message: withRequiredDisclosure(String(draft.message || '').trim(), legal),
        visualHeadline: cleanPlanValue(draft.visualHeadline, 100) || fallback[index].visualHeadline,
        visualSubheadline: cleanPlanValue(draft.visualSubheadline, 180) || fallback[index].visualSubheadline,
        scheduledTime: validPostTime(draft.suggestedTime, DAILY_PLAN_TIMES[index]),
        visualType,
        imageUrls: visualType === 'infographic' ? [] : fallback[index].imageUrls,
        productIndex,
      };
    });
    return { drafts, generatedBy: 'ai', warning: '' };
  } catch (error) {
    return { drafts: fallback, generatedBy: 'fallback', warning: `AI генератор түр ажилласангүй: ${cleanMetaError(error)}` };
  }
}

export function isFacebookPostPlanDue(plan, local) {
  if (plan?.status !== 'approved') return false;
  const dateKey = validDateKey(plan.dateKey);
  const scheduledTime = validPostTime(plan.scheduledTime);
  if (!dateKey || !scheduledTime || !local?.dateKey) return false;
  if (dateKey < local.dateKey) return true;
  if (dateKey > local.dateKey) return false;
  const [hour, minute] = scheduledTime.split(':').map(Number);
  return hour * 60 + minute <= Number(local.minutes || 0);
}

async function resolvePermalink(postId) {
  if (!postId) return '';
  try {
    const response = await graphGet(postId, { fields: 'permalink_url' });
    return response.data?.permalink_url || '';
  } catch {
    return '';
  }
}

function numericInsightValue(response) {
  const values = safeArray(response?.data?.data?.[0]?.values);
  const value = values.at(-1)?.value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + (Number(item) || 0), 0);
  }
  return Number(value) || 0;
}

async function fetchMetaPostInsights(metaPostId) {
  const metrics = {
    post_media_view: 'views',
    post_total_media_view_unique: 'viewers',
    post_clicks: 'clicks',
    post_reactions_by_type_total: 'reactions',
  };
  const output = {
    views: null,
    viewers: null,
    actions: null,
    clicks: null,
    reactions: null,
    comments: null,
    shares: null,
    error: '',
  };
  if (!metaPostId) return { ...output, error: 'Meta Post ID олдсонгүй.' };

  const errors = [];
  const metricResults = await Promise.allSettled(Object.keys(metrics).map(metric => (
    graphGet(`${metaPostId}/insights`, { metric })
  )));
  Object.entries(metrics).forEach(([metric, key], index) => {
    const result = metricResults[index];
    if (result.status === 'fulfilled') output[key] = numericInsightValue(result.value);
    else errors.push(`${metric}: ${cleanMetaError(result.reason)}`);
  });

  try {
    const engagement = await graphGet(metaPostId, {
      fields: 'comments.limit(0).summary(true),shares',
    });
    output.comments = Number(engagement.data?.comments?.summary?.total_count || 0);
    output.shares = Number(engagement.data?.shares?.count || 0);
  } catch (error) {
    errors.push(`comments/shares: ${cleanMetaError(error)}`);
  }
  const actionValues = [output.clicks, output.reactions, output.comments, output.shares]
    .filter(value => Number.isFinite(value));
  output.actions = actionValues.length ? actionValues.reduce((sum, value) => sum + value, 0) : null;
  output.error = [...new Set(errors.filter(Boolean))].join(' · ').slice(0, 500);
  return output;
}

async function publishPost(config, {
  source = 'manual',
  scheduleKey,
  message = '',
  imageUrl = '',
  imageUrls = [],
  topic,
  listingActive = true,
  linkToMessenger,
  ctaType,
  productIndex,
} = {}) {
  const { pageId, pageAccessToken } = facebookEnv();
  if (!pageId || !pageAccessToken) throw new Error('Zentro Facebook Page ID болон access token тохируулагдаагүй байна.');
  const social = normalizeZentroSocial(config.social);
  const finalTopic = normalizePostTopic(topic, social.postDefaultTopic);
  const legacyCtaType = linkToMessenger === undefined
    ? social.postCtaType
    : (linkToMessenger ? 'MESSAGE_PAGE' : 'NONE');
  const finalCtaType = normalizeFacebookPostCtaType(ctaType, legacyCtaType);
  const messengerLinked = finalCtaType === 'MESSAGE_PAGE';
  const generated = buildZentroPost(config, new Date(), message, productIndex);
  const finalImages = resolveFacebookPostImages(imageUrls, imageUrl, generated.imageUrl);
  const finalImage = finalImages[0] || '';
  const existing = scheduleKey ? await FacebookPost.findOne({ scheduleKey }) : null;
  if (existing?.status === 'published') return existing;
  const recordId = existing?._id || new mongoose.Types.ObjectId();
  const referralCode = messengerLinked ? `zpc-post-${finalTopic}-${recordId}` : '';
  const messengerUrl = messengerLinked ? buildZentroMessengerLink(social, referralCode, pageId) : '';
  const applicationUrl = `${WEBSITE_URL}/?fb_post=${recordId}#apply`;
  const ctaUrl = finalCtaType === 'MESSAGE_PAGE'
    ? messengerUrl
    : (finalCtaType === 'APPLY_NOW' ? applicationUrl : '');
  const postMessage = messengerLinked
    ? removeZentroWebsiteApplicationHandoff(generated.message)
    : generated.message;
  const ctaLinkLabel = finalCtaType === 'MESSAGE_PAGE'
    ? messengerLinkLabel(finalTopic)
    : 'Зээлийн хүсэлт өгөх';
  const primaryMessage = ctaUrl && !postMessage.includes(ctaUrl)
    ? `${postMessage}\n\n${ctaLinkLabel}: ${ctaUrl}`
    : postMessage;
  const finalMessage = messengerLinked && !primaryMessage.includes(applicationUrl)
    ? `${primaryMessage}\nОнлайнаар хүсэлт өгөх: ${applicationUrl}`
    : primaryMessage;
  const filter = scheduleKey ? { scheduleKey } : { _id: recordId };
  const record = await FacebookPost.findOneAndUpdate(
    filter,
    {
      $set: {
        dateKey: generated.dateKey,
        source,
        status: 'publishing',
        message: finalMessage,
        imageUrl: finalImage,
        imageUrls: finalImages,
        productName: generated.productName,
        topic: finalTopic,
        listingActive: listingActive !== false,
        listingFeatureVersion: 1,
        messengerLinked,
        referralCode,
        messengerUrl,
        ctaType: finalCtaType,
        ctaUrl,
        ctaApplied: false,
        ctaError: '',
        error: '',
      },
      $inc: { attempts: 1 },
      ...(scheduleKey ? { $setOnInsert: { _id: recordId, scheduleKey } } : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  try {
    let publishResult;
    if (finalImages.length > 0) {
      const attachedMedia = [];
      for (const url of finalImages) {
        const photo = await graphPost(`${pageId}/photos`, { url, published: false });
        const mediaId = photo.data?.id;
        if (!mediaId) throw new Error('Meta зураг upload хийх үед media ID буцаасангүй.');
        attachedMedia.push({ media_fbid: mediaId });
      }
      publishResult = await publishPageFeed(pageId, {
        message: finalMessage,
        attached_media: attachedMedia,
      });
    } else {
      publishResult = await publishPageFeed(pageId, {
        message: finalMessage,
        link: ctaUrl || WEBSITE_URL,
      });
    }
    const response = publishResult.response;
    const metaPostId = response.data?.post_id || response.data?.id || '';
    record.status = 'published';
    record.metaPostId = metaPostId;
    const ctaCheck = finalCtaType === 'NONE'
      ? { applied: false, error: '' }
      : await verifyPostCta(metaPostId);
    record.ctaApplied = ctaCheck.applied;
    record.ctaError = ctaCheck.applied
      ? ''
      : [publishResult.ctaError, ctaCheck.error, finalCtaType === 'NONE' ? '' : FACEBOOK_ORGANIC_CTA_NOTE]
        .filter(Boolean).join(' · ').slice(0, 500);
    record.permalinkUrl = await resolvePermalink(metaPostId);
    record.publishedAt = new Date();
    await record.save();
    clearActiveListingsCache();
    return record;
  } catch (error) {
    record.status = 'failed';
    record.error = cleanMetaError(error);
    await record.save();
    throw new Error(record.error);
  }
}

async function legacyMessengerStatus(zentroPageId) {
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';
  const result = { configured: Boolean(accessToken), samePage: false, page: null, error: '' };
  if (!accessToken) return result;
  try {
    const response = await axios.get(graphUrl('me'), {
      params: { fields: 'id,name', access_token: accessToken },
      timeout: 15000,
    });
    result.page = response.data;
    result.samePage = Boolean(zentroPageId && String(response.data?.id) === String(zentroPageId));
  } catch (error) {
    result.error = cleanMetaError(error);
  }
  return result;
}

async function connectionStatus(webhookActivity = null) {
  const env = facebookEnv();
  const credentials = {
    pageId: Boolean(env.pageId),
    pageAccessToken: Boolean(env.pageAccessToken),
    verifyToken: Boolean(env.verifyToken),
    appSecret: Boolean(env.appSecret),
  };
  const status = {
    configured: Object.values(credentials).every(Boolean),
    credentials,
    connected: false,
    page: null,
    subscriptions: [],
    subscriptionError: '',
    legacyMessenger: { configured: false, samePage: false, page: null, error: '' },
    webhookActivity: webhookActivity ? { ...webhookActivity } : null,
    webhookUrl: `${process.env.PUBLIC_API_BASE_URL || 'https://scm-okjs.onrender.com'}/api/zentro/facebook/webhook`,
    requiredPermissions: ['pages_messaging', 'pages_manage_metadata', 'pages_manage_posts', 'pages_read_engagement', 'read_insights', 'pages_read_user_content'],
    error: '',
  };
  if (!env.pageId || !env.pageAccessToken) return status;
  try {
    const response = await graphGet(env.pageId, { fields: 'id,name,link,picture' });
    status.connected = true;
    status.page = response.data;
    try {
      const subscriptions = await graphGet(`${env.pageId}/subscribed_apps`, {
        fields: 'id,name,link,subscribed_fields',
      });
      status.subscriptions = safeArray(subscriptions.data?.data);
    } catch (error) {
      status.subscriptionError = cleanMetaError(error);
    }
    status.legacyMessenger = await legacyMessengerStatus(env.pageId);
  } catch (error) {
    status.error = cleanMetaError(error);
  }
  return status;
}

export function createZentroFacebookIntegration({
  app,
  ZentroWebConfig,
  ZentroLoanRequest,
  authenticateUser,
  requireAdmin,
  createLog,
  openai: openaiClient = null,
}) {
  let scheduler;
  let schedulerBusy = false;
  const webhookActivity = {
    requests: 0,
    events: 0,
    processed: 0,
    errors: 0,
    signatureFailures: 0,
    lastRequestAt: null,
    lastEventAt: null,
    lastProcessedAt: null,
    lastError: '',
  };

  async function currentConfig() {
    return ZentroWebConfig.findOneAndUpdate(
      { key: 'public' },
      { $setOnInsert: { key: 'public' } },
      { new: true, upsert: true }
    ).lean();
  }

  async function runSchedule() {
    if (schedulerBusy || mongoose.connection.readyState !== 1) return;
    schedulerBusy = true;
    try {
      const config = await currentConfig();
      const social = normalizeZentroSocial(config.social);
      if (!social.dailyPostEnabled) return;
      const env = facebookEnv();
      if (!env.pageId || !env.pageAccessToken) return;
      const local = zonedParts(new Date(), social.postTimezone);
      const candidates = await FacebookPostPlan.find({
        status: 'approved',
        dateKey: { $lte: local.dateKey },
      }).sort({ dateKey: 1, scheduledTime: 1, slot: 1 }).limit(12).lean();
      for (const candidate of candidates.filter(plan => isFacebookPostPlanDue(plan, local))) {
        const plan = await FacebookPostPlan.findOneAndUpdate(
          { _id: candidate._id, status: 'approved' },
          { $set: { status: 'publishing', error: '' }, $inc: { attempts: 1 } },
          { new: true }
        );
        if (!plan) continue;
        try {
          const post = await publishPost(config, {
            source: 'automatic',
            scheduleKey: `plan:${plan._id}`,
            message: plan.message,
            imageUrls: plan.imageUrls,
            topic: plan.topic,
            listingActive: plan.listingActive,
            ctaType: plan.ctaType,
            productIndex: plan.productIndex,
          });
          plan.status = 'published';
          plan.publishedPostId = post._id;
          plan.error = '';
          await plan.save();
        } catch (error) {
          plan.status = 'failed';
          plan.error = cleanMetaError(error);
          await plan.save();
          console.error('Zentro scheduled Facebook plan error:', plan.error);
        }
      }
    } catch (error) {
      console.error('Zentro Facebook planner error:', error.message);
    } finally {
      schedulerBusy = false;
    }
  }

  app.get('/api/zentro/facebook/webhook', (req, res) => {
    const env = facebookEnv();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && env.verifyToken && token === env.verifyToken) return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  app.post('/api/zentro/facebook/webhook', (req, res) => {
    webhookActivity.requests += 1;
    webhookActivity.lastRequestAt = new Date();
    if (!verifyWebhookSignature(req)) {
      webhookActivity.signatureFailures += 1;
      webhookActivity.lastError = 'INVALID_SIGNATURE';
      return res.status(401).send('INVALID_SIGNATURE');
    }
    if (req.body?.object !== 'page') return res.sendStatus(404);
    res.status(200).send('EVENT_RECEIVED');
    const entries = safeArray(req.body.entry);
    void currentConfig().then(async config => {
      for (const entry of entries) {
        for (const event of safeArray(entry.messaging)) {
          webhookActivity.events += 1;
          webhookActivity.lastEventAt = new Date();
          try {
            await processZentroMessengerEvent({
              event,
              config,
              ZentroLoanRequest,
              fetchListings: (limit, offset = 0) => fetchActivePageListings(limit, 'all', offset),
              sendListings: sendListingCarousel,
            });
            webhookActivity.processed += 1;
            webhookActivity.lastProcessedAt = new Date();
          } catch (error) {
            webhookActivity.errors += 1;
            webhookActivity.lastError = cleanMetaError(error);
            console.error('Zentro Messenger event error:', webhookActivity.lastError);
          }
        }
      }
    }).catch(error => {
      webhookActivity.errors += 1;
      webhookActivity.lastError = cleanMetaError(error);
      console.error('Zentro Messenger config error:', webhookActivity.lastError);
    });
  });

  app.get('/api/zentro/admin/facebook/status', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await connectionStatus(webhookActivity)); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.post('/api/zentro/admin/facebook/test-connection', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await connectionStatus(webhookActivity)); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.get('/api/zentro/admin/facebook/messenger-activity', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const [totalSessions, sessions] = await Promise.all([
        MessengerSession.countDocuments(),
        MessengerSession.find().sort({ lastInteractionAt: -1 }).limit(20)
          .select('senderId state topic referralCode sourcePostId lastInteractionAt updatedAt')
          .lean(),
      ]);
      res.json({
        webhook: { ...webhookActivity },
        totalSessions,
        sessions: sessions.map(session => ({
          ...session,
          senderId: session.senderId ? `***${String(session.senderId).slice(-6)}` : '',
        })),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/zentro/admin/facebook/subscribe', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const config = await currentConfig();
      const result = await subscribePage(config.social);
      await createLog(req.user, 'zentro_facebook_subscribed', 'Connected Zentro Facebook Page webhooks and Messenger profile');
      res.json({ success: Boolean(result?.success ?? true), appWebhook: result?.appWebhook || null, status: await connectionStatus(webhookActivity) });
    } catch (error) {
      res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  app.get('/api/zentro/admin/facebook/plans', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const config = await currentConfig();
      const social = normalizeZentroSocial(config.social);
      const dateKey = validDateKey(req.query?.dateKey, zonedParts(new Date(), social.postTimezone).dateKey);
      const plans = await FacebookPostPlan.find({ dateKey, status: { $ne: 'cancelled' } })
        .sort({ slot: 1, createdAt: -1 })
        .lean();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/zentro/admin/facebook/plans/generate', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const config = await currentConfig();
      const social = normalizeZentroSocial(config.social);
      const dateKey = validDateKey(req.body?.dateKey, zonedParts(new Date(), social.postTimezone).dateKey);
      const topic = normalizePostTopic(req.body?.topic, social.postDefaultTopic);
      const productIndex = dailyPlanProduct(config, req.body?.productIndex).index;
      const input = {
        dateKey,
        subject: cleanPlanValue(req.body?.subject, 180),
        objective: cleanPlanValue(req.body?.objective, 160),
        audience: cleanPlanValue(req.body?.audience, 180),
        requirements: cleanPlanValue(req.body?.requirements, 1000),
        contentStyle: cleanPlanValue(req.body?.contentStyle, 80) || 'professional',
        visualType: ['photo', 'infographic', 'mixed'].includes(req.body?.visualType) ? req.body.visualType : 'mixed',
        productIndex,
        templateIndex: Number(req.body?.templateIndex) || 0,
      };
      const generated = await generateDailyPostDrafts(openaiClient, config, input);
      const fixedPlans = await FacebookPostPlan.find({
        dateKey,
        status: { $in: ['publishing', 'published'] },
      }).sort({ slot: 1 }).lean();
      const fixedSlots = new Set(fixedPlans.map(plan => Number(plan.slot)));
      const availableSlots = [1, 2, 3].filter(slot => !fixedSlots.has(slot));
      await FacebookPostPlan.updateMany(
        { dateKey, status: { $in: ['draft', 'approved', 'failed'] } },
        { $set: { status: 'cancelled' } }
      );
      const product = safeArray(config.products)[productIndex] || {};
      const created = availableSlots.length ? await FacebookPostPlan.insertMany(availableSlots.map((slot, index) => {
        const draft = generated.drafts[slot - 1] || generated.drafts[index] || generated.drafts[0];
        return {
          dateKey,
          slot,
          status: 'draft',
          subject: input.subject,
          objective: input.objective,
          audience: input.audience,
          requirements: input.requirements,
          contentStyle: input.contentStyle,
          visualType: draft.visualType,
          title: draft.title,
          message: draft.message,
          visualHeadline: draft.visualHeadline,
          visualSubheadline: draft.visualSubheadline,
          imageUrls: safeArray(draft.imageUrls).map(safeHttpsUrl).filter(Boolean).slice(0, 5),
          productIndex,
          productName: product.name || draft.productName || '',
          templateIndex: draft.templateIndex,
          topic,
          ctaType: normalizeFacebookPostCtaType(req.body?.ctaType, social.postCtaType),
          listingActive: topic !== 'general' && req.body?.listingActive !== false,
          scheduledTime: validPostTime(draft.scheduledTime, DAILY_PLAN_TIMES[slot - 1]),
          generatedBy: generated.generatedBy,
          generationWarning: generated.warning,
        };
      })) : [];
      const plans = [...fixedPlans, ...created.map(plan => plan.toObject())].sort((a, b) => a.slot - b.slot);
      await createLog(req.user, 'zentro_facebook_plan_generated', `${dateKey}:${generated.generatedBy}:${created.length}`);
      res.status(201).json({ plans, generatedBy: generated.generatedBy, warning: generated.warning });
    } catch (error) {
      res.status(500).json({ message: cleanMetaError(error) });
    }
  });

  app.patch('/api/zentro/admin/facebook/plans/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const plan = await FacebookPostPlan.findById(req.params.id);
      if (!plan || plan.status === 'cancelled') return res.status(404).json({ message: 'Төлөвлөсөн пост олдсонгүй.' });
      if (['publishing', 'published'].includes(plan.status)) return res.status(409).json({ message: 'Нийтлэгдэж буй эсвэл нийтлэгдсэн постыг засах боломжгүй.' });
      const editable = ['title', 'message', 'visualHeadline', 'visualSubheadline', 'subject', 'objective', 'audience', 'requirements', 'contentStyle'];
      editable.forEach(key => {
        if (key in req.body) plan[key] = String(req.body[key] || '').trim().slice(0, key === 'message' || key === 'requirements' ? 5000 : 500);
      });
      if ('imageUrls' in req.body) plan.imageUrls = safeArray(req.body.imageUrls).map(safeHttpsUrl).filter(Boolean).slice(0, 5);
      if ('scheduledTime' in req.body) plan.scheduledTime = validPostTime(req.body.scheduledTime, plan.scheduledTime || DAILY_PLAN_TIMES[plan.slot - 1]);
      if ('visualType' in req.body) plan.visualType = req.body.visualType === 'infographic' ? 'infographic' : 'photo';
      if ('topic' in req.body) plan.topic = normalizePostTopic(req.body.topic, plan.topic);
      if ('ctaType' in req.body) plan.ctaType = normalizeFacebookPostCtaType(req.body.ctaType, plan.ctaType);
      if ('listingActive' in req.body) plan.listingActive = plan.topic !== 'general' && req.body.listingActive !== false;
      if ('productIndex' in req.body) {
        const config = await currentConfig();
        const selected = dailyPlanProduct(config, req.body.productIndex);
        plan.productIndex = selected.index;
        plan.productName = selected.product.name || '';
      }
      if (plan.status === 'approved') {
        plan.status = 'draft';
        plan.approvedAt = null;
        plan.approvedBy = null;
      }
      plan.error = '';
      await plan.save();
      await createLog(req.user, 'zentro_facebook_plan_updated', String(plan._id));
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/zentro/admin/facebook/plans/:id/approve', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const plan = await FacebookPostPlan.findById(req.params.id);
      if (!plan || plan.status === 'cancelled') return res.status(404).json({ message: 'Төлөвлөсөн пост олдсонгүй.' });
      if (['publishing', 'published'].includes(plan.status)) return res.status(409).json({ message: 'Энэ пост аль хэдийн нийтлэгдэж байна.' });
      if (!String(plan.message || '').trim()) return res.status(400).json({ message: 'Постын текст хоосон байна.' });
      if (plan.visualType === 'infographic' && !safeArray(plan.imageUrls).length) {
        return res.status(400).json({ message: 'Инфографик постоо батлахаас өмнө инфографик зураг үүсгэнэ үү.' });
      }
      plan.scheduledTime = validPostTime(req.body?.scheduledTime, plan.scheduledTime);
      if (!plan.scheduledTime) return res.status(400).json({ message: 'Нийтлэх цаг сонгоно уу.' });
      plan.status = 'approved';
      plan.approvedBy = req.user?._id;
      plan.approvedAt = new Date();
      plan.error = '';
      await plan.save();
      await createLog(req.user, 'zentro_facebook_plan_approved', `${plan._id}:${plan.dateKey}T${plan.scheduledTime}`);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/zentro/admin/facebook/plans/:id/unapprove', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const plan = await FacebookPostPlan.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['approved', 'failed'] } },
        { $set: { status: 'draft', approvedAt: null, approvedBy: null, error: '' } },
        { new: true }
      );
      if (!plan) return res.status(404).json({ message: 'Буцаах боломжтой төлөвлөсөн пост олдсонгүй.' });
      await createLog(req.user, 'zentro_facebook_plan_unapproved', String(plan._id));
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/zentro/admin/facebook/plans/:id/publish', authenticateUser, requireAdmin, async (req, res) => {
    let plan;
    try {
      plan = await FacebookPostPlan.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['draft', 'approved', 'failed'] } },
        { $set: { status: 'publishing', error: '' }, $inc: { attempts: 1 } },
        { new: true }
      );
      if (!plan) return res.status(404).json({ message: 'Нийтлэх боломжтой төлөвлөсөн пост олдсонгүй.' });
      const config = await currentConfig();
      const post = await publishPost(config, {
        source: 'automatic',
        scheduleKey: `plan:${plan._id}`,
        message: plan.message,
        imageUrls: plan.imageUrls,
        topic: plan.topic,
        listingActive: plan.listingActive,
        ctaType: plan.ctaType,
        productIndex: plan.productIndex,
      });
      plan.status = 'published';
      plan.publishedPostId = post._id;
      plan.error = '';
      await plan.save();
      await createLog(req.user, 'zentro_facebook_plan_published_now', String(plan._id));
      res.json({ plan, post });
    } catch (error) {
      if (plan) {
        plan.status = 'failed';
        plan.error = cleanMetaError(error);
        await plan.save().catch(() => {});
      }
      res.status(500).json({ message: cleanMetaError(error) });
    }
  });

  app.delete('/api/zentro/admin/facebook/plans/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const plan = await FacebookPostPlan.findById(req.params.id);
      if (!plan) return res.status(404).json({ message: 'Төлөвлөсөн пост олдсонгүй.' });
      if (['publishing', 'published'].includes(plan.status)) return res.status(409).json({ message: 'Нийтлэгдэж буй эсвэл нийтлэгдсэн постыг цуцлах боломжгүй.' });
      plan.status = 'cancelled';
      await plan.save();
      await createLog(req.user, 'zentro_facebook_plan_cancelled', String(plan._id));
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/zentro/admin/facebook/posts', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await FacebookPost.find().sort({ createdAt: -1 }).limit(100).lean()); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.get('/api/zentro/admin/facebook/posts/:id/insights', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const post = await FacebookPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Facebook пост олдсонгүй.' });

      const [meta, uniqueChatters, leads] = await Promise.all([
        fetchMetaPostInsights(post.metaPostId),
        MessengerSession.countDocuments({ sourcePostId: post._id }),
        ZentroLoanRequest.find({
          $or: [
            { 'answers.facebookSourcePostId': String(post._id) },
            { 'answers.facebookListingId': { $in: [String(post._id), String(post.metaPostId || '')].filter(Boolean) } },
          ],
        }).sort({ createdAt: -1 }).limit(200).lean(),
      ]);

      post.insights = meta;
      post.insightsUpdatedAt = new Date();
      post.insightsError = meta.error || '';
      await post.save();

      const chatStarts = Math.max(Number(post.chatStarts || 0), Number(uniqueChatters || 0));
      const leadCount = leads.length;
      const denominator = Number(meta.viewers || chatStarts || 0);
      return res.json({
        post: {
          id: post._id,
          metaPostId: post.metaPostId,
          productName: post.productName,
          topic: post.topic,
          permalinkUrl: post.permalinkUrl,
          publishedAt: post.publishedAt,
        },
        meta,
        funnel: {
          chatStarts,
          uniqueChatters,
          leads: leadCount,
          marketingConsentedLeads: leads.filter(lead => lead.answers?.marketingConsent === true).length,
          conversionRate: denominator > 0 ? Math.round((leadCount / denominator) * 10000) / 100 : 0,
          conversionBase: meta.viewers > 0 ? 'viewers' : 'chat_starts',
        },
        leads: leads.map(lead => ({
          id: lead._id,
          name: lead.name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          source: lead.source,
          status: lead.status,
          marketingConsent: lead.answers?.marketingConsent === true,
          marketingConsentAt: lead.answers?.marketingConsentAt || '',
          createdAt: lead.createdAt,
        })),
        privacy: {
          viewerContactDataAvailable: false,
          leadContactDataSource: 'voluntary_application',
        },
      });
    } catch (error) {
      return res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  app.get('/api/zentro/admin/facebook/listings', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const topic = ['car', 'loan'].includes(req.query?.topic) ? req.query.topic : 'all';
      const limit = Math.min(Math.max(Number(req.query?.limit) || 10, 1), 100);
      const offset = Math.max(Number(req.query?.offset) || 0, 0);
      res.json(await fetchActivePageListings(limit, topic, offset));
    }
    catch (error) { res.status(500).json({ message: cleanMetaError(error) }); }
  });

  app.post('/api/zentro/admin/facebook/publish', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const config = await currentConfig();
      const post = await publishPost(config, {
        source: 'manual',
        message: String(req.body?.message || '').trim(),
        imageUrl: String(req.body?.imageUrl || '').trim(),
        imageUrls: safeArray(req.body?.imageUrls).map(value => String(value || '').trim()).filter(Boolean).slice(0, 5),
        topic: normalizePostTopic(req.body?.topic, normalizeZentroSocial(config.social).postDefaultTopic),
        listingActive: req.body?.listingActive !== false,
        linkToMessenger: req.body?.linkToMessenger !== false,
        ctaType: normalizeFacebookPostCtaType(req.body?.ctaType, req.body?.linkToMessenger === false ? 'NONE' : 'MESSAGE_PAGE'),
        productIndex: Number.isInteger(Number(req.body?.productIndex)) ? Number(req.body.productIndex) : undefined,
      });
      await createLog(req.user, 'zentro_facebook_post_published', post.metaPostId || String(post._id));
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  app.patch('/api/zentro/admin/facebook/posts/:id/listing', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const post = await FacebookPost.findByIdAndUpdate(
        req.params.id,
        { $set: { listingActive: req.body?.listingActive !== false, listingFeatureVersion: 1 } },
        { new: true }
      );
      if (!post) return res.status(404).json({ message: 'Facebook пост олдсонгүй.' });
      clearActiveListingsCache();
      await createLog(req.user, 'zentro_facebook_listing_updated', `${post._id}:${post.listingActive ? 'active' : 'inactive'}`);
      return res.json(post);
    } catch (error) {
      return res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  app.delete('/api/zentro/admin/facebook/posts/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const post = await FacebookPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Facebook пост олдсонгүй.' });
      if (post.status === 'deleted') return res.json(post);
      if (post.status === 'published' && !post.metaPostId) {
        return res.status(409).json({ message: 'Facebook Post ID олдсонгүй. Постыг Facebook Page дээрээс гараар устгана уу.' });
      }

      if (post.metaPostId) {
        try {
          const response = await graphDelete(post.metaPostId);
          if (response.data?.success === false) throw new Error('Meta постыг устгасангүй.');
        } catch (error) {
          if (!isMissingMetaPostError(error)) throw error;
        }
      }

      post.status = 'deleted';
      post.listingActive = false;
      post.deletedAt = new Date();
      post.error = '';
      await post.save();
      clearActiveListingsCache();
      await createLog(req.user, 'zentro_facebook_post_deleted', post.metaPostId || String(post._id));
      return res.json(post);
    } catch (error) {
      return res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  return {
    start() {
      if (scheduler) return;
      void FacebookPost.updateMany(
        {
          topic: 'loan',
          status: 'published',
          $or: [
            { listingFeatureVersion: { $exists: false } },
            { listingFeatureVersion: { $lt: 1 } },
          ],
        },
        { $set: { listingActive: true, listingFeatureVersion: 1 } }
      ).then(result => {
        if (result.modifiedCount) clearActiveListingsCache();
      }).catch(error => console.error('Zentro active loan migration error:', error.message));
      scheduler = cron.schedule('* * * * *', () => void runSchedule());
      setTimeout(() => void runSchedule(), 15000);
    },
    stop() {
      scheduler?.stop();
      scheduler = null;
    },
    runSchedule,
  };
}
