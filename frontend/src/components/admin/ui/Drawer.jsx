import { Loader2 } from 'lucide-react';

// Building blocks used inside <SideDrawer> (dark liquid glass). Labels #AEB9CC (≥ 7:1), values #F4F7FB.

export function DrawerSection({ title, id, first = false, className = '', children, ...rest }) {
  return <section aria-labelledby={id} className={`adm-drawer-card ${first ? '!mt-0' : ''} ${className}`} {...rest}>
    {title && <h3 id={id} className="adm-drawer-card__title">{title}</h3>}
    {children}
  </section>;
}

// Glass chip for the sticky action bar; `active` marks the open inline panel (aria-expanded).
export function DrawerAction({ icon, active, danger = false, busy = false, children, className = '', ...rest }) {
  return <button type="button" className={`adm-chip-action ${danger ? 'adm-chip-action--danger' : ''} ${className}`} {...(active !== undefined ? { 'aria-expanded': Boolean(active) } : {})} {...rest}>
    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}{children}
  </button>;
}

// Label/value grid for contact and info cards.
export function DetailList({ items, columns = 3 }) {
  const cols = columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  return <dl className={`grid gap-3 text-sm ${cols}`}>
    {items.filter(Boolean).map(item => <div key={item.label} className="min-w-0">
      <dt className="text-xs font-semibold text-[#AEB9CC]">{item.label}</dt>
      <dd className="mt-0.5 break-words text-[#F4F7FB]">{item.value ?? '—'}</dd>
    </div>)}
  </dl>;
}

// Vertical timeline for history entries.
export function Timeline({ items, empty = 'Түүх алга.' }) {
  if (!items.length) return <p className="text-sm text-[#AEB9CC]">{empty}</p>;
  return <ol className="relative space-y-4 border-l border-white/10 pl-4">
    {items.map(item => <li key={item.key} className="relative text-sm">
      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#0C1020] bg-[var(--hue)] shadow-[0_0_10px_var(--hue)]" aria-hidden="true" />
      <p className="text-xs text-[#AEB9CC]">{item.meta}</p>
      <div className="mt-0.5 text-[#F4F7FB]">{item.content}</div>
    </li>)}
  </ol>;
}
