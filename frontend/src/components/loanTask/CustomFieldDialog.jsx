import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { FILE_FORMATS, slugify } from '@shared/loanWidgets';
import { makeCustomKey } from './configHelpers';

const BOX = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';
const TYPE_LABELS = { text: 'Текст', number: 'Тоо', date: 'Огноо', select: 'Сонголт', yesno: 'Тийм/Үгүй', file: 'Файл' };
const CUSTOM_TYPES = Object.keys(TYPE_LABELS);

export default function CustomFieldDialog({ initial, takenKeys, onSave, onCancel }) {
  const editing = Boolean(initial);
  const [draft, setDraft] = useState(() => initial ? { ...initial, options: initial.options || [] } : { type: 'text', label: '', helpText: '', placeholder: '', required: false, maxLength: '', min: '', max: '', options: [{ value: '', label: '' }], accept: ['pdf', 'jpg', 'png', 'webp'], maxSizeMb: 10, maxFiles: 1 });
  const [error, setError] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('input')?.focus();
    const onKey = event => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const set = patch => setDraft(previous => ({ ...previous, ...patch }));
  const formats = Object.keys(FILE_FORMATS || {});

  const save = () => {
    const label = String(draft.label || '').trim();
    if (!label) { setError('Талбарын нэрийг оруулна уу.'); return; }
    const field = { kind: 'custom', key: editing ? initial.key : makeCustomKey(label, takenKeys), type: draft.type, label, required: Boolean(draft.required) };
    if (draft.helpText?.trim()) field.helpText = draft.helpText.trim();
    if (draft.placeholder?.trim()) field.placeholder = draft.placeholder.trim();
    if (draft.type === 'text' && draft.maxLength !== '' && draft.maxLength != null) field.maxLength = Number(draft.maxLength);
    if (draft.type === 'number' || draft.type === 'date') {
      if (draft.min !== '' && draft.min != null) field.min = draft.type === 'number' ? Number(draft.min) : draft.min;
      if (draft.max !== '' && draft.max != null) field.max = draft.type === 'number' ? Number(draft.max) : draft.max;
    }
    if (draft.type === 'select') {
      const options = (draft.options || []).map(option => ({ label: String(option.label || '').trim(), value: String(option.value || '').trim() })).filter(option => option.label);
      if (!options.length) { setError('Дор хаяж нэг сонголт нэмнэ үү.'); return; }
      const used = new Set();
      field.options = options.map((option, index) => {
        let value = option.value || (slugify(option.label) || `opt-${index + 1}`).replace(/[^a-z0-9_-]/g, '-').slice(0, 36) || `opt-${index + 1}`;
        while (used.has(value)) value = `${value.slice(0, 34)}-${index + 1}`;
        used.add(value);
        return { label: option.label, value };
      });
    }
    if (draft.type === 'file') {
      if (!draft.accept?.length) { setError('Дор хаяж нэг файлын формат сонгоно уу.'); return; }
      field.accept = draft.accept;
      field.maxSizeMb = Math.min(10, Math.max(1, Number(draft.maxSizeMb) || 10));
      field.maxFiles = Math.min(5, Math.max(1, Number(draft.maxFiles) || 1));
    }
    onSave(field);
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="cfd-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><h3 id="cfd-title" className="text-lg font-bold text-[#003B5C]">{editing ? 'Тусгай талбар засах' : 'Тусгай талбар нэмэх'}</h3><button type="button" onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="Хаах"><X size={18} aria-hidden="true" /></button></div>
      <div className="space-y-4">
        <label className="block text-xs font-semibold text-slate-600">Нэр <span className="text-red-600" aria-hidden="true">*</span><input className={`${BOX} mt-1`} maxLength={120} value={draft.label} onChange={event => set({ label: event.target.value })} /></label>
        <label className="block text-xs font-semibold text-slate-600">Төрөл<select className={`${BOX} mt-1`} value={draft.type} disabled={editing} onChange={event => set({ type: event.target.value })}>{CUSTOM_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-600">Тайлбар<input className={`${BOX} mt-1`} maxLength={300} value={draft.helpText || ''} onChange={event => set({ helpText: event.target.value })} /></label>
        {['text', 'number', 'select'].includes(draft.type) && <label className="block text-xs font-semibold text-slate-600">Placeholder<input className={`${BOX} mt-1`} maxLength={120} value={draft.placeholder || ''} onChange={event => set({ placeholder: event.target.value })} /></label>}
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={Boolean(draft.required)} onChange={event => set({ required: event.target.checked })} />Заавал бөглөх</label>
        {draft.type === 'text' && <label className="block text-xs font-semibold text-slate-600">Хамгийн их урт (1–1000)<input type="number" min="1" max="1000" className={`${BOX} mt-1`} value={draft.maxLength ?? ''} onChange={event => set({ maxLength: event.target.value })} /></label>}
        {draft.type === 'number' && <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-600">Доод утга<input type="number" className={`${BOX} mt-1`} value={draft.min ?? ''} onChange={event => set({ min: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Дээд утга<input type="number" className={`${BOX} mt-1`} value={draft.max ?? ''} onChange={event => set({ max: event.target.value })} /></label></div>}
        {draft.type === 'date' && <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-600">Эхний огноо<input type="date" className={`${BOX} mt-1`} value={draft.min ?? ''} onChange={event => set({ min: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Сүүлийн огноо<input type="date" className={`${BOX} mt-1`} value={draft.max ?? ''} onChange={event => set({ max: event.target.value })} /></label></div>}
        {draft.type === 'select' && <fieldset className="space-y-2"><legend className="text-xs font-semibold text-slate-600">Сонголтууд</legend>{(draft.options || []).map((option, index) => <div key={index} className="flex gap-2"><input className={BOX} maxLength={100} value={option.label || ''} aria-label={`Сонголт ${index + 1}`} onChange={event => set({ options: draft.options.map((item, position) => (position === index ? { ...item, label: event.target.value } : item)) })} /><button type="button" disabled={draft.options.length <= 1} onClick={() => set({ options: draft.options.filter((_, position) => position !== index) })} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Сонголт ${index + 1} хасах`}><Trash2 size={16} aria-hidden="true" /></button></div>)}{draft.options.length < 30 && <button type="button" onClick={() => set({ options: [...draft.options, { value: '', label: '' }] })} className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-[#003B5C]"><Plus size={14} aria-hidden="true" />Сонголт нэмэх</button>}</fieldset>}
        {draft.type === 'file' && <div className="space-y-3"><fieldset><legend className="mb-1 text-xs font-semibold text-slate-600">Зөвшөөрөх формат</legend><div className="flex flex-wrap gap-3">{formats.map(format => <label key={format} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={draft.accept?.includes(format)} onChange={event => set({ accept: event.target.checked ? [...(draft.accept || []), format] : (draft.accept || []).filter(item => item !== format) })} />{format.toUpperCase()}</label>)}</div></fieldset><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-600">Хамгийн их MB (1–10)<input type="number" min="1" max="10" className={`${BOX} mt-1`} value={draft.maxSizeMb ?? ''} onChange={event => set({ maxSizeMb: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Хамгийн их тоо (1–5)<input type="number" min="1" max="5" className={`${BOX} mt-1`} value={draft.maxFiles ?? ''} onChange={event => set({ maxFiles: event.target.value })} /></label></div></div>}
        {editing && <p className="text-xs text-slate-500">Түлхүүр: <span className="font-mono">{initial.key}</span> (өөрчлөгдөхгүй)</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm">Болих</button><button type="button" onClick={save} className="min-h-11 rounded-xl bg-[#003B5C] px-5 text-sm font-semibold text-white">Хадгалах</button></div>
      </div>
    </div>
  </div>;
}
