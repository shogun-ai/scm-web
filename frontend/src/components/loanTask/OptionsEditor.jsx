import { Plus, Trash2 } from 'lucide-react';
import { makeOptionValue } from './configHelpers';

const BOX = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';

// Edits option labels; value keys of existing options never change, new ones get a stable generated key.
export default function OptionsEditor({ options, onChange, legend = 'Сонголтууд', max = 30 }) {
  const list = Array.isArray(options) ? options : [];
  const setLabel = (index, label) => onChange(list.map((item, position) => (position === index ? { ...item, label } : item)));
  return <fieldset className="space-y-2">
    <legend className="text-xs font-semibold text-slate-600">{legend}</legend>
    {list.map((option, index) => <div key={option.value || index} className="flex gap-2">
      <input className={BOX} maxLength={100} value={option.label || ''} aria-label={`Сонголт ${index + 1}`} onChange={event => setLabel(index, event.target.value)} />
      <button type="button" disabled={list.length <= 1} onClick={() => onChange(list.filter((_, position) => position !== index))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Сонголт ${index + 1} хасах`}><Trash2 size={16} aria-hidden="true" /></button>
    </div>)}
    {list.length < max && <button type="button" onClick={() => onChange([...list, { value: makeOptionValue(list), label: '' }])} className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-[#003B5C]"><Plus size={14} aria-hidden="true" />Сонголт нэмэх</button>}
  </fieldset>;
}
