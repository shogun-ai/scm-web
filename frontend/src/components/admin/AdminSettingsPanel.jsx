import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import AutomationSettings from './AutomationSettings';

// Устгах тохиргоо: loanRequestDeleteEnabled (GET/PUT /api/admin/settings).
export default function AdminSettingsPanel({ apiUrl }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [pixelSaving, setPixelSaving] = useState(false);
  const [pixelError, setPixelError] = useState('');
  const [pixelMessage, setPixelMessage] = useState('');

  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/admin/settings`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) { setEnabled(Boolean(res.data?.loanRequestDeleteEnabled)); setPixelId(res.data?.metaPixelId ? String(res.data.metaPixelId) : ''); setLoaded(true); } })
      .catch(err => { if (alive) setError(err.response?.data?.message || 'Тохиргоо ачаалж чадсангүй.'); });
    return () => { alive = false; };
  }, [apiUrl]);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await axios.put(`${apiUrl}/api/admin/settings`, { loanRequestDeleteEnabled: next }, { headers: getAuthHeaders(), timeout: 15000 });
      setEnabled(typeof res.data?.loanRequestDeleteEnabled === 'boolean' ? res.data.loanRequestDeleteEnabled : next);
      setMessage(next ? 'Хүсэлт устгах боломж асалаа.' : 'Хүсэлт устгах боломж унтраалаа.');
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };

  const savePixel = async event => {
    event.preventDefault();
    const value = pixelId.trim();
    setPixelError(''); setPixelMessage('');
    if (value && !/^\d{10,20}$/.test(value)) { setPixelError('Pixel ID нь зөвхөн 10–20 оронтой тоо байна.'); return; }
    setPixelSaving(true);
    try {
      await axios.put(`${apiUrl}/api/admin/settings`, { metaPixelId: value }, { headers: getAuthHeaders(), timeout: 15000 });
      setPixelMessage(value ? 'Meta Pixel ID хадгалагдлаа.' : 'Meta Pixel ID устгагдлаа.');
    } catch (err) { setPixelError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setPixelSaving(false); }
  };

  return <div className="max-w-2xl space-y-6 animate-fade-in">
    <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><Trash2 size={24} aria-hidden="true" />Устгах тохиргоо</h2>
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="del-switch-label" className="font-bold text-slate-800">Зээлийн хүсэлт устгахыг зөвшөөрөх</p>
          <p id="del-switch-help" className="mt-1 text-sm text-slate-600">Асаалттай үед зөвхөн админ хүсэлтийг жагсаалт болон дэлгэрэнгүйгээс устгах боломжтой. Анхдагчаар унтраалттай.</p>
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-labelledby="del-switch-label" aria-describedby="del-switch-help" disabled={!loaded || saving} onClick={toggle} className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-red-600' : 'bg-slate-300'}`}>
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>
      {!loaded && !error && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <p role="note" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Устгасан хүсэлт болон түүний файлууд бүрмөсөн устгагдана, сэргээх боломжгүй. Ашиглаж дууссаны дараа унтрааж орхино уу.</p>
    </section>
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <form onSubmit={savePixel} noValidate>
        <label htmlFor="meta-pixel-id" className="font-bold text-slate-800">Meta Pixel ID</label>
        <p id="meta-pixel-help" className="mt-1 text-sm text-slate-600">Сайтын PageView болон Lead (хүсэлт илгээсэн) үйл явдлыг хэмжинэ. Хоосон бол Pixel ачаалагдахгүй.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input id="meta-pixel-id" inputMode="numeric" autoComplete="off" value={pixelId} onChange={event => setPixelId(event.target.value)} disabled={!loaded || pixelSaving} aria-describedby="meta-pixel-help" aria-invalid={Boolean(pixelError)} placeholder="1234567890123456" className="min-h-11 w-64 rounded-xl border border-slate-300 px-3 text-sm tabular-nums focus:border-[#003B5C] focus:outline-none focus:ring-2" />
          <button type="submit" disabled={!loaded || pixelSaving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{pixelSaving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Хадгалах</button>
        </div>
        {pixelMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{pixelMessage}</p>}
        {pixelError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{pixelError}</p>}
      </form>
    </section>
    <AutomationSettings apiUrl={apiUrl} />
  </div>;
}
