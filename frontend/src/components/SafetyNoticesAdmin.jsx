import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, ImagePlus, X } from 'lucide-react';
import { requestSafetyNotices } from '../safetyNoticesApi';

export default function SafetyNoticesAdmin({ token, uploadImage }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    const isEditing = !!draft;
    if (isEditing && !wasEditingRef.current) {
      formRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
    wasEditingRef.current = isEditing;
  }, [draft]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    const load = async () => {
      try {
        if (!token) throw new Error('Дахин нэвтэрнэ үү.');
        const result = await requestSafetyNotices({ token, signal: controller.signal });
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.name === 'AbortError' ? 'Сервер хариу өгсөнгүй. Дахин ачаална уу.' : err.message);
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [token, attempt]);

  const reload = () => {
    if (draft && !window.confirm('Хадгалаагүй өөрчлөлтийг орхиод дахин ачаалах уу?')) return;
    setDraft(null); setData(null); setError(''); setSuccess(''); setLoading(true); setAttempt(value => value + 1);
  };

  const persist = async (notices, message) => {
    if (!token || !data || saving) return;
    setSaving(true); setError(''); setSuccess('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await requestSafetyNotices({ token, notices, revision: data.revision, signal: controller.signal });
      setData(result); setDraft(null); setSuccess(message);
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Сервер хариу өгсөнгүй. Хадгалсан эсэхийг дахин ачаалж шалгана уу.' : err.message);
    } finally {
      clearTimeout(timeout); setSaving(false);
    }
  };

  const saveDraft = event => {
    event.preventDefault();
    const notice = { ...draft, title: draft.title.trim(), body: draft.body.trim(), order: Number(draft.order) };
    if (!notice.title || !notice.body || !Number.isInteger(notice.order)) {
      setError('Гарчиг, зөвлөмжийн текст болон дарааллыг бүрэн оруулна уу.'); return;
    }
    const exists = data.notices.some(item => item.id === notice.id);
    persist(exists ? data.notices.map(item => item.id === notice.id ? notice : item) : [...data.notices, notice], 'Сэрэмжлүүлэг хадгалагдлаа.');
  };

  const handleImageChange = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !draft) return;
    setError(''); setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      setDraft(current => current ? { ...current, imageUrl: url } : current);
    } catch {
      setError('Зураг оруулахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#003B5C]"><ShieldCheck size={23} /> Сэрэмжлүүлэг</h3>
          <p className="mt-2 text-sm text-slate-500">Нийтэлсэн зөвлөмжүүд нүүрний слайдерын сэрэмжлүүлгийн хуудсанд харагдана. Эхний зөвлөмж том гарчигтай байна.</p>
        </div>
        <button type="button" onClick={reload} disabled={saving || loading} className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Дахин ачаалах</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status">Мэдээлэл ачаалж байна…</p> : data && <>
        <button type="button" disabled={saving || !!draft || data.notices.length >= 30} onClick={() => {
          setSuccess(''); setError('');
          setDraft({ id: crypto.randomUUID(), title: '', body: '', isPublished: true, imageUrl: '', order: Math.min(1000000, Math.max(0, ...data.notices.map(item => item.order)) + 1) });
        }} className="flex items-center gap-2 rounded-xl bg-[#003B5C] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={17} /> Сэрэмжлүүлэг нэмэх</button>
        {data.notices.length >= 30 && <p className="text-sm text-slate-500">Хамгийн ихдээ 30 сэрэмжлүүлэг хадгална.</p>}
        {draft && <form ref={formRef} onSubmit={saveDraft} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm scroll-mt-6">
          <fieldset disabled={saving} className="space-y-4">
            <legend className="mb-3 font-bold text-[#003B5C]">{data.notices.some(item => item.id === draft.id) ? 'Сэрэмжлүүлэг засах' : 'Шинэ сэрэмжлүүлэг'}</legend>
            <label className="block text-sm font-semibold">Гарчиг
              <input autoFocus required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Зөвлөмжийн текст
              <textarea required maxLength={2000} rows={6} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal" />
              <span className="text-xs font-normal text-slate-400">{draft.body.length}/2000 тэмдэгт</span>
            </label>
            <div className="space-y-2">
              <span className="block text-sm font-semibold">Холбоотой зураг (сонголт)</span>
              <div className="flex flex-wrap items-center gap-3">
                {draft.imageUrl && <img src={draft.imageUrl} alt={draft.title || 'Зураг preview'} className="h-20 w-20 rounded-xl border object-cover" />}
                <button type="button" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-normal text-slate-700 disabled:opacity-50">
                  <ImagePlus size={16} /> {uploadingImage ? 'Оруулж байна…' : draft.imageUrl ? 'Зураг солих' : 'Зураг нэмэх'}
                </button>
                {draft.imageUrl && <button type="button" onClick={() => setDraft({ ...draft, imageUrl: '' })} className="flex items-center gap-1 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-normal text-red-600"><X size={14} /> Хасах</button>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
              <p className="text-xs font-normal text-slate-400">Энэ зураг сэрэмжлүүлгийн текстийн хажууд/ард харагдана.</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="text-sm font-semibold">Дараалал <input type="number" required min={0} max={1000000} step={1} value={draft.order} onChange={event => setDraft({ ...draft, order: event.target.value })} className="ml-2 w-24 rounded-lg border p-2 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isPublished} onChange={event => setDraft({ ...draft, isPublished: event.target.checked })} /> Нүүр хуудсанд нийтлэх</label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-xl bg-[#003B5C] px-5 py-2.5 font-bold text-white">{saving ? 'Хадгалж байна…' : 'Хадгалах'}</button>
              <button type="button" onClick={() => { setDraft(null); setError(''); }} className="rounded-xl border bg-white px-5 py-2.5 text-slate-700">Болих</button>
            </div>
          </fieldset>
        </form>}
        {data.notices.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">Сэрэмжлүүлэг байхгүй байна. Шинээр нэмэхэд нийтэлсэн мэдээлэл нүүр хуудсанд харагдана.</p>}
        <div className="space-y-3">
          {[...data.notices].sort((a, b) => a.order - b.order).map(notice => <article key={notice.id} className="min-w-0 rounded-xl border bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-1 ${notice.isPublished ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{notice.isPublished ? 'Нийтэлсэн' : 'Нуусан'}</span>
              <span className="text-slate-400">Дараалал: {notice.order}</span>
            </div>
            <div className="flex gap-4">
              {notice.imageUrl && <img src={notice.imageUrl} alt={notice.title} className="h-16 w-16 shrink-0 rounded-lg border object-cover" />}
              <div className="min-w-0">
                <h4 className="break-words font-bold text-[#003B5C]">{notice.title}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{notice.body}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={saving || !!draft} onClick={() => { setDraft({ ...notice }); setSuccess(''); setError(''); }} className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"><Pencil size={14} /> Засах</button>
              <button type="button" disabled={saving || !!draft} onClick={() => persist(data.notices.map(item => item.id === notice.id ? { ...item, isPublished: !item.isPublished } : item), notice.isPublished ? 'Сэрэмжлүүлгийг нуусан.' : 'Сэрэмжлүүлэг нийтлэгдлээ.')} className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50">{notice.isPublished ? 'Нуух' : 'Нийтлэх'}</button>
              <button type="button" disabled={saving || !!draft} aria-label={`${notice.title} — устгах`} onClick={() => { if (window.confirm(`«${notice.title}» сэрэмжлүүлгийг устгах уу?`)) persist(data.notices.filter(item => item.id !== notice.id), 'Сэрэмжлүүлэг устгагдлаа.'); }} className="flex items-center gap-1 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm text-red-600 disabled:opacity-50"><Trash2 size={14} /> Устгах</button>
            </div>
          </article>)}
        </div>
      </>}
    </div>
  );
}
