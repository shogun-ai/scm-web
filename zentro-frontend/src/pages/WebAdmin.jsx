import { useEffect, useState } from 'react';
import { getAdminWebConfig, updateAdminWebConfig } from '../api';
import { ImageUp, MousePointer2, Plus, Save, Trash2 } from 'lucide-react';

const emptyProduct = { name: '', flowTitle: '', rate: '', term: '', amount: '', description: '', image: '' };
const emptyStep = { id: '', title: '', fields: [] };
const defaultWidget = () => ({ id: `widget-${Date.now()}`, type: 'text', text: 'Шинэ текст', src: '', x: 8, y: 12, w: 32, h: 18, size: 22 });

export default function WebAdmin() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [drag, setDrag] = useState(null);

  useEffect(() => { getAdminWebConfig().then(data => setCfg({ ...data, webWidgets: data.webWidgets || [] })); }, []);
  if (!cfg) return <div className="text-slate-400 text-sm font-semibold p-6">Уншиж байна...</div>;

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const setProduct = (i, k, v) => set('products', (cfg.products || []).map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const setWidget = (i, patch) => set('webWidgets', (cfg.webWidgets || []).map((w, idx) => idx === i ? { ...w, ...patch } : w));
  const setStep = (i, k, v) => set('formFlow', (cfg.formFlow || []).map((s, idx) => idx === i ? { ...s, [k]: k === 'fields' ? v.split(',').map(x => x.trim()).filter(Boolean) : v } : s));
  const save = async () => { setSaving(true); try { setCfg(await updateAdminWebConfig(cfg)); } finally { setSaving(false); } };

  const readImage = (file, onLoad) => {
    if (!file) return;
    if (file.size > 1500000) { alert('Зураг файл 1.5MB-аас бага байх хэрэгтэй.'); return; }
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result);
    reader.readAsDataURL(file);
  };
  const uploadLogo = (file) => readImage(file, result => { set('logoUrl', result); setLogoName(file.name); });
  const uploadProductImage = (index, file) => readImage(file, result => setProduct(index, 'image', result));
  const uploadWidgetImage = (index, file) => readImage(file, result => setWidget(index, { src: result, type: 'image' }));

  const startDrag = (e, index, mode) => {
    const stage = e.currentTarget.closest('.za-widget-canvas').getBoundingClientRect();
    const widget = cfg.webWidgets[index];
    setDrag({ index, mode, startX: e.clientX, startY: e.clientY, stageW: stage.width, stageH: stage.height, widget: { ...widget } });
    e.preventDefault();
  };
  const moveDrag = (e) => {
    if (!drag) return;
    const dx = ((e.clientX - drag.startX) / drag.stageW) * 100;
    const dy = ((e.clientY - drag.startY) / drag.stageH) * 100;
    if (drag.mode === 'resize') {
      setWidget(drag.index, { w: Math.min(92, Math.max(8, drag.widget.w + dx)), h: Math.min(80, Math.max(8, drag.widget.h + dy)) });
    } else {
      setWidget(drag.index, { x: Math.min(96 - drag.widget.w, Math.max(0, drag.widget.x + dx)), y: Math.min(96 - drag.widget.h, Math.max(0, drag.widget.y + dy)) });
    }
  };

  return <div className="za-page flex flex-col gap-4" onMouseMove={moveDrag} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
    <div className="za-hero"><div><p>Public website</p><h1>Веб админ</h1><span>Нүүр хуудасны текст, зураг, лого, зээлийн нөхцөл, хүсэлтийн алхам, widget байрлалыг удирдана.</span></div><button className="zp-form-button" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Хадгалж байна...' : 'Хадгалах'}</button></div>

    <div className="za-card za-logo-card">
      <div><h2>Лого</h2><p>PNG, JPG, SVG файл оруулж болно. Лого өөрийн харьцаагаар харагдана.</p></div>
      <div className="za-logo-preview">{cfg.logoUrl ? <img src={cfg.logoUrl} alt="Logo preview" /> : <span>Z</span>}</div>
      <label className="za-upload"><ImageUp size={16} /> Лого файл сонгох<input type="file" accept="image/*,.svg" onChange={e => uploadLogo(e.target.files?.[0])} /></label>
      {logoName && <p className="text-xs font-bold text-slate-500">{logoName}</p>}
      {cfg.logoUrl && <button className="z-btn z-btn-danger z-btn-sm" onClick={() => set('logoUrl', '')}>Лого арилгах</button>}
    </div>

    <div className="za-card grid md:grid-cols-2 gap-3">
      {['brandName','tagline','heroTitle','phone','email','address','heroImage'].map(k => <div key={k}><label className="z-label">{labels[k]}</label><input className="z-input" value={cfg[k] || ''} onChange={e => set(k, e.target.value)} /></div>)}
      <div className="md:col-span-2"><label className="z-label">Hero text</label><textarea className="z-input" rows={3} value={cfg.heroText || ''} onChange={e => set('heroText', e.target.value)} /></div>
    </div>

    <div className="za-card">
      <div className="za-section-tools"><div><h2>Widget editor</h2><p>Доорх canvas дээр widget-ээ чирж байрлуулаад, баруун доод булангаас нь хэмжээг өөрчилнө.</p></div><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => set('webWidgets', [...(cfg.webWidgets || []), defaultWidget()])}><Plus size={14}/> Widget нэмэх</button></div>
      <div className="za-widget-canvas">
        {(cfg.webWidgets || []).map((w, i) => <div className={`za-widget ${w.type === 'button' ? 'button' : ''}`} key={w.id || i} style={{ left: `${w.x}%`, top: `${w.y}%`, width: `${w.w}%`, height: `${w.h}%`, fontSize: `${w.size || 18}px` }} onMouseDown={e => startDrag(e, i, 'move')}>
          {w.type === 'image' && w.src ? <img src={w.src} alt="Widget" /> : <span>{w.text}</span>}
          <i onMouseDown={e => startDrag(e, i, 'resize')}><MousePointer2 size={12}/></i>
        </div>)}
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        {(cfg.webWidgets || []).map((w, i) => <div className="za-subcard" key={`form-${w.id || i}`}>
          <div className="grid grid-cols-[1fr_auto] gap-2"><select className="z-input" value={w.type || 'text'} onChange={e => setWidget(i, { type: e.target.value })}><option value="text">Text</option><option value="button">Button</option><option value="image">Image</option></select><button className="z-btn z-btn-danger z-btn-sm" onClick={() => set('webWidgets', cfg.webWidgets.filter((_, idx) => idx !== i))}><Trash2 size={13}/></button></div>
          <input className="z-input" placeholder="Текст" value={w.text || ''} onChange={e => setWidget(i, { text: e.target.value })} />
          <div className="grid grid-cols-4 gap-2"><input className="z-input" type="number" placeholder="X" value={w.x} onChange={e => setWidget(i, { x: Number(e.target.value) })} /><input className="z-input" type="number" placeholder="Y" value={w.y} onChange={e => setWidget(i, { y: Number(e.target.value) })} /><input className="z-input" type="number" placeholder="W" value={w.w} onChange={e => setWidget(i, { w: Number(e.target.value) })} /><input className="z-input" type="number" placeholder="H" value={w.h} onChange={e => setWidget(i, { h: Number(e.target.value) })} /></div>
          <input className="z-input" type="number" placeholder="Font size" value={w.size || 18} onChange={e => setWidget(i, { size: Number(e.target.value) })} />
          <input className="z-input" placeholder="Зураг URL" value={w.src || ''} onChange={e => setWidget(i, { src: e.target.value })} />
          <label className="za-upload"><ImageUp size={16} /> Widget зураг<input type="file" accept="image/*" onChange={e => uploadWidgetImage(i, e.target.files?.[0])} /></label>
        </div>)}
      </div>
    </div>

    <div className="za-card">
      <div className="flex justify-between items-center mb-3"><h2>Зээлийн бүтээгдэхүүн</h2><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => set('products', [...(cfg.products || []), emptyProduct])}>Нэмэх</button></div>
      <div className="grid md:grid-cols-2 gap-3">
        {(cfg.products || []).map((p, i) => <div className="za-subcard" key={i}>
          <input className="z-input" placeholder="Нэр" value={p.name || ''} onChange={e => setProduct(i, 'name', e.target.value)} />
          <input className="z-input" placeholder="Урсах гарчиг: Машинаа унаад зээлээ ав" value={p.flowTitle || ''} onChange={e => setProduct(i, 'flowTitle', e.target.value)} />
          <div className="grid grid-cols-3 gap-2"><input className="z-input" placeholder="Хүү" value={p.rate || ''} onChange={e => setProduct(i, 'rate', e.target.value)} /><input className="z-input" placeholder="Хугацаа" value={p.term || ''} onChange={e => setProduct(i, 'term', e.target.value)} /><input className="z-input" placeholder="Дүн" value={p.amount || ''} onChange={e => setProduct(i, 'amount', e.target.value)} /></div>
          <textarea className="z-input" placeholder="Тайлбар" value={p.description || ''} onChange={e => setProduct(i, 'description', e.target.value)} />
          <input className="z-input" placeholder="Урсдаг хэсгийн зураг URL" value={p.image || ''} onChange={e => setProduct(i, 'image', e.target.value)} />
          <div className="za-product-image-row"><div className="za-product-image-preview">{p.image ? <img src={p.image} alt="Product preview" /> : <span>Зураг</span>}</div><label className="za-upload"><ImageUp size={16} /> Зураг сонгох<input type="file" accept="image/*" onChange={e => uploadProductImage(i, e.target.files?.[0])} /></label>{p.image && <button className="z-btn z-btn-danger z-btn-sm" onClick={() => setProduct(i, 'image', '')}>Арилгах</button>}</div>
          <button className="z-btn z-btn-danger z-btn-sm self-start" onClick={() => set('products', cfg.products.filter((_, idx) => idx !== i))}>Устгах</button>
        </div>)}
      </div>
    </div>

    <div className="za-card"><div className="flex justify-between items-center mb-3"><h2>Хүсэлтийн алхам, асуулт</h2><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => set('formFlow', [...(cfg.formFlow || []), emptyStep])}>Алхам нэмэх</button></div><div className="flex flex-col gap-2">{(cfg.formFlow || []).map((s, i) => <div className="grid md:grid-cols-[1fr_1fr_2fr_auto] gap-2" key={i}><input className="z-input" placeholder="ID" value={s.id || ''} onChange={e => setStep(i, 'id', e.target.value)} /><input className="z-input" placeholder="Гарчиг" value={s.title || ''} onChange={e => setStep(i, 'title', e.target.value)} /><input className="z-input" placeholder="fields comma separated" value={(s.fields || []).join(', ')} onChange={e => setStep(i, 'fields', e.target.value)} /><button className="z-btn z-btn-danger z-btn-sm" onClick={() => set('formFlow', cfg.formFlow.filter((_, idx) => idx !== i))}>Устгах</button></div>)}</div></div>
  </div>;
}

const labels = { brandName:'Брэнд нэр', tagline:'Tagline', heroTitle:'Hero гарчиг', phone:'Утас', email:'И-мэйл', address:'Хаяг', heroImage:'Hero зураг URL' };