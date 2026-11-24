import { useState } from 'react';
import { FILE_FORMATS, slugify } from '@shared/loanWidgets';
import OptionsEditor from './OptionsEditor';
import { makeCustomKey } from './configHelpers';
import { Modal } from '../admin/ui/Modal';
import Button from '../admin/ui/Button';
import { Field, Input, Select } from '../admin/ui/Form';

const CHECK = 'h-[18px] w-[18px] shrink-0 accent-[#0369A1]';
const TYPE_LABELS = { text: 'Текст', number: 'Тоо', date: 'Огноо', select: 'Сонголт', multiselect: 'Олон сонголт', yesno: 'Тийм/Үгүй', file: 'Файл' };
const CUSTOM_TYPES = Object.keys(TYPE_LABELS);

export default function CustomFieldDialog({ initial, takenKeys, onSave, onCancel }) {
  const editing = Boolean(initial);
  const [draft, setDraft] = useState(() => initial ? { ...initial, options: initial.options || [] } : { type: 'text', label: '', helpText: '', placeholder: '', required: false, maxLength: '', min: '', max: '', options: [{ value: '', label: '' }], accept: ['pdf', 'jpg', 'png', 'webp'], maxSizeMb: 10, maxFiles: 1 });
  const [error, setError] = useState('');
  // Modal primitive: focus moves to the first input, Escape / backdrop click cancel, focus returns on close.
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
    if (draft.type === 'select' || draft.type === 'multiselect') {
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

  const L = 'light';
  return <Modal title={editing ? 'Тусгай талбар засах' : 'Тусгай талбар нэмэх'} description={editing ? <>Түлхүүр: <span className="font-mono">{initial.key}</span> (өөрчлөгдөхгүй)</> : 'Маягтад шинэ асуулт нэмнэ.'} onClose={onCancel}
    footer={<><Button variant="light" onClick={onCancel}>Болих</Button><Button variant="ink" onClick={save}>Хадгалах</Button></>}>
    <div className="max-h-[60vh] space-y-4 overflow-y-auto px-0.5 pb-1 [--drawer-ink:#0369A1] [--hue:#4CC6FF]">
      <Field tone={L} label="Нэр" required>{({ id }) => <Input tone={L} id={id} maxLength={120} value={draft.label} onChange={event => set({ label: event.target.value })} />}</Field>
      <Field tone={L} label="Төрөл">{({ id }) => <Select tone={L} id={id} value={draft.type} disabled={editing} onChange={event => set({ type: event.target.value })}>{CUSTOM_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</Select>}</Field>
      <Field tone={L} label="Тайлбар">{({ id }) => <Input tone={L} id={id} maxLength={300} value={draft.helpText || ''} onChange={event => set({ helpText: event.target.value })} />}</Field>
      {['text', 'number', 'select'].includes(draft.type) && <Field tone={L} label="Placeholder">{({ id }) => <Input tone={L} id={id} maxLength={120} value={draft.placeholder || ''} onChange={event => set({ placeholder: event.target.value })} />}</Field>}
      <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-slate-800"><input type="checkbox" className={CHECK} checked={Boolean(draft.required)} onChange={event => set({ required: event.target.checked })} />Заавал бөглөх</label>
      {draft.type === 'text' && <Field tone={L} label="Хамгийн их урт (1–1000)">{({ id }) => <Input tone={L} id={id} type="number" min="1" max="1000" value={draft.maxLength ?? ''} onChange={event => set({ maxLength: event.target.value })} />}</Field>}
      {draft.type === 'number' && <div className="grid grid-cols-2 gap-3"><Field tone={L} label="Доод утга">{({ id }) => <Input tone={L} id={id} type="number" value={draft.min ?? ''} onChange={event => set({ min: event.target.value })} />}</Field><Field tone={L} label="Дээд утга">{({ id }) => <Input tone={L} id={id} type="number" value={draft.max ?? ''} onChange={event => set({ max: event.target.value })} />}</Field></div>}
      {draft.type === 'date' && <div className="grid grid-cols-2 gap-3"><Field tone={L} label="Эхний огноо">{({ id }) => <Input tone={L} id={id} type="date" value={draft.min ?? ''} onChange={event => set({ min: event.target.value })} />}</Field><Field tone={L} label="Сүүлийн огноо">{({ id }) => <Input tone={L} id={id} type="date" value={draft.max ?? ''} onChange={event => set({ max: event.target.value })} />}</Field></div>}
      {(draft.type === 'select' || draft.type === 'multiselect') && <OptionsEditor tone={L} options={draft.options} onChange={options => set({ options })} />}
      {draft.type === 'file' && <div className="space-y-3"><fieldset><legend className="mb-1 text-xs font-semibold text-slate-700">Зөвшөөрөх формат</legend><div className="flex flex-wrap gap-x-4">{formats.map(format => <label key={format} className="flex min-h-11 items-center gap-2 text-sm text-slate-800"><input type="checkbox" className={CHECK} checked={draft.accept?.includes(format)} onChange={event => set({ accept: event.target.checked ? [...(draft.accept || []), format] : (draft.accept || []).filter(item => item !== format) })} />{format.toUpperCase()}</label>)}</div></fieldset><div className="grid grid-cols-2 gap-3"><Field tone={L} label="Хамгийн их MB (1–10)">{({ id }) => <Input tone={L} id={id} type="number" min="1" max="10" value={draft.maxSizeMb ?? ''} onChange={event => set({ maxSizeMb: event.target.value })} />}</Field><Field tone={L} label="Хамгийн их тоо (1–5)">{({ id }) => <Input tone={L} id={id} type="number" min="1" max="5" value={draft.maxFiles ?? ''} onChange={event => set({ maxFiles: event.target.value })} />}</Field></div></div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  </Modal>;
}
