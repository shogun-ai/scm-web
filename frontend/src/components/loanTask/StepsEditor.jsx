import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { PRESET_BY_KEY, PRESET_WIDGETS, WIDGET_GROUPS } from '@shared/loanWidgets';
import CustomFieldDialog from './CustomFieldDialog';
import { collectKeys, fieldLabel, fieldType, newStepId, presetLabel } from './configHelpers';

const BOX = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';
const ICON_BTN = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30';
const TYPE_LABELS = { text: 'Текст', textarea: 'Урт текст', number: 'Тоо', date: 'Огноо', select: 'Сонголт', yesno: 'Тийм/Үгүй', file: 'Файл', composite: 'Нийлмэл' };

const move = (list, index, delta) => { const target = index + delta; if (target < 0 || target >= list.length) return list; const next = [...list]; [next[index], next[target]] = [next[target], next[index]]; return next; };

export default function StepsEditor({ steps, onChange, errors = {}, pathPrefix = 'steps', allKeys }) {
  const [dialog, setDialog] = useState(null); // { stepIndex, fieldIndex? }
  const used = useMemo(() => new Set(collectKeys(steps)), [steps]);
  const taken = allKeys || [...used];
  const patchStep = (index, patch) => onChange(steps.map((step, position) => (position === index ? { ...step, ...patch } : step)));
  const patchField = (stepIndex, fieldIndex, patch) => patchStep(stepIndex, { fields: steps[stepIndex].fields.map((field, position) => (position === fieldIndex ? { ...field, ...patch } : field)) });
  const removeField = (stepIndex, fieldIndex) => patchStep(stepIndex, { fields: steps[stepIndex].fields.filter((_, position) => position !== fieldIndex) });
  const moveField = (stepIndex, fieldIndex, targetStep) => {
    const field = steps[stepIndex].fields[fieldIndex];
    onChange(steps.map((step, position) => {
      if (position === stepIndex) return { ...step, fields: step.fields.filter((_, p) => p !== fieldIndex) };
      if (position === targetStep) return { ...step, fields: [...step.fields, field] };
      return step;
    }));
  };
  const addPreset = (stepIndex, key) => { if (key) patchStep(stepIndex, { fields: [...steps[stepIndex].fields, { kind: 'preset', key, required: key === 'phone' || key === 'full_name' }] }); };
  const errorAt = path => errors[path];

  return <div className="space-y-5">
    {steps.map((step, stepIndex) => <section key={step.id} className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={`Алхам ${stepIndex + 1}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">Алхмын нэр<input className={`${BOX} mt-1 w-full`} maxLength={80} value={step.title} onChange={event => patchStep(stepIndex, { title: event.target.value })} /></label>
          <label className="block text-xs font-semibold text-slate-600">Тайлбар<input className={`${BOX} mt-1 w-full`} maxLength={300} value={step.description || ''} onChange={event => patchStep(stepIndex, { description: event.target.value })} /></label>
        </div>
        <div className="flex items-center">
          <button type="button" className={ICON_BTN} disabled={stepIndex === 0} onClick={() => onChange(move(steps, stepIndex, -1))} aria-label="Алхмыг дээш"><ArrowUp size={16} aria-hidden="true" /></button>
          <button type="button" className={ICON_BTN} disabled={stepIndex === steps.length - 1} onClick={() => onChange(move(steps, stepIndex, 1))} aria-label="Алхмыг доош"><ArrowDown size={16} aria-hidden="true" /></button>
          <button type="button" className={`${ICON_BTN} hover:!bg-red-50 hover:!text-red-700`} onClick={() => onChange(steps.filter((_, position) => position !== stepIndex))} aria-label="Алхмыг устгах"><Trash2 size={16} aria-hidden="true" /></button>
        </div>
      </div>
      {errorAt(`${pathPrefix}.${stepIndex}.title`) && <p role="alert" className="mt-1 text-xs text-red-700">{errorAt(`${pathPrefix}.${stepIndex}.title`)}</p>}

      <ul className="mt-4 space-y-2">
        {step.fields.map((field, fieldIndex) => {
          const error = errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}.label`) || errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}`) || errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}.key`);
          return <li key={field.key} className="rounded-xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                {field.kind === 'preset'
                  ? <label className="block text-xs font-semibold text-slate-600"><span className="sr-only">Нэр</span><input className={`${BOX} w-full`} maxLength={120} value={field.label ?? ''} placeholder={presetLabel(PRESET_BY_KEY?.[field.key])} aria-label={`${presetLabel(PRESET_BY_KEY?.[field.key])} — нэр өөрчлөх`} onChange={event => patchField(stepIndex, fieldIndex, { label: event.target.value || undefined })} /></label>
                  : <p className="text-sm font-medium">{field.label}</p>}
                <p className="mt-1 text-[11px] text-slate-500"><span className="rounded bg-white px-1.5 py-0.5">{field.kind === 'preset' ? 'Бэлэн' : 'Тусгай'} · {TYPE_LABELS[fieldType(field)] || fieldType(field)}</span> <span className="font-mono">{field.key}</span></p>
              </div>
              <label className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={Boolean(field.required)} onChange={event => patchField(stepIndex, fieldIndex, { required: event.target.checked })} />Заавал</label>
              <select aria-label={`${fieldLabel(field)} — өөр алхам руу зөөх`} className={`${BOX} max-w-[8rem] text-xs`} value="" onChange={event => { if (event.target.value !== '') moveField(stepIndex, fieldIndex, Number(event.target.value)); }}>
                <option value="">Зөөх…</option>{steps.map((target, position) => position !== stepIndex && <option key={target.id} value={position}>{target.title || `Алхам ${position + 1}`}</option>)}
              </select>
              <div className="flex items-center">
                {field.kind === 'custom' && <button type="button" className={ICON_BTN} onClick={() => setDialog({ stepIndex, fieldIndex })} aria-label={`${field.label} засах`}><Pencil size={15} aria-hidden="true" /></button>}
                <button type="button" className={ICON_BTN} disabled={fieldIndex === 0} onClick={() => patchStep(stepIndex, { fields: move(step.fields, fieldIndex, -1) })} aria-label="Талбарыг дээш"><ArrowUp size={15} aria-hidden="true" /></button>
                <button type="button" className={ICON_BTN} disabled={fieldIndex === step.fields.length - 1} onClick={() => patchStep(stepIndex, { fields: move(step.fields, fieldIndex, 1) })} aria-label="Талбарыг доош"><ArrowDown size={15} aria-hidden="true" /></button>
                <button type="button" className={`${ICON_BTN} hover:!bg-red-50 hover:!text-red-700`} onClick={() => removeField(stepIndex, fieldIndex)} aria-label={`${fieldLabel(field)} устгах`}><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            </div>
            {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
          </li>;
        })}
        {step.fields.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Талбар алга.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`add-widget-${step.id}`}>Widget нэмэх</label>
        <select id={`add-widget-${step.id}`} className={`${BOX} min-h-10`} value="" onChange={event => addPreset(stepIndex, event.target.value)}>
          <option value="">+ Widget нэмэх</option>
          {WIDGET_GROUPS.map(group => <optgroup key={group.key} label={group.label}>{(PRESET_WIDGETS || []).filter(preset => (preset.group || 'other') === group.key).map(preset => <option key={preset.key} value={preset.key} disabled={used.has(preset.key)}>{presetLabel(preset)}{used.has(preset.key) ? ' (ашигласан)' : ''}</option>)}</optgroup>)}
        </select>
        <button type="button" onClick={() => setDialog({ stepIndex })} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#003B5C]"><Plus size={15} aria-hidden="true" />Тусгай талбар</button>
      </div>
    </section>)}
    <button type="button" onClick={() => onChange([...steps, { id: newStepId(steps), title: `Алхам ${steps.length + 1}`, description: '', fields: [] }])} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C]/10 px-4 text-sm font-semibold text-[#003B5C]"><Plus size={16} aria-hidden="true" />Алхам нэмэх</button>

    {dialog && <CustomFieldDialog
      initial={dialog.fieldIndex != null ? steps[dialog.stepIndex].fields[dialog.fieldIndex] : null}
      takenKeys={taken}
      onCancel={() => setDialog(null)}
      onSave={field => {
        if (dialog.fieldIndex != null) patchField(dialog.stepIndex, dialog.fieldIndex, field);
        else patchStep(dialog.stepIndex, { fields: [...steps[dialog.stepIndex].fields, field] });
        setDialog(null);
      }} />}
  </div>;
}
