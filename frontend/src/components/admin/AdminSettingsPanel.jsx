import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';

// Устгах тохиргоо: loanRequestDeleteEnabled (GET/PUT /api/admin/settings).
export default function AdminSettingsPanel({ apiUrl }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/admin/settings`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) { setEnabled(Boolean(res.data?.loanRequestDeleteEnabled)); setLoaded(true); } })
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
  </div>;
}
