import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Send } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';

// D24/D25 тохиргоо: итгэлцлийн нэмэлт материал авто хүсэлт, өдөр тутмын сануулга (+ тест), хуваарилалт.
// GET/PUT /api/admin/settings, POST /api/admin/daily-digest/test.
const DEFAULT_ASSIGNMENT = { loan: { mode: 'manual', staffId: '' }, trust: { mode: 'manual', staffId: '' } };
const KINDS = [
  { key: 'loan', title: 'Зээлийн хүсэлт', note: 'Бүтээгдэхүүн дээр тусгайлан тохируулсан хүлээн авагч (маягтын тохиргоо) энэ тохиргооноос илүү эрэмбэтэй.' },
  { key: 'trust', title: 'Итгэлцлийн хүсэлт', note: 'Автомат горимд шинэ хүсэлт сонгосон ажилтанд хуваарилагдаж, түүнд имэйлээр мэдэгдэнэ.' },
];
const DIGEST_REASONS = { mail_disabled: 'Имэйл илгээх тохиргоо (MAIL_ENABLED) идэвхгүй байна.', no_email: 'Таны имэйл хаяг бүртгэлгүй байна.' };

function Switch({ id, label, help, checked, disabled, onChange }) {
  return <div className="flex items-start justify-between gap-4">
    <div><p id={`${id}-label`} className="font-bold text-slate-800">{label}</p><p id={`${id}-help`} className="mt-1 text-sm text-slate-600">{help}</p></div>
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} disabled={disabled} onClick={onChange} className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>;
}

export default function AutomationSettings({ apiUrl }) {
  const [loaded, setLoaded] = useState(false);
  const [trustAuto, setTrustAuto] = useState(true);
  const [digest, setDigest] = useState(true);
  const [assignment, setAssignment] = useState(DEFAULT_ASSIGNMENT);
  const [staff, setStaff] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/admin/settings`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => {
        if (!alive) return;
        const data = res.data || {};
        setTrustAuto(data.trustAutoDocRequest !== false); setDigest(data.dailyDigestEnabled !== false);
        const read = kind => ({ mode: data.assignment?.[kind]?.mode === 'auto' ? 'auto' : 'manual', staffId: data.assignment?.[kind]?.staffId || '' });
        setAssignment({ loan: read('loan'), trust: read('trust') });
        setStaff(Array.isArray(data.assignmentStaff) ? data.assignmentStaff : []);
        setLoaded(true);
      })
      .catch(err => { if (alive) setError(err.response?.data?.message || 'Тохиргоо ачаалж чадсангүй.'); });
    return () => { alive = false; };
  }, [apiUrl]);

  const save = async (id, body, done) => {
    setBusy(id); setError(''); setMessage('');
    try {
      await axios.put(`${apiUrl}/api/admin/settings`, body, { headers: getAuthHeaders(), timeout: 15000 });
      setMessage(done);
      return true;
    } catch (err) {
      const detail = err.response?.data?.errors?.assignment;
      setError((detail && typeof detail === 'object' ? Object.values(detail).join(' ') : '') || err.response?.data?.message || 'Хадгалж чадсангүй.');
      return false;
    } finally { setBusy(''); }
  };

  const toggleTrust = async () => { const next = !trustAuto; if (await save('trust', { trustAutoDocRequest: next }, next ? 'Итгэлцлийн нэмэлт материал автоматаар хүсэх боломж асалаа.' : 'Итгэлцлийн нэмэлт материал автоматаар хүсэх боломж унтраалаа.')) setTrustAuto(next); };
  const toggleDigest = async () => { const next = !digest; if (await save('digest', { dailyDigestEnabled: next }, next ? 'Өдөр тутмын сануулга асалаа.' : 'Өдөр тутмын сануулга унтраалаа.')) setDigest(next); };

  const setKind = (kind, patch) => setAssignment(previous => ({ ...previous, [kind]: { ...previous[kind], ...patch } }));
  const saveAssignment = async kind => {
    const value = assignment[kind];
    if (value.mode === 'auto' && !value.staffId) { setError('Автомат горимд ажилтан сонгоно уу.'); setMessage(''); return; }
    await save(`assign-${kind}`, { assignment: { [kind]: { mode: value.mode, ...(value.mode === 'auto' ? { staffId: value.staffId } : {}) } } }, 'Хуваарилалтын тохиргоо хадгалагдлаа.');
  };

  const sendTest = async () => {
    setTesting(true); setTestMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${apiUrl}/api/admin/daily-digest/test`, {}, { headers: getAuthHeaders(), timeout: 30000 });
      const { result, reason, sentTo } = res.data || {};
      if (result === 'sent') setTestMsg({ type: 'ok', text: `Тест имэйл ${sentTo || 'таны хаяг'} руу илгээгдлээ.` });
      else if (result === 'skipped') setTestMsg({ type: 'error', text: DIGEST_REASONS[reason] || 'Имэйл илгээгээгүй.' });
      else setTestMsg({ type: 'error', text: 'Тест имэйл илгээж чадсангүй.' });
    } catch (err) { setTestMsg({ type: 'error', text: err.response?.data?.message || 'Тест илгээж чадсангүй.' }); }
    finally { setTesting(false); }
  };

  return <>
    <section aria-labelledby="automation-title" className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 id="automation-title" className="text-xl font-bold text-[#003B5C]">Автомат имэйл ба сануулга</h2>
      {!loaded && !error && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      <Switch id="trust-auto-docs" label="Итгэлцэл: нэмэлт материалыг автоматаар хүсэх" help="Итгэлцлийн хүсэлт ирэхэд харилцагчийн имэйл байвал нэмэлт материал оруулах холбоос бүхий имэйл автоматаар явна. Анхдагчаар асаалттай." checked={trustAuto} disabled={!loaded || busy === 'trust'} onChange={toggleTrust} />
      <Switch id="daily-digest" label="Өдөр тутмын сануулга (09:00, Улаанбаатар)" help="Ажилтан бүрт өөрт хуваарилагдсан шийдвэрлэгдээгүй зээл, итгэлцлийн хүсэлтийн жагсаалтыг имэйлээр өдөр бүр илгээнэ. Анхдагчаар асаалттай." checked={digest} disabled={!loaded || busy === 'digest'} onChange={toggleDigest} />
      <div>
        <button type="button" onClick={sendTest} disabled={testing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#003B5C] hover:bg-slate-50 disabled:opacity-50">{testing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}Тест илгээх</button>
        <p className="mt-1 text-xs text-slate-500">Зөвхөн танд (өөрийн мэдэгдлийн имэйл рүү) одоогийн сануулгыг илгээнэ.</p>
        {testMsg.text && <p role={testMsg.type === 'error' ? 'alert' : 'status'} className={`mt-2 rounded-lg p-2 text-sm ${testMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{testMsg.text}</p>}
      </div>
    </section>

    <section aria-labelledby="assignment-title" className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 id="assignment-title" className="text-xl font-bold text-[#003B5C]">Хуваарилалт</h2>
      {KINDS.map(kind => {
        const value = assignment[kind.key];
        const name = `assign-${kind.key}`;
        return <fieldset key={kind.key} disabled={!loaded || busy === name} className="space-y-2 border-t pt-4 first-of-type:border-0 first-of-type:pt-0">
          <legend className="font-bold text-slate-800">{kind.title}</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name={name} checked={value.mode === 'manual'} onChange={() => setKind(kind.key, { mode: 'manual' })} className="h-4 w-4" />Гараар хуваарилах</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name={name} checked={value.mode === 'auto'} onChange={() => setKind(kind.key, { mode: 'auto' })} className="h-4 w-4" />Автоматаар нэг ажилтанд</label>
          {value.mode === 'auto' && <div>
            <label htmlFor={`${name}-staff`} className="sr-only">{kind.title}: ажилтан</label>
            <select id={`${name}-staff`} value={value.staffId} onChange={event => setKind(kind.key, { staffId: event.target.value })} className="min-h-11 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="">Ажилтан сонгох…</option>
              {staff.map(item => <option key={item._id} value={item._id}>{item.name || item._id}</option>)}
            </select>
          </div>}
          <p className="text-xs text-slate-500">{kind.note}</p>
          <button type="button" onClick={() => saveAssignment(kind.key)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === name && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Хадгалах</button>
        </fieldset>;
      })}
    </section>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
  </>;
}
