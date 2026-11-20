import { PRESET_BY_KEY, slugify } from '@shared/loanWidgets';

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
