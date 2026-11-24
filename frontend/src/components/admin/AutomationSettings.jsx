import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, MailCheck, Save, Send, Workflow } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import Button from './ui/Button';
import { Notice } from './ui/Feedback';
import { Field, Select } from './ui/Form';

// D24/D25 тохиргоо: итгэлцлийн нэмэлт материал авто хүсэлт, өдөр тутмын сануулга (+ тест), хуваарилалт.
// GET/PUT /api/admin/settings, POST /api/admin/daily-digest/test.
const DEFAULT_ASSIGNMENT = { loan: { mode: 'manual', staffId: '' }, trust: { mode: 'manual', staffId: '' } };
const KINDS = [
  { key: 'loan', title: 'Зээлийн хүсэлт', note: 'Бүтээгдэхүүн дээр тусгайлан тохируулсан хүлээн авагч (маягтын тохиргоо) энэ тохиргооноос илүү эрэмбэтэй.' },
  { key: 'trust', title: 'Итгэлцлийн хүсэлт', note: 'Автомат горимд шинэ хүсэлт сонгосон ажилтанд хуваарилагдаж, түүнд имэйлээр мэдэгдэнэ.' },
];
const DIGEST_REASONS = { mail_disabled: 'Имэйл илгээх тохиргоо (MAIL_ENABLED) идэвхгүй байна.', no_email: 'Таны имэйл хаяг бүртгэлгүй байна.' };

// Тохиргооны глас карт (тэнгэр дээр): hue icon tile, гарчиг, тайлбар.
export function SettingsCard({ id, icon: Icon, title, description, aside, children, className = '' }) {
  return <section aria-labelledby={id} className={`glass relative p-5 md:p-6 ${className}`}>
    <span className="adm-card__rim" aria-hidden="true" />
    <div className="relative flex items-start gap-3.5">
      {Icon && <span className="hidden h-10 w-10 shrink-0 sm:grid place-items-center rounded-xl bg-[color-mix(in_srgb,var(--hue)_14%,transparent)] text-[color-mix(in_srgb,var(--hue)_70%,white)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--hue)_30%,transparent)]" aria-hidden="true"><Icon size={18} /></span>}
      <div className="min-w-0 flex-1">
        <h3 id={id} className="text-[15px] font-semibold text-white">{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-[var(--adm-ink-2)]">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
    <div className="relative mt-5">{children}</div>
  </section>;
}

// Toggle primitive-д aria-labelledby/aria-describedby байхгүй тул энд адилхан `.adm-switch` дээр орон нутгийн хувилбар.
export function SettingSwitch({ id, label, help, checked, disabled, onChange, hue }) {
  return <div className="flex items-start justify-between gap-4 py-1">
    <div className="min-w-0"><p id={`${id}-label`} className="text-sm font-semibold text-white">{label}</p><p id={`${id}-help`} className="mt-1 text-[13px] leading-relaxed text-[var(--adm-ink-3)]">{help}</p></div>
    <span className="grid min-h-11 min-w-11 shrink-0 place-items-center">
      <button type="button" role="switch" aria-checked={Boolean(checked)} aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} disabled={disabled} onClick={onChange} className="adm-switch disabled:opacity-50" style={hue ? { '--hue': `var(--sp-${hue})` } : undefined} />
    </span>
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

  const option = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm font-medium text-[var(--adm-ink-2)] transition hover:border-white/20 has-[:checked]:border-[color-mix(in_srgb,var(--hue)_55%,transparent)] has-[:checked]:bg-[color-mix(in_srgb,var(--hue)_10%,transparent)] has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color-mix(in_srgb,var(--hue)_65%,white)]';

  return <>
    <SettingsCard id="automation-title" icon={MailCheck} title="Автомат имэйл ба сануулга" description="Харилцагч болон ажилтанд автоматаар очих имэйлүүд.">
      {!loaded && !error && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      <div className="divide-y divide-white/[0.07] [&>*]:py-3 [&>*:first-child]:pt-0">
        <SettingSwitch id="trust-auto-docs" hue="green" label="Итгэлцэл: нэмэлт материалыг автоматаар хүсэх" help="Итгэлцлийн хүсэлт ирэхэд харилцагчийн имэйл байвал нэмэлт материал оруулах холбоос бүхий имэйл автоматаар явна. Анхдагчаар асаалттай." checked={trustAuto} disabled={!loaded || busy === 'trust'} onChange={toggleTrust} />
        <SettingSwitch id="daily-digest" hue="green" label="Өдөр тутмын сануулга (09:00, Улаанбаатар)" help="Ажилтан бүрт өөрт хуваарилагдсан шийдвэрлэгдээгүй зээл, итгэлцлийн хүсэлтийн жагсаалтыг имэйлээр өдөр бүр илгээнэ. Анхдагчаар асаалттай." checked={digest} disabled={!loaded || busy === 'digest'} onChange={toggleDigest} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 !pb-0">
          <Button variant="secondary" busy={testing} disabled={testing} onClick={sendTest} icon={<Send size={16} aria-hidden="true" />} aria-describedby="digest-test-help">Тест илгээх</Button>
          <p id="digest-test-help" className="min-w-0 flex-1 text-xs text-[var(--adm-ink-3)]">Зөвхөн танд (өөрийн мэдэгдлийн имэйл рүү) одоогийн сануулгыг илгээнэ.</p>
        </div>
      </div>
      {testMsg.text && <Notice kind={testMsg.type === 'error' ? 'err' : 'ok'} className="mt-3">{testMsg.text}</Notice>}
    </SettingsCard>

    <SettingsCard id="assignment-title" icon={Workflow} title="Хуваарилалт" description="Шинэ хүсэлтийг гараар эсвэл нэг ажилтанд автоматаар хуваарилна.">
      <div className="space-y-5">
        {KINDS.map(kind => {
          const value = assignment[kind.key];
          const name = `assign-${kind.key}`;
          return <fieldset key={kind.key} disabled={!loaded || busy === name} className="space-y-2.5 border-t border-white/[0.07] pt-5 first:border-0 first:pt-0 disabled:opacity-60">
            <legend className="float-left mb-2.5 w-full text-sm font-semibold text-white">{kind.title}</legend>
            <div className="clear-both grid gap-2 sm:grid-cols-2">
              <label className={option}><input type="radio" name={name} checked={value.mode === 'manual'} onChange={() => setKind(kind.key, { mode: 'manual' })} className="h-4 w-4 accent-[var(--hue)]" />Гараар хуваарилах</label>
              <label className={option}><input type="radio" name={name} checked={value.mode === 'auto'} onChange={() => setKind(kind.key, { mode: 'auto' })} className="h-4 w-4 accent-[var(--hue)]" />Автоматаар нэг ажилтанд</label>
            </div>
            {value.mode === 'auto' && <Field label={`${kind.title}: ажилтан`}>{({ id }) => <Select id={id} value={value.staffId} onChange={event => setKind(kind.key, { staffId: event.target.value })} className="sm:max-w-xs">
              <option value="">Ажилтан сонгох…</option>
              {staff.map(item => <option key={item._id} value={item._id}>{item.name || item._id}</option>)}
            </Select>}</Field>}
            <p className="text-xs leading-relaxed text-[var(--adm-ink-3)]">{kind.note}</p>
            <Button variant="secondary" busy={busy === name} onClick={() => saveAssignment(kind.key)} icon={<Save size={16} aria-hidden="true" />}>Хадгалах</Button>
          </fieldset>;
        })}
      </div>
    </SettingsCard>
    {message && <Notice kind="ok">{message}</Notice>}
    {error && <Notice kind="err">{error}</Notice>}
  </>;
}
