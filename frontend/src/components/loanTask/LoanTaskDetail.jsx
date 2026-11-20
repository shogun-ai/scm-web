import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCircle2, Copy, ExternalLink, FileText, Link2, Loader2, Mail, MessageSquare, Phone, Plus, Send, Trash2, UserCheck, X } from 'lucide-react';
import { LEGACY_STATUS_LABELS, TASK_OUTCOMES, TASK_OUTCOME_LABELS, TASK_STATUS_LABELS } from '@shared/loanTaskStatus';
import { PRESET_WIDGETS } from '@shared/loanWidgets';
import TaskField from './TaskField';
import TaskStatusBadge from './TaskStatusBadge';
import ConfirmDeleteDialog from '../admin/ConfirmDeleteDialog';
import { deleteLoanRequest, errorMessage, fetchTaskDetail, postDocRequest, postTaskAction, postTaskFiles, postTaskMessage } from './api';
import { FILE_CATEGORIES, categoryOf, formatMoney, isFileField, isVisible, maskRegister } from './taskFormUtils';

const BOX = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20 disabled:opacity-60';
const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50';
const BTN_LIGHT = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-[#003B5C] hover:bg-slate-50 disabled:opacity-50';
const HISTORY_LABELS = { created: 'Үүссэн', assigned: 'Хуваарилсан', unassigned: 'Хуваарилалт цуцалсан', status: 'Төлөв өөрчилсөн', reopened: 'Дахин нээсэн', docs_requested: 'Нэмэлт баримт хүссэн', note: 'Тэмдэглэл', file_added: 'Файл нэмсэн', email: 'Имэйл', message: 'Харилцагчид имэйл илгээсэн' };
const EMAIL_CHIPS = { sent: ['Имэйл илгээгдсэн', 'bg-emerald-100 text-emerald-800'], queued: ['Имэйл илгээгдэж байна', 'bg-sky-100 text-sky-800'], failed: ['Имэйл илгээж чадсангүй', 'bg-red-100 text-red-700'], skipped: ['Имэйл илгээгээгүй', 'bg-slate-100 text-slate-600'] };
const SOURCE_LABELS = { applicant: 'Харилцагч', staff: 'Ажилтан', applicant_link: 'Харилцагч (холбоосоор)' };
const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const formatSize = bytes => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);

function Section({ title, children }) {
  return <section className="border-t border-slate-200 py-5"><h3 className="mb-3 text-sm font-bold text-[#003B5C]">{title}</h3>{children}</section>;
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
  const drawerRef = useRef(null);
  const previousFocus = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await fetchTaskDetail(apiUrl, id); setDetail(data); setConflict(false); setAssigneeId(data.assignee?.userId || ''); }
    catch (err) { setError(errorMessage(err, 'Дэлгэрэнгүй ачаалж чадсангүй.')); }
    finally { setLoading(false); }
  }, [apiUrl, id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    drawerRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previousFocus.current?.focus?.(); };
  }, [onClose]);

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
        if ((field ? categoryOf(field) : 'other') !== category.key) return;
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
  const barButton = (name, label, icon) => <button type="button" aria-expanded={panel === name} aria-controls={`panel-${name}`} onClick={() => togglePanel(name)} className={`${BTN_LIGHT} ${panel === name ? 'border-[#003B5C] bg-[#003B5C]/5' : ''}`}>{icon}{label}</button>;

  return <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Хүсэлтийн дэлгэрэнгүй" className="h-full w-full overflow-y-auto bg-white shadow-2xl outline-none sm:max-w-2xl">
      <header className="border-b border-slate-200 p-5 pb-4 sm:px-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{detail?.applicationReference || ''}</p>
            <h2 className="text-xl font-bold text-[#003B5C]">{detail?.displayName || 'Хүсэлт'}</h2>
            {detail && <p className="mt-1 text-sm text-slate-700">{detail.productName || detail.productKey || '—'}{detail.subProductName ? ` · ${detail.subProductName}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100" aria-label="Хаах"><X size={20} aria-hidden="true" /></button>
        </div>
        {detail && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><TaskStatusBadge status={detail.taskStatus} outcome={detail.outcome} legacy={isLegacy} /><span className="text-slate-600">Хариуцагч: {detail.assignee?.name || 'Хуваарилаагүй'} · Үүссэн: {dt(detail.createdAt)}</span></div>}
        {isLegacy && <p className="mt-2 text-xs text-slate-500">Хуучин урсгал · төлөв: {legacyLabel}{detail.outcome?.note ? ` · ${detail.outcome.note}` : ''}</p>}
      </header>

      {detail && <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-7">
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Үйлдлүүд">
          {allowed.requestDocs && barButton('docs', 'Нэмэлт материал хүсэх', <Link2 size={16} aria-hidden="true" />)}
          <button type="button" className={BTN_LIGHT} disabled={busy || !applicantEmail || allowed.message === false} onClick={() => setEmailOpen(true)}><Mail size={16} aria-hidden="true" />Чөлөөт имэйл бичих</button>
          {(statusChoices.length > 0 || allowed.reopen) && barButton('status', 'Төлөв солих', <Check size={16} aria-hidden="true" />)}
          {allowed.assign && barButton('assign', 'Хуваарилах', <UserCheck size={16} aria-hidden="true" />)}
          {allowed.note && barButton('note', 'Тэмдэглэл', <MessageSquare size={16} aria-hidden="true" />)}
          {detail.canDelete && <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 size={16} aria-hidden="true" />Устгах</button>}
        </div>
        {!applicantEmail && <p className="mt-2 text-xs text-amber-700">Харилцагчийн имэйл бүртгэлгүй тул имэйл илгээх боломжгүй. Утсаар холбогдоно уу.</p>}
      </div>}

      <div className="p-5 sm:px-7">
        {loading && !detail && <p role="status" className="flex items-center gap-2 text-slate-600"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
        {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{conflict && <button type="button" onClick={load} className="ml-3 font-semibold underline">Дахин ачаалах</button>}</div>}
        {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

        {detail && <>
          <section aria-labelledby="applicant-card" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 id="applicant-card" className="mb-2 text-sm font-bold text-[#003B5C]">Харилцагчийн холбоо барих</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs font-semibold text-slate-500">Нэр</dt><dd className="break-words text-slate-800">{applicantName || '—'}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Утас</dt><dd>{applicantPhone ? <a href={`tel:${applicantPhone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-9 items-center gap-1 font-semibold text-[#003B5C] underline"><Phone size={14} aria-hidden="true" />{applicantPhone}</a> : '—'}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">Имэйл</dt><dd>{applicantEmail ? <span className="flex flex-wrap items-center gap-1"><a href={`mailto:${applicantEmail}`} className="min-w-0 break-all font-semibold text-[#003B5C] underline">{applicantEmail}</a><button type="button" onClick={copyEmail} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-200" aria-label="Имэйл хуулах">{emailCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{emailCopied ? 'Хуулсан' : 'Хуулах'}</button></span> : <span className="text-slate-500">Бүртгэлгүй</span>}</dd></div>
            </dl>
          </section>

          {panel && <div id={`panel-${panel}`} className="mb-4 space-y-3 rounded-xl border border-[#003B5C]/30 bg-white p-4">
            {panel === 'assign' && allowed.assign && <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2"><label className="block min-w-0 flex-1 text-xs font-semibold text-slate-600">Хариуцагч<select className={`${BOX} mt-1 min-h-11 w-full`} value={assigneeId} disabled={busy} onChange={event => setAssigneeId(event.target.value)}><option value="">Хуваарилаагүй</option>{detail.assignee?.userId && !assignees.some(person => person._id === detail.assignee.userId) && <option value={detail.assignee.userId}>{detail.assignee.name}</option>}{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label><button type="button" className={BTN} disabled={busy || assigneeId === (detail.assignee?.userId || '')} onClick={doAssign}>Хуваарилах</button></div>
              {assigneeId && (notifyEmail ? <p className="flex items-center gap-1 text-xs text-slate-600"><Bell size={14} aria-hidden="true" />Мэдэгдэл: {notifyEmail}</p> : notifyEmail === null ? <p role="note" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Энэ ажилтанд мэдэгдлийн имэйл бүртгэлгүй — мэдэгдэл очихгүй. Хэрэглэгчийн тохиргооноос нэмнэ үү.</p> : null)}
            </div>}

            {panel === 'status' && <div className="space-y-5">
              {statusChoices.length > 0 && <div className="space-y-2"><label className="block text-xs font-semibold text-slate-600">Төлөв солих<select className={`${BOX} mt-1 min-h-11 w-full`} value={statusTo} disabled={busy} onChange={event => setStatusTo(event.target.value)}><option value="">Сонгох</option>{statusChoices.map(code => <option key={code} value={code}>{TASK_STATUS_LABELS[code] || code}</option>)}</select></label>
                {statusTo === 'resolved' && <label className="block text-xs font-semibold text-slate-600">Үр дүн <span className="text-red-600" aria-hidden="true">*</span><select className={`${BOX} mt-1 min-h-11 w-full`} value={outcome} onChange={event => setOutcome(event.target.value)}><option value="">Сонгох</option>{TASK_OUTCOMES.map(code => <option key={code} value={code}>{TASK_OUTCOME_LABELS[code]}</option>)}</select></label>}
                {(statusTo === 'rejected' || statusTo === 'resolved') && <label className="block text-xs font-semibold text-slate-600">{statusTo === 'rejected' ? 'Татгалзсан шалтгаан' : 'Тайлбар'} <span className="text-red-600" aria-hidden="true">*</span><textarea className={`${BOX} mt-1 w-full`} rows={3} maxLength={2000} value={statusNote} onChange={event => setStatusNote(event.target.value)} /></label>}
                {statusTo && statusTo !== 'rejected' && statusTo !== 'resolved' && <label className="block text-xs font-semibold text-slate-600">Тайлбар (заавал биш)<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={statusNote} onChange={event => setStatusNote(event.target.value)} /></label>}
                <button type="button" className={BTN} disabled={busy || !statusTo} onClick={doStatus}>Төлөв хадгалах</button></div>}
              {allowed.reopen && <div className="space-y-2"><label className="block text-xs font-semibold text-slate-600">Дахин нээх шалтгаан <span className="text-red-600" aria-hidden="true">*</span><textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={reopenNote} onChange={event => setReopenNote(event.target.value)} /></label><button type="button" className={BTN} disabled={busy} onClick={doReopen}>Дахин нээх</button></div>}
            </div>}

            {panel === 'note' && allowed.note && <div className="space-y-2"><label className="block text-xs font-semibold text-slate-600">Тэмдэглэл нэмэх (дотоод, харилцагчид харагдахгүй)<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label><button type="button" className={BTN} disabled={busy || !note.trim()} onClick={doNote}>Тэмдэглэл нэмэх</button></div>}

            {panel === 'docs' && allowed.requestDocs && <div className="space-y-3">
              <p role="note" className={`rounded-lg p-2 text-xs ${applicantEmail ? 'bg-sky-50 text-sky-900' : 'bg-amber-50 text-amber-800'}`}>{applicantEmail ? `Харилцагчийн ${applicantEmail} хаяг руу файл оруулах холбоос имэйлээр илгээнэ.` : 'Имэйл байхгүй — холбоосыг хуулж утсаар/мессежээр илгээнэ.'}</p>
              {docChoices.length > 0 && <div className="space-y-3">{FILE_CATEGORIES.map(category => { const list = docChoices.filter(field => categoryOf(field) === category.key); return list.length ? <fieldset key={category.key} className="space-y-1"><legend className="text-xs font-bold text-slate-500">{category.label}</legend>{list.map(field => <label key={field.key} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={docKeys.includes(field.key)} onChange={event => setDocKeys(previous => (event.target.checked ? [...previous, field.key] : previous.filter(key => key !== field.key)))} />{field.label}</label>)}</fieldset> : null; })}</div>}
              <div className="space-y-2">{docExtra.map((text, index) => <div key={index} className="flex gap-2"><input className={`${BOX} min-h-11 flex-1`} maxLength={120} value={text} placeholder="Өөр баримт (чөлөөт бичих)" aria-label={`Өөр баримт ${index + 1}`} onChange={event => setDocExtra(previous => previous.map((value, position) => (position === index ? event.target.value : value)))} />{docExtra.length > 1 && <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-red-50" aria-label="Мөр хасах" onClick={() => setDocExtra(previous => previous.filter((_, position) => position !== index))}><Trash2 size={16} aria-hidden="true" /></button>}</div>)}
                {docExtra.length + docKeys.length < 10 && <button type="button" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-[#003B5C]" onClick={() => setDocExtra(previous => [...previous, ''])}><Plus size={14} aria-hidden="true" />Мөр нэмэх</button>}</div>
              <label className="block text-xs font-semibold text-slate-600">Тайлбар<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={2000} value={docNote} aria-describedby="doc-note-help" onChange={event => setDocNote(event.target.value)} /></label>
              <p id="doc-note-help" className="text-xs text-amber-700">Тайлбар харилцагчийн холбоос болон имэйлд харагдана. Регистр, нэр, дүн зэрэг хувийн мэдээлэл бүү бичээрэй.</p>
              {applicantEmail && <p className="text-xs text-slate-600">Имэйлд сонгосон материалын жагсаалт, тайлбар болон файл оруулах холбоос автоматаар орно. Дахин бичих шаардлагагүй.</p>}
              <button type="button" className={BTN} disabled={busy || docCount === 0} onClick={doDocs}><Send size={16} aria-hidden="true" />{applicantEmail ? `Сонгосон ${docCount} материалыг имэйлээр хүсэх` : `Сонгосон ${docCount} материалын холбоос үүсгэх`}</button>
            </div>}
          </div>}

          {docLink?.uploadUrl && docEmailed && !showLink && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 size={16} aria-hidden="true" /><span className="min-w-0 flex-1">Материалын жагсаалт, файл оруулах холбоос {applicantEmail} хаяг руу имэйлээр илгээгдлээ.</span><button type="button" onClick={() => setShowLink(true)} className="text-xs font-semibold underline">Холбоосыг харах</button></div>}
          {docLink?.uploadUrl && (!docEmailed || showLink) && <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs"><p className="mb-1 font-semibold">{docEmailed ? 'Харилцагчид илгээсэн холбоос' : 'Имэйл илгээгдээгүй — энэ холбоосыг хуулж харилцагчид утсаар/мессежээр илгээнэ үү'}{docLink.expiresAt ? ` · ${dt(docLink.expiresAt)} хүртэл` : ''}</p><div className="flex items-center gap-2"><input readOnly aria-label="Баримт оруулах холбоос" value={docLink.uploadUrl} onFocus={event => event.target.select()} className={`${BOX} min-w-0 flex-1 font-mono text-xs`} /><button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 font-semibold">{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Хуулсан' : 'Хуулах'}</button></div><p className="mt-2 text-slate-500">Холбоос зөвхөн одоо харагдана. Хаасны дараа дахин авах боломжгүй.</p></div>}

          <Section title="Мэдээлэл">
            {detail.taskForm?.steps?.length ? <div className="space-y-5">{detail.taskForm.steps.map(step => <div key={step.id}><h4 className="mb-2 text-xs font-bold uppercase text-slate-500">{step.title}</h4><dl className="grid gap-4 sm:grid-cols-2">{(step.fields || []).filter(field => !isFileField(field) && isVisible(field, detail.answers)).map(field => <TaskField key={field.key} field={field} mode="readonly" value={detail.answers?.[field.key]} />)}</dl></div>)}</div>
              : <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[['Хүсэгч', [detail.applicant?.lastname, detail.applicant?.firstname].filter(Boolean).join(' ') || detail.applicant?.contactName], ['Байгууллага', detail.applicant?.orgName], ['Хаяг', detail.applicant?.address], ['Зээлийн дүн', detail.request?.amount ? `${formatMoney(detail.request.amount)} ₮` : ''], ['Хугацаа', detail.request?.term ? `${detail.request.term} сар` : ''], ['Зориулалт', detail.request?.purpose], ['Эргэн төлөх эх үүсвэр', detail.request?.repaymentSource]].map(([label, value]) => <div key={label}><dt className="mb-1 text-xs font-semibold text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-slate-800">{value || <span className="text-slate-400">—</span>}</dd></div>)}
                {detail.applicant?.regNo && <MaskedRegister value={detail.applicant.regNo} />}
              </dl>}
          </Section>

          <Section title="Баримт">
            {groupedFiles.length === 0 ? <p className="text-sm text-slate-500">Файл алга.</p> : <div className="space-y-5">{groupedFiles.map(category => <div key={category.key}><h4 className="mb-2 text-sm font-bold text-[#003B5C]">{category.label}</h4><div className="space-y-3">{category.groups.map(([label, list]) => <div key={label}><h5 className="mb-1 text-xs font-bold text-slate-500">{label}</h5><ul className="space-y-1">{list.map(file => <li key={file.id || file.fileName} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><FileText size={14} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="min-w-0 flex-1 break-all">{file.fileName} <span className="text-xs text-slate-500">· {formatSize(file.size)} · {SOURCE_LABELS[file.source] || file.source}</span></span>{file.url && <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#003B5C] underline" aria-label={`${file.fileName} — шинэ табд нээх`}>Нээх<ExternalLink size={12} aria-hidden="true" /></a>}</li>)}</ul></div>)}</div></div>)}</div>}
            {allowed.uploadFiles && <div className="mt-5 space-y-2 rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-700">Файл нэмэх</p><label className="block text-xs font-semibold text-slate-600">Хэсэг<select className={`${BOX} mt-1 min-h-11 w-full`} value={uploadKey} onChange={event => setUploadKey(event.target.value)}><option value="additional">Нэмэлт баримт</option>{fileFields.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label><input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="Нэмэх файл" onChange={event => setUploadFiles(Array.from(event.target.files || []).slice(0, 5))} className="block w-full text-xs file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-medium" /><button type="button" className={BTN} disabled={busy || !uploadFiles.length} onClick={doUpload}>Файл илгээх ({uploadFiles.length})</button></div>}
          </Section>

          <Section title="Түүх">
            {(!detail.history || detail.history.length === 0) ? <p className="text-sm text-slate-500">{isLegacy ? `Хуучин урсгалын түүх бүртгэгдээгүй — хуучин төлөв: ${legacyLabel}` : 'Түүх алга.'}</p> : <ol className="space-y-3 border-l-2 border-slate-200 pl-4">{[...detail.history].reverse().map((entry, index) => {
              const chip = entry.email ? (EMAIL_CHIPS[entry.email.result] || EMAIL_CHIPS.skipped) : null;
              return <li key={entry.id || index} className={`text-sm ${entry.type === 'message' ? 'rounded-xl border border-sky-200 bg-sky-50 p-3' : ''}`}><p className="text-xs text-slate-500">{dt(entry.at)} · {entry.actor?.system ? 'Систем' : (entry.actor?.name || '—')}</p><p className="flex flex-wrap items-center gap-2 font-medium">{entry.type === 'message' && <Send size={14} className="text-sky-700" aria-hidden="true" />}<span>{HISTORY_LABELS[entry.type] || entry.type}{entry.to ? `: ${TASK_STATUS_LABELS[entry.from] || entry.from || ''}${entry.from ? ' → ' : ''}${TASK_STATUS_LABELS[entry.to] || entry.to}` : ''}{entry.assignee?.name ? ` · ${entry.assignee.name}` : ''}{entry.outcome ? ` · ${TASK_OUTCOME_LABELS[entry.outcome?.code || entry.outcome] || ''}` : ''}</span>{chip && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chip[1]}`}>{chip[0]}</span>}</p>{Array.isArray(entry.items) && entry.items.length > 0 && <p className="text-slate-600">Хүссэн: {entry.items.join(', ')}</p>}{entry.note && <p className="whitespace-pre-wrap break-words text-slate-700">{entry.note}</p>}</li>;
            })}</ol>}
          </Section>
        </>}
      </div>

      {deleteOpen && <ConfirmDeleteDialog reference={detail?.applicationReference} busy={deleteBusy} error={deleteError} onCancel={() => setDeleteOpen(false)} onConfirm={doDelete} />}

      {emailOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEmailOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="email-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) setEmailOpen(false); } }}>
          <h3 id="email-dialog-title" className="text-lg font-bold text-[#003B5C]">Чөлөөт имэйл бичих</h3>
          <p className="mt-1 break-all text-sm text-slate-600">Хүлээн авагч: {applicantEmail}</p>
          {docCount > 0 && <p role="note" className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Нэмэлт материал хүсэх бол энэ цонхыг хаагаад "Нэмэлт материал хүсэх" хэсгийн "Сонгосон {docCount} материалыг имэйлээр хүсэх" товчийг дарна уу. Тэгвэл жагсаалт, холбоос автоматаар орно.</p>}
          <label className="mt-4 block text-xs font-semibold text-slate-600">Мессеж<textarea autoFocus className={`${BOX} mt-1 w-full`} rows={6} maxLength={2000} value={emailText} aria-describedby="email-help" onChange={event => setEmailText(event.target.value)} /></label>
          <div className="mt-1 flex justify-between gap-3 text-xs"><p id="email-help" className="text-amber-700">Хувийн мэдээлэл бүү бичнэ үү.</p><span className="text-slate-500">{emailText.length}/2000</span></div>
          <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={BTN_LIGHT} disabled={busy} onClick={() => setEmailOpen(false)}>Болих</button><button type="button" className={BTN} disabled={busy || !emailText.trim()} onClick={doEmail}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}Илгээх</button></div>
        </div>
      </div>}
    </aside>
  </div>;
}

function MaskedRegister({ value }) {
  const [shown, setShown] = useState(false);
  return <div><dt className="mb-1 text-xs font-semibold text-slate-500">Регистр</dt><dd className="flex items-center gap-2"><span className="font-mono">{shown ? value : maskRegister(value)}</span><button type="button" aria-pressed={shown} onClick={() => setShown(v => !v)} className="min-h-8 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100">{shown ? 'Нуух' : 'Харах'}</button></dd></div>;
}
