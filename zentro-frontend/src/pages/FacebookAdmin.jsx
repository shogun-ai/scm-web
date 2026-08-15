import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import {
  getAdminWebConfig,
  getFacebookPostHistory,
  getFacebookStatus,
  publishFacebookPost,
  subscribeFacebookPage,
  testFacebookConnection,
  updateAdminWebConfig,
} from '../api';
import { DEFAULT_SOCIAL, normalizeSiteConfig } from '../siteDefaults';

const VIEWS = [
  { id: 'connection', label: 'Холболт', icon: Link2 },
  { id: 'bot', label: 'Чатбот', icon: Bot },
  { id: 'posts', label: 'Өдөр тутмын пост', icon: CalendarClock },
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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [manualMessage, setManualMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rawConfig, connection, history] = await Promise.all([
        getAdminWebConfig(),
        getFacebookStatus(),
        getFacebookPostHistory(),
      ]);
      const normalized = normalizeSiteConfig(rawConfig);
      setConfig(normalized);
      setSocial(normalized.social);
      setStatus(connection);
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
      const post = await publishFacebookPost({ message: manualMessage.trim() });
      setPosts(current => [post, ...current]);
      setManualMessage('');
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

  const preview = useMemo(() => {
    if (!config) return '';
    const product = config.products?.[0] || {};
    return manualMessage || replaceTemplate(social.postTemplates?.[0] || '', {
      product: product.name,
      description: product.description,
      rate: product.rate,
      term: product.term,
      amount: product.amount,
      phone: config.phone,
      website: 'https://zentrocapitalgroup.com',
    });
  }, [config, manualMessage, social.postTemplates]);

  const messengerReady = Boolean(status?.connected && status?.configured);

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
    </div>}

    {view === 'bot' && <div className="zf-grid bot">
      <section className="zf-panel">
        <div className="zf-panel-head"><div><span>Automation</span><h2>Messenger chatbot</h2></div><Bot size={20} /></div>
        <Toggle checked={social.autoReplyEnabled} onChange={value => change('autoReplyEnabled', value)} label="Автомат хариулт" detail="Нөхцөл, холбоо барих мэдээлэл болон түгээмэл асуултад хариулна" />
        <Toggle checked={social.requestIntakeEnabled} onChange={value => change('requestIntakeEnabled', value)} label="Messenger-ээр хүсэлт авах" detail="Хүсэлтийг Facebook эх сурвалжтайгаар CRM-д бүртгэнэ" />
        <label className="z-label">Мэндчилгээ</label>
        <textarea className="z-input" rows={5} value={social.welcomeMessage} onChange={event => change('welcomeMessage', event.target.value)} />
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
      <section className="zf-panel zf-post-settings">
        <div className="zf-panel-head"><div><span>Scheduler</span><h2>Өдөр тутмын нийтлэл</h2></div><CalendarClock size={20} /></div>
        <Toggle checked={social.dailyPostEnabled} onChange={value => change('dailyPostEnabled', value)} label="Өдөр бүр автоматаар постлох" detail="Тухайн өдөр амжилттай нийтэлсэн бол давтан постлохгүй" />
        <Toggle checked={social.postUseProductImage} onChange={value => change('postUseProductImage', value)} label="Бүтээгдэхүүний зураг ашиглах" detail="Веб админаас оруулсан эхний зургийг сонгоно" />
        <div className="zf-time-grid"><label><span className="z-label">Постлох цаг</span><input className="z-input" type="time" value={social.postTime} onChange={event => change('postTime', event.target.value)} /></label><label><span className="z-label">Цагийн бүс</span><select className="z-select" value={social.postTimezone} onChange={event => change('postTimezone', event.target.value)}><option value="Asia/Ulaanbaatar">Asia/Ulaanbaatar</option></select></label></div>
        <div className="zf-template-list">{social.postTemplates.map((template, index) => <div key={index}><span>Загвар {index + 1}</span><textarea className="z-input" rows={7} value={template} onChange={event => updateTemplate(index, event.target.value)} /><button type="button" title="Загвар устгах" onClick={() => removeTemplate(index)} disabled={social.postTemplates.length <= 1}><Trash2 size={14} /></button></div>)}</div>
        <button className="z-btn z-btn-secondary" type="button" onClick={addTemplate} disabled={social.postTemplates.length >= 12}><Plus size={14} /> Загвар нэмэх</button>
      </section>

      <aside className="zf-publish-panel">
        <div className="zf-panel-head"><div><span>Preview</span><h2>Дараагийн пост</h2></div><Send size={19} /></div>
        <div className="zf-post-preview"><pre>{preview}</pre></div>
        <label className="z-label">Гараар нийтлэх текст</label>
        <textarea className="z-input" rows={5} value={manualMessage} onChange={event => setManualMessage(event.target.value)} placeholder="Хоосон бол дээрх автомат загварыг ашиглана" />
        <button className="z-btn z-btn-primary" type="button" onClick={publish} disabled={Boolean(busy) || !status?.connected}>{busy === 'publish' ? <LoaderCircle className="animate-spin" size={14} /> : <Send size={14} />} Одоо постлох</button>
      </aside>

      <section className="zf-history">
        <div className="zf-panel-head"><div><span>History</span><h2>Нийтлэлийн түүх</h2></div><Clock3 size={19} /></div>
        <div className="z-table-wrap"><table className="z-table"><thead><tr><th>Огноо</th><th>Эх үүсвэр</th><th>Пост</th><th>Төлөв</th><th></th></tr></thead><tbody>{posts.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8">Нийтлэлийн түүх хоосон</td></tr>}{posts.map(post => <tr key={post._id}><td>{formatDate(post.publishedAt || post.createdAt)}</td><td>{post.source === 'automatic' ? 'Автомат' : 'Гараар'}</td><td><b>{post.productName || 'Facebook нийтлэл'}</b><span className="zf-history-copy">{post.message}</span></td><td><span className={`z-badge ${post.status === 'published' ? 'z-badge-green' : post.status === 'failed' ? 'z-badge-red' : 'z-badge-yellow'}`}>{post.status === 'published' ? 'Нийтэлсэн' : post.status === 'failed' ? 'Алдаа' : 'Нийтэлж байна'}</span>{post.error && <small className="zf-error-text">{post.error}</small>}</td><td>{post.permalinkUrl && <a href={post.permalinkUrl} target="_blank" rel="noreferrer" title="Пост нээх"><ExternalLink size={15} /></a>}</td></tr>)}</tbody></table></div>
      </section>
    </div>}
  </div>;
}
