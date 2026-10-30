const borrowers = [
  ['individual', 'Иргэн'],
  ['organization', 'Байгууллага'],
];

export function getProductTermSections(product) {
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
  return borrowers.filter(([borrower]) => product[borrower]).map(([borrower, label]) => ({
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

// An intentionally empty list is saved content too; do not restore static defaults.
export function hasProductTerms(variant) {
  return borrowers.some(([borrower]) => ['conditions', 'requirements']
    .some(field => Array.isArray(variant?.[borrower]?.[field])));
}
