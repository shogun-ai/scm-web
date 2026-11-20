import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, Upload } from 'lucide-react';
import TaskField from './TaskField';
import { API_URL, errorMessage, fetchUploadRequest, submitUploadFiles } from './api';
import { checkFileSelection } from './taskFormUtils';

const toField = item => ({
  key: item.key,
  kind: 'custom',
  type: 'file',
  label: item.label || item.key,
  required: false,
  accept: Array.isArray(item.accept) ? item.accept.filter(value => ['pdf', 'jpg', 'png', 'webp'].includes(value)) : null,
  maxSizeMb: item.maxSizeMb || null,
  maxFiles: item.maxFiles || 3,
});

const formatDate = value => { try { return new Date(value).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ''; } };

export default function TaskUploadForm({ token, onBack, apiUrl = API_URL }) {
  const [state, setState] = useState({ status: 'loading', data: null, message: '' });
  const [files, setFiles] = useState({});
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchUploadRequest(apiUrl, token)
      .then(data => { if (!cancelled) setState({ status: 'ready', data, message: '' }); })
      .catch(error => {
        if (cancelled) return;
        const code = error.response?.status;
        setState({ status: code === 404 || code === 410 || code === 400 ? 'invalid' : 'error', data: null, message: errorMessage(error, '') });
      });
    return () => { cancelled = true; };
  }, [apiUrl, token]);
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  const items = Array.isArray(state.data?.items) ? state.data.items : [];
  const expired = state.data?.expiresAt && new Date(state.data.expiresAt).getTime() < Date.now();
  const all = Object.values(files).flat();

  const add = (field, incoming) => {
    setUploadError('');
    const existing = files[field.key] || [];
    const message = checkFileSelection(field, existing, incoming, all.length, all.reduce((sum, file) => sum + file.size, 0));
    if (message) { setUploadError(`${field.label}: ${message}`); return; }
    setFiles(previous => ({ ...previous, [field.key]: [...existing, ...incoming] }));
  };
  const remove = (field, index) => setFiles(previous => ({ ...previous, [field.key]: (previous[field.key] || []).filter((_, position) => position !== index) }));

  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!all.length) { setSubmitError('Дор хаяж нэг файл сонгоно уу.'); return; }
    submittingRef.current = true;
    setLoading(true); setSubmitError(''); setProgress(0);
    try {
      const payload = new FormData();
      Object.entries(files).forEach(([key, list]) => list.forEach(file => payload.append(key, file)));
      await submitUploadFiles(apiUrl, token, payload, ev => { if (ev.total) setProgress(Math.round(ev.loaded / ev.total * 100)); });
      setDone(true);
      setFiles({});
    } catch (error) {
      const code = error.response?.status;
      if (code === 404 || code === 410) setState({ status: 'invalid', data: null, message: '' });
      else setSubmitError(errorMessage(error, 'Файл илгээж чадсангүй. Сонгосон файлууд энэ дэлгэцэд хадгалагдсан тул дахин оролдоно уу.'));
    } finally { submittingRef.current = false; setLoading(false); }
  };

  const shell = children => <main className="sc-public-page min-h-screen bg-[#f7f8f6] pb-20 pt-28 text-[#102d43] md:pt-32"><div className="mx-auto max-w-2xl px-5 md:px-8">
    {onBack && <button type="button" onClick={onBack} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-[#102d43]"><ArrowLeft size={17} aria-hidden="true" />Нүүр хуудас</button>}
    {children}
  </div></main>;

  if (state.status === 'loading') return shell(<p role="status" className="flex items-center gap-3 text-slate-600"><Loader2 className="animate-spin" size={20} aria-hidden="true" />Ачаалж байна…</p>);
  if (state.status === 'invalid' || (state.status === 'ready' && expired)) {
    return shell(<section role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><Clock size={44} className="mx-auto mb-5 text-amber-600" aria-hidden="true" /><h1 className="text-2xl font-semibold">Холбоос хүчингүй эсвэл хугацаа дууссан</h1><p className="mt-4 text-slate-600">Энэ холбоосоор баримт оруулах боломжгүй байна. Шинэ холбоос авахын тулд бидэнтэй холбогдоно уу.</p></section>);
  }
  if (state.status === 'error') return shell(<section role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><AlertTriangle size={44} className="mx-auto mb-5 text-red-600" aria-hidden="true" /><h1 className="text-2xl font-semibold">Ачаалж чадсангүй</h1><p className="mt-4 text-slate-600">{state.message || 'Түр хүлээгээд хуудсыг дахин ачаална уу.'}</p></section>);
  if (done) return shell(<section ref={doneRef} tabIndex={-1} role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><CheckCircle2 size={48} className="mx-auto mb-5 text-emerald-700" aria-hidden="true" /><h1 className="text-2xl font-semibold">Баримт хүлээн авлаа</h1><p className="mt-4 text-slate-600">Баярлалаа. Ажилтан таны оруулсан баримтыг хянана.</p>{state.data?.requestNo && <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">Хүсэлтийн дугаар <strong className="mt-1 block text-lg">{state.data.requestNo}</strong></p>}</section>);

  return shell(<form onSubmit={submit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
    <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-[#806735]">НЭМЭЛТ БАРИМТ</p>
    <h1 className="text-2xl font-semibold">Нэмэлт баримт оруулах</h1>
    <p className="mt-3 text-sm text-slate-600">{state.data.productName ? `${state.data.productName} · ` : ''}Хүсэлтийн дугаар <strong>{state.data.requestNo}</strong></p>
    {state.data.expiresAt && <p className="mt-1 text-xs text-slate-500">Холбоос {formatDate(state.data.expiresAt)} хүртэл хүчинтэй.</p>}
    {state.data.note && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{state.data.note}</p>}
    <fieldset disabled={loading} className="mt-6 space-y-6">
      <legend className="sr-only">Хүссэн баримтууд</legend>
      {items.length === 0 && <p className="text-sm text-slate-600">Одоогоор хүссэн баримт алга.</p>}
      {items.map(item => <div key={item.key} className="border-b border-slate-200 pb-6 last:border-0">
        {item.uploaded && <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} aria-hidden="true" />Өмнө нь оруулсан — шаардлагатай бол дахин нэмж болно</p>}
        <TaskField field={toField(item)} mode="edit" files={files[item.key] || []} onAddFiles={add} onRemoveFile={remove} disabled={loading} />
      </div>)}
    </fieldset>
    {uploadError && <p role="alert" className="mt-4 text-sm text-red-700">{uploadError}</p>}
    {submitError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{submitError}</p>}
    {loading && <p role="status" className="mt-4 text-sm text-slate-600">{progress < 100 ? `Файл илгээж байна… ${progress}%` : 'Бүртгэж байна…'}</p>}
    <button type="submit" disabled={loading || items.length === 0} className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#102d43] px-6 py-3 text-sm font-medium text-white hover:bg-[#164866] disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}Баримт илгээх</button>
  </form>);
}
