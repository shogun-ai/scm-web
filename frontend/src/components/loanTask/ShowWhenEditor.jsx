import { CONDITION_TYPES, OP_LABELS, normalizeShowWhen, optionsOf } from './configHelpers';
import { Field, Select } from '../admin/ui/Form';

const opsFor = def => (def?.type === 'multiselect' ? ['includes'] : def?.type === 'yesno' ? ['equals'] : ['equals', 'in']);

// candidates: resolved defs of fields placed EARLIER than this field.
// onChange(null) = always visible; onChange({ key, op, value }).
export default function ShowWhenEditor({ idPrefix, showWhen, candidates, onChange }) {
  const targets = candidates.filter(def => CONDITION_TYPES.includes(def.type));
  const norm = normalizeShowWhen(showWhen);
  const target = norm ? targets.find(def => def.key === norm.key) : null;
  const options = optionsOf(target);
  const build = (key, op, values) => {
    const def = targets.find(item => item.key === key);
    const allowed = opsFor(def);
    const nextOp = allowed.includes(op) ? op : allowed[0];
    const valid = values.filter(value => optionsOf(def).some(option => option.value === value));
    onChange({ key, op: nextOp, value: nextOp === 'equals' ? (valid[0] ?? '') : valid });
  };
  const toggle = (value, on) => {
    const values = norm.op === 'equals' ? (on ? [value] : []) : options.map(option => option.value).filter(item => (item === value ? on : norm.values.includes(item)));
    build(norm.key, norm.op, values);
  };
  return <div className="space-y-3 rounded-xl bg-black/20 p-3 ring-1 ring-inset ring-white/[0.06]">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Хамаарах талбар">{({ id }) => <Select id={id} className="adm-field--sm" value={norm?.key || ''} onChange={event => (event.target.value ? build(event.target.value, 'equals', []) : onChange(null))}>
        <option value="">Үргэлж харагдана</option>
        {norm && !target && <option value={norm.key}>{norm.key} (олдсонгүй)</option>}
        {targets.map(def => <option key={def.key} value={def.key}>{def.label}</option>)}
      </Select>}</Field>
      {norm && <Field label="Нөхцөл">{({ id }) => <Select id={id} className="adm-field--sm" value={norm.op} disabled={opsFor(target).length < 2} onChange={event => build(norm.key, event.target.value, norm.values)}>
        {(target ? opsFor(target) : [norm.op]).map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
      </Select>}</Field>}
    </div>
    {norm && target && <fieldset><legend className="adm-label mb-1">{norm.op === 'equals' ? 'Утга' : 'Аль нэг нь сонгогдсон үед'}</legend>
      <div className="flex flex-wrap gap-x-4">{options.map(option => <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[var(--adm-ink-2)]"><input type={norm.op === 'equals' ? 'radio' : 'checkbox'} name={`${idPrefix}-sw`} className="h-4 w-4 accent-[var(--hue)]" checked={norm.values.includes(option.value)} onChange={event => toggle(option.value, event.target.checked)} />{option.label}</label>)}</div>
    </fieldset>}
    {targets.length === 0 && <p className="text-xs text-[var(--adm-ink-3)]">Өмнө байрлах сонголт/Тийм-Үгүй талбар алга.</p>}
  </div>;
}
