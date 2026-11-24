import { TASK_STATUS_LABELS, TASK_OUTCOME_LABELS } from '@shared/loanTaskStatus';

// Status → spectrum hue. Dark tone: light tint text on a translucent hue (≥ 8:1 on the admin glass).
// Light tone: deep hue text on a pale tint (≥ 6:1 on white).
const HUES = {
  new: { dot: '#4CC6FF', dark: 'bg-[#4CC6FF]/[0.12] text-[#A6E6FF] ring-[#4CC6FF]/30', light: 'bg-sky-50 text-sky-800 ring-sky-200' },
  assigned: { dot: '#7C8CFF', dark: 'bg-[#7C8CFF]/[0.14] text-[#C3CAFF] ring-[#7C8CFF]/35', light: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  additional_docs: { dot: '#F3CB55', dark: 'bg-[#F3CB55]/[0.12] text-[#F7DC8A] ring-[#F3CB55]/30', light: 'bg-amber-50 text-amber-800 ring-amber-200' },
  in_review: { dot: '#B794FF', dark: 'bg-[#B794FF]/[0.13] text-[#DCC9FF] ring-[#B794FF]/35', light: 'bg-violet-50 text-violet-800 ring-violet-200' },
  rejected: { dot: '#FF6B86', dark: 'bg-[#FF6B86]/[0.12] text-[#FFB8C5] ring-[#FF6B86]/30', light: 'bg-rose-50 text-rose-800 ring-rose-200' },
  resolved: { dot: '#34D399', dark: 'bg-[#34D399]/[0.12] text-[#8FF0C8] ring-[#34D399]/30', light: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};
const NEUTRAL = { dot: '#93A0B6', dark: 'bg-white/[0.06] text-[#C5CEDC] ring-white/15', light: 'bg-slate-50 text-slate-700 ring-slate-200' };

export default function TaskStatusBadge({ status, outcome, legacy = false, tone = 'light', className = '' }) {
  const outcomeCode = outcome?.code || outcome;
  const hue = HUES[status] || NEUTRAL;
  const dark = tone === 'dark';
  return <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${dark ? hue.dark : hue.light}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: hue.dot, boxShadow: dark ? `0 0 8px ${hue.dot}` : 'none' }} aria-hidden="true" />
      {TASK_STATUS_LABELS[status] || status || '—'}
    </span>
    {outcomeCode && TASK_OUTCOME_LABELS[outcomeCode] && <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${dark ? NEUTRAL.dark : NEUTRAL.light}`}>{TASK_OUTCOME_LABELS[outcomeCode]}</span>}
    {legacy && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${dark ? 'border-white/15 text-[#93A0B6]' : 'border-slate-300 text-slate-600'}`}>хуучин</span>}
  </span>;
}
