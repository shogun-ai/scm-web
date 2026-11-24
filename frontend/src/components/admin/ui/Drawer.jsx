import { Loader2 } from 'lucide-react';

// Building blocks used inside <SideDrawer>. Light (frosted) tone — dense data stays on a light surface.

export function DrawerSection({ title, id, first = false, className = '', children, ...rest }) {
  return <section aria-labelledby={id} className={`adm-drawer-card ${first ? '!mt-0' : ''} ${className}`} {...rest}>
    {title && <h3 id={id} className="adm-drawer-card__title">{title}</h3>}
    {children}
  </section>;
}

// Toggle button for the sticky action bar; `active` marks the open inline panel.
export function DrawerAction({ icon, active, danger = false, busy = false, children, className = '', ...rest }) {
  const tone = danger
    ? 'border-red-300 text-red-700 hover:bg-red-50'
    : active
      ? 'border-[var(--drawer-ink)] bg-[color-mix(in_srgb,var(--hue)_12%,white)] text-slate-900 ring-4 ring-[color-mix(in_srgb,var(--hue)_14%,transparent)]'
      : 'border-slate-200 text-slate-800 hover:border-[var(--drawer-ink)]';
  return <button type="button" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition disabled:opacity-50 ${tone} ${className}`} {...(active !== undefined ? { 'aria-expanded': Boolean(active) } : {})} {...rest}>
    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}{children}
  </button>;
}

// Label/value grid for contact and info cards.
export function DetailList({ items, columns = 3 }) {
  const cols = columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  return <dl className={`grid gap-3 text-sm ${cols}`}>
    {items.filter(Boolean).map(item => <div key={item.label} className="min-w-0">
      <dt className="text-xs font-semibold text-slate-600">{item.label}</dt>
      <dd className="mt-0.5 break-words text-slate-900">{item.value ?? '—'}</dd>
    </div>)}
  </dl>;
}

// Vertical timeline for history entries.
export function Timeline({ items, empty = 'Түүх алга.' }) {
  if (!items.length) return <p className="text-sm text-slate-600">{empty}</p>;
  return <ol className="relative space-y-4 border-l border-slate-200 pl-4">
    {items.map(item => <li key={item.key} className="relative text-sm">
      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--hue)] shadow-[0_0_0_1px_rgba(15,23,42,0.1)]" aria-hidden="true" />
      <p className="text-xs text-slate-600">{item.meta}</p>
      <div className="mt-0.5 text-slate-900">{item.content}</div>
    </li>)}
  </ol>;
}
