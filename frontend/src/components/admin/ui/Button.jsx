import { Loader2 } from 'lucide-react';

// Button variants:
//  dark surfaces:  primary (luminous glass with hue glow), secondary (ghost row button), danger
//  light surfaces: ink (dark ink fill), light (white outline), lightDanger
const VARIANTS = {
  primary: 'adm-btn',
  secondary: 'adm-row-btn adm-row-btn--lg',
  danger: 'adm-row-btn adm-row-btn--lg adm-row-btn--danger',
  ink: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1530] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_-12px_rgba(11,21,48,0.8)] transition hover:-translate-y-px hover:bg-[#13204A] disabled:translate-y-0',
  light: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:border-[var(--drawer-ink,#047857)]',
  lightDanger: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50',
};

export default function Button({ variant = 'primary', icon, busy = false, hue, className = '', style, children, type = 'button', ...rest }) {
  return <button type={type} className={`${VARIANTS[variant] || VARIANTS.primary} disabled:opacity-50 ${className}`} style={hue ? { '--hue': `var(--sp-${hue})`, ...style } : style} aria-busy={busy || undefined} {...rest}>
    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}{children}
  </button>;
}
