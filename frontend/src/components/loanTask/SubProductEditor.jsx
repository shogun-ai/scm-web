import { useState } from 'react';
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react';
import { slugify } from '@shared/loanWidgets';
import StepsEditor from './StepsEditor';
import { collectKeys } from './configHelpers';
import Button from '../admin/ui/Button';
import { Field, Input, Select, Textarea, Toggle } from '../admin/ui/Form';
import { EmptyState, Pill } from '../admin/ui/Feedback';
import { IconButton, SUBCARD } from '../admin/tabs/cms/editorKit';

const STATUS = { live: ['Идэвхтэй', 'green'], scheduled: ['Товлогдсон', 'cyan'], expired: ['Дууссан', 'neutral'], inactive: ['Идэвхгүй', 'neutral'] };
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
      <button type="button" onClick={() => setEditing(null)} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-[var(--adm-ink-2)] hover:text-white"><ArrowLeft size={16} aria-hidden="true" />Жагсаалт руу</button>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Нэр" required error={err(editing, 'name')} className="sm:col-span-2">{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} maxLength={120} value={sub.name} onChange={event => patch(editing, { name: event.target.value, ...(sub.slugTouched || sub.saved ? {} : { id: toSlug(event.target.value).padEnd(2, '0') || sub.id }) })} />}</Field>
        <Field label="Slug (холбоост орно)" error={err(editing, 'id')}>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className="font-mono" maxLength={40} value={sub.id} onChange={event => patch(editing, { id: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), slugTouched: true })} />}</Field>
        <Field label="Хүлээн авагч">{({ id }) => <Select id={id} value={sub.defaultAssigneeId || ''} onChange={event => patch(editing, { defaultAssigneeId: event.target.value })}><option value="">Бүтээгдэхүүний default</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</Select>}</Field>
        <Field label="Тайлбар" className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={sub.description || ''} onChange={event => patch(editing, { description: event.target.value })} />}</Field>
        <Field label="Эхлэх огноо (УБ цаг)" error={err(editing, 'startDate')}>{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" value={sub.startDate || ''} onChange={event => patch(editing, { startDate: event.target.value || null })} />}</Field>
        <Field label="Дуусах огноо (УБ цаг, дугтуйлан)" error={err(editing, 'endDate')}>{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" value={sub.endDate || ''} onChange={event => patch(editing, { endDate: event.target.value || null })} />}</Field>
        <Toggle checked={Boolean(sub.isActive)} onChange={checked => patch(editing, { isActive: checked })} label="Идэвхтэй" />
        <Toggle checked={sub.inheritSteps !== false} onChange={checked => patch(editing, { inheritSteps: checked, steps: checked ? [] : (sub.steps?.length ? sub.steps : JSON.parse(JSON.stringify(productSteps || []))) })} label="Үндсэн маягтыг өвлөх" />
      </div>
      {sub.inheritSteps === false && <div><h4 className="adm-label mb-3">Энэ хөтөлбөрийн алхмууд</h4><StepsEditor steps={sub.steps || []} onChange={steps => patch(editing, { steps })} errors={errors} pathPrefix={`subProducts.${editing}.steps`} allKeys={[...otherKeys, ...collectKeys(sub.steps)]} /></div>}
      <p className={`${SUBCARD} text-xs text-[var(--adm-ink-3)]`}>Нийтийн холбоос: <span className="break-all font-mono text-[var(--adm-ink-2)]">{link(sub)}</span></p>
    </div>;
  }

  return <div className="space-y-4">
    {subProducts.length === 0 && <EmptyState title="Дэд бүтээгдэхүүн алга." description="Хугацаатай хөтөлбөр, тусгай нөхцөл зэргийг дэд бүтээгдэхүүнээр нэмнэ." />}
    <ul className="space-y-3">{subProducts.map((sub, index) => { const [label, hue] = STATUS[sub.status || (sub.isActive ? 'live' : 'inactive')] || STATUS.inactive; return <li key={`${sub.id}-${index}`} className={`${SUBCARD} flex flex-wrap items-center gap-3`}>
      <div className="min-w-0 flex-1 basis-56"><p className="flex flex-wrap items-center gap-2 font-semibold text-white">{sub.name || '(нэргүй)'} <Pill hue={hue}>{label}</Pill></p><p className="adm-tnum mt-1 text-xs text-[var(--adm-ink-3)]">{sub.startDate || '—'} → {sub.endDate || '—'} · <span className="font-mono">{sub.id}</span></p>{Object.keys(errors).some(path => path.startsWith(`subProducts.${index}.`)) && <p role="alert" className="mt-1 text-xs text-[#FFC9D3]">Алдаатай талбар байна.</p>}</div>
      <Button variant="secondary" icon={<Copy size={14} aria-hidden="true" />} onClick={() => copy(sub)}>{copied === sub.id ? 'Хуулсан' : 'Холбоос'}</Button>
      <Button onClick={() => setEditing(index)}>Засах</Button>
      <IconButton danger label={`${sub.name || 'Дэд бүтээгдэхүүн'} устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => onChange(subProducts.filter((_, position) => position !== index))} />
    </li>; })}</ul>
    <button type="button" onClick={add} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.16] text-sm font-semibold text-[var(--adm-ink-2)] transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--hue)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--hue)_7%,transparent)] hover:text-white"><Plus size={16} aria-hidden="true" />Дэд бүтээгдэхүүн нэмэх</button>
  </div>;
}
