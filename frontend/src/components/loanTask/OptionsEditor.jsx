import { Plus, Trash2 } from 'lucide-react';
import { makeOptionValue } from './configHelpers';
import { Input } from '../admin/ui/Form';

// Edits option labels; value keys of existing options never change, new ones get a stable generated key.
// tone="dark" (default) inside the config editor on the sky, tone="light" inside the custom-field Modal.
export default function OptionsEditor({ options, onChange, legend = 'Сонголтууд', max = 30, tone = 'dark' }) {
  const list = Array.isArray(options) ? options : [];
  const light = tone === 'light';
  const setLabel = (index, label) => onChange(list.map((item, position) => (position === index ? { ...item, label } : item)));
  return <fieldset className="space-y-2">
    <legend className={light ? 'mb-1 text-xs font-semibold text-slate-700' : 'adm-label mb-2'}>{legend}</legend>
    {list.map((option, index) => <div key={option.value || index} className="flex gap-2">
      <Input tone={tone} className={light ? '' : 'adm-field--sm'} maxLength={100} value={option.label || ''} aria-label={`Сонголт ${index + 1}`} onChange={event => setLabel(index, event.target.value)} />
      <button type="button" disabled={list.length <= 1} onClick={() => onChange(list.filter((_, position) => position !== index))} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-30 ${light ? 'text-slate-600 hover:bg-red-50 hover:text-red-700' : 'text-[var(--adm-ink-2)] hover:bg-[#FF6B86]/[0.12] hover:text-[#FFB8C5]'}`} aria-label={`Сонголт ${index + 1} хасах`}><Trash2 size={16} aria-hidden="true" /></button>
    </div>)}
    {list.length < max && <button type="button" onClick={() => onChange([...list, { value: makeOptionValue(list), label: '' }])} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold ${light ? 'text-sky-800 hover:underline' : 'text-[color-mix(in_srgb,var(--hue)_55%,white)] hover:text-white'}`}><Plus size={14} aria-hidden="true" />Сонголт нэмэх</button>}
  </fieldset>;
}
