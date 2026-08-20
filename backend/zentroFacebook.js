import crypto from 'crypto';
import axios from 'axios';
import cron from 'node-cron';
import mongoose from 'mongoose';

const WEBSITE_URL = 'https://zentrocapitalgroup.com';
const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';
const DEFAULT_POST_TEMPLATES = [
  '{{product}}\n\n{{description}}\n\nХүү: {{rate}}\nХугацаа: {{term}}\nЗээлийн хэмжээ: {{amount}}\n\nДэлгэрэнгүй: {{website}}/#apply\n\nЗээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна. #ZentroPrimeCapital #ШуурхайЗээл',
  'Санхүүгийн хэрэгцээгээ цөөн алхмаар шийдээрэй.\n\n{{product}}\n{{description}}\n\nХүсэлт өгөх: {{website}}/#apply\nХолбоо барих: {{phone}}\n\n#ZentroPrimeCapital #АвтомашиныЗээл',
  'Машинаа унаад зээлээ авах боломжийг Zentro Prime Capital-аас.\n\nӨнөөдрийн онцлох шийдэл: {{product}}\nХэмжээ: {{amount}}\nХугацаа: {{term}}\n\n{{website}}/#apply\n\nЗээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.',
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
  postDefaultTopic: 'loan',
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
  status: { type: String, enum: ['publishing', 'published', 'failed'], default: 'publishing' },
  message: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  productName: { type: String, default: '' },
  topic: { type: String, enum: ['car', 'loan', 'general'], default: 'loan' },
  messengerLinked: { type: Boolean, default: false },
  referralCode: { type: String, default: '' },
  messengerUrl: { type: String, default: '' },
  chatStarts: { type: Number, default: 0 },
  metaPostId: { type: String, default: '' },
  permalinkUrl: { type: String, default: '' },
  error: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  publishedAt: Date,
}, { timestamps: true });

const MessengerSession = mongoose.models.ZentroMessengerSession
  || mongoose.model('ZentroMessengerSession', MessengerSessionSchema);
const FacebookPost = mongoose.models.ZentroFacebookPost
  || mongoose.model('ZentroFacebookPost', FacebookPostSchema);

function facebookEnv() {
  return {
    graphVersion: process.env.ZENTRO_FB_GRAPH_VERSION || 'v25.0',
    verifyToken: process.env.ZENTRO_FB_VERIFY_TOKEN || '',
    pageAccessToken: process.env.ZENTRO_FB_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.ZENTRO_FB_PAGE_ID || '',
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
  return {
    ...DEFAULT_SOCIAL,
    ...value,
    postDefaultTopic: ['car', 'loan', 'general'].includes(value.postDefaultTopic) ? value.postDefaultTopic : DEFAULT_SOCIAL.postDefaultTopic,
    postTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.postTime || '')) ? value.postTime : DEFAULT_SOCIAL.postTime,
    postTimezone: validTimezone(value.postTimezone || DEFAULT_TIMEZONE),
    postTemplates: postTemplates.length ? postTemplates : DEFAULT_POST_TEMPLATES,
    faqItems,
  };
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

function normalizePostTopic(value, fallback = 'loan') {
  return ['car', 'loan', 'general'].includes(value) ? value : fallback;
}

function entryOptions() {
  return [
    { title: 'Машины талаар', payload: 'ZENTRO_CAR' },
    { title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
  ];
}

function loanMenuOptions(social) {
  const options = [
    { title: 'Зээлийн нөхцөл', payload: 'ZENTRO_PRODUCTS' },
    { title: 'Холбоо барих', payload: 'ZENTRO_CONTACT' },
    { title: 'Үндсэн цэс', payload: 'ZENTRO_HOME' },
  ];
  if (social.requestIntakeEnabled) options.splice(1, 0, { title: 'Хүсэлт өгөх', payload: 'ZENTRO_APPLY' });
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

async function showEntryMenu(session, senderId, social, send = sendMessage) {
  session.state = 'idle';
  session.topic = '';
  session.draft = {};
  await session.save();
  await send(senderId, social.welcomeMessage, entryOptions());
}

async function startCarInquiry(session, senderId, social, send = sendMessage) {
  session.state = 'await_car_inquiry';
  session.topic = 'car';
  session.draft = {};
  await session.save();
  await send(senderId, social.carWelcomeMessage, [
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

async function startApplication(session, senderId, send = sendMessage) {
  session.state = 'await_name';
  session.topic = 'loan';
  session.draft = {};
  session.lastInteractionAt = new Date();
  await session.save();
  await send(senderId, 'Зээлийн хүсэлтийг Messenger-ээр бүртгэе. Үргэлжлүүлснээр мэдээллээ хүсэлт шийдвэрлэх зорилгоор ашиглуулахыг зөвшөөрнө. Эхлээд овог, нэрээ Монгол кириллээр бичнэ үү.', [
    { title: 'Болих', payload: 'ZENTRO_CANCEL' },
  ]);
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
    session.draft = { carInquiry: inquiry.slice(0, 1500) };
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
    session.state = 'await_product';
    session.draft = draft;
    await session.save();
    await send(senderId, 'Сонирхож буй зээлийн төрлөө сонгоно уу.', productOptions(config.products));
    return true;
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
      session.completedRequestId = recentRequest._id;
      await session.save();
      await send(senderId, `Таны сүүлийн хүсэлт аль хэдийн бүртгэгдсэн байна. Хүсэлтийн дугаар: ${String(recentRequest._id).slice(-8).toUpperCase()}`, loanMenuOptions(social));
      return true;
    }
    const request = await ZentroLoanRequest.create({
      ...draft,
      register: '',
      email: '',
      source: 'facebook',
      externalUserId: senderId,
      status: 'new',
      answers: { channel: 'facebook_messenger', facebookSenderId: senderId },
      notes: 'Facebook Messenger-ээс автоматаар бүртгэсэн хүсэлт.',
    });
    session.state = 'idle';
    session.draft = {};
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
}) {
  const senderId = event.sender?.id;
  const payload = event.message?.quick_reply?.payload || event.postback?.payload || '';
  const referralCode = referralFromEvent(event);
  const messageId = event.message?.mid || event.postback?.mid || (referralCode && event.timestamp ? `ref:${referralCode}:${event.timestamp}` : '');
  const messageText = event.message?.text || payload || referralCode;
  if (!senderId || !messageText || event.message?.is_echo) return;

  if (messageId && await SessionModel.exists({ senderId, processedMessageIds: messageId })) return;
  const social = normalizeZentroSocial(config.social);
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
    else await showEntryMenu(session, senderId, social, send);
    return;
  }

  if (payload === 'ZENTRO_HOME' || payload === 'ZENTRO_GET_STARTED') {
    await showEntryMenu(session, senderId, social, send);
    return;
  }

  if (payload === 'ZENTRO_CAR') {
    await startCarInquiry(session, senderId, social, send);
    return;
  }

  if (payload === 'ZENTRO_LOAN') {
    await showLoanMenu(session, senderId, social, send);
    return;
  }

  const text = normalizedText(messageText);
  if (payload === 'ZENTRO_APPLY' || isAny(text, ['хүсэлт өгөх', 'зээлийн хүсэлт', 'хүсэлт гаргах'])) {
    if (!social.requestIntakeEnabled) {
      await send(senderId, `Онлайн хүсэлтээ ${WEBSITE_URL}/#apply хаягаар илгээнэ үү.`, loanMenuOptions(social));
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
    await startCarInquiry(session, senderId, social, send);
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

  await showEntryMenu(session, senderId, social, send);
}

async function configureMessengerProfile() {
  const { pageAccessToken, pageId } = facebookEnv();
  if (!pageAccessToken) throw new Error('Page access token тохируулагдаагүй байна.');
  await graphPost('me/messenger_profile', {
    get_started: { payload: 'ZENTRO_GET_STARTED' },
    persistent_menu: [{
      locale: 'default',
      composer_input_disabled: false,
      call_to_actions: [
        { type: 'postback', title: 'Машины талаар', payload: 'ZENTRO_CAR' },
        { type: 'postback', title: 'Зээлийн талаар', payload: 'ZENTRO_LOAN' },
      ],
    }],
  });
}

async function subscribePage() {
  const { pageId, pageAccessToken } = facebookEnv();
  if (!pageId || !pageAccessToken) throw new Error('Page ID болон Page access token шаардлагатай.');
  const response = await graphPost(`${pageId}/subscribed_apps`, {}, {
    subscribed_fields: 'messages,messaging_postbacks,messaging_referrals',
  });
  await configureMessengerProfile();
  return response.data;
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
  if (topic === 'loan') return 'Зээлийн талаар Messenger-ээр асуух';
  return 'Messenger-ээр холбогдох';
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

async function resolvePermalink(postId) {
  if (!postId) return '';
  try {
    const response = await graphGet(postId, { fields: 'permalink_url' });
    return response.data?.permalink_url || '';
  } catch {
    return '';
  }
}

async function publishPost(config, {
  source = 'manual',
  scheduleKey,
  message = '',
  imageUrl = '',
  topic,
  linkToMessenger,
  productIndex,
} = {}) {
  const { pageId, pageAccessToken } = facebookEnv();
  if (!pageId || !pageAccessToken) throw new Error('Zentro Facebook Page ID болон access token тохируулагдаагүй байна.');
  const social = normalizeZentroSocial(config.social);
  const finalTopic = normalizePostTopic(topic, social.postDefaultTopic);
  const messengerLinked = linkToMessenger === undefined ? Boolean(social.postLinkToMessenger) : Boolean(linkToMessenger);
  const generated = buildZentroPost(config, new Date(), message, productIndex);
  const finalImage = imageUrl || generated.imageUrl;
  const existing = scheduleKey ? await FacebookPost.findOne({ scheduleKey }).select('_id') : null;
  const recordId = existing?._id || new mongoose.Types.ObjectId();
  const referralCode = messengerLinked ? `zpc-post-${finalTopic}-${recordId}` : '';
  const messengerUrl = messengerLinked ? buildZentroMessengerLink(social, referralCode, pageId) : '';
  const finalMessage = messengerUrl && !generated.message.includes(messengerUrl)
    ? `${generated.message}\n\n${messengerLinkLabel(finalTopic)}: ${messengerUrl}`
    : generated.message;
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
        productName: generated.productName,
        topic: finalTopic,
        messengerLinked,
        referralCode,
        messengerUrl,
        error: '',
      },
      $inc: { attempts: 1 },
      ...(scheduleKey ? { $setOnInsert: { _id: recordId, scheduleKey } } : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  try {
    let response;
    if (finalImage) {
      response = await graphPost(`${pageId}/photos`, {
        url: finalImage,
        caption: finalMessage,
        published: true,
      });
    } else {
      response = await graphPost(`${pageId}/feed`, {
        message: finalMessage,
        link: messengerUrl || WEBSITE_URL,
      });
    }
    const metaPostId = response.data?.post_id || response.data?.id || '';
    record.status = 'published';
    record.metaPostId = metaPostId;
    record.permalinkUrl = await resolvePermalink(metaPostId);
    record.publishedAt = new Date();
    await record.save();
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

async function connectionStatus() {
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
    webhookUrl: `${process.env.PUBLIC_API_BASE_URL || 'https://scm-okjs.onrender.com'}/api/zentro/facebook/webhook`,
    requiredPermissions: ['pages_messaging', 'pages_manage_metadata', 'pages_manage_posts', 'pages_read_engagement'],
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
}) {
  let scheduler;
  let schedulerBusy = false;

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
      const [hour, minute] = social.postTime.split(':').map(Number);
      if (local.minutes < hour * 60 + minute) return;
      const scheduleKey = `daily:${local.dateKey}`;
      const existing = await FacebookPost.findOne({ scheduleKey });
      if (existing?.status === 'published' || existing?.status === 'publishing' || Number(existing?.attempts || 0) >= 3) return;
      await publishPost(config, { source: 'automatic', scheduleKey });
    } catch (error) {
      console.error('Zentro daily Facebook post error:', error.message);
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
    if (!verifyWebhookSignature(req)) return res.status(401).send('INVALID_SIGNATURE');
    if (req.body?.object !== 'page') return res.sendStatus(404);
    res.status(200).send('EVENT_RECEIVED');
    const entries = safeArray(req.body.entry);
    void currentConfig().then(async config => {
      for (const entry of entries) {
        for (const event of safeArray(entry.messaging)) {
          try {
            await processZentroMessengerEvent({ event, config, ZentroLoanRequest });
          } catch (error) {
            console.error('Zentro Messenger event error:', cleanMetaError(error));
          }
        }
      }
    }).catch(error => console.error('Zentro Messenger config error:', error.message));
  });

  app.get('/api/zentro/admin/facebook/status', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await connectionStatus()); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.post('/api/zentro/admin/facebook/test-connection', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await connectionStatus()); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.post('/api/zentro/admin/facebook/subscribe', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const result = await subscribePage();
      await createLog(req.user, 'zentro_facebook_subscribed', 'Connected Zentro Facebook Page webhooks and Messenger profile');
      res.json({ success: Boolean(result?.success ?? true), status: await connectionStatus() });
    } catch (error) {
      res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  app.get('/api/zentro/admin/facebook/posts', authenticateUser, requireAdmin, async (req, res) => {
    try { res.json(await FacebookPost.find().sort({ createdAt: -1 }).limit(100).lean()); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });

  app.post('/api/zentro/admin/facebook/publish', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const config = await currentConfig();
      const post = await publishPost(config, {
        source: 'manual',
        message: String(req.body?.message || '').trim(),
        imageUrl: String(req.body?.imageUrl || '').trim(),
        topic: normalizePostTopic(req.body?.topic, normalizeZentroSocial(config.social).postDefaultTopic),
        linkToMessenger: req.body?.linkToMessenger !== false,
        productIndex: Number.isInteger(Number(req.body?.productIndex)) ? Number(req.body.productIndex) : undefined,
      });
      await createLog(req.user, 'zentro_facebook_post_published', post.metaPostId || String(post._id));
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: cleanMetaError(error) });
    }
  });

  return {
    start() {
      if (scheduler) return;
      scheduler = cron.schedule('*/5 * * * *', () => void runSchedule());
      setTimeout(() => void runSchedule(), 15000);
    },
    stop() {
      scheduler?.stop();
      scheduler = null;
    },
    runSchedule,
  };
}
