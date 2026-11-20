import { useState } from 'react';
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react';
import { slugify } from '@shared/loanWidgets';
import StepsEditor from './StepsEditor';
import { collectKeys } from './configHelpers';

const BOX = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';
const STATUS = { live: ['Идэвхтэй', 'bg-emerald-100 text-emerald-800'], scheduled: ['Товлогдсон', 'bg-sky-100 text-sky-800'], expired: ['Дууссан', 'bg-slate-200 text-slate-700'], inactive: ['Идэвхгүй', 'bg-slate-100 text-slate-600'] };
const PUBLIC_BASE = 'https://www.scm.mn/loan-request';

const toSlug = text => (slugify(text) || '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export default function SubProductEditor({ productKey, subProducts, productSteps, assignees, onChange, errors = {} }) {
  const [editing, setEditing] = useState(null); // index
  const [copied, setCopied] = useState('');
  const patch = (index, change) => onChange(subProducts.map((sub, position) => (position === index ? { ...sub, ...change } : sub)));
  const add = () => {
    const base = 'program';
    let n = subProducts.length + 1;
    const ids = new Set(subProducts.map(sub => sub.id));
    while (ids.has(`${base}-${n}`)) n++;
    onChange([...subProducts, { id: `${base}-${n}`, name: '', description: '', startDate: null, endDate: null, isActive: false, order: subProducts.length + 1, inheritSteps: true, steps: [], defaultAssigneeId: '', slugTouched: false }]);
    setEditing(subProducts.length);
  };
  const link = sub => `${PUBLIC_BASE}?product=${encodeURIComponent(productKey)}&sub=${encodeURIComponent(sub.id)}`;
  const copy = async sub => { try { await navigator.clipboard.writeText(link(sub)); setCopied(sub.id); setTimeout(() => setCopied(''), 2000); } catch { setCopied(''); } };
  const err = (index, key) => errors[`subProducts.${index}.${key}`];

  if (editing != null && subProducts[editing]) {
    const sub = subProducts[editing];
    const otherKeys = collectKeys(productSteps);
    return <div className="space-y-5">
      <button type="button" onClick={() => setEditing(null)} className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600 hover:text-[#003B5C]"><ArrowLeft size={16} aria-hidden="true" />Жагсаалт руу</button>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Нэр <span className="text-red-600" aria-hidden="true">*</span><input className={`${BOX} mt-1 w-full`} maxLength={120} value={sub.name} onChange={event => patch(editing, { name: event.target.value, ...(sub.slugTouched || sub.saved ? {} : { id: toSlug(event.target.value).padEnd(2, '0') || sub.id }) })} />{err(editing, 'name') && <span role="alert" className="mt-1 block text-red-700">{err(editing, 'name')}</span>}</label>
        <label className="block text-xs font-semibold text-slate-600">Slug (холбоост орно)<input className={`${BOX} mt-1 w-full font-mono`} maxLength={40} value={sub.id} onChange={event => patch(editing, { id: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), slugTouched: true })} />{err(editing, 'id') && <span role="alert" className="mt-1 block text-red-700">{err(editing, 'id')}</span>}</label>
        <label className="block text-xs font-semibold text-slate-600">Хүлээн авагч<select className={`${BOX} mt-1 w-full min-h-10`} value={sub.defaultAssigneeId || ''} onChange={event => patch(editing, { defaultAssigneeId: event.target.value })}><option value="">Бүтээгдэхүүний default</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Тайлбар<textarea className={`${BOX} mt-1 w-full`} rows={2} maxLength={500} value={sub.description || ''} onChange={event => patch(editing, { description: event.target.value })} /></label>
        <label className="block text-xs font-semibold text-slate-600">Эхлэх огноо (УБ цаг)<input type="date" className={`${BOX} mt-1 w-full`} value={sub.startDate || ''} onChange={event => patch(editing, { startDate: event.target.value || null })} />{err(editing, 'startDate') && <span role="alert" className="mt-1 block text-red-700">{err(editing, 'startDate')}</span>}</label>
        <label className="block text-xs font-semibold text-slate-600">Дуусах огноо (УБ цаг, дугтуйлан)<input type="date" className={`${BOX} mt-1 w-full`} value={sub.endDate || ''} onChange={event => patch(editing, { endDate: event.target.value || null })} />{err(editing, 'endDate') && <span role="alert" className="mt-1 block text-red-700">{err(editing, 'endDate')}</span>}</label>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={Boolean(sub.isActive)} onChange={event => patch(editing, { isActive: event.target.checked })} />Идэвхтэй</label>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#003B5C]" checked={sub.inheritSteps !== false} onChange={event => patch(editing, { inheritSteps: event.target.checked, steps: event.target.checked ? [] : (sub.steps?.length ? sub.steps : JSON.parse(JSON.stringify(productSteps || []))) })} />Үндсэн маягтыг өвлөх</label>
      </div>
      {sub.inheritSteps === false && <div><h4 className="mb-3 text-sm font-bold text-[#003B5C]">Энэ хөтөлбөрийн алхмууд</h4><StepsEditor steps={sub.steps || []} onChange={steps => patch(editing, { steps })} errors={errors} pathPrefix={`subProducts.${editing}.steps`} allKeys={[...otherKeys, ...collectKeys(sub.steps)]} /></div>}
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Нийтийн холбоос: <span className="break-all font-mono">{link(sub)}</span></p>
    </div>;
  }

  return <div className="space-y-4">
    {subProducts.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Дэд бүтээгдэхүүн алга.</p>}
    <ul className="space-y-3">{subProducts.map((sub, index) => { const [label, color] = STATUS[sub.status || (sub.isActive ? 'live' : 'inactive')] || STATUS.inactive; return <li key={`${sub.id}-${index}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="min-w-0 flex-1"><p className="font-semibold">{sub.name || '(нэргүй)'} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span></p><p className="mt-1 text-xs text-slate-500">{sub.startDate || '—'} → {sub.endDate || '—'} · <span className="font-mono">{sub.id}</span></p>{Object.keys(errors).some(path => path.startsWith(`subProducts.${index}.`)) && <p role="alert" className="mt-1 text-xs text-red-700">Алдаатай талбар байна.</p>}</div>
      <button type="button" onClick={() => copy(sub)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-semibold"><Copy size={14} aria-hidden="true" />{copied === sub.id ? 'Хуулсан' : 'Холбоос'}</button>
      <button type="button" onClick={() => setEditing(index)} className="min-h-10 rounded-xl bg-[#003B5C] px-4 text-xs font-semibold text-white">Засах</button>
      <button type="button" onClick={() => onChange(subProducts.filter((_, position) => position !== index))} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-700" aria-label={`${sub.name || 'Дэд бүтээгдэхүүн'} устгах`}><Trash2 size={16} aria-hidden="true" /></button>
    </li>; })}</ul>
    <button type="button" onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C]/10 px-4 text-sm font-semibold text-[#003B5C]"><Plus size={16} aria-hidden="true" />Дэд бүтээгдэхүүн нэмэх</button>
  </div>;
}
