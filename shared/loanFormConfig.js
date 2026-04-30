// ─── Single source of truth ───────────────────────────────────────────────────
// loan-frontend суурь болно. Энд нэмэлт өөрчлөлт хийхэд:
//   • loan-frontend (loan.scm.mn) автоматаар дагана
//   • frontend     (www.scm.mn)   автоматаар дагана
// ─────────────────────────────────────────────────────────────────────────────

export const LOAN_PRODUCTS = [
  { id: 'biz_loan',          name: 'Бизнесийн зээл' },
  { id: 'car_purchase_loan', name: 'Автомашин худалдан авах зээл' },
  { id: 'car_coll_loan',     name: 'Автомашин барьцаалсан зээл' },
  { id: 'cons_loan',         name: 'Хэрэглээний зээл' },
  { id: 'credit_card',       name: 'Кредит карт' },
  { id: 're_loan',           name: 'Үл хөдлөх барьцаалсан зээл' },
  { id: 'line_loan',         name: 'Зээлийн шугам' },
  { id: 'mortgage',          name: 'Орон сууцны зээл' },
];

// Key → Name map (select dropdown-д ашиглана)
export const PRODUCTS_MAP = Object.fromEntries(LOAN_PRODUCTS.map(p => [p.id, p.name]));

export const EMPLOYMENT_TYPES = [
  'Цалинтай ажилтан',
  'Хувиараа хөдөлмөр эрхлэгч',
  'Бизнес эрхлэгч',
  'Тэтгэвэрт гарсан',
  'Ажилгүй',
  'Оюутан',
  'Фриланс',
];

export const REVENUE_RANGES  = ['<10 сая', '10-50 сая', '50-200 сая', '200-500 сая', '500+ сая'];
export const EMPLOYEE_RANGES = ['1-5', '6-20', '21-50', '51-200', '200+'];
export const GUARANTOR_TYPES = ['Хамтран зээлдэгч', 'Батлан даагч'];

// Барьцааны төрлүүд — icon тус тусдаа аппд нэмнэ (lucide-react import)
export const COLLATERAL_TYPE_KEYS = [
  { key: 'real_estate', label: 'Үл хөдлөх хөрөнгө' },
  { key: 'vehicle',     label: 'Тээврийн хэрэгсэл' },
  { key: 'contract',    label: 'Гэрээ / Бусад' },
];
