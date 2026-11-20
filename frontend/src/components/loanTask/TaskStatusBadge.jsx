import { TASK_STATUS_LABELS, TASK_OUTCOME_LABELS } from '@shared/loanTaskStatus';

const COLORS = {
  new: 'bg-sky-100 text-sky-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  additional_docs: 'bg-amber-100 text-amber-800',
  in_review: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  resolved: 'bg-emerald-100 text-emerald-800',
};

export default function TaskStatusBadge({ status, outcome, legacy = false, className = '' }) {
  const outcomeCode = outcome?.code || outcome;
  return <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}>{TASK_STATUS_LABELS[status] || status || '—'}</span>
    {outcomeCode && TASK_OUTCOME_LABELS[outcomeCode] && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{TASK_OUTCOME_LABELS[outcomeCode]}</span>}
    {legacy && <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500">хуучин</span>}
  </span>;
}
