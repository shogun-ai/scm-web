import { FILE_CATEGORIES, FILE_FORMATS, LIMITS, isFieldVisible, validateAnswers } from '@shared/loanWidgets';

export const MAX_FILE_BYTES = (LIMITS?.fileMaxMb || 10) * 1024 * 1024;
export const DEFAULT_ACCEPT = ['pdf', 'jpg', 'png', 'webp'];

export const isFileField = field => field?.type === 'file';
export const isVisible = (field, raw) => isFieldVisible(field, raw || {});
export const allFields = steps => (steps || []).flatMap(step => step.fields || []);

// Keys of fields hidden by their showWhen. Evaluated in order against the answers of
// still-visible fields, so a field whose target is itself hidden is hidden too.
export function hiddenKeys(steps, raw) {
  const working = { ...(raw || {}) };
  const hidden = new Set();
  for (const field of allFields(steps)) {
    if (!isVisible(field, working)) { hidden.add(field.key); delete working[field.key]; }
  }
  return hidden;
}
// raw without answers of hidden fields.
export function pruneHidden(steps, raw) {
  const hidden = hiddenKeys(steps, raw);
  if (![...hidden].some(key => raw && Object.hasOwn(raw, key))) return raw;
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !hidden.has(key)));
}
// Steps that still have at least one visible field (steps with no fields at all are kept).
export const visibleSteps = (steps, raw) => (steps || []).filter(step => !(step.fields || []).length || (step.fields || []).some(field => isVisible(field, raw)));
export const acceptMimes = field => (field.accept?.length ? field.accept : DEFAULT_ACCEPT).map(format => FILE_FORMATS[format]).filter(Boolean);
export const acceptLabel = field => (field.accept?.length ? field.accept : DEFAULT_ACCEPT).map(format => format.toUpperCase()).join(', ');
export const maxFilesOf = field => field.maxFiles || 3;
export const maxMbOf = field => field.maxSizeMb || LIMITS?.fileMaxMb || 10;
export const formatMoney = value => (value === '' || value == null || Number.isNaN(Number(value)) ? '' : Number(value).toLocaleString('mn-MN'));
export const maskRegister = value => (String(value || '').length > 4 ? `${String(value).slice(0, 2)}${'•'.repeat(String(value).length - 4)}${String(value).slice(-2)}` : '••••');

const num = value => (value === '' || value == null ? undefined : Number(value));

// Raw UI state -> normalized-for-validation answers (non-file, visible fields only).
export function prepareAnswers(steps, raw) {
  const out = {};
  for (const field of allFields(steps)) {
    if (isFileField(field) || !isVisible(field, raw)) continue;
    const value = raw?.[field.key];
    if (field.widget === 'other_loans' || field.key === 'other_loans') {
      if (value && typeof value === 'object' && typeof value.hasActiveLoans === 'boolean') {
        out[field.key] = value.hasActiveLoans
          ? { hasActiveLoans: true, loans: (value.loans || []).map(row => ({ lender: String(row.lender || '').trim(), balance: num(row.balance), monthlyPayment: num(row.monthlyPayment) })) }
          : { hasActiveLoans: false };
      }
      continue;
    }
    if (field.type === 'number') { const n = num(value); if (n !== undefined) out[field.key] = n; continue; }
    if (field.type === 'yesno') { if (typeof value === 'boolean') out[field.key] = value; continue; }
    if (field.type === 'multiselect') { if (Array.isArray(value)) { const list = [...new Set(value.filter(item => typeof item === 'string'))]; if (list.length) out[field.key] = list; } continue; }
    if (field.type === 'composite') { if (value && typeof value === 'object') out[field.key] = { lastName: String(value.lastName || '').trim(), firstName: String(value.firstName || '').trim() }; continue; }
    if (typeof value === 'string' && value.trim() !== '') out[field.key] = value.trim();
  }
  return out;
}

export function checkFileSelection(field, existing, additions, allCount, allBytes) {
  const max = maxFilesOf(field);
  const mimes = acceptMimes(field);
  if (additions.some(file => !mimes.includes(file.type))) return `${acceptLabel(field)} файл сонгоно уу.`;
  if (additions.some(file => file.size === 0 || file.size > maxMbOf(field) * 1024 * 1024)) return `Файл бүр хоосон биш, ${maxMbOf(field)} MB хүртэл хэмжээтэй байна.`;
  if (existing.length + additions.length > max) return `Энэ хэсэгт ${max} хүртэл файл нэмнэ үү.`;
  const totalFiles = LIMITS?.filesTotal || 12;
  const totalBytes = LIMITS?.bytesTotal || 50 * 1024 * 1024;
  if (allCount + additions.length > totalFiles || allBytes + additions.reduce((s, f) => s + f.size, 0) > totalBytes) return `Нийт ${totalFiles} файл, ${Math.round(totalBytes / 1024 / 1024)} MB хүртэл хавсаргах боломжтой.`;
  return '';
}

// Validate visible fields of the given steps. Returns { ok, errors, value }.
export function validateSteps(stepsToCheck, raw, files, allStepsForVisibility) {
  const hidden = hiddenKeys(allStepsForVisibility || stepsToCheck, raw);
  // Visibility is already resolved here (targets may live in earlier steps), so showWhen is dropped for the shared validator.
  const shown = stepsToCheck.map(step => ({ ...step, fields: (step.fields || []).filter(field => !hidden.has(field.key)).map(field => ({ ...field, showWhen: null })) }));
  const answers = prepareAnswers(shown, raw);
  const nonFile = shown.map(step => ({ ...step, fields: step.fields.filter(field => !isFileField(field)) }));
  let result = { ok: true, errors: {}, value: answers };
  try { result = validateAnswers(nonFile, answers); } catch { /* keep client-side tolerant; server is authoritative */ }
  const errors = { ...(result.errors || {}) };
  for (const field of allFields(shown)) {
    if (isFileField(field) && field.required && !(files?.[field.key]?.length)) errors[field.key] = 'Энэ баримтыг хавсаргана уу.';
  }
  return { ok: Object.keys(errors).length === 0, errors, value: result.value || answers };
}

export const errorFor = (errors, key) => errors?.[key] || errors?.[Object.keys(errors || {}).find(path => path.startsWith(`${key}.`)) || ''] || '';
export const stepIndexForErrors = (steps, errors) => {
  const keys = Object.keys(errors || {});
  return (steps || []).findIndex(step => (step.fields || []).some(field => keys.some(path => path === field.key || path.startsWith(`${field.key}.`))));
};

// ---- file categories (D15) ----
// FILE_CATEGORIES comes from shared; the preset-key fallback covers configs/snapshots without field.category.
export { FILE_CATEGORIES };
const CATEGORY_BY_KEY = {
  id_reference: 'personal', address_reference: 'personal',
  ndsh_reference: 'income', bank_statement: 'income', zms_reference: 'income', zms_scoring: 'income', income_other_file: 'income',
  car_photos: 'collateral', property_docs: 'collateral',
};
export const categoryOf = field => {
  if (FILE_CATEGORIES.some(item => item.key === field?.category)) return field.category;
  const key = String(field?.key || '');
  if (CATEGORY_BY_KEY[key]) return CATEGORY_BY_KEY[key];
  return key.startsWith('collateral_') ? 'collateral' : 'other';
};
// -> [{ key, label, fields }] in FILE_CATEGORIES order; empty categories are dropped.
export const groupFileFields = fields => FILE_CATEGORIES
  .map(category => ({ ...category, fields: (fields || []).filter(field => categoryOf(field) === category.key) }))
  .filter(group => group.fields.length > 0);
