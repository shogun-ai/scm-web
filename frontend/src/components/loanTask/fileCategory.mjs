// Pure file → category resolution for the staff detail drawer (no imports; unit-tested with node:test).
// Order: the configured field's category → legacy storage field name → preset (key/storage) → preset label match → 'other'.
export const LEGACY_FILE_CATEGORY = Object.freeze({
  file_id: 'personal', file_address: 'personal',
  file_social: 'income', file_bank: 'income', file_credit: 'income', file_sainscore: 'income', file_income_other: 'income',
  file_car_photos: 'collateral', file_prop_map: 'collateral', file_prop_cert: 'collateral', file_car_cert: 'collateral',
});

const norm = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function resolveFileCategory(file, field, { presets = [], categoryOf, categories = [] } = {}) {
  const known = key => categories.some(item => item.key === key);
  if (field && known(field.category)) return field.category;
  if (field && categoryOf) {
    const fromField = categoryOf(field);
    if (fromField && fromField !== 'other') return fromField;
  }
  const names = [file?.fieldName, file?.fieldKey, field?.storage].map(value => String(value || '')).filter(Boolean);
  for (const name of names) {
    if (LEGACY_FILE_CATEGORY[name]) return LEGACY_FILE_CATEGORY[name];
    if (name.startsWith('file_collateral') || name.startsWith('collateral_')) return 'collateral';
    const preset = presets.find(item => item.key === name || item.storage === name);
    if (preset && categoryOf) { const category = categoryOf(preset); if (category !== 'other') return category; }
  }
  const label = norm(file?.label || field?.label);
  if (label) {
    const preset = presets.find(item => norm(item.label) && (norm(item.label) === label || label.includes(norm(item.label))));
    if (preset && categoryOf) return categoryOf(preset);
  }
  return 'other';
}
