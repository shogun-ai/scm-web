import { useEffect, useState } from 'react';
import { Eye, EyeOff, Paperclip, Plus, Trash2 } from 'lucide-react';
import { acceptLabel, acceptMimes, formatMoney, maskRegister, maxFilesOf, maxMbOf } from './taskFormUtils';

export const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-[#102d43] placeholder:text-slate-400 focus:border-[#102d43] focus:outline-none focus:ring-2 focus:ring-[#102d43]/15 disabled:opacity-60';
const MAX_LOAN_ROWS = 10;

function Marker({ required }) {
  return required
    ? <><span className="text-red-600" aria-hidden="true">*</span><span className="sr-only">заавал</span></>
    : <span className="text-xs font-normal text-slate-500">Заавал биш</span>;
}

function Shell({ field, error, children, group = false }) {
  const id = `tf-${field.key}`;
  const help = field.helpText ? <span id={`${id}-help`} className="mt-1 block text-xs font-normal text-slate-500">{field.helpText}</span> : null;
  const err = error ? <span id={`${id}-error`} className="mt-2 block text-xs text-red-700" role="alert">{error}</span> : null;
  if (group) {
    return <fieldset className="block min-w-0 text-sm font-medium text-[#102d43]" aria-describedby={error ? `${id}-error` : field.helpText ? `${id}-help` : undefined}>
      <legend className="mb-2 flex items-center gap-2">{field.label}<Marker required={field.required} /></legend>{help}{children}{err}
    </fieldset>;
  }
  return <div className="block text-sm font-medium text-[#102d43]">
    <label htmlFor={id}><span className="mb-2 flex items-center gap-2">{field.label}<Marker required={field.required} /></span></label>{children}{help}{err}
  </div>;
}

// Smooth reveal for fields that appear after the user changes an earlier answer (no layout jump).
export function Reveal({ animate, children }) {
  const [open, setOpen] = useState(!animate);
  useEffect(() => {
    if (open) return undefined;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  return <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="-m-1 min-h-0 overflow-hidden p-1">{children}</div></div>;
}

const describe = (field, error) => [error ? `tf-${field.key}-error` : '', field.helpText ? `tf-${field.key}-help` : ''].filter(Boolean).join(' ') || undefined;

function RegisterValue({ value }) {
  const [shown, setShown] = useState(false);
  return <span className="inline-flex items-center gap-2"><span className="font-mono">{shown ? value : maskRegister(value)}</span><button type="button" onClick={() => setShown(v => !v)} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100" aria-pressed={shown}>{shown ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}{shown ? 'Нуух' : 'Харах'}</button></span>;
}

function Display({ field, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return <span className="text-slate-400">—</span>;
  if (field.widget === 'register_number') return <RegisterValue value={value} />;
  if (field.widget === 'full_name' && typeof value === 'object') return <>{[value.lastName, value.firstName].filter(Boolean).join(' ')}</>;
  if (field.widget === 'other_loans' && typeof value === 'object') {
    if (!value.hasActiveLoans) return <>Үгүй</>;
    return <ul className="space-y-1">{(value.loans || []).map((row, index) => <li key={index}>{row.lender || '—'} · үлдэгдэл {formatMoney(row.balance)} ₮ · сарын төлбөр {formatMoney(row.monthlyPayment)} ₮</li>)}</ul>;
  }
  if (field.type === 'yesno') return <>{value === true ? 'Тийм' : 'Үгүй'}</>;
  if (field.type === 'multiselect') return <>{(Array.isArray(value) ? value : [value]).map(item => field.options?.find(option => option.value === item)?.label || String(item)).join(', ')}</>;
  if (field.type === 'select') return <>{field.options?.find(option => option.value === value)?.label || String(value)}</>;
  if (field.type === 'number') return <span className="tabular-nums">{formatMoney(value)}</span>;
  if (field.type === 'file' && Array.isArray(value)) return <>{value.map(file => file.fileName).join(', ')}</>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function YesNoButtons({ name, value, disabled, onPick }) {
  return <div className="grid grid-cols-2 gap-3">{[[true, 'Тийм'], [false, 'Үгүй']].map(([flag, label]) => <label key={label} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#102d43]/40 ${value === flag ? 'border-[#102d43] bg-[#102d43] text-white' : 'border-slate-200 text-slate-600'}`}><input type="radio" name={name} className="sr-only" checked={value === flag} disabled={disabled} onChange={() => onPick(flag)} />{label}</label>)}</div>;
}

const EMPTY_LOAN = { lender: '', balance: '', monthlyPayment: '' };

function OtherLoans({ field, value, onChange, error, disabled }) {
  const current = value && typeof value === 'object' ? value : {};
  const loans = Array.isArray(current.loans) ? current.loans : [];
  const set = patch => onChange(field.key, { ...current, ...patch });
  const setRow = (index, patch) => set({ loans: loans.map((row, position) => (position === index ? { ...row, ...patch } : row)) });
  return <Shell field={field} error={error} group>
    <YesNoButtons name={`tf-${field.key}`} value={current.hasActiveLoans} disabled={disabled} onPick={flag => set(flag ? { hasActiveLoans: true, loans: loans.length ? loans : [{ ...EMPTY_LOAN }] } : { hasActiveLoans: false })} />
    {current.hasActiveLoans === true && <div className="mt-4 space-y-4">
      {loans.map((row, index) => <div key={index} className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-600">Зээл {index + 1}<button type="button" disabled={disabled || loans.length <= 1} onClick={() => set({ loans: loans.filter((_, position) => position !== index) })} className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label={`Зээл ${index + 1}-г хасах`}><Trash2 size={16} aria-hidden="true" /></button></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-slate-700">Зээлдүүлэгч<input className={`${INPUT} mt-1`} value={row.lender || ''} maxLength={120} disabled={disabled} onChange={event => setRow(index, { lender: event.target.value })} placeholder="Банк / ББСБ" /></label>
          <label className="block text-xs font-medium text-slate-700">Үлдэгдэл · ₮<input className={`${INPUT} mt-1`} inputMode="numeric" value={row.balance ?? ''} disabled={disabled} onChange={event => setRow(index, { balance: event.target.value.replace(/\D/g, '') })} /></label>
          <label className="block text-xs font-medium text-slate-700">Сарын төлбөр · ₮<input className={`${INPUT} mt-1`} inputMode="numeric" value={row.monthlyPayment ?? ''} disabled={disabled} onChange={event => setRow(index, { monthlyPayment: event.target.value.replace(/\D/g, '') })} /></label>
        </div>
      </div>)}
      {loans.length < MAX_LOAN_ROWS && <button type="button" disabled={disabled} onClick={() => set({ loans: [...loans, { ...EMPTY_LOAN }] })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-700 hover:border-[#102d43]"><Plus size={16} aria-hidden="true" />Зээл нэмэх</button>}
    </div>}
  </Shell>;
}

export default function TaskField({ field, value, onChange, error, disabled = false, mode = 'edit', files = [], onAddFiles, onRemoveFile }) {
  if (mode === 'readonly') {
    return <div className="text-sm"><dt className="mb-1 text-xs font-semibold text-slate-500">{field.label}</dt><dd className="text-slate-800"><Display field={field} value={value} /></dd></div>;
  }
  const id = `tf-${field.key}`;
  const common = { id, name: field.key, disabled, 'aria-invalid': Boolean(error), 'aria-describedby': describe(field, error), 'aria-required': field.required || undefined, className: INPUT };

  if (field.widget === 'full_name') {
    const name = value && typeof value === 'object' ? value : {};
    return <Shell field={field} error={error} group><div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-slate-700">Овог<input {...common} id={`${id}-last`} name={`${field.key}-last`} value={name.lastName || ''} autoComplete="family-name" maxLength={100} onChange={event => onChange(field.key, { ...name, lastName: event.target.value })} /></label>
      <label className="block text-xs font-medium text-slate-700">Нэр<input {...common} id={`${id}-first`} name={`${field.key}-first`} value={name.firstName || ''} autoComplete="given-name" maxLength={100} onChange={event => onChange(field.key, { ...name, firstName: event.target.value })} /></label>
    </div></Shell>;
  }
  if (field.widget === 'other_loans') return <OtherLoans field={field} value={value} onChange={onChange} error={error} disabled={disabled} />;
  if (field.type === 'yesno') return <Shell field={field} error={error} group><YesNoButtons name={id} value={value} disabled={disabled} onPick={flag => onChange(field.key, flag)} /></Shell>;
  if (field.type === 'multiselect') {
    const chosen = Array.isArray(value) ? value : [];
    const toggle = (optionValue, on) => onChange(field.key, (field.options || []).map(option => option.value).filter(item => (item === optionValue ? on : chosen.includes(item))));
    return <Shell field={field} error={error} group><div className="grid gap-2 sm:grid-cols-2">{(field.options || []).map(option => <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#102d43]/40 ${chosen.includes(option.value) ? 'border-[#102d43] bg-[#102d43]/5 text-[#102d43]' : 'border-slate-200 text-slate-700'}`}><input type="checkbox" name={`${field.key}[]`} value={option.value} checked={chosen.includes(option.value)} disabled={disabled} aria-invalid={Boolean(error)} onChange={event => toggle(option.value, event.target.checked)} className="h-5 w-5 shrink-0 accent-[#102d43]" />{option.label}</label>)}</div></Shell>;
  }
  if (field.type === 'select') {
    return <Shell field={field} error={error}><select {...common} value={value ?? ''} onChange={event => onChange(field.key, event.target.value)}><option value="">{field.placeholder || 'Сонгох'}</option>{(field.options || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Shell>;
  }
  if (field.type === 'textarea') {
    return <Shell field={field} error={error}><textarea {...common} rows={3} value={value ?? ''} maxLength={field.maxLength || 1000} placeholder={field.placeholder || undefined} onChange={event => onChange(field.key, event.target.value)} /></Shell>;
  }
  if (field.type === 'date') {
    return <Shell field={field} error={error}><input {...common} type="date" value={value ?? ''} min={field.min || undefined} max={field.max || undefined} autoComplete={field.widget === 'birth_date' ? 'bday' : undefined} onChange={event => onChange(field.key, event.target.value)} /></Shell>;
  }
  if (field.type === 'number') {
    const preset = field.kind === 'preset';
    return <Shell field={field} error={error}><input {...common} type={preset ? 'text' : 'number'} inputMode={preset ? 'numeric' : 'decimal'} value={preset ? formatMoney(value) : (value ?? '')} min={preset ? undefined : (field.min ?? undefined)} max={preset ? undefined : (field.max ?? undefined)} placeholder={field.placeholder || undefined} onChange={event => onChange(field.key, preset ? event.target.value.replace(/\D/g, '') : event.target.value)} /></Shell>;
  }
  if (field.type === 'file') {
    const max = maxFilesOf(field);
    return <Shell field={field} error={error} group>
      <p className="mb-3 text-xs text-slate-500">{acceptLabel(field)} · файл бүр {maxMbOf(field)} MB хүртэл · {max} хүртэл файл</p>
      <input id={id} name={field.key} type="file" accept={acceptMimes(field).join(',')} multiple={max > 1} disabled={disabled || files.length >= max} aria-label={`${field.label} — файл сонгох`} aria-invalid={Boolean(error)} onChange={event => { onAddFiles?.(field, Array.from(event.target.files || [])); event.target.value = ''; }} className="block w-full text-xs text-slate-600 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:text-sm file:font-medium file:text-[#102d43]" />
      {files.map((file, index) => <div key={`${file.name}-${index}`} className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><Paperclip size={14} className="shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 break-all">{file.name} <span className="text-slate-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></span><button type="button" disabled={disabled} onClick={() => onRemoveFile?.(field, index)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700" aria-label={`${file.name} файлыг хасах`}><Trash2 size={16} aria-hidden="true" /></button></div>)}
    </Shell>;
  }
  const attrs = field.widget === 'phone' ? { type: 'tel', autoComplete: 'tel', inputMode: 'tel' } : field.widget === 'email' ? { type: 'email', autoComplete: 'email' } : field.widget === 'register_number' ? { autoCapitalize: 'characters', autoComplete: 'off' } : {};
  return <Shell field={field} error={error}><input {...common} {...attrs} value={value ?? ''} maxLength={field.maxLength || 200} placeholder={field.placeholder || undefined} onChange={event => onChange(field.key, field.widget === 'register_number' ? event.target.value.toUpperCase() : event.target.value)} /></Shell>;
}
