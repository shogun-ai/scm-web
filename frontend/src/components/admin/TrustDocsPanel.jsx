import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Download, ExternalLink, FileText, Loader2, MailPlus, Plus, UserCheck, X } from 'lucide-react';
import { getAuthHeaders, openTrustFile } from '../loanTask/api';
import { DrawerSection, Timeline } from './ui/Drawer';
import Button from './ui/Button';
import { isTrustClosed } from './trustUtils';

// D24/D25: итгэлцлийн хүсэлтийн материал (Хувийн / Хөрөнгийн эх үүсвэр / Бусад), нэмэлт материал хүсэх, хариуцагч, түүх.
// Rendered as panels/sections of the trust SideDrawer. The trust object is owned by the drawer: panels report server
// responses through onTrustChange and ask the list to refresh through onChanged. API calls are unchanged.
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
const BOX = 'adm-lfield';

const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const sizeText = size => (Number.isFinite(size) && size > 0 ? (size >= 1048576 ? `${(size / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(size / 1024))} КБ`) : '');

function describeHistory(entry) {
  if (!entry || typeof entry !== 'object') return '';
  switch (entry.type) {
    case 'docs_requested': return `Нэмэлт материал хүссэн${entry.items?.length ? `: ${entry.items.join(', ')}` : ''}${entry.sentTo ? ` → ${entry.sentTo}` : ''}`;
    case 'upload': return `Харилцагч ${entry.count || 0} файл оруулсан${entry.items?.length ? `: ${entry.items.join(', ')}` : ''}`;
    case 'assigned': return `Хуваарилсан: ${entry.assignee?.name || '—'}`;
    case 'unassigned': return 'Хуваарилалт цуцалсан';
    case 'status': return `Төлөв: ${entry.from || '—'} → ${entry.to || '—'}`;
    case 'email': return `${TEMPLATES[entry.email?.template] || 'Имэйл'}: ${MAIL_STATE[entry.email?.result] || entry.email?.result || ''}${entry.sentTo ? ` → ${entry.sentTo}` : ''}`;
    default: return HISTORY_LABELS[entry.type] || '';
  }
}

export function TrustAssignPanel({ apiUrl, trust, canAssign, onTrustChange, onChanged }) {
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!canAssign) return undefined;
    let alive = true;
    axios.get(`${apiUrl}/api/trusts/assignees`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) setStaff(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (alive) setMsg({ type: 'error', text: 'Ажилтны жагсаалт ачаалж чадсангүй.' }); });
    return () => { alive = false; };
  }, [apiUrl, canAssign]);

  const assign = async nextId => {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${apiUrl}/api/trusts/${trust._id}/assign`, { staffId: nextId || null }, { headers: getAuthHeaders(), timeout: 20000 });
      if (res.data?.trust) onTrustChange(res.data.trust);
      setStaffId('');
      setMsg({ type: 'ok', text: nextId ? (res.data?.notify?.result === 'queued' ? 'Хуваарилагдлаа. Хариуцагчид имэйлээр мэдэгдэнэ.' : 'Хуваарилагдлаа.') : 'Хуваарилалт цуцлагдлаа.' });
      onChanged?.();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Хуваарилж чадсангүй.' }); }
    finally { setBusy(false); }
  };

  return <div className="space-y-3">
    <p className="text-sm text-slate-800">Одоогийн хариуцагч: {trust?.assignee?.name ? <><UserCheck size={15} className="mr-1 inline text-[var(--drawer-ink)]" aria-hidden="true" /><b>{trust.assignee.name}</b>{trust.assignedAt ? <span className="text-xs text-slate-600"> · {dt(trust.assignedAt)}</span> : null}</> : <span className="font-semibold text-amber-800">Хуваарилаагүй</span>}</p>
    {canAssign ? <>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 flex-1 text-xs font-semibold text-slate-700">Хариуцагч сонгох
          <select value={staffId} onChange={event => setStaffId(event.target.value)} disabled={busy} className={`${BOX} mt-1`}>
            <option value="">Ажилтан сонгох…</option>
            {staff.map(item => <option key={item._id} value={item._id}>{item.name || item._id}</option>)}
          </select>
        </label>
        <Button variant="ink" busy={busy} disabled={!staffId || busy} onClick={() => assign(staffId)}>Хуваарилах</Button>
        {trust?.assignee?.userId && <Button variant="light" disabled={busy} onClick={() => assign(null)}>Цуцлах</Button>}
      </div>
      <p className="text-xs text-slate-600">Хуваарилахад хариуцагчид мэдэгдлийн имэйлээр (мэдэгдлийн имэйл эсвэл нэвтрэх имэйл) мэдэгдэнэ.</p>
    </> : <p className="text-xs text-slate-600">Танд хуваарилах эрх байхгүй.</p>}
    {msg.text && <p role={msg.type === 'error' ? 'alert' : 'status'} className={`rounded-lg p-2 text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{msg.text}</p>}
  </div>;
}

export function TrustDocRequestPanel({ apiUrl, trust, canRequest, permsLoaded, onTrustChange, onChanged }) {
  const [selected, setSelected] = useState({});
  const [extras, setExtras] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const email = String(trust?.email || '').trim();
  const closed = isTrustClosed(trust);
  const activeLink = (Array.isArray(trust?.uploadLinks) ? trust.uploadLinks : []).find(link => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now());

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
      if (res.data?.trust) onTrustChange(res.data.trust);
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

  return <div className="space-y-3">
    {!email && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Харилцагчийн имэйл бүртгэлгүй тул материал хүсэх боломжгүй.</p>}
    {closed && email && <p className="text-xs text-slate-600">Шийдвэрлэсэн хүсэлтэд материал хүсэх боломжгүй.</p>}
    {!canRequest && email && !closed && permsLoaded && <p className="text-xs text-slate-600">Танд материал хүсэх эрх байхгүй.</p>}
    {activeLink && <p className="rounded-lg bg-sky-50 p-2 text-xs text-sky-900">Идэвхтэй холбоос {dt(activeLink.expiresAt)} хүртэл хүчинтэй ({(activeLink.items || []).map(item => item.label).join(', ')}).</p>}
    {canRequest && email && !closed && <fieldset disabled={busy} className="space-y-2">
      <legend className="mb-1 text-xs font-semibold text-slate-700">Хүсэх материал</legend>
      {TRUST_PRESETS.map(item => <label key={item.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 has-[:checked]:border-[var(--drawer-ink)] has-[:checked]:bg-[color-mix(in_srgb,var(--hue)_8%,white)]"><input type="checkbox" checked={Boolean(selected[item.key])} onChange={() => toggle(item.key)} className="h-4 w-4 accent-[var(--drawer-ink)]" />{item.label}</label>)}
      {extras.map((value, index) => <div key={index} className="flex items-center gap-2">
        <input aria-label={`Нэмэлт материал ${index + 1}`} maxLength={120} value={value} onChange={event => setExtras(previous => previous.map((item, position) => (position === index ? event.target.value : item)))} placeholder="Материалын нэр" className={`${BOX} flex-1`} />
        <button type="button" aria-label="Устгах" onClick={() => setExtras(previous => previous.filter((_, position) => position !== index))} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><X size={16} aria-hidden="true" /></button>
      </div>)}
      {extras.length < MAX_EXTRA && <button type="button" onClick={() => setExtras(previous => [...previous, ''])} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-400 px-3 text-sm font-semibold text-slate-800 hover:bg-white"><Plus size={16} aria-hidden="true" />Өөр материал нэмэх</button>}
      <label className="block text-xs font-semibold text-slate-700">Тайлбар (заавал биш)<textarea rows={3} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className={`${BOX} mt-1`} /></label>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button variant="ink" busy={busy} icon={<MailPlus size={16} aria-hidden="true" />} disabled={busy || !total} onClick={request}>Нэмэлт материал хүсэх{total ? ` (${total})` : ''}</Button>
        <p className="text-xs text-slate-600">Холбоос {email ? `${email} хаягт` : 'харилцагчийн имэйлд'} 14 хоногийн хугацаатай илгээгдэнэ.</p>
      </div>
    </fieldset>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
  </div>;
}

export function TrustFilesSection({ apiUrl, trust }) {
  const [fileBusy, setFileBusy] = useState('');
  const [fileError, setFileError] = useState('');
  const files = useMemo(() => (Array.isArray(trust?.files) ? trust.files : []), [trust?.files]);
  const grouped = useMemo(() => GROUPS.map(group => ({ ...group, files: files.filter(file => (GROUPS.some(item => item.key === file.group) ? file.group : 'other') === group.key) })).filter(group => group.files.length), [files]);
  const open = async (file, download) => {
    setFileError(''); setFileBusy(`${file.ref}:${download ? 'd' : 'o'}`);
    try { await openTrustFile(apiUrl, trust._id, file.ref, { download, fileName: file.fileName }); } catch (err) { setFileError(err.message); }
    finally { setFileBusy(''); }
  };
  const fileBtn = 'inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:border-[var(--drawer-ink)] disabled:opacity-50';

  return <DrawerSection id="trust-docs-title" title={`Материал (${files.length})`}>
    {files.length === 0 && <p className="text-sm text-slate-600">Харилцагч одоогоор материал оруулаагүй байна.</p>}
    <div className="space-y-4">{grouped.map(group => <div key={group.key}>
      <p className="mb-2 text-sm font-semibold text-slate-900">{group.label}</p>
      <ul className="space-y-2">{group.files.map(file => <li key={file.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-sm ring-1 ring-inset ring-slate-200/70">
        <span className="flex min-w-0 flex-1 items-start gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-slate-600" aria-hidden="true" /><span className="min-w-0"><span className="block break-all font-medium text-slate-900">{file.label || file.fileName}</span><span className="block break-all text-xs text-slate-600">{file.fileName}{sizeText(file.size) ? ` · ${sizeText(file.size)}` : ''}{file.uploadedAt ? ` · ${dt(file.uploadedAt)}` : ''}</span></span></span>
        {file.canOpen ? <span className="flex gap-1.5">
          <button type="button" disabled={Boolean(fileBusy)} onClick={() => open(file, false)} className={fileBtn}>{fileBusy === `${file.ref}:o` ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}Нээх</button>
          <button type="button" disabled={Boolean(fileBusy)} onClick={() => open(file, true)} className={fileBtn}>{fileBusy === `${file.ref}:d` ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}Татах</button>
        </span> : <span className="text-xs text-slate-600">Нээх боломжгүй</span>}
      </li>)}</ul>
    </div>)}</div>
    {fileError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{fileError}</p>}
  </DrawerSection>;
}

export function TrustHistorySection({ trust }) {
  const history = Array.isArray(trust?.history) ? trust.history : [];
  const items = [...history].reverse().map((entry, index) => {
    const text = describeHistory(entry);
    return text ? { key: `${entry.at}-${index}`, meta: `${dt(entry.at)}${entry.actor?.name ? ` · ${entry.actor.name}` : ''}`, content: <>{text}{entry.note ? <span className="mt-1 block whitespace-pre-wrap text-slate-700">{entry.note}</span> : null}</> } : null;
  }).filter(Boolean);
  return <DrawerSection id="trust-history-title" title="Түүх"><Timeline items={items} /></DrawerSection>;
}
