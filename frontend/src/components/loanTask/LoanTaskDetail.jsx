import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCircle2, Copy, Download, ExternalLink, FileText, Link2, Loader2, Mail, MessageSquare, Phone, Plus, Send, Trash2, UserCheck } from 'lucide-react';
import { LEGACY_STATUS_LABELS, TASK_OUTCOMES, TASK_OUTCOME_LABELS, TASK_STATUS_LABELS } from '@shared/loanTaskStatus';
import { PRESET_WIDGETS } from '@shared/loanWidgets';
import TaskField from './TaskField';
import TaskStatusBadge from './TaskStatusBadge';
import ChannelBadge from './ChannelBadge';
import ConfirmDeleteDialog from '../admin/ConfirmDeleteDialog';
import SideDrawer from '../admin/ui/SideDrawer';
import { deleteLoanRequest, errorMessage, fetchTaskDetail, openLoanFile, postDocRequest, postTaskAction, postTaskFiles, postTaskMessage } from './api';
import { FILE_CATEGORIES, categoryOf, categoryOfFile, formatMoney, isFileField, isVisible, maskRegister } from './taskFormUtils';

const BOX = 'adm-field py-2 disabled:opacity-60';
const BTN = 'adm-btn disabled:translate-y-0 disabled:opacity-50';
const BTN_LIGHT = 'adm-chip-action';
const HISTORY_LABELS = { created: 'Үүссэн', assigned: 'Хуваарилсан', unassigned: 'Хуваарилалт цуцалсан', status: 'Төлөв өөрчилсөн', reopened: 'Дахин нээсэн', docs_requested: 'Нэмэлт баримт хүссэн', note: 'Тэмдэглэл', file_added: 'Файл нэмсэн', email: 'Имэйл', message: 'Харилцагчид имэйл илгээсэн' };
const EMAIL_CHIPS = { sent: ['Имэйл илгээгдсэн', 'bg-[#34D399]/[0.14] text-[#B5F5D9]'], queued: ['Имэйл илгээгдэж байна', 'bg-[#4CC6FF]/[0.14] text-[#A6E6FF]'], failed: ['Имэйл илгээж чадсангүй', 'bg-[#FF6B86]/[0.14] text-[#FFC9D3]'], skipped: ['Имэйл илгээгээгүй', 'bg-white/[0.06] text-[#AEB9CC]'] };
const SOURCE_LABELS = { applicant: 'Харилцагч', staff: 'Ажилтан', applicant_link: 'Харилцагч (холбоосоор)' };
const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const formatSize = bytes => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);

function Section({ title, children }) {
  return <section className="adm-drawer-card"><h3 className="adm-drawer-card__title">{title}</h3>{children}</section>;
}

export default function LoanTaskDetail({ apiUrl, id, assignees = [], onClose, onChanged, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [statusTo, setStatusTo] = useState('');
  const [outcome, setOutcome] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [note, setNote] = useState('');
  const [docKeys, setDocKeys] = useState([]);
  const [docExtra, setDocExtra] = useState(['']);
  const [docNote, setDocNote] = useState('');
  const [docLink, setDocLink] = useState(null);
  const [showLink, setShowLink] = useState(false);
  const docEmailed = ['sent', 'queued'].includes(docLink?.email?.result);
  const [copied, setCopied] = useState(false);
  const [uploadKey, setUploadKey] = useState('additional');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [panel, setPanel] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [fileBusy, setFileBusy] = useState('');
  const [fileError, setFileError] = useState('');
  const openFile = async (file, download = false) => {
    setFileBusy(file.ref); setFileError('');
    try { await openLoanFile(apiUrl, id, file.ref, { download, fileName: file.fileName }); }
    catch (err) { setFileError(err.message); }
    finally { setFileBusy(''); }
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await fetchTaskDetail(apiUrl, id); setDetail(data); setConflict(false); setAssigneeId(data.assignee?.userId || ''); }
    catch (err) { setError(errorMessage(err, 'Дэлгэрэнгүй ачаалж чадсангүй.')); }
    finally { setLoading(false); }
  }, [apiUrl, id]);
  useEffect(() => { load(); }, [load]);

  // Backend allowedActions нь эрхийн матрицыг (D17) аль хэдийн тооцсон байдаг.
  const allowed = detail?.allowedActions || {};
  const fileFields = useMemo(() => (detail?.taskForm?.steps || []).flatMap(step => step.fields || []).filter(isFileField), [detail]);
  // Legacy requests have no form snapshot: offer every preset document type (the backend accepts preset keys for them).
  const docChoices = useMemo(() => (fileFields.length ? fileFields : PRESET_WIDGETS.filter(widget => widget.type === 'file' && widget.key !== 'property_docs')), [fileFields]);
  const revision = detail?.taskRevision || 0;

  const run = async (fn, success) => {
    setBusy(true); setMessage(''); setError('');
    try { const result = await fn(); if (result?._id || result?.history) { setDetail(result); setAssigneeId(result.assignee?.userId || ''); } else await load(); setMessage(success); onChanged?.(); return true; }
    catch (err) {
      if (err.response?.status === 409) { setConflict(true); setError('Өөр хүн өөрчилсөн байна.'); } else setError(errorMessage(err));
      return false;
    } finally { setBusy(false); }
  };

  const doAssign = () => run(() => postTaskAction(apiUrl, id, { type: 'assign', assigneeId, expectedRevision: revision }), 'Хариуцагч шинэчлэгдлээ.');
  const doStatus = async () => {
    const action = { type: 'status', to: statusTo, expectedRevision: revision };
    if (statusTo === 'rejected' && !statusNote.trim()) { setError('Татгалзсан шалтгаанаа бичнэ үү.'); return; }
    if (statusTo === 'resolved') {
      if (!outcome) { setError('Үр дүнгээ сонгоно уу.'); return; }
      if (!statusNote.trim()) { setError('Тайлбар бичнэ үү.'); return; }
      action.outcome = { code: outcome };
    }
    if (statusNote.trim()) action.note = statusNote.trim();
    if (await run(() => postTaskAction(apiUrl, id, action), 'Төлөв өөрчлөгдлөө.')) { setStatusTo(''); setOutcome(''); setStatusNote(''); }
  };
  const doReopen = async () => {
    if (!reopenNote.trim()) { setError('Дахин нээх шалтгаанаа бичнэ үү.'); return; }
    if (await run(() => postTaskAction(apiUrl, id, { type: 'reopen', note: reopenNote.trim(), expectedRevision: revision }), 'Хүсэлтийг дахин нээлээ.')) setReopenNote('');
  };
  const doDelete = async () => {
    setDeleteBusy(true); setDeleteError('');
    try { await deleteLoanRequest(apiUrl, id); setDeleteOpen(false); onChanged?.(); (onDeleted || onClose)(); }
    catch (err) { setDeleteError(err.response?.data?.code === 'DELETE_DISABLED' ? 'Устгах тохиргоо унтраалттай байна.' : errorMessage(err, 'Устгаж чадсангүй.')); }
    finally { setDeleteBusy(false); }
  };
  const doNote = async () => { if (!note.trim()) return; if (await run(() => postTaskAction(apiUrl, id, { type: 'note', note: note.trim() }), 'Тэмдэглэл нэмлээ.')) setNote(''); };

  const applicantEmail = String(detail?.applicant?.email || '').trim();
  const applicantPhone = String(detail?.applicant?.phone || '').trim();
  const applicantName = [detail?.applicant?.lastname, detail?.applicant?.firstname].filter(Boolean).join(' ') || detail?.applicant?.name || detail?.applicant?.contactName || detail?.displayName || '';

  const docCount = docKeys.length + docExtra.filter(text => text.trim()).length;
  const doDocs = async () => {
    const items = [
      ...docChoices.filter(field => docKeys.includes(field.key)).map(field => ({ key: field.key, label: field.label })),
      ...docExtra.map(text => text.trim()).filter(Boolean).map((label, index) => ({ key: `extra_${index + 1}`, label })),
    ];
    if (!items.length) { setError('Хүсэх баримтаа сонгох эсвэл бичнэ үү.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await postDocRequest(apiUrl, id, { items, note: docNote.trim(), expiresInDays: 7, expectedRevision: revision });
      setDocLink(result); setShowLink(false); setDocKeys([]); setDocExtra(['']); setDocNote(''); setPanel(null);
      const state = result?.email?.result;
      setMessage(state === 'sent' || state === 'queued' ? `Файл оруулах холбоос ${applicantEmail || 'харилцагчийн'} хаяг руу имэйлээр илгээгдлээ.` : 'Нэмэлт баримтын холбоос үүслээ. Холбоосыг хуулж харилцагчид илгээнэ үү.');
      await load(); onChanged?.();
    } catch (err) {
      if (err.response?.status === 409) { setConflict(true); setError('Өөр хүн өөрчилсөн байна.'); } else setError(errorMessage(err));
    } finally { setBusy(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(docLink.uploadUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Холбоосыг гараар хуулна уу.'); }
  };
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(applicantEmail); setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000); } catch { setError('Имэйлийг гараар хуулна уу.'); }
  };
  const doUpload = async () => {
    if (!uploadFiles.length) return;
    const form = new FormData();
    form.append('fieldKey', uploadKey);
    uploadFiles.forEach(file => form.append('files', file));
    if (await run(() => postTaskFiles(apiUrl, id, form), 'Файл нэмлээ.')) setUploadFiles([]);
  };
  const doEmail = async () => {
    const text = emailText.trim();
    if (!text) { setError('Илгээх мессежээ бичнэ үү.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await postTaskMessage(apiUrl, id, { message: text, expectedRevision: revision });
      const state = result?.email?.result;
      if (state === 'failed') setError('Мессеж бүртгэгдсэн боловч имэйл илгээж чадсангүй.');
      else setMessage(state === 'skipped' ? 'Мессеж бүртгэгдлээ (имэйл илгээгээгүй).' : 'Имэйл илгээгдлээ');
      setEmailText(''); setEmailOpen(false);
      await load(); onChanged?.();
    } catch (err) {
      if (err.response?.status === 409) { setConflict(true); setError('Өөр хүн өөрчилсөн байна.'); setEmailOpen(false); }
      else if (err.response?.data?.code === 'NO_APPLICANT_EMAIL') { setError('Харилцагчийн имэйл бүртгэлгүй байна.'); setEmailOpen(false); }
      else setError(errorMessage(err, 'Имэйл илгээж чадсангүй.'));
    } finally { setBusy(false); }
  };

  // Files grouped by category (as in the public form), then by field label.
  const groupedFiles = useMemo(() => {
    const fieldByKey = new Map(fileFields.map(field => [field.key, field]));
    return FILE_CATEGORIES.map(category => {
      const groups = new Map();
      (detail?.files || []).forEach(file => {
        const field = fieldByKey.get(file.fieldKey);
        if (categoryOfFile(file, field) !== category.key) return;
        const key = file.label || field?.label || file.fieldKey || file.fieldName || 'Бусад';
        groups.set(key, [...(groups.get(key) || []), file]);
      });
      return { ...category, groups: [...groups.entries()] };
    }).filter(category => category.groups.length > 0);
  }, [detail, fileFields]);

  const legacyLabel = detail?.legacyStatus ? (LEGACY_STATUS_LABELS?.[detail.legacyStatus] || detail.legacyStatus) : '';
  const isLegacy = detail && detail.taskStatusSource === 'legacy';
  // "Нэмэлт баримт хүлээж буй" is set only by the doc-request form (it creates the upload link + email).
  const statusChoices = Array.isArray(allowed.transitions) ? allowed.transitions.filter(code => code !== 'additional_docs') : [];
  const selectedAssignee = assignees.find(person => person._id === assigneeId);
  const notifyEmail = assigneeId ? (selectedAssignee ? selectedAssignee.notifyEmail : (assigneeId === detail?.assignee?.userId ? detail.assignee.notifyEmail : undefined)) : undefined;
  const togglePanel = name => setPanel(previous => (previous === name ? null : name));
  const barButton = (name, label, icon) => <button type="button" aria-expanded={panel === name} aria-controls={`panel-${name}`} onClick={() => togglePanel(name)} className={`${BTN_LIGHT} `}>{icon}{label}</button>;

  return <SideDrawer
    hue="green"
    label="Хүсэлтийн дэлгэрэнгүй"
    eyebrow="Зээлийн хүсэлт"
    reference={detail?.applicationReference || ''}
    badge={<ChannelBadge channel={detail?.channel} tone="dark" />}
    title={detail?.displayName || 'Хүсэлт'}
    subtitle={detail ? `${detail.productName || detail.productKey || '—'}${detail.subProductName ? ` · ${detail.subProductName}` : ''}` : undefined}
    meta={detail ? <><TaskStatusBadge status={detail.taskStatus} outcome={detail.outcome} legacy={isLegacy} tone="dark" /><span>Хариуцагч: {detail.assignee?.name || 'Хуваарилаагүй'} · Үүссэн: {dt(detail.createdAt)}</span></> : null}
    note={isLegacy ? <>Хуучин урсгал · төлөв: {legacyLabel}{detail.outcome?.note ? ` · ${detail.outcome.note}` : ''}</> : null}
    onClose={onClose}
    actions={detail ? <>
        {allowed.requestDocs && barButton('docs', 'Нэмэлт материал хүсэх', <Link2 size={16} aria-hidden="true" />)}
        <button type="button" className={BTN_LIGHT} disabled={busy || !applicantEmail || allowed.message === false} onClick={() => setEmailOpen(true)}><Mail size={16} aria-hidden="true" />Чөлөөт имэйл бичих</button>
        {(statusChoices.length > 0 || allowed.reopen) && barButton('status', 'Төлөв солих', <Check size={16} aria-hidden="true" />)}
        {allowed.assign && barButton('assign', 'Хуваарилах', <UserCheck size={16} aria-hidden="true" />)}
        {allowed.note && barButton('note', 'Тэмдэглэл', <MessageSquare size={16} aria-hidden="true" />)}
        {detail.canDelete && <button type="button" className="adm-chip-action adm-chip-action--danger" onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 size={16} aria-hidden="true" />Устгах</button>}
    </> : null}
    actionsNote={detail && !applicantEmail ? <p className="text-[#F7DC8A]">Харилцагчийн имэйл бүртгэлгүй тул имэйл илгээх боломжгүй. Утсаар холбогдоно уу.</p> : null}
  >
      {loading && !detail && <p role="status" className="flex items-center gap-2 text-[#AEB9CC]"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      {error && <div role="alert" className="mb-4 rounded-xl bg-[#FF6B86]/10 p-3 text-sm text-[#FFC9D3]">{error}{conflict && <button type="button" onClick={load} className="ml-3 font-semibold underline">Дахин ачаалах</button>}</div>}
      {message && <p role="status" className="mb-4 rounded-xl bg-[#34D399]/10 p-3 text-sm text-[#B5F5D9]">{message}</p>}

      {detail && <>
        <section aria-labelledby="applicant-card" className="adm-drawer-card !mt-0 mb-4">
          <h3 id="applicant-card" className="adm-drawer-card__title">Харилцагчийн холбоо барих</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs font-semibold text-[#AEB9CC]">Нэр</dt><dd className="break-words text-[#E6EBF3]">{applicantName || '—'}</dd></div>
            <div><dt className="text-xs font-semibold text-[#AEB9CC]">Утас</dt><dd>{applicantPhone ? <a href={`tel:${applicantPhone.replace(/[^\d+]/g, '')}`} className="adm-link inline-flex min-h-9 items-center gap-1"><Phone size={14} aria-hidden="true" />{applicantPhone}</a> : '—'}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-semibold text-[#AEB9CC]">Имэйл</dt><dd>{applicantEmail ? <span className="flex flex-wrap items-center gap-1"><a href={`mailto:${applicantEmail}`} className="adm-link min-w-0 break-all">{applicantEmail}</a><button type="button" onClick={copyEmail} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-[#AEB9CC] hover:bg-white/[0.1]" aria-label="Имэйл хуулах">{emailCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{emailCopied ? 'Хуулсан' : 'Хуулах'}</button></span> : <span className="text-[#AEB9CC]">Бүртгэлгүй</span>}</dd></div>
          </dl>
        </section>

        {panel && <div id={`panel-${panel}`} className="adm-drawer-card !mt-0 mb-4 space-y-3 ring-1 ring-[color-mix(in_srgb,var(--hue)_45%,transparent)]">
          {panel === 'assign' && allowed.assign && <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-2"><label className="block min-w-0 flex-1 text-xs font-semibold text-[#AEB9CC]">Хариуцагч<select className={`${BOX} mt-1 min-h-11 w-full`} value={assigneeId} disabled={busy} onChange={event => setAssigneeId(event.target.value)}><option value="">Хуваарилаагүй</option>{detail.assignee?.userId && !assignees.some(person => person._id === detail.assignee.userId) && <option value={detail.assignee.userId}>{detail.assignee.name}</option>}{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label><button type="button" className={BTN} disabled={busy || assigneeId === (detail.assignee?.userId || '')} onClick={doAssign}>Хуваарилах</button></div>
            {assigneeId && (notifyEmail ? <p className="flex items-center gap-1 text-xs text-[#AEB9CC]"><Bell size={14} aria-hidden="true" />Мэдэгдэл: {notifyEmail}</p> : notifyEmail === null ? <p role="note" className="rounded-lg bg-[#F3CB55]/10 p-2 text-xs text-[#F7DC8A]">Энэ ажилтанд мэдэгдлийн имэйл бүртгэлгүй — мэдэгдэл очихгүй. Хэрэглэгчийн тохиргооноос нэмнэ үү.</p> : null)}
          </div>}

          {panel === 'status' && <div className="space-y-5">
            {statusChoices.length > 0 && <div className="space-y-2"><label className="block text-xs font-semibold text-[#AEB9CC]">Төлөв солих<select className={`${BOX} mt-1 min-h-11 w-full`} value={statusTo} disabled={busy} onChange={event => setStatusTo(event.target.value)}><option value="">Сонгох</option>{statusChoices.map(code => <option key={code} value={code}>{TASK_STATUS_LABELS[code] || code}</option>)}</select></label>
              {statusTo === 'resolved' && <label className="block text-xs font-semibold text-[#AEB9CC]">Үр дүн <span className="text-[#FFB8C5]" aria-hidden="true">*</span><select className={`${BOX} mt-1 min-h-11 w-full`} value={outcome} onChange={event => setOutcome(event.target.value)}><option value="">Сонгох</option>{TASK_OUTCOMES.map(code => <option key={code} value={code}>{TASK_OUTCOME_LABELS[code]}</option>)}</select></label>}
              {(statusTo === 'rejected' || statusTo === 'resolved') && <label className="block text-xs font-semibold text-[#AEB9CC]">{statusTo === 'rejected' ? 'Татгалзсан шалтгаан' : 'Тайлбар'} <span className="text-[#FFB8C5]" aria-hidden="true">*</span><textarea className={`${BOX} mt-1 w-full`} rows={3} maxLength={2000} value={statusNote} onChange={event => setStatusNote(event.target.value)} /></label>}
              {statusTo && statusTo !== 'rejected' && statusTo !== 'resolved' && <label className="block text-xs font-semibold text-[#AEB9CC]">Тайлбар (заавал биш)<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={statusNote} onChange={event => setStatusNote(event.target.value)} /></label>}
              <button type="button" className={BTN} disabled={busy || !statusTo} onClick={doStatus}>Төлөв хадгалах</button></div>}
            {allowed.reopen && <div className="space-y-2"><label className="block text-xs font-semibold text-[#AEB9CC]">Дахин нээх шалтгаан <span className="text-[#FFB8C5]" aria-hidden="true">*</span><textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={reopenNote} onChange={event => setReopenNote(event.target.value)} /></label><button type="button" className={BTN} disabled={busy} onClick={doReopen}>Дахин нээх</button></div>}
          </div>}

          {panel === 'note' && allowed.note && <div className="space-y-2"><label className="block text-xs font-semibold text-[#AEB9CC]">Тэмдэглэл нэмэх (дотоод, харилцагчид харагдахгүй)<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label><button type="button" className={BTN} disabled={busy || !note.trim()} onClick={doNote}>Тэмдэглэл нэмэх</button></div>}

          {panel === 'docs' && allowed.requestDocs && <div className="space-y-3">
            <p role="note" className={`rounded-lg p-2 text-xs ${applicantEmail ? 'bg-[#4CC6FF]/10 text-[#A6E6FF]' : 'bg-[#F3CB55]/10 text-[#F7DC8A]'}`}>{applicantEmail ? `Харилцагчийн ${applicantEmail} хаяг руу файл оруулах холбоос имэйлээр илгээнэ.` : 'Имэйл байхгүй — холбоосыг хуулж утсаар/мессежээр илгээнэ.'}</p>
            {docChoices.length > 0 && <div className="space-y-3">{FILE_CATEGORIES.map(category => { const list = docChoices.filter(field => categoryOf(field) === category.key); return list.length ? <fieldset key={category.key} className="space-y-1"><legend className="text-xs font-bold text-[#AEB9CC]">{category.label}</legend>{list.map(field => <label key={field.key} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={docKeys.includes(field.key)} onChange={event => setDocKeys(previous => (event.target.checked ? [...previous, field.key] : previous.filter(key => key !== field.key)))} />{field.label}</label>)}</fieldset> : null; })}</div>}
            <div className="space-y-2">{docExtra.map((text, index) => <div key={index} className="flex gap-2"><input className={`${BOX} min-h-11 flex-1`} maxLength={120} value={text} placeholder="Өөр баримт (чөлөөт бичих)" aria-label={`Өөр баримт ${index + 1}`} onChange={event => setDocExtra(previous => previous.map((value, position) => (position === index ? event.target.value : value)))} />{docExtra.length > 1 && <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-[#AEB9CC] hover:bg-[#FF6B86]/10" aria-label="Мөр хасах" onClick={() => setDocExtra(previous => previous.filter((_, position) => position !== index))}><Trash2 size={16} aria-hidden="true" /></button>}</div>)}
              {docExtra.length + docKeys.length < 10 && <button type="button" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-white" onClick={() => setDocExtra(previous => [...previous, ''])}><Plus size={14} aria-hidden="true" />Мөр нэмэх</button>}</div>
            <label className="block text-xs font-semibold text-[#AEB9CC]">Тайлбар<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={docNote} aria-describedby="doc-note-help" onChange={event => setDocNote(event.target.value)} /></label>
            <p id="doc-note-help" className="text-xs text-[#F7DC8A]">Тайлбар харилцагчийн холбоос болон имэйлд харагдана. Регистр, нэр, дүн зэрэг хувийн мэдээлэл бүү бичээрэй.</p>
            {applicantEmail && <p className="text-xs text-[#AEB9CC]">Имэйлд сонгосон материалын жагсаалт, тайлбар болон файл оруулах холбоос автоматаар орно. Дахин бичих шаардлагагүй.</p>}
            <button type="button" className={BTN} disabled={busy || docCount === 0} onClick={doDocs}><Send size={16} aria-hidden="true" />{applicantEmail ? `Сонгосон ${docCount} материалыг имэйлээр хүсэх` : `Сонгосон ${docCount} материалын холбоос үүсгэх`}</button>
          </div>}
        </div>}

        {docLink?.uploadUrl && docEmailed && !showLink && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#34D399]/10 p-3 text-sm text-[#B5F5D9]"><CheckCircle2 size={16} aria-hidden="true" /><span className="min-w-0 flex-1">Материалын жагсаалт, файл оруулах холбоос {applicantEmail} хаяг руу имэйлээр илгээгдлээ.</span><button type="button" onClick={() => setShowLink(true)} className="text-xs font-semibold underline">Холбоосыг харах</button></div>}
        {docLink?.uploadUrl && (!docEmailed || showLink) && <div className="mb-4 rounded-xl bg-white/[0.04] p-3 text-xs"><p className="mb-1 font-semibold">{docEmailed ? 'Харилцагчид илгээсэн холбоос' : 'Имэйл илгээгдээгүй — энэ холбоосыг хуулж харилцагчид утсаар/мессежээр илгээнэ үү'}{docLink.expiresAt ? ` · ${dt(docLink.expiresAt)} хүртэл` : ''}</p><div className="flex items-center gap-2"><input readOnly aria-label="Баримт оруулах холбоос" value={docLink.uploadUrl} onFocus={event => event.target.select()} className={`${BOX} min-w-0 flex-1 font-mono text-xs`} /><button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/15 px-3 font-semibold">{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Хуулсан' : 'Хуулах'}</button></div><p className="mt-2 text-[#AEB9CC]">Холбоос зөвхөн одоо харагдана. Хаасны дараа дахин авах боломжгүй.</p></div>}

        <Section title="Мэдээлэл">
          {detail.taskForm?.steps?.length ? <div className="space-y-5">{detail.taskForm.steps.map(step => <div key={step.id}><h4 className="mb-2 text-xs font-bold uppercase text-[#AEB9CC]">{step.title}</h4><dl className="grid gap-4 sm:grid-cols-2">{(step.fields || []).filter(field => !isFileField(field) && isVisible(field, detail.answers)).map(field => <TaskField key={field.key} field={field} mode="readonly" tone="dark" value={detail.answers?.[field.key]} />)}</dl></div>)}</div>
            : <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[['Хүсэгч', [detail.applicant?.lastname, detail.applicant?.firstname].filter(Boolean).join(' ') || detail.applicant?.contactName], ['Байгууллага', detail.applicant?.orgName], ['Хаяг', detail.applicant?.address], ['Зээлийн дүн', detail.request?.amount ? `${formatMoney(detail.request.amount)} ₮` : ''], ['Хугацаа', detail.request?.term ? `${detail.request.term} сар` : ''], ['Зориулалт', detail.request?.purpose], ['Эргэн төлөх эх үүсвэр', detail.request?.repaymentSource]].map(([label, value]) => <div key={label}><dt className="mb-1 text-xs font-semibold text-[#AEB9CC]">{label}</dt><dd className="whitespace-pre-wrap break-words text-[#E6EBF3]">{value || <span className="text-[#8E9AB0]">—</span>}</dd></div>)}
              {detail.applicant?.regNo && <MaskedRegister value={detail.applicant.regNo} />}
            </dl>}
        </Section>

        <Section title="Баримт">
          {groupedFiles.length === 0 ? <p className="text-sm text-[#AEB9CC]">Файл алга.</p> : <div className="space-y-5">{groupedFiles.map(category => <div key={category.key}><h4 className="mb-2 text-sm font-bold text-white">{category.label}</h4><div className="space-y-3">{category.groups.map(([label, list]) => <div key={label}><h5 className="mb-1 text-xs font-bold text-[#AEB9CC]">{label}</h5><ul className="space-y-1">{list.map(file => <li key={file.id || file.fileName} className="adm-glass-row flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm text-[#E6EBF3]"><FileText size={14} className="shrink-0 text-[#AEB9CC]" aria-hidden="true" /><span className="min-w-0 flex-1 break-all">{file.fileName} <span className="text-xs text-[#AEB9CC]">· {formatSize(file.size)} · {SOURCE_LABELS[file.source] || file.source}</span></span>{file.url && file.ref && <span className="inline-flex shrink-0 items-center gap-3"><button type="button" disabled={fileBusy === file.ref} onClick={() => openFile(file)} className="adm-row-btn disabled:opacity-50" aria-label={`${file.fileName} — шинэ табд нээх`}>{fileBusy === file.ref ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : null}Нээх<ExternalLink size={12} aria-hidden="true" /></button><button type="button" disabled={fileBusy === file.ref} onClick={() => openFile(file, true)} className="adm-row-btn disabled:opacity-50" aria-label={`${file.fileName} — татах`}>Татах<Download size={12} aria-hidden="true" /></button></span>}</li>)}</ul></div>)}</div></div>)}</div>}
          {fileError && <p role="alert" className="mt-3 rounded-lg bg-[#FF6B86]/10 px-3 py-2 text-sm text-[#FFC9D3]">{fileError}</p>}
          {allowed.uploadFiles && <div className="mt-5 space-y-2 rounded-xl border border-white/10 p-4"><p className="text-xs font-bold text-[#C5CEDC]">Файл нэмэх</p><label className="block text-xs font-semibold text-[#AEB9CC]">Хэсэг<select className={`${BOX} mt-1 min-h-11 w-full`} value={uploadKey} onChange={event => setUploadKey(event.target.value)}><option value="additional">Нэмэлт баримт</option>{fileFields.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label><input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="Нэмэх файл" onChange={event => setUploadFiles(Array.from(event.target.files || []).slice(0, 5))} className="block w-full text-xs file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:text-sm file:font-medium file:text-white text-[#C5CEDC]" /><button type="button" className={BTN} disabled={busy || !uploadFiles.length} onClick={doUpload}>Файл илгээх ({uploadFiles.length})</button></div>}
        </Section>

        <Section title="Түүх">
          {(!detail.history || detail.history.length === 0) ? <p className="text-sm text-[#AEB9CC]">{isLegacy ? `Хуучин урсгалын түүх бүртгэгдээгүй — хуучин төлөв: ${legacyLabel}` : 'Түүх алга.'}</p> : <ol className="space-y-3 border-l-2 border-white/10 pl-4">{[...detail.history].reverse().map((entry, index) => {
            const chip = entry.email ? (EMAIL_CHIPS[entry.email.result] || EMAIL_CHIPS.skipped) : null;
            return <li key={entry.id || index} className={`text-sm ${entry.type === 'message' ? 'rounded-xl border border-[#4CC6FF]/25 bg-[#4CC6FF]/10 p-3' : ''}`}><p className="text-xs text-[#AEB9CC]">{dt(entry.at)} · {entry.actor?.system ? 'Систем' : (entry.actor?.name || '—')}</p><p className="flex flex-wrap items-center gap-2 font-medium">{entry.type === 'message' && <Send size={14} className="text-[#A6E6FF]" aria-hidden="true" />}<span>{HISTORY_LABELS[entry.type] || entry.type}{entry.to ? `: ${TASK_STATUS_LABELS[entry.from] || entry.from || ''}${entry.from ? ' → ' : ''}${TASK_STATUS_LABELS[entry.to] || entry.to}` : ''}{entry.assignee?.name ? ` · ${entry.assignee.name}` : ''}{entry.outcome ? ` · ${TASK_OUTCOME_LABELS[entry.outcome?.code || entry.outcome] || ''}` : ''}</span>{chip && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chip[1]}`}>{chip[0]}</span>}</p>{Array.isArray(entry.items) && entry.items.length > 0 && <p className="text-[#AEB9CC]">Хүссэн: {entry.items.join(', ')}</p>}{entry.note && <p className="whitespace-pre-wrap break-words text-[#C5CEDC]">{entry.note}</p>}</li>;
          })}</ol>}
        </Section>
      </>}

    {deleteOpen && <ConfirmDeleteDialog reference={detail?.applicationReference} busy={deleteBusy} error={deleteError} onCancel={() => setDeleteOpen(false)} onConfirm={doDelete} />}

    {emailOpen && <div className="fixed inset-0 z-[60] grid place-items-center adm-drawer-overlay p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEmailOpen(false); }}>
      <div role="dialog" aria-modal="true" data-nested-dialog="" aria-labelledby="email-dialog-title" className="adm-drawer adm-modal w-full max-w-lg rounded-3xl p-5 sm:p-6" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) setEmailOpen(false); } }}>
        <h3 id="email-dialog-title" className="text-lg font-bold text-white">Чөлөөт имэйл бичих</h3>
        <p className="mt-1 break-all text-sm text-[#AEB9CC]">Хүлээн авагч: {applicantEmail}</p>
        {docCount > 0 && <p role="note" className="mt-3 rounded-lg bg-[#F3CB55]/10 p-2 text-xs text-[#F7DC8A]">Нэмэлт материал хүсэх бол энэ цонхыг хаагаад "Нэмэлт материал хүсэх" хэсгийн "Сонгосон {docCount} материалыг имэйлээр хүсэх" товчийг дарна уу. Тэгвэл жагсаалт, холбоос автоматаар орно.</p>}
        <label className="mt-4 block text-xs font-semibold text-[#AEB9CC]">Мессеж<textarea autoFocus className={`${BOX} mt-1 w-full`} rows={6} maxLength={2000} value={emailText} aria-describedby="email-help" onChange={event => setEmailText(event.target.value)} /></label>
        <div className="mt-1 flex justify-between gap-3 text-xs"><p id="email-help" className="text-[#F7DC8A]">Хувийн мэдээлэл бүү бичнэ үү.</p><span className="text-[#AEB9CC]">{emailText.length}/2000</span></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={BTN_LIGHT} disabled={busy} onClick={() => setEmailOpen(false)}>Болих</button><button type="button" className={BTN} disabled={busy || !emailText.trim()} onClick={doEmail}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}Илгээх</button></div>
      </div>
    </div>}
  </SideDrawer>;
}

function MaskedRegister({ value }) {
  const [shown, setShown] = useState(false);
  return <div><dt className="mb-1 text-xs font-semibold text-[#AEB9CC]">Регистр</dt><dd className="flex items-center gap-2"><span className="font-mono">{shown ? value : maskRegister(value)}</span><button type="button" aria-pressed={shown} onClick={() => setShown(v => !v)} className="min-h-8 rounded-lg px-2 text-xs text-[#AEB9CC] hover:bg-white/[0.08]">{shown ? 'Нуух' : 'Харах'}</button></dd></div>;
}
