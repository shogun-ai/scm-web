import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CalendarClock,
  CarFront,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  ImagePlus,
  Landmark,
  Link2,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  getAdminWebConfig,
  getFacebookMessengerActivity,
  getFacebookPostHistory,
  getFacebookStatus,
  publishFacebookPost,
  subscribeFacebookPage,
  testFacebookConnection,
  updateAdminWebConfig,
  uploadAdminWebImages,
} from '../api';
import { DEFAULT_SOCIAL, normalizeSiteConfig } from '../siteDefaults';

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

function Toggle({ checked, onChange, label, detail }) {
  return <label className="zf-toggle-row">
    <span><b>{label}</b>{detail && <small>{detail}</small>}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} />
    <i aria-hidden="true" />
  </label>;
}

function Notice({ type = 'success', children }) {
  return <div className={`zf-notice ${type}`}>
    {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
    <span>{children}</span>
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

export default function FacebookAdmin() {
  const [view, setView] = useState('connection');
  const [config, setConfig] = useState(null);
  const [social, setSocial] = useState(DEFAULT_SOCIAL);
  const [status, setStatus] = useState(null);
  const [messengerActivity, setMessengerActivity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [manualMessage, setManualMessage] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualTopic, setManualTopic] = useState('loan');
  const [manualProductIndex, setManualProductIndex] = useState(0);
  const [linkPostToMessenger, setLinkPostToMessenger] = useState(true);

  const load = async () => {
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
      setLinkPostToMessenger(normalized.social.postLinkToMessenger !== false);
      setStatus(connection);
      setMessengerActivity(activity);
      setPosts(history);
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Facebook тохиргоог уншиж чадсангүй.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        imageUrl: manualImageUrl.trim(),
        topic: manualTopic,
        productIndex: manualProductIndex,
        linkToMessenger: linkPostToMessenger,
      });
      setPosts(current => [post, ...current]);
      setManualMessage('');
      setManualImageUrl('');
      setNotice({ type: 'success', text: 'Facebook пост амжилттай нийтлэгдлээ.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Facebook пост нийтлэхэд алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const addTemplate = () => change('postTemplates', [...social.postTemplates, '']);
  const updateTemplate = (index, value) => change('postTemplates', social.postTemplates.map((item, itemIndex) => itemIndex === index ? value : item));
  const removeTemplate = index => change('postTemplates', social.postTemplates.filter((_, itemIndex) => itemIndex !== index));
  const addFaq = () => change('faqItems', [...social.faqItems, { keywords: '', answer: '', enabled: true }]);
  const updateFaq = (index, key, value) => change('faqItems', social.faqItems.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const removeFaq = index => change('faqItems', social.faqItems.filter((_, itemIndex) => itemIndex !== index));

  const uploadPostImage = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('upload');
    setNotice(null);
    try {
      const result = await uploadAdminWebImages([file]);
      const imageUrl = result.images?.[0]?.url || '';
      if (!imageUrl) throw new Error('Зургийн URL буцаж ирсэнгүй.');
      setManualImageUrl(imageUrl);
      setNotice({ type: 'success', text: 'Постын зураг бэлэн боллоо.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || error.message || 'Зураг оруулахад алдаа гарлаа.' });
    } finally {
      setBusy('');
    }
  };

  const preview = useMemo(() => {
    if (!config) return '';
    const product = config.products?.[manualProductIndex] || config.products?.[0] || {};
    const message = manualMessage || replaceTemplate(social.postTemplates?.[0] || '', {
      product: product.name,
      description: product.description,
      rate: product.rate,
      term: product.term,
      amount: product.amount,
      phone: config.phone,
      website: 'https://zentrocapitalgroup.com',
    });
    if (!linkPostToMessenger) return message;
    const base = social.messengerUrl || 'https://m.me/JapanCarDealership';
    const separator = base.includes('?') ? '&' : '?';
    const label = manualTopic === 'car' ? 'Машины талаар Messenger-ээр асуух' : manualTopic === 'loan' ? 'Зээлийн талаар Messenger-ээр асуух' : 'Messenger-ээр холбогдох';
    return `${message}\n\n${label}: ${base}${separator}ref=post-preview`;
  }, [config, linkPostToMessenger, manualMessage, manualProductIndex, manualTopic, social.messengerUrl, social.postTemplates]);

  const selectedProduct = config?.products?.[manualProductIndex] || config?.products?.[0] || {};
  const selectedProductImages = [
    ...(Array.isArray(selectedProduct.images) ? selectedProduct.images : []),
    selectedProduct.image,
    selectedProduct.imageUrl,
  ].filter(Boolean);
  const previewImage = manualImageUrl || (social.postUseProductImage ? selectedProductImages[0] : '');

  const messengerReady = Boolean(status?.connected && status?.configured);
  const legacyOverlap = Boolean(status?.legacyMessenger?.samePage);

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
      <div><b>{messengerReady ? status.page?.name || 'Facebook Page холбогдсон' : status?.connected ? `${status.page?.name || 'Facebook Page'} · webhook credentials дутуу` : 'Meta холболт хүлээгдэж байна'}</b><span>{messengerReady ? 'Messenger болон Page API ашиглахад бэлэн' : 'Credentials-ийн төлөвийг Холболт хэсгээс харна уу'}</span></div>
      {status?.page?.link && <a href={status.page.link} target="_blank" rel="noreferrer" title="Facebook Page нээх"><ExternalLink size={16} /></a>}
    </div>

    {notice && <Notice type={notice.type}>{notice.text}</Notice>}

    <nav className="zf-tabs">{VIEWS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={16} />{label}</button>)}</nav>

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
        <div className="zf-credential-list">{Object.entries(CREDENTIAL_LABELS).map(([key, label]) => <div key={key}><span className={status?.credentials?.[key] ? 'ok' : ''}>{status?.credentials?.[key] ? <Check size={13} /> : <AlertCircle size={13} />}</span><b>{label}</b><small>{status?.credentials?.[key] ? 'Тохирсон' : 'Дутуу'}</small></div>)}</div>
        <div className="zf-permissions">{status?.requiredPermissions?.map(permission => <code key={permission}>{permission}</code>)}</div>
        <button className="z-btn z-btn-primary" type="button" onClick={subscribe} disabled={Boolean(busy) || !messengerReady}>{busy === 'subscribe' ? <LoaderCircle className="animate-spin" size={14} /> : <Link2 size={14} />} Messenger webhook холбох</button>
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
          <div><button type="button" tabIndex={-1}><CarFront size={15} /> Машины талаар</button><button type="button" tabIndex={-1}><Landmark size={15} /> Зээлийн талаар</button></div>
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
      <section className="zf-panel zf-compose-panel">
        <div className="zf-panel-head"><div><span>Composer</span><h2>Facebook пост оруулах</h2></div><Send size={20} /></div>

        <label className="z-label">Постын чиглэл</label>
        <div className="zf-topic-selector">
          <button type="button" className={manualTopic === 'car' ? 'active' : ''} onClick={() => setManualTopic('car')}><CarFront size={15} /> Машин</button>
          <button type="button" className={manualTopic === 'loan' ? 'active' : ''} onClick={() => setManualTopic('loan')}><Landmark size={15} /> Зээл</button>
          <button type="button" className={manualTopic === 'general' ? 'active' : ''} onClick={() => setManualTopic('general')}><MessageCircle size={15} /> Ерөнхий</button>
        </div>

        <label className="z-label">Холбох бүтээгдэхүүн</label>
        <select className="z-select" value={manualProductIndex} onChange={event => setManualProductIndex(Number(event.target.value))}>
          {(config?.products || []).map((product, index) => <option value={index} key={`${product.name}-${index}`}>{product.name || `Бүтээгдэхүүн ${index + 1}`}</option>)}
        </select>

        <label className="z-label">Постын текст</label>
        <textarea className="z-input" rows={9} value={manualMessage} onChange={event => setManualMessage(event.target.value)} placeholder="Хоосон бол сонгосон бүтээгдэхүүнтэй автомат загварыг ашиглана" />

        <div className="zf-image-picker">
          <div><span className="z-label">Постын зураг</span>{manualImageUrl && <button type="button" title="Сонгосон зураг арилгах" onClick={() => setManualImageUrl('')}><X size={14} /></button>}</div>
          {previewImage ? <img src={previewImage} alt="Постын зураг" /> : <div className="zf-image-empty"><ImagePlus size={22} /><span>Зураг сонгоогүй</span></div>}
          {selectedProductImages.length > 0 && <div className="zf-image-library">{selectedProductImages.slice(0, 5).map((url, index) => <button type="button" className={previewImage === url ? 'active' : ''} key={`${url}-${index}`} onClick={() => setManualImageUrl(url)} title={`Бүтээгдэхүүний зураг ${index + 1}`}><img src={url} alt="" /></button>)}</div>}
          <div className="zf-image-actions">
            <label className="z-btn z-btn-secondary"><Upload size={14} /> {busy === 'upload' ? 'Оруулж байна...' : 'Зураг оруулах'}<input type="file" accept="image/*" onChange={uploadPostImage} disabled={Boolean(busy)} /></label>
            <input className="z-input" type="url" value={manualImageUrl} onChange={event => setManualImageUrl(event.target.value)} placeholder="эсвэл зургийн URL" />
          </div>
        </div>

        <Toggle checked={linkPostToMessenger} onChange={setLinkPostToMessenger} label="Messenger чаттай холбох" detail="Постоос орж ирсэн хүнийг сонгосон чиглэлийн чат руу оруулна" />
        <button className="z-btn z-btn-primary zf-publish-now" type="button" onClick={publish} disabled={Boolean(busy) || !status?.connected}>{busy === 'publish' ? <LoaderCircle className="animate-spin" size={14} /> : <Send size={14} />} Одоо нийтлэх</button>
      </section>

      <aside className="zf-publish-panel">
        <div className="zf-panel-head"><div><span>Preview</span><h2>Постын харагдац</h2></div><MessagesSquare size={19} /></div>
        {previewImage && <img className="zf-post-preview-image" src={previewImage} alt="Нийтлэх зураг" />}
        <div className="zf-post-preview"><pre>{preview}</pre></div>
        {linkPostToMessenger && <div className="zf-chat-link-state"><MessageCircle size={15} /><span><b>{manualTopic === 'car' ? 'Машины чат' : manualTopic === 'loan' ? 'Зээлийн чат' : 'Үндсэн чат'}</b><small>Referral tracking идэвхтэй</small></span></div>}
      </aside>

      <section className="zf-panel zf-post-settings">
        <div className="zf-panel-head"><div><span>Scheduler</span><h2>Өдөр тутмын нийтлэл</h2></div><CalendarClock size={20} /></div>
        <div className="zf-schedule-options">
          <Toggle checked={social.dailyPostEnabled} onChange={value => change('dailyPostEnabled', value)} label="Өдөр бүр автоматаар постлох" detail="Тухайн өдөр амжилттай нийтэлсэн бол давтан постлохгүй" />
          <Toggle checked={social.postUseProductImage} onChange={value => change('postUseProductImage', value)} label="Бүтээгдэхүүний зураг ашиглах" detail="Веб админаас оруулсан эхний зургийг сонгоно" />
          <Toggle checked={social.postLinkToMessenger !== false} onChange={value => change('postLinkToMessenger', value)} label="Автомат постыг чаттай холбох" detail="Пост бүрт тусдаа referral холбоос үүсгэнэ" />
        </div>
        <div className="zf-time-grid"><label><span className="z-label">Постлох цаг</span><input className="z-input" type="time" value={social.postTime} onChange={event => change('postTime', event.target.value)} /></label><label><span className="z-label">Чатын чиглэл</span><select className="z-select" value={social.postDefaultTopic || 'loan'} onChange={event => change('postDefaultTopic', event.target.value)}><option value="loan">Зээлийн чат</option><option value="car">Машины чат</option><option value="general">Үндсэн чат</option></select></label><label><span className="z-label">Цагийн бүс</span><select className="z-select" value={social.postTimezone} onChange={event => change('postTimezone', event.target.value)}><option value="Asia/Ulaanbaatar">Asia/Ulaanbaatar</option></select></label></div>
        <div className="zf-template-list">{social.postTemplates.map((template, index) => <div key={index}><span>Загвар {index + 1}</span><textarea className="z-input" rows={7} value={template} onChange={event => updateTemplate(index, event.target.value)} /><button type="button" title="Загвар устгах" onClick={() => removeTemplate(index)} disabled={social.postTemplates.length <= 1}><Trash2 size={14} /></button></div>)}</div>
        <button className="z-btn z-btn-secondary" type="button" onClick={addTemplate} disabled={social.postTemplates.length >= 12}><Plus size={14} /> Загвар нэмэх</button>
      </section>

      <section className="zf-history">
        <div className="zf-panel-head"><div><span>History</span><h2>Нийтлэлийн түүх</h2></div><Clock3 size={19} /></div>
        <div className="z-table-wrap"><table className="z-table"><thead><tr><th>Огноо</th><th>Эх үүсвэр</th><th>Пост</th><th>Чат</th><th>Төлөв</th><th></th></tr></thead><tbody>{posts.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">Нийтлэлийн түүх хоосон</td></tr>}{posts.map(post => <tr key={post._id}><td>{formatDate(post.publishedAt || post.createdAt)}</td><td>{post.source === 'automatic' ? 'Автомат' : 'Гараар'}</td><td><b>{post.productName || 'Facebook нийтлэл'}</b><span className="zf-history-copy">{post.message}</span></td><td>{post.messengerLinked ? <span className="zf-chat-count"><MessageCircle size={13} />{post.chatStarts || 0}</span> : '-'}</td><td><span className={`z-badge ${post.status === 'published' ? 'z-badge-green' : post.status === 'failed' ? 'z-badge-red' : 'z-badge-yellow'}`}>{post.status === 'published' ? 'Нийтэлсэн' : post.status === 'failed' ? 'Алдаа' : 'Нийтэлж байна'}</span>{post.error && <small className="zf-error-text">{post.error}</small>}</td><td>{post.permalinkUrl && <a href={post.permalinkUrl} target="_blank" rel="noreferrer" title="Пост нээх"><ExternalLink size={15} /></a>}</td></tr>)}</tbody></table></div>
      </section>
    </div>}
  </div>;
}
