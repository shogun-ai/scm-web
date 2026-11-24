import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { PRESET_BY_KEY, PRESET_WIDGETS, WIDGET_GROUPS } from '@shared/loanWidgets';
import CustomFieldDialog from './CustomFieldDialog';
import OptionsEditor from './OptionsEditor';
import ShowWhenEditor from './ShowWhenEditor';
import { OPTION_TYPES, collectKeys, effectiveField, fieldLabel, fieldType, newStepId, presetLabel, showWhenSummary } from './configHelpers';
import Button from '../admin/ui/Button';
import { Field, Input } from '../admin/ui/Form';
import { Pill } from '../admin/ui/Feedback';
import { Check, IconButton, SUBCARD } from '../admin/tabs/cms/editorKit';

const TYPE_LABELS = { text: 'Текст', textarea: 'Урт текст', number: 'Тоо', date: 'Огноо', select: 'Сонголт', multiselect: 'Олон сонголт', yesno: 'Тийм/Үгүй', file: 'Файл', composite: 'Нийлмэл' };
const ERR = 'mt-1.5 text-xs text-[#FFC9D3]';

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
  // Resolved defs (with admin overrides) in form order; a field may only depend on earlier ones.
  const defsByStep = useMemo(() => steps.map(step => step.fields.map(effectiveField)), [steps]);
  const flatDefs = useMemo(() => defsByStep.flat(), [defsByStep]);
  const setShowWhen = (stepIndex, fieldIndex, showWhen) => {
    const field = steps[stepIndex].fields[fieldIndex];
    if (showWhen) patchField(stepIndex, fieldIndex, { showWhen });
    else patchField(stepIndex, fieldIndex, { showWhen: field.kind === 'preset' && PRESET_BY_KEY?.[field.key]?.showWhen ? null : undefined });
  };

  return <div>
    <div className="space-y-4">
    {steps.map((step, stepIndex) => <section key={step.id} className={SUBCARD} aria-label={`Алхам ${stepIndex + 1}`}>
      <div className="flex flex-wrap items-end gap-2">
        <span className="adm-tnum mb-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--hue)_16%,transparent)] text-xs font-bold text-white ring-1 ring-inset ring-[color-mix(in_srgb,var(--hue)_45%,transparent)]" aria-hidden="true">{stepIndex + 1}</span>
        <div className="grid min-w-[14rem] flex-1 gap-3 sm:grid-cols-2">
          <Field label="Алхмын нэр">{({ id }) => <Input id={id} maxLength={80} value={step.title} onChange={event => patchStep(stepIndex, { title: event.target.value })} />}</Field>
          <Field label="Тайлбар">{({ id }) => <Input id={id} maxLength={300} value={step.description || ''} onChange={event => patchStep(stepIndex, { description: event.target.value })} />}</Field>
        </div>
        <div className="flex items-center">
          <IconButton label="Алхмыг дээш" icon={<ArrowUp size={16} aria-hidden="true" />} disabled={stepIndex === 0} onClick={() => onChange(move(steps, stepIndex, -1))} />
          <IconButton label="Алхмыг доош" icon={<ArrowDown size={16} aria-hidden="true" />} disabled={stepIndex === steps.length - 1} onClick={() => onChange(move(steps, stepIndex, 1))} />
          <IconButton danger label="Алхмыг устгах" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => onChange(steps.filter((_, position) => position !== stepIndex))} />
        </div>
      </div>
      {errorAt(`${pathPrefix}.${stepIndex}.title`) && <p role="alert" className={ERR}>{errorAt(`${pathPrefix}.${stepIndex}.title`)}</p>}

      <ul className="mt-4 space-y-2">
        {step.fields.map((field, fieldIndex) => {
          const error = errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}.label`) || errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}`) || errorAt(`${pathPrefix}.${stepIndex}.fields.${fieldIndex}.key`);
          return <li key={field.key} className={`rounded-xl bg-white/[0.025] p-3 ring-1 ring-inset ${error ? 'ring-[#FF6B86]/40' : 'ring-white/[0.06]'}`}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1 basis-56">
                {field.kind === 'preset'
                  ? <Input className="adm-field--sm" maxLength={120} value={field.label ?? ''} placeholder={presetLabel(PRESET_BY_KEY?.[field.key])} aria-label={`${presetLabel(PRESET_BY_KEY?.[field.key])} — нэр өөрчлөх`} onChange={event => patchField(stepIndex, fieldIndex, { label: event.target.value || undefined })} />
                  : <p className="text-sm font-medium text-white">{field.label}</p>}
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--adm-ink-3)]">
                  <span className={`rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset ${field.kind === 'preset' ? 'bg-white/[0.05] text-[var(--adm-ink-2)] ring-white/10' : 'bg-[#B794FF]/[0.12] text-[#DCC9FF] ring-[#B794FF]/30'}`}>{field.kind === 'preset' ? 'Бэлэн' : 'Тусгай'} · {TYPE_LABELS[fieldType(field)] || fieldType(field)}</span>
                  <span className="font-mono">{field.key}</span>
                </p>
              </div>
              <Check className="!min-h-10 text-xs" checked={Boolean(field.required)} onChange={event => patchField(stepIndex, fieldIndex, { required: event.target.checked })} label="Заавал" />
              <select aria-label={`${fieldLabel(field)} — өөр алхам руу зөөх`} className="adm-field adm-field--sm max-w-[9rem] text-xs" value="" onChange={event => { if (event.target.value !== '') moveField(stepIndex, fieldIndex, Number(event.target.value)); }}>
                <option value="">Зөөх…</option>{steps.map((target, position) => position !== stepIndex && <option key={target.id} value={position}>{target.title || `Алхам ${position + 1}`}</option>)}
              </select>
              <div className="flex items-center">
                {field.kind === 'custom' && <IconButton label={`${field.label} засах`} icon={<Pencil size={15} aria-hidden="true" />} onClick={() => setDialog({ stepIndex, fieldIndex })} />}
                <IconButton label="Талбарыг дээш" icon={<ArrowUp size={15} aria-hidden="true" />} disabled={fieldIndex === 0} onClick={() => patchStep(stepIndex, { fields: move(step.fields, fieldIndex, -1) })} />
                <IconButton label="Талбарыг доош" icon={<ArrowDown size={15} aria-hidden="true" />} disabled={fieldIndex === step.fields.length - 1} onClick={() => patchStep(stepIndex, { fields: move(step.fields, fieldIndex, 1) })} />
                <IconButton danger label={`${fieldLabel(field)} устгах`} icon={<Trash2 size={15} aria-hidden="true" />} onClick={() => removeField(stepIndex, fieldIndex)} />
              </div>
            </div>
            {error && <p role="alert" className={ERR}>{error}</p>}
            {(() => {
              const def = defsByStep[stepIndex][fieldIndex];
              const before = flatDefs.slice(0, steps.slice(0, stepIndex).reduce((sum, item) => sum + item.fields.length, 0) + fieldIndex);
              const summary = showWhenSummary(def.showWhen, before);
              const editableOptions = field.key !== 'borrower_type' && OPTION_TYPES.includes(def.type) && field.kind === 'preset';
              return <details className="group mt-2 text-xs">
                <summary className="flex min-h-10 cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg font-semibold text-[var(--adm-ink-2)] hover:text-white [&::-webkit-details-marker]:hidden">
                  <ChevronRight size={14} className="transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                  Харагдах нөхцөл{editableOptions ? ' ба сонголт' : ''}
                  {summary ? <Pill hue={summary.broken ? 'rose' : 'cyan'} dot={false} className="!whitespace-normal !font-medium">Харагдах: {summary.text}{summary.broken ? ' (буруу)' : ''}</Pill> : <span className="font-normal text-[var(--adm-ink-3)]">үргэлж харагдана</span>}
                </summary>
                <div className="mt-2 space-y-3">
                  <ShowWhenEditor idPrefix={`${step.id}-${field.key}`} showWhen={def.showWhen} candidates={before} onChange={showWhen => setShowWhen(stepIndex, fieldIndex, showWhen)} />
                  {editableOptions && <OptionsEditor options={def.options} onChange={options => patchField(stepIndex, fieldIndex, { options })} />}
                </div>
              </details>;
            })()}
          </li>;
        })}
        {step.fields.length === 0 && <li className="rounded-xl border border-dashed border-white/[0.14] p-4 text-center text-xs text-[var(--adm-ink-3)]">Талбар алга.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`add-widget-${step.id}`}>Widget нэмэх</label>
        <select id={`add-widget-${step.id}`} className="adm-field min-w-0 max-w-full flex-1 sm:max-w-xs" value="" onChange={event => addPreset(stepIndex, event.target.value)}>
          <option value="">+ Widget нэмэх</option>
          {WIDGET_GROUPS.map(group => <optgroup key={group.key} label={group.label}>{(PRESET_WIDGETS || []).filter(preset => (preset.group || 'other') === group.key).map(preset => <option key={preset.key} value={preset.key} disabled={used.has(preset.key)}>{presetLabel(preset)}{used.has(preset.key) ? ' (ашигласан)' : ''}</option>)}</optgroup>)}
        </select>
        <Button variant="secondary" icon={<Plus size={15} aria-hidden="true" />} onClick={() => setDialog({ stepIndex })}>Тусгай талбар</Button>
      </div>
    </section>)}
    <button type="button" onClick={() => onChange([...steps, { id: newStepId(steps), title: `Алхам ${steps.length + 1}`, description: '', fields: [] }])} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.16] text-sm font-semibold text-[var(--adm-ink-2)] transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--hue)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--hue)_7%,transparent)] hover:text-white"><Plus size={16} aria-hidden="true" />Алхам нэмэх</button>
    </div>

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
