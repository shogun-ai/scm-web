import { Inbox } from 'lucide-react';

// Status pill. tone="dark" on glass (light tint text ≥ 7.8:1), tone="light" on white (deep hue text ≥ 6:1).
const PILL = {
  cyan: ['#4CC6FF', 'bg-[#4CC6FF]/[0.12] text-[#A6E6FF] ring-[#4CC6FF]/30', 'bg-sky-50 text-sky-800 ring-sky-200'],
  indigo: ['#7C8CFF', 'bg-[#7C8CFF]/[0.14] text-[#C3CAFF] ring-[#7C8CFF]/35', 'bg-indigo-50 text-indigo-800 ring-indigo-200'],
  gold: ['#F3CB55', 'bg-[#F3CB55]/[0.12] text-[#F7DC8A] ring-[#F3CB55]/30', 'bg-amber-50 text-amber-800 ring-amber-200'],
  violet: ['#B794FF', 'bg-[#B794FF]/[0.13] text-[#DCC9FF] ring-[#B794FF]/35', 'bg-violet-50 text-violet-800 ring-violet-200'],
  rose: ['#FF6B86', 'bg-[#FF6B86]/[0.12] text-[#FFB8C5] ring-[#FF6B86]/30', 'bg-rose-50 text-rose-800 ring-rose-200'],
  green: ['#34D399', 'bg-[#34D399]/[0.12] text-[#8FF0C8] ring-[#34D399]/30', 'bg-emerald-50 text-emerald-800 ring-emerald-200'],
  neutral: ['#93A0B6', 'bg-white/[0.06] text-[#C5CEDC] ring-white/15', 'bg-slate-50 text-slate-700 ring-slate-200'],
};

export function Pill({ hue = 'neutral', tone = 'dark', dot = true, className = '', children }) {
  const [color, dark, light] = PILL[hue] || PILL.neutral;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone === 'dark' ? dark : light} ${className}`}>
    {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: tone === 'dark' ? `0 0 8px ${color}` : 'none' }} aria-hidden="true" />}
    {children}
  </span>;
}

export function EmptyState({ icon = Inbox, title, description, action, tone = 'dark' }) {
  const Icon = icon;
  const dark = tone === 'dark';
  return <div className={`${dark ? 'glass' : 'rounded-2xl border border-dashed border-slate-300 bg-white/70'} relative flex flex-col items-center px-6 py-12 text-center`}>
    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${dark ? 'bg-white/[0.05] text-[var(--adm-ink-2)] ring-1 ring-white/10' : 'bg-slate-100 text-slate-600'}`}><Icon size={22} aria-hidden="true" /></span>
    <p className={`mt-4 text-[15px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
    {description && <p className={`mt-1 max-w-sm text-sm ${dark ? 'text-[var(--adm-ink-2)]' : 'text-slate-600'}`}>{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

// Inline status/error message. tone: ok | err | info (dark surfaces) — use .adm-note classes.
export function Notice({ kind = 'ok', children, className = '' }) {
  const role = kind === 'err' ? 'alert' : 'status';
  const cls = kind === 'err' ? 'adm-note adm-note--err' : kind === 'info' ? 'adm-note border-white/10 bg-white/[0.04] text-[var(--adm-ink-2)]' : 'adm-note adm-note--ok';
  return <p role={role} className={`${cls} ${className}`}>{children}</p>;
}
