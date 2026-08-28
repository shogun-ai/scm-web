import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  Check,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Palette,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import {
  approveFacebookPostPlan,
  deleteFacebookPostPlan,
  generateFacebookPostPlans,
  getFacebookPostPlans,
  publishFacebookPostPlan,
  unapproveFacebookPostPlan,
  updateAdminWebConfig,
  updateFacebookPostPlan,
  uploadAdminWebImages,
} from '../api';
import { createZentroInfographicFile } from '../facebookInfographic';

const OBJECTIVES = [
  'Зээлийн хүсэлт нэмэгдүүлэх',
  'Бүтээгдэхүүний нөхцөл тайлбарлах',
  'Брэндийн итгэлцэл нэмэгдүүлэх',
  'Messenger яриа эхлүүлэх',
];

const AUDIENCES = [
  'Автомашин эзэмшигчид',
  'Шуурхай санхүүжилт хэрэгтэй иргэд',
  'Жижиг бизнес эрхлэгчид',
  'Орлого нотлоход хүндрэлтэй харилцагчид',
  'Бүх боломжит харилцагч',
];

const STYLES = [
  { value: 'professional', label: 'Мэргэжлийн' },
  { value: 'direct', label: 'Шууд' },
  { value: 'educational', label: 'Тайлбарласан' },
];

const VISUALS = [
  { value: 'mixed', label: 'Хосолсон' },
  { value: 'photo', label: 'Зураг' },
  { value: 'infographic', label: 'Инфографик' },
];

const STATUS_LABELS = {
  draft: 'Засварлаж байна',
  approved: 'Баталсан',
  publishing: 'Нийтэлж байна',
  published: 'Нийтэлсэн',
  failed: 'Алдаа',
};

function ulaanbaatarDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function planPayload(plan) {
  return {
    title: plan.title,
    message: plan.message,
    visualHeadline: plan.visualHeadline,
    visualSubheadline: plan.visualSubheadline,
    imageUrls: plan.imageUrls || [],
    scheduledTime: plan.scheduledTime,
    visualType: plan.visualType,
    topic: plan.topic,
    ctaType: plan.ctaType,
    listingActive: plan.listingActive,
    productIndex: plan.productIndex,
  };
}

export default function FacebookDailyPlanner({
  config,
  social,
  selectedTemplateIndex,
  onSocialChange,
  onNotice,
  onPublished,
}) {
  const today = useMemo(ulaanbaatarDateKey, []);
  const [dateKey, setDateKey] = useState(today);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  const [brief, setBrief] = useState({
    subject: '',
    objective: OBJECTIVES[0],
    audience: AUDIENCES[0],
    requirements: '',
    productIndex: 0,
    topic: 'loan',
    contentStyle: 'professional',
    visualType: 'mixed',
  });

  const notify = useCallback((type, text, url = '') => onNotice?.({ type, text, url }), [onNotice]);
  const loadPlans = useCallback(async selectedDate => {
    setBusy('load');
    try {
      setPlans(await getFacebookPostPlans(selectedDate));
    } catch (error) {
      notify('error', error.response?.data?.message || 'Өдрийн постын төлөвлөгөөг уншиж чадсангүй.');
    } finally {
      setBusy('');
    }
  }, [notify]);

  useEffect(() => { loadPlans(dateKey); }, [dateKey, loadPlans]);

  const updateLocal = (id, key, value) => {
    setPlans(current => current.map(plan => plan._id === id ? { ...plan, [key]: value } : plan));
  };

  const generate = async () => {
    setBusy('generate');
    try {
      const result = await generateFacebookPostPlans({
        ...brief,
        dateKey,
        templateIndex: selectedTemplateIndex,
        ctaType: social.postCtaType || 'MESSAGE_PAGE',
        listingActive: brief.topic !== 'general',
      });
      setPlans(result.plans || []);
      notify(result.warning ? 'warning' : 'success', result.warning || `${dateKey}-ны 3 пост бэлтгэгдлээ. Текст, зураг, цагийг шалгаад батална уу.`);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Өдрийн 3 пост үүсгэж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const savePlan = async (plan, quiet = false) => {
    setBusy(`save-${plan._id}`);
    try {
      const updated = await updateFacebookPostPlan(plan._id, planPayload(plan));
      setPlans(current => current.map(item => item._id === updated._id ? updated : item));
      if (!quiet) notify('success', `${plan.slot}-р постын засварыг хадгаллаа.`);
      return updated;
    } catch (error) {
      notify('error', error.response?.data?.message || 'Постын засварыг хадгалж чадсангүй.');
      throw error;
    } finally {
      setBusy('');
    }
  };

  const enableScheduler = async () => {
    if (social.dailyPostEnabled) return;
    const nextSocial = { ...social, dailyPostEnabled: true };
    await updateAdminWebConfig({ social: nextSocial });
    onSocialChange?.(nextSocial);
  };

  const approve = async plan => {
    setBusy(`approve-${plan._id}`);
    try {
      const saved = await updateFacebookPostPlan(plan._id, planPayload(plan));
      await enableScheduler();
      const approved = await approveFacebookPostPlan(saved._id, saved.scheduledTime);
      setPlans(current => current.map(item => item._id === approved._id ? approved : item));
      notify('success', `${approved.slot}-р пост ${approved.scheduledTime}-д автоматаар нийтлэгдэхээр батлагдлаа.`);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Постыг баталж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const unapprove = async plan => {
    setBusy(`unapprove-${plan._id}`);
    try {
      const updated = await unapproveFacebookPostPlan(plan._id);
      setPlans(current => current.map(item => item._id === updated._id ? updated : item));
      notify('success', `${updated.slot}-р постыг засварын төлөвт буцаалаа.`);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Батлалыг цуцалж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const publishNow = async plan => {
    if (!window.confirm(`${plan.slot}-р постыг яг одоо Facebook дээр нийтлэх үү?`)) return;
    setBusy(`publish-${plan._id}`);
    try {
      await updateFacebookPostPlan(plan._id, planPayload(plan));
      const result = await publishFacebookPostPlan(plan._id);
      setPlans(current => current.map(item => item._id === result.plan._id ? result.plan : item));
      notify('success', 'Facebook пост амжилттай нийтлэгдлээ.', result.post?.permalinkUrl || '');
      onPublished?.(result.post);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Постыг нийтэлж чадсангүй.');
      await loadPlans(dateKey);
    } finally {
      setBusy('');
    }
  };

  const cancelPlan = async plan => {
    if (!window.confirm(`${plan.slot}-р төлөвлөсөн постыг цуцлах уу?`)) return;
    setBusy(`delete-${plan._id}`);
    try {
      await deleteFacebookPostPlan(plan._id);
      setPlans(current => current.filter(item => item._id !== plan._id));
      notify('success', 'Төлөвлөсөн постыг цуцаллаа.');
    } catch (error) {
      notify('error', error.response?.data?.message || 'Төлөвлөсөн постыг цуцалж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const uploadImage = async (plan, files) => {
    const selected = Array.from(files || []).slice(0, Math.max(0, 5 - (plan.imageUrls?.length || 0)));
    if (!selected.length) return;
    setBusy(`image-${plan._id}`);
    try {
      const result = await uploadAdminWebImages(selected);
      const imageUrls = [...new Set([...(plan.imageUrls || []), ...(result.images || []).map(image => image.url)])].filter(Boolean).slice(0, 5);
      const updated = await updateFacebookPostPlan(plan._id, { imageUrls, visualType: 'photo' });
      setPlans(current => current.map(item => item._id === updated._id ? updated : item));
      notify('success', `${updated.slot}-р постод зураг нэмлээ.`);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Постын зураг оруулж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const generateInfographic = async plan => {
    setBusy(`infographic-${plan._id}`);
    try {
      const file = await createZentroInfographicFile(plan, config);
      const uploaded = await uploadAdminWebImages([file]);
      const imageUrl = uploaded.images?.[0]?.url;
      if (!imageUrl) throw new Error('Инфографикийн URL буцаж ирсэнгүй.');
      const updated = await updateFacebookPostPlan(plan._id, { imageUrls: [imageUrl], visualType: 'infographic' });
      setPlans(current => current.map(item => item._id === updated._id ? updated : item));
      notify('success', `${updated.slot}-р постын инфографик бэлэн боллоо.`);
    } catch (error) {
      notify('error', error.response?.data?.message || error.message || 'Инфографик үүсгэж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const removeImage = async (plan, imageUrl) => {
    setBusy(`image-${plan._id}`);
    try {
      const updated = await updateFacebookPostPlan(plan._id, { imageUrls: (plan.imageUrls || []).filter(url => url !== imageUrl) });
      setPlans(current => current.map(item => item._id === updated._id ? updated : item));
    } catch (error) {
      notify('error', error.response?.data?.message || 'Зургийг хасаж чадсангүй.');
    } finally {
      setBusy('');
    }
  };

  const approvedCount = plans.filter(plan => ['approved', 'publishing', 'published'].includes(plan.status)).length;
  const schedulerLabel = social.dailyPostEnabled ? 'Автомат нийтлэл идэвхтэй' : 'Эхний батлалтаар автомат нийтлэл идэвхжинэ';

  return <section className="zf-daily-planner">
    <header className="zf-planner-head">
      <div><span>Morning approval</span><h2>Өдрийн 3 постын төлөвлөгөө</h2><p>AI-аар бэлтгээд, ажилтан хянаж баталсны дараа сонгосон цагт нийтэлнэ.</p></div>
      <div className="zf-approval-meter"><b>{approvedCount}/3</b><span>баталсан</span></div>
    </header>

    <div className="zf-planner-toolbar">
      <label><span className="z-label">Төлөвлөх өдөр</span><input className="z-input" type="date" min={today} value={dateKey} onChange={event => setDateKey(event.target.value)} /></label>
      <div className={`zf-scheduler-state ${social.dailyPostEnabled ? 'active' : ''}`}><CalendarCheck size={17} /><span><b>{schedulerLabel}</b><small>Asia/Ulaanbaatar · минут тутам шалгана</small></span></div>
      <button className="z-btn z-btn-secondary" type="button" onClick={() => loadPlans(dateKey)} disabled={Boolean(busy)} title="Төлөвлөгөө шинэчлэх">{busy === 'load' ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />} Шинэчлэх</button>
    </div>

    <div className="zf-brief-grid">
      <label className="wide"><span className="z-label">Сэдэв</span><input className="z-input" value={brief.subject} onChange={event => setBrief(current => ({ ...current, subject: event.target.value }))} placeholder="Жишээ: Машинаа унаад авах зээлийн давуу тал" /></label>
      <label><span className="z-label">Зорилго</span><select className="z-select" value={brief.objective} onChange={event => setBrief(current => ({ ...current, objective: event.target.value }))}>{OBJECTIVES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="z-label">Зорилтот хүрээ</span><select className="z-select" value={brief.audience} onChange={event => setBrief(current => ({ ...current, audience: event.target.value }))}>{AUDIENCES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="z-label">Бүтээгдэхүүн</span><select className="z-select" value={brief.productIndex} onChange={event => setBrief(current => ({ ...current, productIndex: Number(event.target.value) }))}>{(config?.products || []).map((product, index) => <option value={index} key={`${product.name}-${index}`}>{product.name}</option>)}</select></label>
      <label><span className="z-label">Чатын чиглэл</span><select className="z-select" value={brief.topic} onChange={event => setBrief(current => ({ ...current, topic: event.target.value }))}><option value="loan">Зээлийн чат</option><option value="car">Машины чат</option><option value="general">Ерөнхий чат</option></select></label>
      <label className="wide"><span className="z-label">Заавал тусгах шаардлага</span><textarea className="z-input" rows={3} value={brief.requirements} onChange={event => setBrief(current => ({ ...current, requirements: event.target.value }))} placeholder="Жишээ: Орлого нотлохгүй гэдгийг зөвхөн машин байршуулах бүтээгдэхүүнд ашиглах; 18 нас хүрсэн байх" /></label>
    </div>

    <div className="zf-brief-modes">
      <div><span>Өнгө аяс</span>{STYLES.map(option => <button type="button" className={brief.contentStyle === option.value ? 'active' : ''} onClick={() => setBrief(current => ({ ...current, contentStyle: option.value }))} key={option.value}>{option.label}</button>)}</div>
      <div><span>Дүрслэл</span>{VISUALS.map(option => <button type="button" className={brief.visualType === option.value ? 'active' : ''} onClick={() => setBrief(current => ({ ...current, visualType: option.value }))} key={option.value}>{option.label}</button>)}</div>
      <button className="z-btn z-btn-primary" type="button" onClick={generate} disabled={Boolean(busy) || !brief.subject.trim()}>{busy === 'generate' ? <LoaderCircle className="animate-spin" size={15} /> : <Sparkles size={15} />} 3 пост бэлтгэх</button>
    </div>

    {plans.length === 0 ? <div className="zf-plan-empty"><Sparkles size={25} /><b>Өдрийн төлөвлөгөө хоосон байна</b><span>Сэдвээ оруулаад 3 пост бэлтгэнэ.</span></div> : <div className="zf-plan-list">
      {plans.map(plan => {
        const locked = ['publishing', 'published'].includes(plan.status);
        const planBusy = busy.endsWith(plan._id);
        const infographicMissing = plan.visualType === 'infographic' && !(plan.imageUrls || []).length;
        return <article className={`zf-plan-item status-${plan.status}`} key={plan._id}>
          <header><div className="zf-plan-slot">{String(plan.slot).padStart(2, '0')}</div><div><input value={plan.title || ''} onChange={event => updateLocal(plan._id, 'title', event.target.value)} disabled={locked} aria-label={`${plan.slot}-р постын гарчиг`} /><span>{plan.productName || 'Facebook нийтлэл'} · {plan.generatedBy === 'ai' ? 'AI' : 'Загвар'}</span></div><span className={`zf-plan-status ${plan.status}`}>{STATUS_LABELS[plan.status] || plan.status}</span></header>
          <div className="zf-plan-body">
            <div className="zf-plan-copy">
              <label><span>Постын текст</span><textarea rows={11} value={plan.message || ''} onChange={event => updateLocal(plan._id, 'message', event.target.value)} disabled={locked} /></label>
              <div className="zf-plan-visual-copy"><label><span>Зургийн гарчиг</span><input value={plan.visualHeadline || ''} onChange={event => updateLocal(plan._id, 'visualHeadline', event.target.value)} disabled={locked} /></label><label><span>Дэд тайлбар</span><input value={plan.visualSubheadline || ''} onChange={event => updateLocal(plan._id, 'visualSubheadline', event.target.value)} disabled={locked} /></label></div>
            </div>
            <aside className="zf-plan-media">
              {(plan.imageUrls || []).length > 0 ? <div className="zf-plan-images">{plan.imageUrls.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`${plan.slot}-р постын зураг ${index + 1}`} />{!locked && <button type="button" onClick={() => removeImage(plan, url)} title="Зураг хасах"><Trash2 size={13} /></button>}</div>)}</div> : <div className="zf-plan-image-empty"><ImagePlus size={24} /><span>Зураг сонгоогүй</span></div>}
              {!locked && <div className="zf-plan-media-actions"><label className="z-btn z-btn-secondary"><Upload size={14} /> Зураг<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { uploadImage(plan, event.target.files); event.target.value = ''; }} /></label><button className="z-btn z-btn-secondary" type="button" onClick={() => generateInfographic(plan)} disabled={Boolean(busy)}>{busy === `infographic-${plan._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Palette size={14} />} Инфографик</button></div>}
              <label className="zf-plan-time"><Clock3 size={15} /><span><b>Нийтлэх цаг</b><small>{dateKey} · Улаанбаатар</small></span><input type="time" value={plan.scheduledTime || ''} onChange={event => updateLocal(plan._id, 'scheduledTime', event.target.value)} disabled={locked} /></label>
              {plan.generationWarning && <small className="zf-plan-warning"><AlertCircle size={13} />{plan.generationWarning}</small>}
              {infographicMissing && <small className="zf-plan-warning"><AlertCircle size={13} />Батлахын өмнө инфографик зураг үүсгэнэ үү.</small>}
              {plan.error && <small className="zf-plan-warning"><AlertCircle size={13} />{plan.error}</small>}
            </aside>
          </div>
          {!locked && <footer>
            <button className="z-btn z-btn-secondary" type="button" onClick={() => savePlan(plan)} disabled={Boolean(busy)}>{busy === `save-${plan._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} Хадгалах</button>
            {plan.status === 'approved'
              ? <button className="z-btn z-btn-secondary" type="button" onClick={() => unapprove(plan)} disabled={Boolean(busy)}><Undo2 size={14} /> Батлал цуцлах</button>
              : <button className="z-btn z-btn-primary" type="button" onClick={() => approve(plan)} disabled={Boolean(busy) || !plan.message?.trim() || !plan.scheduledTime || infographicMissing} title={infographicMissing ? 'Эхлээд инфографик зураг үүсгэнэ үү' : 'Сонгосон цагт автоматаар нийтлэхээр батлах'}>{busy === `approve-${plan._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />} Батлах</button>}
            <button className="z-btn z-btn-secondary" type="button" onClick={() => publishNow(plan)} disabled={Boolean(busy)}>{busy === `publish-${plan._id}` ? <LoaderCircle className="animate-spin" size={14} /> : <Play size={14} />} Одоо нийтлэх</button>
            <button className="zf-plan-delete" type="button" onClick={() => cancelPlan(plan)} disabled={Boolean(busy)} title="Төлөвлөгөөнөөс хасах">{planBusy ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>
          </footer>}
        </article>;
      })}
    </div>}
  </section>;
}
