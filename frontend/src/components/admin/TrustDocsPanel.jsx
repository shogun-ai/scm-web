import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Download, ExternalLink, FileText, Loader2, MailPlus, Plus, UserCheck, X } from 'lucide-react';
import { getAuthHeaders, openTrustFile } from '../loanTask/api';

// D24/D25: итгэлцлийн хүсэлтийн материал (Хувийн / Хөрөнгийн эх үүсвэр / Бусад), нэмэлт материал хүсэх, хариуцагч, түүх.
const TRUST_PRESETS = [
  { key: 'trust_id_reference', label: 'Иргэний үнэмлэхийн лавлагаа' },
  { key: 'trust_address_reference', label: 'Оршин суугаа газрын лавлагаа' },
  { key: 'trust_funds_bank_statement', label: 'Дансны хуулга (хөрөнгийн эх үүсвэр)' },
  { key: 'trust_funds_savings_book', label: 'Хадгаламжийн дэвтэр' },
  { key: 'trust_funds_other', label: 'Хөрөнгийн эх үүсвэрийн бусад баримт' },
];
const GROUPS = [{ key: 'personal', label: 'Хувийн' }, { key: 'funds', label: 'Хөрөнгийн эх үүсвэр' }, { key: 'other', label: 'Бусад' }];
const MAX_EXTRA = 5;
const MAIL_STATE = { sent: 'Илгээгдсэн', queued: 'Илгээгдэж байна', failed: 'Илгээж чадсангүй', skipped: 'Илгээгээгүй' };
const HISTORY_LABELS = { created: 'Хүсэлт ирсэн', assigned: 'Хуваарилсан', unassigned: 'Хуваарилалт цуцалсан', status: 'Төлөв өөрчилсөн', docs_requested: 'Нэмэлт материал хүссэн', upload: 'Харилцагч файл оруулсан', email: 'Имэйл' };
const TEMPLATES = { trust_ack: 'Хүлээн авсан мэдэгдэл', trust_doc_request: 'Материал хүссэн имэйл', staff_trust_upload: 'Ажилтанд мэдэгдэл', staff_trust_assignment: 'Хариуцагчид мэдэгдэл', trust_message: 'Чөлөөт имэйл' };

const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const sizeText = size => (Number.isFinite(size) && size > 0 ? (size >= 1048576 ? `${(size / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(size / 1024))} КБ`) : '');

function describeHistory(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const who = entry.actor?.name ? ` · ${entry.actor.name}` : '';
  switch (entry.type) {
    case 'docs_requested': return `Нэмэлт материал хүссэн${entry.items?.length ? `: ${entry.items.join(', ')}` : ''}${entry.sentTo ? ` → ${entry.sentTo}` : ''}${who}`;
    case 'upload': return `Харилцагч ${entry.count || 0} файл оруулсан${entry.items?.length ? `: ${entry.items.join(', ')}` : ''}`;
    case 'assigned': return `Хуваарилсан: ${entry.assignee?.name || '—'}${who}`;
    case 'unassigned': return `Хуваарилалт цуцалсан${who}`;
    case 'status': return `Төлөв: ${entry.from || '—'} → ${entry.to || '—'}${who}`;
    case 'email': return `${TEMPLATES[entry.email?.template] || 'Имэйл'}: ${MAIL_STATE[entry.email?.result] || entry.email?.result || ''}${entry.sentTo ? ` → ${entry.sentTo}` : ''}`;
    default: return HISTORY_LABELS[entry.type] || '';
  }
}

export default function TrustDocsPanel({ apiUrl, trust: initial, onChanged }) {
  const [trust, setTrust] = useState(initial);
  const [perms, setPerms] = useState(null);
  const [selected, setSelected] = useState({});
  const [extras, setExtras] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fileBusy, setFileBusy] = useState('');
  const [fileError, setFileError] = useState('');
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState({ type: '', text: '' });

  const email = String(trust?.email || '').trim();
  const closed = ['resolved', 'closed', 'rejected', 'completed', 'done'].includes(String(trust?.status || '').toLowerCase());
  const canRequest = Boolean(perms?.has('trusts.message'));
  const canAssign = Boolean(perms?.has('trusts.assign'));
  const files = useMemo(() => (Array.isArray(trust?.files) ? trust.files : []), [trust?.files]);
  const history = Array.isArray(trust?.history) ? trust.history : [];
  const activeLink = (Array.isArray(trust?.uploadLinks) ? trust.uploadLinks : []).find(link => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now());

  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/me/permissions`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) setPerms(new Set(Array.isArray(res.data?.keys) ? res.data.keys : [])); })
      .catch(() => { if (alive) setPerms(new Set()); });
    return () => { alive = false; };
  }, [apiUrl]);

  useEffect(() => {
    if (!canAssign) return undefined;
    let alive = true;
    axios.get(`${apiUrl}/api/trusts/assignees`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) setStaff(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (alive) setAssignMsg({ type: 'error', text: 'Ажилтны жагсаалт ачаалж чадсангүй.' }); });
    return () => { alive = false; };
  }, [apiUrl, canAssign]);

  const grouped = useMemo(() => GROUPS.map(group => ({ ...group, files: files.filter(file => (GROUPS.some(item => item.key === file.group) ? file.group : 'other') === group.key) })).filter(group => group.files.length), [files]);

  const open = async (file, download) => {
    setFileError(''); setFileBusy(`${file.ref}:${download ? 'd' : 'o'}`);
    try { await openTrustFile(apiUrl, trust._id, file.ref, { download, fileName: file.fileName }); } catch (err) { setFileError(err.message); }
    finally { setFileBusy(''); }
  };

  const toggle = key => setSelected(previous => ({ ...previous, [key]: !previous[key] }));
  const picked = TRUST_PRESETS.filter(item => selected[item.key]);
  const filledExtras = extras.map(item => item.trim()).filter(Boolean);
  const total = picked.length + filledExtras.length;

  const request = async () => {
    if (!total) { setError('Хүсэх материалаа сонгоно уу.'); return; }
    setBusy(true); setError(''); setNotice('');
    const items = [...picked.map(item => ({ key: item.key })), ...filledExtras.map((label, index) => ({ key: `extra_${index + 1}`, label }))];
    try {
      const res = await axios.post(`${apiUrl}/api/trusts/${trust._id}/doc-request`, { items, ...(note.trim() ? { note: note.trim() } : {}) }, { headers: getAuthHeaders(), timeout: 30000 });
      if (res.data?.trust) setTrust(res.data.trust);
      const state = res.data?.email?.result;
      if (state === 'failed') setError(`Холбоос үүссэн боловч имэйл илгээж чадсангүй (${res.data.sentTo || email}).`);
      else setNotice(state === 'skipped' ? `Хүсэлт бүртгэгдлээ, имэйл илгээгээгүй (${res.data.sentTo || email}).` : `Имэйл ${res.data.sentTo || email} хаягт илгээгдлээ.`);
      setSelected({}); setExtras([]); setNote('');
      onChanged?.();
    } catch (err) {
      const code = err.response?.data?.code;
      setError(code === 'NO_APPLICANT_EMAIL' ? 'Харилцагчийн имэйл бүртгэлгүй байна.' : code === 'TERMINAL' ? 'Шийдвэрлэсэн хүсэлтэд материал хүсэх боломжгүй.' : (err.response?.data?.message || 'Хүсэлт илгээж чадсангүй.'));
    } finally { setBusy(false); }
  };

  const assign = async nextId => {
    setAssignBusy(true); setAssignMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${apiUrl}/api/trusts/${trust._id}/assign`, { staffId: nextId || null }, { headers: getAuthHeaders(), timeout: 20000 });
      if (res.data?.trust) setTrust(res.data.trust);
      setStaffId('');
      setAssignMsg({ type: 'ok', text: nextId ? (res.data?.notify?.result === 'queued' ? 'Хуваарилагдлаа. Хариуцагчид имэйлээр мэдэгдэнэ.' : 'Хуваарилагдлаа.') : 'Хуваарилалт цуцлагдлаа.' });
      onChanged?.();
    } catch (err) { setAssignMsg({ type: 'error', text: err.response?.data?.message || 'Хуваарилж чадсангүй.' }); }
    finally { setAssignBusy(false); }
  };

  return <div className="mt-6 space-y-5 border-t pt-4">
    <section aria-labelledby="trust-assignee-title" className="space-y-2">
      <h3 id="trust-assignee-title" className="text-xs font-bold uppercase text-gray-400">Хариуцагч</h3>
      <p className="text-sm text-slate-800">{trust?.assignee?.name ? <><UserCheck size={15} className="mr-1 inline text-emerald-700" aria-hidden="true" /><b>{trust.assignee.name}</b>{trust.assignedAt ? <span className="text-xs text-slate-500"> · {dt(trust.assignedAt)}</span> : null}</> : <span className="text-amber-700">Хуваарилаагүй</span>}</p>
      {canAssign && <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="trust-assignee-select">Хариуцагч сонгох</label>
        <select id="trust-assignee-select" value={staffId} onChange={event => setStaffId(event.target.value)} disabled={assignBusy} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">Ажилтан сонгох…</option>
          {staff.map(item => <option key={item._id} value={item._id}>{item.name || item._id}</option>)}
        </select>
        <button type="button" disabled={!staffId || assignBusy} onClick={() => assign(staffId)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{assignBusy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Хуваарилах</button>
        {trust?.assignee?.userId && <button type="button" disabled={assignBusy} onClick={() => assign(null)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Цуцлах</button>}
      </div>}
      {canAssign && <p className="text-xs text-slate-500">Хуваарилахад хариуцагчид мэдэгдлийн имэйлээр (мэдэгдлийн имэйл эсвэл нэвтрэх имэйл) мэдэгдэнэ.</p>}
      {assignMsg.text && <p role={assignMsg.type === 'error' ? 'alert' : 'status'} className={`rounded-lg p-2 text-sm ${assignMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{assignMsg.text}</p>}
    </section>

    <section aria-labelledby="trust-docs-title" className="space-y-2">
      <h3 id="trust-docs-title" className="text-xs font-bold uppercase text-gray-400">Материал ({files.length})</h3>
      {files.length === 0 && <p className="text-sm text-slate-500">Харилцагч одоогоор материал оруулаагүй байна.</p>}
      {grouped.map(group => <div key={group.key}>
        <p className="mb-1 text-sm font-semibold text-[#003B5C]">{group.label}</p>
        <ul className="space-y-1">{group.files.map(file => <li key={file.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 text-sm">
          <span className="min-w-0 flex-1"><FileText size={15} className="mr-1 inline text-slate-500" aria-hidden="true" /><span className="break-all font-medium">{file.label || file.fileName}</span><span className="block break-all text-xs text-slate-500">{file.fileName}{sizeText(file.size) ? ` · ${sizeText(file.size)}` : ''}{file.uploadedAt ? ` · ${dt(file.uploadedAt)}` : ''}</span></span>
          {file.canOpen ? <span className="flex gap-1">
            <button type="button" disabled={Boolean(fileBusy)} onClick={() => open(file, false)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-[#003B5C] disabled:opacity-50">{fileBusy === `${file.ref}:o` ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}Нээх</button>
            <button type="button" disabled={Boolean(fileBusy)} onClick={() => open(file, true)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-[#003B5C] disabled:opacity-50">{fileBusy === `${file.ref}:d` ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}Татах</button>
          </span> : <span className="text-xs text-slate-500">Нээх боломжгүй</span>}
        </li>)}</ul>
      </div>)}
      {fileError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{fileError}</p>}
    </section>

    <section aria-labelledby="trust-req-title" className="space-y-3">
      <h3 id="trust-req-title" className="text-xs font-bold uppercase text-gray-400">Нэмэлт материал хүсэх</h3>
      {!email && <p className="text-xs text-amber-700">Харилцагчийн имэйл бүртгэлгүй тул материал хүсэх боломжгүй.</p>}
      {closed && email && <p className="text-xs text-slate-500">Шийдвэрлэсэн хүсэлтэд материал хүсэх боломжгүй.</p>}
      {!canRequest && email && !closed && perms && <p className="text-xs text-slate-500">Танд материал хүсэх эрх байхгүй.</p>}
      {activeLink && <p className="text-xs text-slate-600">Идэвхтэй холбоос {dt(activeLink.expiresAt)} хүртэл хүчинтэй ({(activeLink.items || []).map(item => item.label).join(', ')}).</p>}
      {canRequest && email && !closed && <fieldset disabled={busy} className="space-y-2">
        <legend className="sr-only">Хүсэх материал</legend>
        {TRUST_PRESETS.map(item => <label key={item.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" checked={Boolean(selected[item.key])} onChange={() => toggle(item.key)} className="h-4 w-4" />{item.label}</label>)}
        {extras.map((value, index) => <div key={index} className="flex items-center gap-2">
          <input aria-label={`Нэмэлт материал ${index + 1}`} maxLength={120} value={value} onChange={event => setExtras(previous => previous.map((item, position) => (position === index ? event.target.value : item)))} placeholder="Материалын нэр" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm" />
          <button type="button" aria-label="Устгах" onClick={() => setExtras(previous => previous.filter((_, position) => position !== index))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600"><X size={16} aria-hidden="true" /></button>
        </div>)}
        {extras.length < MAX_EXTRA && <button type="button" onClick={() => setExtras(previous => [...previous, ''])} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-700"><Plus size={16} aria-hidden="true" />Өөр материал нэмэх</button>}
        <label className="block text-xs font-semibold text-slate-600">Тайлбар (заавал биш)<textarea rows={3} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
        <button type="button" disabled={busy || !total} onClick={request} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MailPlus size={16} aria-hidden="true" />}Нэмэлт материал хүсэх{total ? ` (${total})` : ''}</button>
        <p className="text-xs text-slate-500">Холбоос {email ? `${email} хаягт` : 'харилцагчийн имэйлд'} 14 хоногийн хугацаатай илгээгдэнэ.</p>
      </fieldset>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </section>

    {history.length > 0 && <section aria-labelledby="trust-history-title">
      <h3 id="trust-history-title" className="mb-1 text-xs font-bold uppercase text-gray-400">Түүх</h3>
      <ol className="max-h-56 space-y-1 overflow-y-auto">{[...history].reverse().map((entry, index) => {
        const text = describeHistory(entry);
        return text ? <li key={`${entry.at}-${index}`} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700"><span className="text-slate-500">{dt(entry.at)}</span> · {text}{entry.note ? <span className="block whitespace-pre-wrap text-slate-600">{entry.note}</span> : null}</li> : null;
      })}</ol>
    </section>}
  </div>;
}
