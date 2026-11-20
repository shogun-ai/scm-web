const borrowers = [
  ['individual', 'Иргэн'],
  ['organization', 'Байгууллага'],
];

// includeAll: the CMS editor always offers both borrower sections (new products have none yet).
export function getProductTermSections(product, { includeAll = false } = {}) {
  const variants = product.productKey === 'car_loan' || product.isCarLoan
    ? [['purchase', 'Автомашины зээл'], ['collateral', 'Автомашин барьцаалсан зээл']]
    : [];
  if (variants.length) {
    return variants.flatMap(([variant, label]) => borrowers.map(([borrower, borrowerLabel]) => ({
      key: `${variant}-${borrower}`,
      label: `${label} — ${borrowerLabel}`,
      path: [variant, borrower],
    })));
  }
  return borrowers.filter(([borrower]) => includeAll || product[borrower]).map(([borrower, label]) => ({
    key: borrower, label, path: [borrower],
  }));
}

export function getProductTermList(product, path, field) {
  const section = path.reduce((value, key) => value?.[key], product);
  return Array.isArray(section?.[field]) ? section[field] : [];
}

export function updateProductTermList(product, path, field, update) {
  const replace = (value, depth) => depth === path.length
    ? { ...value, [field]: update(getProductTermList(product, path, field)) }
    : { ...value, [path[depth]]: replace(value?.[path[depth]], depth + 1) };
  return replace(product, 0);
}

// Drop borrower sections the editor offered but the admin left empty, unless the saved product already had them
// (an existing empty list is intentional content and must be kept).
export function pruneNewEmptyTerms(product, original) {
  const next = { ...product };
  for (const [borrower] of borrowers) {
    const section = next[borrower];
    const empty = !section || ['conditions', 'requirements'].every(field => !Array.isArray(section[field]) || section[field].every(item => !String(item || '').trim()));
    if (empty && !original?.[borrower]) delete next[borrower];
  }
  return next;
}

// Content copied from another product: everything except identity/ordering fields.
const COPY_EXCLUDE = new Set(['_id', 'productKey', 'order', 'isActive', 'updatedAt', 'createdAt', '__v']);
export function copyProductContent(target, source) {
  const copied = {};
  for (const [key, value] of Object.entries(source || {})) if (!COPY_EXCLUDE.has(key) && value !== undefined) copied[key] = JSON.parse(JSON.stringify(value));
  return { ...target, ...copied, title: target.title || (source?.title ? `${source.title} (хуулбар)` : '') };
}

// An intentionally empty list is saved content too; do not restore static defaults.
export function hasProductTerms(variant) {
  return borrowers.some(([borrower]) => ['conditions', 'requirements']
    .some(field => Array.isArray(variant?.[borrower]?.[field])));
}
