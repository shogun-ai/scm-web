import { useId } from 'react';
import { Upload } from 'lucide-react';
import { Field, Input } from '../../ui/Form';

// Local editor building blocks for the Prism Sky editing tabs (CMS, chatbot, bot content, loan form config, files).
// They compose the shared admin/ui primitives; nothing here changes behaviour.
//
// Panel deliberately has NO backdrop-filter / transform: editors render position:fixed dialogs (Modal) inside
// their subtree, and a filter on an ancestor would become their containing block.
const PANEL = 'relative rounded-[20px] bg-[rgba(12,16,32,0.78)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.06),0_24px_60px_-28px_rgba(0,0,0,0.75)]';

export function Panel({ title, eyebrow, description, actions, children, className = '', bodyClassName = 'space-y-4', glint = true, as = 'section' }) {
  const headingId = useId();
  const Tag = as;
  return <Tag className={`${PANEL} p-4 md:p-6 ${className}`} aria-labelledby={title ? headingId : undefined}>
    <span className="adm-card__rim" aria-hidden="true" />
    {glint && <span className="adm-card__glint" aria-hidden="true" />}
    {(title || actions) && <header className="relative mb-4 flex flex-wrap items-start justify-between gap-3 md:mb-5">
      <div className="min-w-0">
        {eyebrow && <p className="adm-eyebrow mb-1">{eyebrow}</p>}
        {title && <h3 id={headingId} className="text-[15px] font-semibold tracking-tight text-white md:text-base">{title}</h3>}
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--adm-ink-3)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>}
    <div className={`relative ${bodyClassName}`}>{children}</div>
  </Tag>;
}

// Nested inset card inside a Panel.
export const SUBCARD = 'rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.08] md:p-4';
export function SubCard({ className = '', children, ...rest }) {
  return <div className={`${SUBCARD} ${className}`} {...rest}>{children}</div>;
}

// Small-caps group label inside a panel.
export function GroupLabel({ children, className = '', as = 'p', id }) {
  const Tag = as;
  return <Tag id={id} className={`adm-label ${className}`}>{children}</Tag>;
}

// 44px ghost icon button for row actions (move / edit / delete).
export function IconButton({ label, icon, danger = false, className = '', type = 'button', ...rest }) {
  return <button type={type} aria-label={label} title={label} className={`adm-icon-btn shrink-0 disabled:pointer-events-none disabled:opacity-30 ${danger ? 'hover:!bg-[#FF6B86]/[0.12] hover:!text-[#FFB8C5]' : ''} ${className}`} {...rest}>{icon}</button>;
}

// Native checkbox on the dark surface (hue accent, 44px hit area).
export function Check({ label, className = '', children, ...rest }) {
  return <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--adm-ink-2)] ${className}`}>
    <input type="checkbox" className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--hue)]" {...rest} />
    {label}{children}
  </label>;
}

// File picker styled as a ghost button. The input stays keyboard-focusable (sr-only, not display:none).
export function FileButton({ label = 'Зураг', onFile, busy = false, accept = 'image/*', icon, className = '', inputRef, id }) {
  return <label className={`adm-row-btn adm-row-btn--lg shrink-0 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color-mix(in_srgb,var(--hue)_65%,white)] ${busy ? 'pointer-events-none opacity-60' : ''} ${className}`}>
    {icon || <Upload size={15} aria-hidden="true" />}{label}
    <input ref={inputRef} id={id} type="file" accept={accept} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file, event); }} />
  </label>;
}

// Image URL field: optional preview, URL input and an upload button. `onFile(file)` runs the caller's original upload logic.
export function ImageField({ label, value, onChange, onFile, placeholder = 'URL эсвэл файл сонгоно уу', previewClassName = 'h-24 w-40', alt, buttonLabel = 'Зураг', hint }) {
  return <Field label={label} hint={hint}>{({ id, describedBy }) => <div className="space-y-2.5">
    <div className="flex gap-2">
      <Input id={id} aria-describedby={describedBy} value={value || ''} placeholder={placeholder} onChange={onChange} className="min-w-0 flex-1" />
      <FileButton label={buttonLabel} onFile={onFile} />
    </div>
    {value && <img src={value} alt={alt ?? label} className={`${previewClassName} rounded-xl object-cover ring-1 ring-white/10`} />}
  </div>}</Field>;
}

// Text config row (`input` or `textarea`) wired to the CMS configEdits map.
export function ConfigField({ label, value, onChange, multiline = false, rows = 3, type = 'text', ...rest }) {
  return <Field label={label}>{({ id }) => (multiline
    ? <textarea id={id} rows={rows} value={value} onChange={onChange} className="adm-field w-full resize-y py-2.5 leading-relaxed" {...rest} />
    : <Input id={id} type={type} value={value} onChange={onChange} {...rest} />)}</Field>;
}

// Light "island" for embedded legacy light components (keeps their original contrast on the dark sky).
export function LightIsland({ className = '', children }) {
  return <div className={`rounded-2xl bg-[#F4F7FB] p-4 text-slate-800 shadow-[inset_0_1px_0_#FFFFFF,0_14px_34px_-22px_rgba(0,0,0,0.9)] [color-scheme:light] md:p-5 ${className}`}>{children}</div>;
}

// Inline light-on-dark message (ok | err | warn | info) — the Notice primitive plus an amber "warn" tone.
export function InlineNote({ kind = 'info', children, className = '', role }) {
  const cls = {
    ok: 'adm-note adm-note--ok',
    err: 'adm-note adm-note--err',
    warn: 'adm-note border-[#FFA25C]/30 bg-[#FFA25C]/[0.08] text-[#FFD2B0]',
    info: 'adm-note border-[#4CC6FF]/25 bg-[#4CC6FF]/[0.07] text-[#BFE9FF]',
  }[kind] || 'adm-note';
  return <div role={role || (kind === 'err' ? 'alert' : 'status')} className={`${cls} ${className}`}>{children}</div>;
}
