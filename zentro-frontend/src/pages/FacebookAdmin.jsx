import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bot,
  CalendarClock,
  CarFront,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  Landmark,
  Link2,
  LoaderCircle,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Paintbrush,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteFacebookPost,
  getAdminWebConfig,
  getFacebookMessengerActivity,
  getFacebookListings,
  getFacebookPostHistory,
  getFacebookPostInsights,
  getFacebookStatus,
  publishFacebookPost,
  subscribeFacebookPage,
  testFacebookConnection,
  updateAdminWebConfig,
  updateFacebookListing,
  uploadAdminWebImages,
} from '../api';
import { DEFAULT_SOCIAL, normalizeSiteConfig } from '../siteDefaults';
import FacebookDailyPlanner from './FacebookDailyPlanner';
import FacebookImageEditor from './FacebookImageEditor';

const VIEWS = [
  { id: 'connection', label: 'Холболт', icon: Link2 },
  { id: 'bot', label: 'Чатбот', icon: Bot },
  { id: 'posts', label: 'Пост', icon: Send },
];

const CREDENTIAL_LABELS = {
  pageId: 'Page ID',
  pageAccessToken: 'Page access token',
  verifyToken: 'Webhook verify token',
  appSecret: 'Meta App secret',
};

const POST_CTA_OPTIONS = [
  { value: 'MESSAGE_PAGE', label: 'Send Message', detail: 'ref-тэй m.me холбоос текстэд орно, товч нь зар болгосон үед гарна', icon: MessageCircle },
  { value: 'APPLY_NOW', label: 'Apply Now', detail: 'Веб хүсэлтийн холбоос текстэд орно', icon: FileText },
  { value: 'NONE', label: 'Товчгүй', detail: 'Зөвхөн пост нийтэлнэ', icon: X },
];

// Meta органик Page постод CTA товч тавихыг хаасан. Товч зөвхөн boost хийсэн
// (Click-to-Messenger) зар дээр гарах тул админ дээр үүнийг алдаа биш гэж үзнэ.
const ORGANIC_CTA_HINT = 'Meta органик пост дээр товч зөвшөөрдөггүй. Товч гаргахын тулд Facebook дээрх постоо Create ad → Get more messages → Send Message болгож зар болгоно.';

function facebookCtaLabel(value) {
  if (value === 'MESSAGE_PAGE') return 'Send Message';
  if (value === 'APPLY_NOW') return 'Apply Now';
  return 'Товчгүй';
}

function Toggle({ checked, onChange, label, detail }) {
  return <label className="zf-toggle-row">
    <span><b>{label}</b>{detail && <small>{detail}</small>}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} />
    <i aria-hidden="true" />
  </label>;
}

function Notice({ type = 'success', children, url = '' }) {
  return <div className={`zf-notice ${type}`}>
    {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
    <span>{children}</span>
    {url && <a href={url} target="_blank" rel="noreferrer">Facebook дээр нээх <ExternalLink size={13} /></a>}
  </div>;
}

function replaceTemplate(template, values) {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value || '')),
    String(template || '')
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('mn-MN') : '-';
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value || 0).toLocaleString('mn-MN');
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function removeWebsiteApplicationHandoff(message = '') {
  return String(message)
    .replace(/(?:Дэлгэрэнгүй|Хүсэлт өгөх)\s*:\s*https?:\/\/(?:www\.)?zentrocapitalgroup\.com\/?#apply[^\n]*/giu, '')
    .replace(/https?:\/\/(?:www\.)?zentrocapitalgroup\.com\/?#apply\b/giu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function FacebookAdmin() {
  const [view, setView] = useState('connection');
  const [config, setConfig] = useState(null);
  const [social, setSocial] = useState(DEFAULT_SOCIAL);
  const [status, setStatus] = useState(null);
  const [messengerActivity, setMessengerActivity] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [listingDisplayCount, setListingDisplayCount] = useState(10);
  const [posts, setPosts] = useState([]);
  const [postInsights, setPostInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [manualMessage, setManualMessage] = useState('');
  const [manualImageUrls, setManualImageUrls] = useState([]);
  const [manualImageInput, setManualImageInput] = useState('');
  const [manualTopic, setManualTopic] = useState('loan');
  const [manualProductIndex, setManualProductIndex] = useState(0);
  const [manualCtaType, setManualCtaType] = useState('MESSAGE_PAGE');
  const [listingActive, setListingActive] = useState(true);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);

  const refreshActiveListings = useCallback(() => getFacebookListings('all', 100, 0)
    .then(listings => {
      setActiveListings(listings);
      setListingDisplayCount(10);
    })
    .catch(() => setActiveListings([])), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawConfig, connection, activity, history] = await Promise.all([
        getAdminWebConfig(),
        getFacebookStatus(),
        getFacebookMessengerActivity().catch(() => null),
        getFacebookPostHistory(),
      ]);
      const normalized = normalizeSiteConfig(rawConfig);
      setConfig(normalized);
      setSocial(normalized.social);
      setManualTopic(normalized.social.postDefaultTopic || 'loan');
      setManualCtaType(normalized.social.postCtaType || 'MESSAGE_PAGE');
      setStatus(connection);
      setMessengerActivity(activity);
      setPosts(history);
      refreshActiveListings();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Facebook тохиргоог уншиж чадсангүй.' });
    } finally {
      setLoading(false);
    }
  }, [refreshActiveListings]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!postInsights) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setPostInsights(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [postInsights]);

  const change = (key, value) => {
    setSocial(current => ({ ...current, [key]: value }));
    setNotice(null);
  };

  const save = async (quiet = false) => {
    setBusy('save');
    try {
      const saved = await updateAdminWebConfig({ social });
      const normalized = normalizeSiteConfig(saved);
      setConfig(normalized);
      setSocial(normalized.social);
      if (!quiet) setNotice({ type: 'success', text: 'Facebook автоматжуулалтын тохиргоог хадгаллаа.' });
      return normalized;
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Тохиргоо хадгалахад алдаа гарлаа.' });
      throw error;
    } finally {
      setBusy('');
    }
  };

  const testConnection = async () => {
    setBusy('test');
    setNotice(null);
    try {
      const result = await testFacebookConnection();
      setStatus(result);
      const activity = await getFacebookMessengerActivity().catch(() => null);
      setMessengerActivity(activity);
      setNotice({ type: result.connected ? 'success' : 'error', text: result.connected ? `${result.page?.name || 'Facebook Page'} холболт хэвийн байна.` : (result.error || 'Meta credentials дутуу байна.') });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Холболт шалгахад алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const subscribe = async () => {
    setBusy('subscribe');
    setNotice(null);
    try {
      const result = await subscribeFacebookPage();
      setStatus(result.status);
      setNotice({ type: 'success', text: 'Messenger webhook болон үндсэн цэсийг Facebook Page-д холбоод шинэчиллээ.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Page webhook холбоход алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    setBusy('publish');
    setNotice(null);
    try {
      const saved = await updateAdminWebConfig({ social });
      const normalized = normalizeSiteConfig(saved);
      setConfig(normalized);
      setSocial(normalized.social);
      const post = await publishFacebookPost({
        message: manualMessage.trim(),
        imageUrls: manualImageUrls,
        topic: manualTopic,
        productIndex: manualProductIndex,
        listingActive: manualTopic !== 'general' && listingActive,
        ctaType: manualCtaType,
      });
      setPosts(current => [post, ...current]);
      refreshActiveListings();
      setManualMessage('');
      setManualImageUrls([]);
      setManualImageInput('');
      const publishedCtaType = post.ctaType || manualCtaType;
      if (publishedCtaType !== 'NONE' && !post.ctaApplied) {
        setNotice({
          type: 'warning',
          text: `Пост нийтлэгдлээ. ${facebookCtaLabel(publishedCtaType)} товч органик постод гарахгүй — холбоос текстэд үлдсэн. Товч гаргах бол постоо зар болгоно уу.`,
          url: post.permalinkUrl || '',
        });
      } else {
        const suffix = post.ctaApplied ? ` · ${facebookCtaLabel(publishedCtaType)} товчтой` : '';
        setNotice({ type: 'success', text: `Facebook пост амжилттай нийтлэгдлээ${suffix}.`, url: post.permalinkUrl || '' });
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Facebook пост нийтлэхэд алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const addTemplate = () => {
    const nextIndex = social.postTemplates.length;
    change('postTemplates', [...social.postTemplates, 'Шинэ постын текстээ энд бичнэ үү.']);
    setSelectedTemplateIndex(nextIndex);
  };
  const updateTemplate = (index, value) => change('postTemplates', social.postTemplates.map((item, itemIndex) => itemIndex === index ? value : item));
  const removeTemplate = index => {
    if (social.postTemplates.length <= 1) return;
    const templates = social.postTemplates.filter((_, itemIndex) => itemIndex !== index);
    change('postTemplates', templates);
    setSelectedTemplateIndex(current => Math.min(current > index ? current - 1 : current, templates.length - 1));
  };
  const addFaq = () => change('faqItems', [...social.faqItems, { keywords: '', answer: '', enabled: true }]);
  const updateFaq = (index, key, value) => change('faqItems', social.faqItems.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const removeFaq = index => change('faqItems', social.faqItems.filter((_, itemIndex) => itemIndex !== index));

  const uploadPostImage = async event => {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 5 - manualImageUrls.length));
    event.target.value = '';
    if (!files.length) return;
    setBusy('upload');
    setNotice(null);
    try {
      const result = await uploadAdminWebImages(files);
      const imageUrls = (result.images || []).map(image => image.url).filter(Boolean);
      if (!imageUrls.length) throw new Error('Зургийн URL буцаж ирсэнгүй.');
      setManualImageUrls(current => [...new Set([...current, ...imageUrls])].slice(0, 5));
      setNotice({ type: 'success', text: `${imageUrls.length} зураг постод нэмэгдлээ.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || error.message || 'Зураг оруулахад алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const addPostImageUrl = () => {
    const value = manualImageInput.trim();
    if (!value) return;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') throw new Error('HTTPS зураг шаардлагатай.');
      setManualImageUrls(current => [...new Set([...current, url.href])].slice(0, 5));
      setManualImageInput('');
      setNotice(null);
    } catch {
      setNotice({ type: 'error', text: 'Зургийн HTTPS холбоос зөв оруулна уу.' });
    }
  };

  const togglePostImage = url => setManualImageUrls(current => (
    current.includes(url) ? current.filter(item => item !== url) : [...current, url].slice(0, 5)
  ));

  const updateListing = async post => {
    setBusy(`listing-${post._id}`);
    setNotice(null);
    try {
      const updated = await updateFacebookListing(post._id, post.listingActive === false);
      setPosts(current => current.map(item => item._id === updated._id ? updated : item));
      refreshActiveListings();
      const itemLabel = 'Зарыг';
      setNotice({ type: 'success', text: updated.listingActive ? `${itemLabel} Messenger-д идэвхжүүллээ.` : `${itemLabel} Messenger жагсаалтаас хаслаа.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Зарын төлөв өөрчилж чадсангүй.' });
    } finally {
      setBusy('');
    }
  };

  const removePost = async post => {
    const label = post.productName || 'Facebook нийтлэл';
    if (!window.confirm(`“${label}” постыг Facebook-ээс устгах уу?\n\nЭнэ үйлдлийг буцаах боломжгүй. Дотоод аудитын түүх хадгалагдана.`)) return;
    setBusy(`delete-${post._id}`);
    setNotice(null);
    try {
      const deleted = await deleteFacebookPost(post._id);
      setPosts(current => current.map(item => item._id === deleted._id ? deleted : item));
      refreshActiveListings();
      setNotice({ type: 'success', text: 'Facebook постыг устгалаа. Аудитын түүх хадгалагдсан.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Facebook постыг устгаж чадсангүй.' });
    } finally {
      setBusy('');
    }
  };

  const openPostInsights = async post => {
    setBusy(`insights-${post._id}`);
    setNotice(null);
    try {
      setPostInsights(await getFacebookPostInsights(post._id));
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Постын статистик уншиж чадсангүй.' });
    } finally {
      setBusy('');
    }
  };

  const downloadConsentedLeads = () => {
    const leads = (postInsights?.leads || []).filter(lead => lead.marketingConsent && (lead.phone || lead.email));
    if (!leads.length) return;
    const rows = [
      ['name', 'phone', 'email', 'consent_at', 'source', 'status'],
      ...leads.map(lead => [lead.name, lead.phone, lead.email, lead.marketingConsentAt, lead.source, lead.status]),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zentro-consented-leads-${postInsights?.post?.id || 'post'}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const preview = useMemo(() => {
    if (!config) return '';
    const product = config.products?.[manualProductIndex] || config.products?.[0] || {};
    const message = manualMessage || replaceTemplate(social.postTemplates?.[selectedTemplateIndex] || social.postTemplates?.[0] || '', {
      product: product.name,
      description: product.description,
      rate: product.rate,
      term: product.term,
      amount: product.amount,
      phone: config.phone,
      website: 'https://zentrocapitalgroup.com',
    });
    if (manualCtaType === 'NONE') return message;
    if (manualCtaType === 'APPLY_NOW') {
      const applicationUrl = 'https://zentrocapitalgroup.com/#apply';
      return message.includes(applicationUrl) ? message : `${message}\n\nЗээлийн хүсэлт өгөх: ${applicationUrl}`;
    }
    const messengerMessage = removeWebsiteApplicationHandoff(message);
    const base = social.messengerUrl || 'https://m.me/JapanCarDealership';
    const separator = base.includes('?') ? '&' : '?';
    const label = manualTopic === 'car' ? 'Машины талаар Messenger-ээр асуух' : manualTopic === 'loan' ? 'Зээлийн хүсэлтээ Messenger-ээр өгөх' : 'Messenger-ээр холбогдох';
    return `${messengerMessage}\n\n${label}: ${base}${separator}ref=post-preview\nОнлайнаар хүсэлт өгөх: https://zentrocapitalgroup.com/?fb_post=post-id#apply`;
  }, [config, manualCtaType, manualMessage, manualProductIndex, manualTopic, selectedTemplateIndex, social.messengerUrl, social.postTemplates]);

  const selectedProduct = config?.products?.[manualProductIndex] || config?.products?.[0] || {};
  const selectedProductImages = [
    ...(Array.isArray(selectedProduct.images) ? selectedProduct.images : []),
    selectedProduct.image,
    selectedProduct.imageUrl,
  ].filter(Boolean);
  const previewImages = manualImageUrls.length
    ? manualImageUrls
    : (social.postUseProductImage && selectedProductImages[0] ? [selectedProductImages[0]] : []);
  const imageEditorSource = manualImageUrls[0] || selectedProductImages[0] || '';
  const selectedTemplatePreview = replaceTemplate(social.postTemplates?.[selectedTemplateIndex] || '', {
    product: selectedProduct.name,
    description: selectedProduct.description,
    rate: selectedProduct.rate,
    term: selectedProduct.term,
    amount: selectedProduct.amount,
    phone: config?.phone,
    website: 'https://zentrocapitalgroup.com',
  });

  const saveImageDesign = async file => {
    setBusy('design-upload');
    try {
      const result = await uploadAdminWebImages([file]);
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) throw new Error('Дизайны зураг серверт хадгалагдсангүй.');
      setManualImageUrls(current => [imageUrl, ...(current.length ? current.slice(1) : [])].slice(0, 5));
      setImageEditorOpen(false);
      setNotice({ type: 'success', text: 'Зураг дээрх дизайн PNG болж постын эхний зурагт орлоо.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || error.message || 'Зургийн дизайныг хадгалж чадсангүй.' });
      throw error;
    } finally {
      setBusy('');
    }
  };

  const messengerReady = Boolean(status?.connected && status?.configured);
  const pixelReady = /^\d{5,30}$/.test(String(social.metaPixelId || '').trim());
  const legacyOverlap = Boolean(status?.legacyMessenger?.samePage);
  const tokenExpired = /(?:access token|session).*(?:expired|хугацаа)/i.test(String(status?.error || ''));
  const connectionDetail = tokenExpired
    ? 'Page access token-ийн хугацаа дууссан. Meta-аас шинэ token үүсгээд Render Environment-д солино уу.'
    : status?.error || (messengerReady ? 'Messenger болон Page API ашиглахад бэлэн' : 'Credentials-ийн төлөвийг Холболт хэсгээс харна уу');

  if (loading) return <div className="zf-loading"><LoaderCircle className="animate-spin" size={20} /> Facebook удирдлагыг нээж байна...</div>;

  return <div className="zf-page">
    <header className="zf-header">
      <div><span>Social operations</span><h1>Facebook ба Messenger</h1></div>
      <div className="zf-header-actions">
        <button className="z-btn z-btn-secondary" type="button" onClick={testConnection} disabled={Boolean(busy)}>{busy === 'test' ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />} Холболт шалгах</button>
        <button className="z-btn z-btn-primary" type="button" onClick={() => save()} disabled={Boolean(busy)}>{busy === 'save' ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} Хадгалах</button>
      </div>
    </header>

    <div className={`zf-status ${messengerReady ? 'connected' : ''}`}>
      <div className="zf-status-icon">{messengerReady ? <Check size={18} /> : <AlertCircle size={18} />}</div>
      <div><b>{messengerReady ? status.page?.name || 'Facebook Page холбогдсон' : tokenExpired ? 'Facebook Page token шинэчлэх шаардлагатай' : status?.connected ? `${status.page?.name || 'Facebook Page'} · webhook credentials дутуу` : 'Meta холболт хүлээгдэж байна'}</b><span>{connectionDetail}</span></div>
      {status?.page?.link && <a href={status.page.link} target="_blank" rel="noreferrer" title="Facebook Page нээх"><ExternalLink size={16} /></a>}
    </div>

    {notice && <Notice type={notice.type} url={notice.url}>{notice.text}</Notice>}

    <nav className="zf-tabs">{VIEWS.map(({ id, label, icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{createElement(icon, { size: 16 })}{label}</button>)}</nav>

    {view === 'connection' && <div className="zf-grid connection">
      <section className="zf-panel">
        <div className="zf-panel-head"><div><span>Public холбоос</span><h2>Facebook Page</h2></div><MessageCircle size={19} /></div>
        <label className="z-label">Facebook Page URL</label>
        <input className="z-input" type="url" value={social.facebookPageUrl} onChange={event => change('facebookPageUrl', event.target.value)} placeholder="https://www.facebook.com/..." />
        <label className="z-label">Messenger URL</label>
        <input className="z-input" type="url" value={social.messengerUrl} onChange={event => change('messengerUrl', event.target.value)} placeholder="https://m.me/..." />
        <div className="zf-webhook">
          <span>Webhook callback</span>
          <code>{status?.webhookUrl}</code>
          <button type="button" title="Хуулах" onClick={() => navigator.clipboard?.writeText(status?.webhookUrl || '')}><Copy size={14} /></button>
        </div>
      </section>

      <section className="zf-panel">
        <div className="zf-panel-head"><div><span>Server credentials</span><h2>Meta API төлөв</h2></div><Link2 size={19} /></div>
        <div className="zf-credential-list">{Object.entries(CREDENTIAL_LABELS).map(([key, label]) => {
          const ready = Boolean(status?.credentials?.[key]) && !(key === 'pageAccessToken' && tokenExpired);
          return <div key={key}><span className={ready ? 'ok' : ''}>{ready ? <Check size={13} /> : <AlertCircle size={13} />}</span><b>{label}</b><small>{key === 'pageAccessToken' && tokenExpired ? 'Хугацаа дууссан' : ready ? 'Тохирсон' : 'Дутуу'}</small></div>;
        })}</div>
        <div className="zf-permissions">{status?.requiredPermissions?.map(permission => <code key={permission}>{permission}</code>)}</div>
        <button className="z-btn z-btn-primary" type="button" onClick={subscribe} disabled={Boolean(busy) || !messengerReady}>{busy === 'subscribe' ? <LoaderCircle className="animate-spin" size={14} /> : <Link2 size={14} />} Messenger webhook холбох</button>
      </section>

      <section className="zf-panel zf-marketing-panel">
        <div className="zf-panel-head"><div><span>Measurement</span><h2>Статистик ба маркетинг</h2></div><BarChart3 size={19} /></div>
        <label className="z-label">Meta Pixel ID</label>
        <input className="z-input" inputMode="numeric" value={social.metaPixelId || ''} onChange={event => change('metaPixelId', event.target.value.replace(/\D/g, '').slice(0, 30))} placeholder="Жишээ: 123456789012345" />
        <div className="zf-marketing-list">
          <div><span className={pixelReady ? 'ready' : ''}>{pixelReady ? <Check size={13} /> : <AlertCircle size={13} />}</span><b>Вебийн Pixel</b><small>{pixelReady ? 'Зөвшөөрөл өгсөн хэрэглэгч дээр идэвхжинэ' : 'Pixel ID оруулаагүй'}</small></div>
          <div><span><BarChart3 size={13} /></span><b>Постын үзүүлэлт</b><small>Постын түүхээс статистик нээнэ</small></div>
          <div><span><ShieldAlert size={13} /></span><b>Холбоо барих мэдээлэл</b><small>Зөвхөн хүсэлтээр сайн дураар өгсөн утас, имэйл</small></div>
        </div>
        <small className="zf-panel-note">View, click-д <code>read_insights</code>, comment/share-д <code>pages_read_user_content</code> эрх шаардлагатай. Пост үзсэн бүх хүний нэр, утас, имэйл ирэхгүй.</small>
      </section>

      <section className="zf-panel zf-diagnostic-panel">
        <div className="zf-panel-head"><div><span>Routing diagnostics</span><h2>Давхар автоматжуулалт</h2></div><ShieldAlert size={19} /></div>
        {legacyOverlap && <div className="zf-route-warning"><AlertCircle size={16} /><span><b>Хуучин SCM Messenger мөн энэ Page-ийг зааж байна.</b><small>Шинэ хувилбар Zentro Page-ийн event-ийг хуучин webhook дээр автоматаар алгасана.</small></span></div>}
        <div className="zf-route-warning neutral"><ShieldAlert size={16} /><span><b>Meta Business Suite-ийн Instant reply</b><small>Inbox → Automations → Instant reply хэсэгт хуучин хариулт байвал OFF болгоно.</small></span></div>
        <div className="zf-subscription-list">
          <span>Page-д бүртгэлтэй app</span>
          {status?.subscriptions?.length
            ? status.subscriptions.map(item => <div key={item.id}><b>{item.name || item.id}</b><small>{item.subscribed_fields?.join(', ') || 'Event сонгоогүй'}</small></div>)
            : <small>{status?.subscriptionError || 'Subscription мэдээлэл олдсонгүй.'}</small>}
        </div>
        <div className="zf-subscription-list">
          <span>Webhook activity</span>
          <div><b>{messengerActivity?.webhook?.events || 0} event</b><small>Сүүлд ирсэн: {formatDate(messengerActivity?.webhook?.lastEventAt)}</small></div>
          <div><b>{messengerActivity?.totalSessions || 0} чат session</b><small>Сүүлд боловсруулсан: {formatDate(messengerActivity?.webhook?.lastProcessedAt)}</small></div>
          {messengerActivity?.webhook?.lastError && <div><b>Сүүлийн алдаа</b><small>{messengerActivity.webhook.lastError}</small></div>}
        </div>
      </section>
    </div>}

    {view === 'bot' && <div className="zf-grid bot">
      <section className="zf-panel">
        <div className="zf-panel-head"><div><span>Automation</span><h2>Messenger chatbot</h2></div><Bot size={20} /></div>
        <Toggle checked={social.autoReplyEnabled} onChange={value => change('autoReplyEnabled', value)} label="Автомат хариулт" detail="Нөхцөл, холбоо барих мэдээлэл болон түгээмэл асуултад хариулна" />
        <Toggle checked={social.requestIntakeEnabled} onChange={value => change('requestIntakeEnabled', value)} label="Messenger-ээр хүсэлт авах" detail="Хүсэлтийг Facebook эх сурвалжтайгаар CRM-д бүртгэнэ" />
        <div className="zf-chat-entry-preview">
          <span>Эхний сонголт</span>
          <div><button type="button" tabIndex={-1}><CarFront size={15} /> Идэвхтэй зар</button><button type="button" tabIndex={-1}><MessageCircle size={15} /> Зээлийн талаар</button></div>
        </div>
        <div className="zf-active-listings-summary">
          <span>Messenger-д харагдах идэвхтэй зар · {activeListings.length}</span>
          {activeListings.length > 0
            ? activeListings.slice(0, listingDisplayCount).map(listing => <div key={listing.id}>{listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : listing.topic === 'loan' ? <Landmark size={16} /> : <CarFront size={16} />}<b>{listing.title}</b>{listing.permalinkUrl && <a href={listing.permalinkUrl} target="_blank" rel="noreferrer" title="Facebook зар нээх"><ExternalLink size={13} /></a>}</div>)
            : <small>Идэвхтэй зар олдсонгүй.</small>}
          {activeListings.length > listingDisplayCount && <button className="z-btn z-btn-secondary" type="button" onClick={() => setListingDisplayCount(current => current + 10)}><Plus size={14} /> Илүү их</button>}
        </div>
        <label className="z-label">Чат нээгдэхэд харагдах мэндчилгээ</label>
        <textarea className="z-input" rows={2} maxLength={160} value={social.profileGreeting || ''} onChange={event => change('profileGreeting', event.target.value)} />
        <label className="z-label">Эхний мэндчилгээ</label>
        <textarea className="z-input" rows={5} value={social.welcomeMessage} onChange={event => change('welcomeMessage', event.target.value)} />
        <label className="z-label">Машины урсгалын хариулт</label>
        <textarea className="z-input" rows={4} value={social.carWelcomeMessage || ''} onChange={event => change('carWelcomeMessage', event.target.value)} />
        <label className="z-label">Зээлийн урсгалын хариулт</label>
        <textarea className="z-input" rows={3} value={social.loanWelcomeMessage || ''} onChange={event => change('loanWelcomeMessage', event.target.value)} />
        <label className="z-label">Ажлын цаг</label>
        <input className="z-input" value={social.businessHours} onChange={event => change('businessHours', event.target.value)} />
      </section>

      <section className="zf-panel">
        <div className="zf-panel-head"><div><span>Knowledge</span><h2>Нэмэлт автомат хариулт</h2></div><FileText size={19} /></div>
        <div className="zf-faq-list">{social.faqItems.map((item, index) => <div className="zf-faq" key={index}>
          <input className="z-input" value={Array.isArray(item.keywords) ? item.keywords.join(', ') : item.keywords || ''} onChange={event => updateFaq(index, 'keywords', event.target.value)} placeholder="Түлхүүр үгс: материал, бичиг баримт" />
          <textarea className="z-input" rows={3} value={item.answer || ''} onChange={event => updateFaq(index, 'answer', event.target.value)} placeholder="Автомат хариулт" />
          <div><label><input type="checkbox" checked={item.enabled !== false} onChange={event => updateFaq(index, 'enabled', event.target.checked)} /> Идэвхтэй</label><button type="button" title="Устгах" onClick={() => removeFaq(index)}><Trash2 size={14} /></button></div>
        </div>)}</div>
        <button className="z-btn z-btn-secondary" type="button" onClick={addFaq}><Plus size={14} /> Хариулт нэмэх</button>
      </section>
    </div>}

    {view === 'posts' && <div className="zf-post-layout">
      <div className="zf-compose-workspace">
        <section className="zf-panel zf-compose-panel">
        <div className="zf-panel-head"><div><span>Composer</span><h2>Facebook пост оруулах</h2></div><Send size={20} /></div>

        <label className="z-label">Постын чиглэл</label>
        <div className="zf-topic-selector">
          <button type="button" className={manualTopic === 'car' ? 'active' : ''} onClick={() => setManualTopic('car')}><CarFront size={15} /> Машин</button>
          <button type="button" className={manualTopic === 'loan' ? 'active' : ''} onClick={() => setManualTopic('loan')}><Landmark size={15} /> Зээл</button>
          <button type="button" className={manualTopic === 'general' ? 'active' : ''} onClick={() => setManualTopic('general')}><MessageCircle size={15} /> Ерөнхий</button>
        </div>
        <div className="zf-topic-hint">
          {manualTopic === 'car'
            ? <><CarFront size={14} /><span><b>Автомашины зар</b> Зураг, мэдээлэлтэй бөгөөд “Идэвхтэй зар” асаалттай бол Messenger-ийн нэгдсэн жагсаалтад огноогоор орно.</span></>
            : manualTopic === 'loan'
              ? <><Landmark size={14} /><span><b>Зээлийн пост</b> “Идэвхтэй зар” асаалттай бол Messenger-ийн нэгдсэн жагсаалтад огноогоор орно.</span></>
              : <><AlertCircle size={14} /><span><b>Ерөнхий пост</b> Messenger-ийн идэвхтэй жагсаалтад орохгүй.</span></>}
        </div>

        <label className="z-label">Холбох бүтээгдэхүүн</label>
        <select className="z-select" value={manualProductIndex} onChange={event => setManualProductIndex(Number(event.target.value))}>
          {(config?.products || []).map((product, index) => <option value={index} key={`${product.name}-${index}`}>{product.name || `Бүтээгдэхүүн ${index + 1}`}</option>)}
        </select>

        <label className="z-label">Постын текст</label>
        <textarea className="z-input" rows={9} value={manualMessage} onChange={event => setManualMessage(event.target.value)} placeholder="Хоосон бол сонгосон бүтээгдэхүүнтэй автомат загварыг ашиглана" />

        <div className="zf-image-picker">
          <div><span className="z-label">Постын зураг · {manualImageUrls.length}/5</span>{manualImageUrls.length > 0 && <button type="button" title="Бүх зураг арилгах" onClick={() => setManualImageUrls([])}><X size={14} /></button>}</div>
          {manualImageUrls.length > 0
            ? <div className="zf-selected-images">{manualImageUrls.map((url, index) => <button type="button" key={`${url}-${index}`} onClick={() => togglePostImage(url)} title={`Зураг ${index + 1}-ийг арилгах`}><img src={url} alt={`Постын зураг ${index + 1}`} /><span><X size={13} /></span></button>)}</div>
            : <div className="zf-image-empty"><ImagePlus size={22} /><span>Зураг сонгоогүй · 5 хүртэл оруулна</span></div>}
          {selectedProductImages.length > 0 && <div className="zf-image-library">{selectedProductImages.slice(0, 5).map((url, index) => <button type="button" className={manualImageUrls.includes(url) ? 'active' : ''} key={`${url}-${index}`} onClick={() => togglePostImage(url)} title={`Бүтээгдэхүүний зураг ${index + 1}`}><img src={url} alt="" /></button>)}</div>}
          <div className="zf-image-actions">
            <label className="z-btn z-btn-secondary"><Upload size={14} /> {busy === 'upload' ? 'Оруулж байна...' : 'Зураг оруулах'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={uploadPostImage} disabled={Boolean(busy) || manualImageUrls.length >= 5} /></label>
            <div className="zf-image-url"><input className="z-input" type="url" value={manualImageInput} onChange={event => setManualImageInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addPostImageUrl(); } }} placeholder="эсвэл зургийн HTTPS URL" /><button type="button" title="URL зураг нэмэх" onClick={addPostImageUrl} disabled={!manualImageInput.trim() || manualImageUrls.length >= 5}><Plus size={15} /></button></div>
            <button className="z-btn z-btn-secondary zf-design-launch" type="button" onClick={() => setImageEditorOpen(true)} disabled={!imageEditorSource || Boolean(busy)}><Paintbrush size={14} /> Зураг дээр текст, лого дизайн хийх</button>
          </div>
        </div>

        <label className="z-label">Постын үйлдлийн товч</label>
        <div className="zf-cta-selector" role="radiogroup" aria-label="Facebook постын үйлдлийн товч">
          {POST_CTA_OPTIONS.map(option => {
            const Icon = option.icon;
            return <button
              type="button"
              role="radio"
              aria-checked={manualCtaType === option.value}
              className={manualCtaType === option.value ? 'active' : ''}
              onClick={() => setManualCtaType(option.value)}
              key={option.value}
            >
              <Icon size={15} />
              <span><b>{option.label}</b><small>{option.detail}</small></span>
            </button>;
          })}
        </div>
        <small className="zf-panel-note">{ORGANIC_CTA_HINT} Сонгосон холбоос постын текстэд ямар ч тохиолдолд орно. Page-ийн нүүрэнд байнгын товч нэмэх бол: Page → <code>Edit action button</code> → <code>Send Message</code>.</small>
        {manualTopic !== 'general' && <Toggle checked={listingActive} onChange={setListingActive} label="Идэвхтэй зар" detail="Messenger-ийн нэгдсэн жагсаалтад хамгийн шинэ огноогоор эрэмбэлж харуулна" />}
        <button className="z-btn z-btn-primary zf-publish-now" type="button" onClick={publish} disabled={Boolean(busy) || !status?.connected}>{busy === 'publish' ? <LoaderCircle className="animate-spin" size={14} /> : <Send size={14} />} Одоо нийтлэх</button>
        </section>

        <aside className="zf-publish-panel">
          <div className="zf-panel-head"><div><span>Preview</span><h2>Постын харагдац</h2></div><MessagesSquare size={19} /></div>
          {previewImages.length > 0 && <div className={`zf-post-preview-images count-${previewImages.length}`}>{previewImages.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`Нийтлэх зураг ${index + 1}`} />)}</div>}
          <div className="zf-post-preview"><pre>{preview}</pre></div>
          {manualCtaType !== 'NONE' && <div className="zf-post-cta-preview"><span>zentrocapitalgroup.com</span><button type="button" tabIndex={-1}>{manualCtaType === 'MESSAGE_PAGE' ? <MessageCircle size={14} /> : <FileText size={14} />}{facebookCtaLabel(manualCtaType)}</button></div>}
          {manualCtaType === 'MESSAGE_PAGE' && <div className="zf-chat-link-state"><MessageCircle size={15} /><span><b>{manualTopic === 'car' ? 'Машины чат' : manualTopic === 'loan' ? 'Зээлийн чат' : 'Үндсэн чат'}</b><small>Referral tracking идэвхтэй</small></span></div>}
        </aside>
      </div>

      <section className="zf-template-studio">
        <div className="zf-panel-head"><div><span>Content library</span><h2>Постын загвар сонгох</h2></div><CalendarClock size={20} /></div>
        <div className="zf-automation-controls">
          <Toggle checked={social.dailyPostEnabled} onChange={value => change('dailyPostEnabled', value)} label="Баталсан постыг автоматаар нийтлэх" detail="Пост бүрийн сонгосон цагийг Asia/Ulaanbaatar бүсээр шалгана" />
          <Toggle checked={social.postUseProductImage} onChange={value => change('postUseProductImage', value)} label="Бүтээгдэхүүний зураг ашиглах" detail="Зурагт постод веб админы бүтээгдэхүүний зургийг санал болгоно" />
          <div className="zf-educational-mode"><Sparkles size={17} /><span><b>AI танин мэдэхүйн горим</b><small>Зарын CTA болон идэвхтэй зарын жагсаалт ашиглахгүй</small></span></div>
        </div>
        <div className="zf-template-picker" role="tablist" aria-label="Facebook постын загвар">
          {social.postTemplates.map((template, index) => <button type="button" role="tab" aria-selected={selectedTemplateIndex === index} className={selectedTemplateIndex === index ? 'active' : ''} onClick={() => setSelectedTemplateIndex(index)} key={index}><span>Загвар {index + 1}</span><p>{replaceTemplate(template, { product: selectedProduct.name, description: selectedProduct.description, rate: selectedProduct.rate, term: selectedProduct.term, amount: selectedProduct.amount, phone: config?.phone, website: 'zentrocapitalgroup.com' }).slice(0, 150)}</p>{selectedTemplateIndex === index && <Check size={14} />}</button>)}
          <button className="add" type="button" onClick={addTemplate} disabled={social.postTemplates.length >= 12}><Plus size={16} /><span>Шинэ загвар</span></button>
        </div>
        <div className="zf-template-editor">
          <div><label className="z-label">Сонгосон загварын текст</label><textarea className="z-input" rows={9} value={social.postTemplates[selectedTemplateIndex] || ''} onChange={event => updateTemplate(selectedTemplateIndex, event.target.value)} /></div>
          <aside><span>Бодит утгатай харагдац</span><pre>{selectedTemplatePreview}</pre></aside>
        </div>
        <div className="zf-template-actions">
          <button className="z-btn z-btn-primary" type="button" onClick={() => setManualMessage(selectedTemplatePreview)}><Send size={14} /> Гараар нийтлэх хэсэгт ашиглах</button>
          <button className="z-btn z-btn-secondary" type="button" onClick={() => removeTemplate(selectedTemplateIndex)} disabled={social.postTemplates.length <= 1}><Trash2 size={14} /> Сонгосон загвар устгах</button>
        </div>
      </section>

      <FacebookDailyPlanner
        config={config}
        social={social}
        onSocialChange={nextSocial => {
          setSocial(nextSocial);
          setConfig(current => current ? { ...current, social: nextSocial } : current);
        }}
        onNotice={setNotice}
        onPublished={post => {
          if (post) setPosts(current => [post, ...current.filter(item => item._id !== post._id)]);
          refreshActiveListings();
        }}
      />

      <section className="zf-history">
        <div className="zf-panel-head"><div><span>History</span><h2>Нийтлэлийн түүх</h2></div><Clock3 size={19} /></div>
        <div className="z-table-wrap">
          <table className="z-table">
            <thead><tr><th>Огноо</th><th>Эх үүсвэр</th><th>Пост</th><th>Товч</th><th>Чат</th><th>Messenger жагсаалт</th><th>Төлөв</th><th></th></tr></thead>
            <tbody>
              {posts.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">Нийтлэлийн түүх хоосон</td></tr>}
              {posts.map(post => {
                const ctaType = post.ctaType || (post.messengerLinked ? 'MESSAGE_PAGE' : 'NONE');
                return <tr key={post._id}>
                  <td>{formatDate(post.publishedAt || post.createdAt)}</td>
                  <td>{post.source === 'automatic' ? 'Автомат' : 'Гараар'}</td>
                  <td><b>{post.productName || 'Facebook нийтлэл'}</b><span className="zf-history-copy">{post.message}</span></td>
                  <td>{ctaType === 'NONE' ? '-' : <><span className={`zf-cta-status ${post.ctaApplied ? 'active' : 'boost'}`} title={post.ctaError || ORGANIC_CTA_HINT}>{post.ctaApplied ? <Check size={12} /> : <Megaphone size={12} />}{post.ctaApplied ? facebookCtaLabel(ctaType) : 'Зар болгоход'}</span><small className="zf-cta-hint">{post.ctaApplied ? '' : `${facebookCtaLabel(ctaType)} товч зар дээр гарна`}</small></>}</td>
                  <td>{post.messengerLinked ? <span className="zf-chat-count"><MessageCircle size={13} />{post.chatStarts || 0}</span> : '-'}</td>
                  <td>{post.topic !== 'general' && post.status === 'published' ? <button type="button" className={`zf-listing-toggle ${post.listingActive === false ? '' : 'active'}`} onClick={() => updateListing(post)} disabled={Boolean(busy)} title="Messenger жагсаалтын төлөв өөрчлөх">{busy === `listing-${post._id}` ? <LoaderCircle className="animate-spin" size={13} /> : post.listingActive === false ? <X size={13} /> : <Check size={13} />}{post.listingActive === false ? 'Нуусан' : 'Идэвхтэй зар'}</button> : '-'}</td>
                  <td><span className={`z-badge ${post.status === 'published' ? 'z-badge-green' : post.status === 'failed' ? 'z-badge-red' : post.status === 'deleted' ? 'z-badge-gray' : 'z-badge-yellow'}`}>{post.status === 'published' ? 'Нийтэлсэн' : post.status === 'failed' ? 'Алдаа' : post.status === 'deleted' ? 'Устгасан' : 'Нийтэлж байна'}</span>{post.status === 'deleted' && <small className="zf-deleted-at">{formatDate(post.deletedAt)}</small>}{post.error && <small className="zf-error-text">{post.error}</small>}</td>
                  <td><div className="zf-history-actions">{post.status === 'published' && <button className="stats" type="button" onClick={() => openPostInsights(post)} disabled={Boolean(busy)} title="Постын статистик">{busy === `insights-${post._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <BarChart3 size={14} />}</button>}{post.permalinkUrl && post.status !== 'deleted' && <a href={post.permalinkUrl} target="_blank" rel="noreferrer" title="Пост нээх"><ExternalLink size={15} /></a>}{post.status !== 'deleted' && <button className="delete" type="button" onClick={() => removePost(post)} disabled={Boolean(busy)} title="Facebook пост устгах">{busy === `delete-${post._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>}

    {imageEditorOpen && <FacebookImageEditor
      imageUrl={imageEditorSource}
      logoUrl={config?.logoUrl}
      headline={manualMessage.trim().split('\n').find(Boolean) || selectedProduct.name || 'Zentro Prime Capital'}
      subtext={selectedProduct.description || config?.heroText || ''}
      cta={manualCtaType === 'APPLY_NOW' ? 'Зээлийн хүсэлт өгөх' : manualCtaType === 'MESSAGE_PAGE' ? 'Messenger-ээр мэдээлэл авах' : config?.phone || 'Дэлгэрэнгүй мэдээлэл'}
      productName={selectedProduct.name || 'Зээлийн бүтээгдэхүүн'}
      conditions={{ rate: selectedProduct.rate, term: selectedProduct.term, amount: selectedProduct.amount }}
      requirements={selectedProduct.requirements}
      address={config?.address}
      phone={config?.phone}
      onClose={() => setImageEditorOpen(false)}
      onExport={saveImageDesign}
    />}

    {postInsights && <div className="zf-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPostInsights(null); }}>
      <section className="zf-insights-dialog" role="dialog" aria-modal="true" aria-labelledby="zf-insights-title">
        <header>
          <div><span>Post performance</span><h2 id="zf-insights-title">{postInsights.post?.productName || 'Facebook постын статистик'}</h2><small>{formatDate(postInsights.post?.publishedAt)}</small></div>
          <div>{postInsights.post?.permalinkUrl && <a href={postInsights.post.permalinkUrl} target="_blank" rel="noreferrer" title="Facebook пост нээх"><ExternalLink size={15} /></a>}<button type="button" title="Хаах" onClick={() => setPostInsights(null)}><X size={17} /></button></div>
        </header>

        <div className="zf-insight-metrics">
          <div><span>Үзэлт</span><b>{formatNumber(postInsights.meta?.views)}</b></div>
          <div><span>Үзсэн хүн</span><b>{formatNumber(postInsights.meta?.viewers)}</b></div>
          <div><span>Нийт үйлдэл</span><b>{formatNumber(postInsights.meta?.actions)}</b></div>
          <div><span>Даралт</span><b>{formatNumber(postInsights.meta?.clicks)}</b></div>
          <div><span>Reaction</span><b>{formatNumber(postInsights.meta?.reactions)}</b></div>
          <div><span>Сэтгэгдэл</span><b>{formatNumber(postInsights.meta?.comments)}</b></div>
          <div><span>Share</span><b>{formatNumber(postInsights.meta?.shares)}</b></div>
        </div>
        {postInsights.meta?.error && <div className="zf-insight-warning"><AlertCircle size={15} /><span><b>Meta статистик бүрэн ирсэнгүй.</b><small>{postInsights.meta.error}</small></span></div>}

        <div className="zf-funnel-strip">
          <div><MessageCircle size={16} /><span><b>{formatNumber(postInsights.funnel?.chatStarts)}</b><small>Чат эхлүүлсэн</small></span></div>
          <div><FileText size={16} /><span><b>{formatNumber(postInsights.funnel?.leads)}</b><small>Хүсэлт болсон</small></span></div>
          <div><BarChart3 size={16} /><span><b>{formatNumber(postInsights.funnel?.conversionRate)}%</b><small>Хөрвөлт</small></span></div>
          <div><Check size={16} /><span><b>{formatNumber(postInsights.funnel?.marketingConsentedLeads)}</b><small>Маркетинг зөвшөөрсөн</small></span></div>
        </div>

        <div className="zf-privacy-note"><ShieldAlert size={17} /><span><b>Үзсэн хүний хувийн мэдээлэл харагдахгүй.</b><small>Доорх утас, имэйл нь Messenger эсвэл веб хүсэлтээр өөрсдөө өгсөн харилцагчдын мэдээлэл.</small></span></div>

        <div className="zf-lead-head"><div><span>Attributed leads</span><h3>Энэ постоос ирсэн хүсэлт · {postInsights.leads?.length || 0}</h3></div><button className="z-btn z-btn-secondary" type="button" onClick={downloadConsentedLeads} disabled={!postInsights.funnel?.marketingConsentedLeads}><Download size={14} /> Зөвшөөрөлтэй CSV</button></div>
        <div className="zf-lead-table-wrap">
          <table className="zf-lead-table">
            <thead><tr><th>Огноо</th><th>Харилцагч</th><th>Утас</th><th>И-мэйл</th><th>Суваг</th><th>Маркетинг</th></tr></thead>
            <tbody>
              {!postInsights.leads?.length && <tr><td colSpan={6}>Одоогоор энэ посттой холбогдсон хүсэлт алга.</td></tr>}
              {postInsights.leads?.map(lead => <tr key={lead.id}><td>{formatDate(lead.createdAt)}</td><td><b>{lead.name || '-'}</b><small>{lead.status || 'new'}</small></td><td>{lead.phone || '-'}</td><td>{lead.email || '-'}</td><td>{lead.source === 'facebook' ? 'Messenger' : 'Веб'}</td><td>{lead.marketingConsent ? <span className="zf-consent yes"><Check size={12} /> Зөвшөөрсөн</span> : <span className="zf-consent">Үгүй</span>}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>}
  </div>;
}
