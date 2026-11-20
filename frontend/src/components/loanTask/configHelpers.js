import { PRESET_BY_KEY, resolveField, slugify } from '@shared/loanWidgets';

export const presetLabel = preset => preset?.label || preset?.name || preset?.key || '';
export const fieldLabel = field => field.label || (field.kind === 'preset' ? presetLabel(PRESET_BY_KEY?.[field.key]) : '') || field.key;
export const fieldType = field => (field.kind === 'preset' ? PRESET_BY_KEY?.[field.key]?.type : field.type);
export const collectKeys = steps => (steps || []).flatMap(step => (step.fields || []).map(field => field.key));
export const newStepId = steps => { let n = (steps || []).length + 1; const ids = new Set((steps || []).map(step => step.id)); while (ids.has(`step_${n}`)) n++; return `step_${n}`; };
export const makeCustomKey = (label, takenKeys) => {
  const slug = (slugify(label) || 'field').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'field';
  let key = `cf_${slug}`;
  let index = 2;
  while (takenKeys.includes(key)) key = `cf_${slug.slice(0, 26)}_${index++}`;
  return key;
};
export const isManagerUser = user => {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])];
  return roles.includes('admin') || roles.includes('director');
};

// ---- D11: conditional fields / editable options ----
export const CONDITION_TYPES = ['select', 'yesno', 'multiselect'];
export const OPTION_TYPES = ['select', 'multiselect'];
export const YESNO_OPTIONS = [{ value: 'true', label: 'Тийм' }, { value: 'false', label: 'Үгүй' }];

// Stored field ref -> definition with admin overrides (ref.options / ref.showWhen; ref.showWhen === null means "always visible").
export function effectiveField(ref) {
  let def = null;
  try { def = resolveField(ref); } catch { def = null; }
  const preset = ref.kind === 'preset' ? PRESET_BY_KEY?.[ref.key] : null;
  const out = def ? { ...def } : { ...ref, type: preset ? preset.type : ref.type, options: preset ? preset.options : ref.options, showWhen: preset ? preset.showWhen : null };
  if (Array.isArray(ref.options)) out.options = ref.options;
  if (ref.showWhen !== undefined) out.showWhen = ref.showWhen;
  out.label = fieldLabel({ ...ref, label: ref.label || out.label });
  return out;
}

// Legacy { key, equals } and new { key, op, value } -> { key, op, values: string[] } (or null).
export function normalizeShowWhen(showWhen) {
  if (!showWhen || typeof showWhen !== 'object' || !showWhen.key) return null;
  const op = showWhen.op || 'equals';
  const raw = showWhen.op ? showWhen.value : showWhen.equals;
  const values = (Array.isArray(raw) ? raw : [raw]).filter(item => item !== undefined && item !== null && item !== '').map(String);
  return { key: showWhen.key, op, values };
}
export const OP_LABELS = { equals: 'тэнцүү', in: 'аль нэг нь', includes: 'агуулсан' };

export const optionsOf = def => (def?.type === 'yesno' ? YESNO_OPTIONS : (Array.isArray(def?.options) ? def.options : []));

// Human summary, e.g. "Орлого = Цалин, Цалин + бизнес". Returns { text, broken }.
export function showWhenSummary(showWhen, earlierDefs) {
  const norm = normalizeShowWhen(showWhen);
  if (!norm) return null;
  const target = earlierDefs.find(def => def.key === norm.key);
  const options = optionsOf(target);
  const labels = norm.values.map(value => options.find(option => option.value === value)?.label || value);
  return { text: `${target ? target.label : norm.key} ${norm.op === 'includes' ? 'агуулсан' : '='} ${labels.join(', ')}`, broken: !target || norm.values.length === 0 || norm.values.some(value => !options.some(option => option.value === value)) };
}

export const makeOptionValue = options => {
  const taken = new Set((options || []).map(option => option.value));
  let n = (options || []).length + 1;
  while (taken.has(`opt_${n}`)) n++;
  return `opt_${n}`;
};
