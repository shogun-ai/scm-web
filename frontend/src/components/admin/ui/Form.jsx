import { useId } from 'react';
import { Search } from 'lucide-react';

// Form primitives. tone="dark" (default) for the sky / glass surfaces, tone="light" inside drawers and pearl sheets.
const fieldClass = (tone, extra = '') => `${tone === 'light' ? 'adm-lfield' : 'adm-field w-full'} ${extra}`;
const labelClass = tone => (tone === 'light' ? 'block text-xs font-semibold text-slate-700' : 'adm-label');
const hintClass = tone => (tone === 'light' ? 'text-slate-600' : 'text-[var(--adm-ink-3)]');

// Visible label + optional hint/error wired via aria-describedby. Children receive { id, describedBy } via render prop or are used as-is.
export function Field({ label, hint, error, tone = 'dark', required = false, className = '', children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return <div className={`min-w-0 ${className}`}>
    <label htmlFor={id} className={labelClass(tone)}>{label}{required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}</label>
    <div className="mt-1.5">{typeof children === 'function' ? children({ id, describedBy, invalid: Boolean(error) }) : children}</div>
    {hint && <p id={hintId} className={`mt-1 text-xs ${hintClass(tone)}`}>{hint}</p>}
    {error && <p id={errorId} role="alert" className={`mt-1 text-xs ${tone === 'light' ? 'text-red-700' : 'text-[#FFC9D3]'}`}>{error}</p>}
  </div>;
}

export function Input({ tone = 'dark', className = '', ...rest }) {
  return <input className={fieldClass(tone, className)} {...rest} />;
}

export function Select({ tone = 'dark', className = '', children, ...rest }) {
  return <select className={fieldClass(tone, className)} {...rest}>{children}</select>;
}

export function Textarea({ tone = 'dark', className = '', rows = 3, ...rest }) {
  return <textarea rows={rows} className={fieldClass(tone, `!min-h-0 py-2.5 ${className}`)} {...rest} />;
}

export function SearchInput({ label = 'Хайх', tone = 'dark', ...rest }) {
  return <label className="relative block min-w-0">
    <span className={labelClass(tone)}>{label}</span>
    <Search size={16} className={`pointer-events-none absolute bottom-3.5 left-3 ${tone === 'light' ? 'text-slate-500' : 'text-[var(--adm-ink-3)]'}`} aria-hidden="true" />
    <input type="search" className={fieldClass(tone, 'mt-1.5 w-full !pl-9')} {...rest} />
  </label>;
}

// Accessible switch (role="switch").
export function Toggle({ checked, onChange, label, disabled = false, tone = 'dark' }) {
  return <label className={`inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium ${tone === 'light' ? 'text-slate-800' : 'text-[var(--adm-ink)]'}`}>
    <button type="button" role="switch" aria-checked={Boolean(checked)} disabled={disabled} onClick={() => onChange(!checked)} className="adm-switch disabled:opacity-50" />
    {label}
  </label>;
}
