import { useEffect, useState } from 'react';
import { getAdminWebConfig, updateAdminWebConfig } from '../api';
import { ImageUp, Save } from 'lucide-react';

const emptyProduct = { name: '', rate: '', term: '', amount: '', description: '', image: '' };
const emptyStep = { id: '', title: '', fields: [] };

export default function WebAdmin() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoName, setLogoName] = useState('');

  useEffect(() => { getAdminWebConfig().then(setCfg); }, []);
  if (!cfg) return <div className="text-slate-400 text-sm font-semibold p-6">Уншиж байна...</div>;

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const setProduct = (i, k, v) => set('products', (cfg.products || []).map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const setStep = (i, k, v) => set('formFlow', cfg.formFlow.map((s, idx) => idx === i ? { ...s, [k]: k === 'fields' ? v.split(',').map(x => x.trim()).filter(Boolean) : v } : s));
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

  return <div className="za-page flex flex-col gap-4">
    <div className="za-hero"><div><p>Public website</p><h1>Веб админ</h1><span>Нүүр хуудасны текст, зураг, лого, зээлийн нөхцөл, хүсэлтийн алхмыг удирдана.</span></div><button className="zp-form-button" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Хадгалж байна...' : 'Хадгалах'}</button></div>

    <div className="za-card za-logo-card">
      <div><h2>Лого</h2><p>PNG, JPG, SVG файл оруулж болно. Хадгалах дарахад public веб болон нэвтрэх хэсэгт харагдана.</p></div>
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
      <div className="flex justify-between items-center mb-3"><h2>Зээлийн бүтээгдэхүүн</h2><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => set('products', [...(cfg.products || []), emptyProduct])}>Нэмэх</button></div>
      <div className="grid md:grid-cols-2 gap-3">
        {(cfg.products || []).map((p, i) => <div className="za-subcard" key={i}>
          <input className="z-input" placeholder="Нэр" value={p.name || ''} onChange={e => setProduct(i, 'name', e.target.value)} />
          <div className="grid grid-cols-3 gap-2"><input className="z-input" placeholder="Хүү" value={p.rate || ''} onChange={e => setProduct(i, 'rate', e.target.value)} /><input className="z-input" placeholder="Хугацаа" value={p.term || ''} onChange={e => setProduct(i, 'term', e.target.value)} /><input className="z-input" placeholder="Дүн" value={p.amount || ''} onChange={e => setProduct(i, 'amount', e.target.value)} /></div>
          <textarea className="z-input" placeholder="Тайлбар" value={p.description || ''} onChange={e => setProduct(i, 'description', e.target.value)} />
          <input className="z-input" placeholder="Урсдаг хэсгийн зураг URL" value={p.image || ''} onChange={e => setProduct(i, 'image', e.target.value)} />
          <div className="za-product-image-row">
            <div className="za-product-image-preview">{p.image ? <img src={p.image} alt="Product preview" /> : <span>Зураг</span>}</div>
            <label className="za-upload"><ImageUp size={16} /> Зураг сонгох<input type="file" accept="image/*" onChange={e => uploadProductImage(i, e.target.files?.[0])} /></label>
            {p.image && <button className="z-btn z-btn-danger z-btn-sm" onClick={() => setProduct(i, 'image', '')}>Арилгах</button>}
          </div>
          <button className="z-btn z-btn-danger z-btn-sm self-start" onClick={() => set('products', cfg.products.filter((_, idx) => idx !== i))}>Устгах</button>
        </div>)}
      </div>
    </div>

    <div className="za-card"><div className="flex justify-between items-center mb-3"><h2>Хүсэлтийн алхам, асуулт</h2><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => set('formFlow', [...(cfg.formFlow || []), emptyStep])}>Алхам нэмэх</button></div><div className="flex flex-col gap-2">{(cfg.formFlow || []).map((s, i) => <div className="grid md:grid-cols-[1fr_1fr_2fr_auto] gap-2" key={i}><input className="z-input" placeholder="ID" value={s.id || ''} onChange={e => setStep(i, 'id', e.target.value)} /><input className="z-input" placeholder="Гарчиг" value={s.title || ''} onChange={e => setStep(i, 'title', e.target.value)} /><input className="z-input" placeholder="fields comma separated" value={(s.fields || []).join(', ')} onChange={e => setStep(i, 'fields', e.target.value)} /><button className="z-btn z-btn-danger z-btn-sm" onClick={() => set('formFlow', cfg.formFlow.filter((_, idx) => idx !== i))}>Устгах</button></div>)}</div></div>
  </div>;
}

const labels = { brandName:'Брэнд нэр', tagline:'Tagline', heroTitle:'Hero гарчиг', phone:'Утас', email:'И-мэйл', address:'Хаяг', heroImage:'Hero зураг URL' };
