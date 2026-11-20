// Loan task form widget registry (frontend + backend single source of truth).
// See docs/design/loan-task-management.md §3.1, §3.2, §5.2, §14 D8. Pure functions; browser safe.
import { LOAN_PRODUCTS } from './loanFormConfig.js';

export const LOAN_WIDGETS_VERSION = 1;
export const FILE_FORMATS = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const FILE_FORMAT_KEYS = Object.keys(FILE_FORMATS);
export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'yesno', 'file', 'composite'];
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select', 'yesno', 'file'];
export const LIMITS = { steps: 8, fieldsPerConfig: 60, subProducts: 20, selectOptions: 30, filesTotal: 12, bytesTotal: 50 * 1024 * 1024, fileMaxMb: 10, customFileMaxFiles: 5, answersJsonBytes: 32 * 1024 };
// D8: other_loans rows.
export const OTHER_LOANS_MAX_ROWS = 10;
export const WIDGET_GROUPS = [
  { key: 'personal', label: 'Хувийн мэдээлэл' },
  { key: 'loan', label: 'Зээл' },
  { key: 'documents', label: 'Орлого ба баримт' },
  { key: 'other', label: 'Бусад' },
];
export const BORROWER_TYPE_OPTIONS = [{ value: 'individual', label: 'Иргэн' }, { value: 'organization', label: 'Байгууллага' }];
export const COLLATERAL_OPTIONS = [
  { value: 'vehicle', label: 'Тээврийн хэрэгсэл' },
  { value: 'real_estate', label: 'Үл хөдлөх хөрөнгө' },
  { value: 'account_revenue', label: 'Дансны орлого' },
  { value: 'contract', label: 'Гэрээ / Бусад' },
  { value: 'none', label: 'Барьцаагүй' },
];

const MAX_AMOUNT = 1e12;
const DEFAULT_FILE = { accept: ['pdf', 'jpg', 'png', 'webp'], maxSizeMb: 10, maxFiles: 3 };
const file = (key, label, storage, extra = {}) => ({ key, label, type: 'file', group: 'documents', storage, ...DEFAULT_FILE, ...extra });

export const PRESET_WIDGETS = [
  { key: 'full_name', label: 'Овог нэр', type: 'composite', group: 'personal', maxLength: 100, storage: 'lastname,firstname' },
  { key: 'birth_date', label: 'Төрсөн огноо', type: 'date', group: 'personal', storage: 'applicationData.borrower.birthDate' },
  { key: 'register_number', label: 'Регистрийн дугаар', type: 'text', group: 'personal', maxLength: 10, placeholder: 'УБ90050112', storage: 'regNo' },
  { key: 'phone', label: 'Утас', type: 'text', group: 'personal', maxLength: 20, placeholder: '9900 0000', storage: 'phone' },
  { key: 'email', label: 'Имэйл', type: 'text', group: 'personal', maxLength: 254, placeholder: 'email@mail.com', storage: 'email' },
  { key: 'address', label: 'Оршин суугаа хаяг', type: 'textarea', group: 'personal', maxLength: 500, storage: 'address' },
  { key: 'borrower_type', label: 'Хүсэлт гаргагч', type: 'select', group: 'personal', options: BORROWER_TYPE_OPTIONS, storage: 'userType' },
  { key: 'org_name', label: 'Байгууллагын нэр', type: 'text', group: 'personal', maxLength: 200, showWhen: { key: 'borrower_type', equals: 'organization' }, storage: 'orgName' },
  { key: 'loan_amount', label: 'Зээлийн дүн (₮)', type: 'number', group: 'loan', min: 1, max: MAX_AMOUNT, storage: 'amount' },
  { key: 'loan_term', label: 'Хугацаа (сар)', type: 'number', group: 'loan', min: 1, max: 120, storage: 'term' },
  { key: 'repayment_source', label: 'Эргэн төлөгдөх орлогын эх үүсвэр', type: 'textarea', group: 'loan', maxLength: 1000, storage: 'repaymentSource' },
  { key: 'purpose', label: 'Зориулалт', type: 'textarea', group: 'loan', maxLength: 1000, storage: 'purpose' },
  { key: 'collateral_type', label: 'Барьцаа', type: 'select', group: 'loan', options: COLLATERAL_OPTIONS, storage: 'applicationData.loanRequest.collateralType' },
  { key: 'other_loans', label: 'Өөр банк/ББСБ-д идэвхтэй зээлтэй эсэх', type: 'composite', group: 'loan', maxRows: OTHER_LOANS_MAX_ROWS, storage: 'applicationData.otherLoans' },
  file('id_reference', 'Иргэний үнэмлэхийн лавлагаа', 'file_id'),
  file('address_reference', 'Оршин суугаа газрын лавлагаа', 'file_address'),
  file('ndsh_reference', 'НДШ лавлагаа', 'file_social'),
  file('bank_statement', 'Дансны хуулга', 'file_bank', { maxFiles: 4 }),
  file('zms_reference', 'ЗМС лавлагаа', 'file_credit'),
  file('zms_scoring', 'ЗМС скоринг', 'file_sainscore'),
  file('car_photos', 'Тээврийн хэрэгслийн зураг', 'file_car_photos'),
  file('property_docs', 'Үл хөдлөх / барьцааны материал', 'file_prop_map'),
];
export const PRESET_BY_KEY = Object.freeze(Object.fromEntries(PRESET_WIDGETS.map(preset => [preset.key, preset])));
export const ALWAYS_REQUIRED_PRESETS = ['full_name', 'phone'];
// Labels for stored fileDetails.fieldName values (legacy + preset storage keys).
export const STORAGE_FIELD_LABELS = {
  ...Object.fromEntries(PRESET_WIDGETS.filter(preset => preset.type === 'file').map(preset => [preset.storage, preset.label])),
  file_selfie: 'Селфи зураг', file_car_cert: 'Тээврийн хэрэгслийн гэрчилгээ', file_prop_cert: 'Үл хөдлөхийн гэрчилгээ',
  file_fico: 'FICO скоринг', additional: 'Нэмэлт баримт',
};
export const ADDITIONAL_FILE_KEY = 'additional';

const PRODUCT_KEYS = new Set(LOAN_PRODUCTS.map(product => product.id));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STEP_ID_RE = /^[a-z0-9_-]{1,40}$/;
const CUSTOM_KEY_RE = /^cf_[a-z0-9_]{1,40}$/;
const OPTION_RE = /^[a-z0-9_-]{1,40}$/;
const SUB_ID_RE = /^[a-z0-9-]{2,40}$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
export const REGISTER_RE = /^[А-ЯЁӨҮ]{2}\d{8}$/;
export const PHONE_RE = /^\+?\d{8,15}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const str = value => (typeof value === 'string' ? value.trim() : '');
const isEmpty = value => value === undefined || value === null || (typeof value === 'string' && !value.trim());

export function ubDate(now = new Date()) {
  const time = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return new Date(time + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function subProductStatus(sub, now = new Date()) {
  if (!sub?.isActive) return 'inactive';
  const today = ubDate(now);
  if (sub.startDate && today < sub.startDate) return 'scheduled';
  if (sub.endDate && today > sub.endDate) return 'expired';
  return 'live';
}

export function isSubProductLive(sub, now = new Date()) {
  return subProductStatus(sub, now) === 'live';
}

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'u', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function slugify(text) {
  return String(text || '').toLowerCase().split('').map(char => (Object.hasOwn(TRANSLIT, char) ? TRANSLIT[char] : char)).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
}

// ---------- Field resolution ----------
const FIELD_DEF_DEFAULTS = { helpText: '', placeholder: '', maxLength: null, min: null, max: null, options: null, accept: null, maxSizeMb: null, maxFiles: null, showWhen: null };

export function resolveField(ref) {
  if (!isObject(ref)) return null;
  if (ref.kind === 'preset') {
    const preset = PRESET_BY_KEY[ref.key];
    if (!preset) return null;
    const def = {
      key: preset.key, kind: 'preset', widget: preset.key, type: preset.type,
      label: str(ref.label) || preset.label,
      ...FIELD_DEF_DEFAULTS,
      helpText: str(ref.helpText),
      placeholder: preset.placeholder || '',
      required: ALWAYS_REQUIRED_PRESETS.includes(preset.key) ? true : ref.required === true,
    };
    for (const prop of ['maxLength', 'min', 'max', 'accept', 'maxSizeMb', 'maxFiles']) if (preset[prop] !== undefined) def[prop] = Array.isArray(preset[prop]) ? [...preset[prop]] : preset[prop];
    if (preset.options) def.options = preset.options.map(option => ({ ...option }));
    if (preset.showWhen) def.showWhen = { ...preset.showWhen };
    if (preset.maxRows) def.maxRows = preset.maxRows;
    return def;
  }
  if (ref.kind === 'custom' && CUSTOM_FIELD_TYPES.includes(ref.type)) {
    const def = { key: ref.key, kind: 'custom', widget: null, type: ref.type, label: str(ref.label), ...FIELD_DEF_DEFAULTS, helpText: str(ref.helpText), placeholder: str(ref.placeholder), required: ref.required === true };
    if (ref.type === 'text') def.maxLength = Number.isInteger(ref.maxLength) ? ref.maxLength : 200;
    if (ref.type === 'number' || ref.type === 'date') { def.min = ref.min ?? null; def.max = ref.max ?? null; }
    if (ref.type === 'select') def.options = Array.isArray(ref.options) ? ref.options.map(option => ({ value: option.value, label: option.label })) : [];
    if (ref.type === 'file') {
      def.accept = Array.isArray(ref.accept) && ref.accept.length ? [...ref.accept] : [...DEFAULT_FILE.accept];
      def.maxSizeMb = Number.isInteger(ref.maxSizeMb) ? ref.maxSizeMb : DEFAULT_FILE.maxSizeMb;
      def.maxFiles = Number.isInteger(ref.maxFiles) ? ref.maxFiles : DEFAULT_FILE.maxFiles;
    }
    return def;
  }
  return null;
}

export function resolveSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map(step => ({
    id: step.id, title: str(step.title), description: str(step.description),
    fields: (Array.isArray(step.fields) ? step.fields : []).map(resolveField).filter(Boolean),
  }));
}

const allFields = steps => (Array.isArray(steps) ? steps : []).flatMap(step => (Array.isArray(step?.fields) ? step.fields : []));
const asFieldDefs = steps => allFields(steps).map(field => (field && field.kind && field.type && Object.hasOwn(field, 'widget') ? field : resolveField(field))).filter(Boolean);

// ---------- Config validation ----------
function validateFieldRef(ref, path, errors) {
  if (!isObject(ref)) { errors[path] = 'Талбар буруу байна.'; return null; }
  const textProp = (name, max, required = false) => {
    if (ref[name] !== undefined && ref[name] !== null && typeof ref[name] !== 'string') { errors[`${path}.${name}`] = 'Текст байх ёстой.'; return ''; }
    const value = str(ref[name]);
    if (required && !value) errors[`${path}.${name}`] = 'Заавал бөглөнө.';
    else if (value.length > max) errors[`${path}.${name}`] = `${max} тэмдэгтээс хэтрэхгүй.`;
    return value;
  };
  if (ref.required !== undefined && typeof ref.required !== 'boolean') errors[`${path}.required`] = 'true/false байна.';
  if (ref.kind === 'preset') {
    if (!PRESET_BY_KEY[ref.key]) { errors[`${path}.key`] = 'Үл мэдэгдэх widget.'; return null; }
    const out = { kind: 'preset', key: ref.key, required: ALWAYS_REQUIRED_PRESETS.includes(ref.key) ? true : ref.required === true };
    const label = textProp('label', 120); if (label) out.label = label;
    const helpText = textProp('helpText', 300); if (helpText) out.helpText = helpText;
    return out;
  }
  if (ref.kind !== 'custom') { errors[`${path}.kind`] = 'Талбарын төрөл буруу.'; return null; }
  if (typeof ref.key !== 'string' || !CUSTOM_KEY_RE.test(ref.key)) errors[`${path}.key`] = 'Түлхүүр cf_ угтвартай, a-z0-9_ (40 хүртэл).';
  if (!CUSTOM_FIELD_TYPES.includes(ref.type)) { errors[`${path}.type`] = 'Тусгай талбарын төрөл буруу.'; return null; }
  const out = { kind: 'custom', key: ref.key, type: ref.type, label: textProp('label', 120, true), required: ref.required === true };
  const helpText = textProp('helpText', 300); if (helpText) out.helpText = helpText;
  const placeholder = textProp('placeholder', 120); if (placeholder) out.placeholder = placeholder;
  if (ref.type === 'text' && ref.maxLength !== undefined && ref.maxLength !== null) {
    if (!Number.isInteger(ref.maxLength) || ref.maxLength < 1 || ref.maxLength > 1000) errors[`${path}.maxLength`] = '1–1000 бүхэл тоо.';
    else out.maxLength = ref.maxLength;
  }
  if (ref.type === 'number') {
    for (const name of ['min', 'max']) {
      if (ref[name] === undefined || ref[name] === null || ref[name] === '') continue;
      if (typeof ref[name] !== 'number' || !Number.isFinite(ref[name])) errors[`${path}.${name}`] = 'Тоо байна.';
      else out[name] = ref[name];
    }
    if (out.min !== undefined && out.max !== undefined && out.min > out.max) errors[`${path}.max`] = 'Дээд утга доод утгаас бага байна.';
  }
  if (ref.type === 'date') {
    for (const name of ['min', 'max']) {
      if (ref[name] === undefined || ref[name] === null || ref[name] === '') continue;
      if (!isValidDateString(ref[name])) errors[`${path}.${name}`] = 'YYYY-MM-DD огноо.';
      else out[name] = ref[name];
    }
    if (out.min && out.max && out.min > out.max) errors[`${path}.max`] = 'Дуусах огноо эхлэхээс өмнө байна.';
  }
  if (ref.type === 'select') {
    if (!Array.isArray(ref.options) || ref.options.length < 1 || ref.options.length > LIMITS.selectOptions) errors[`${path}.options`] = `Сонголт 1–${LIMITS.selectOptions}.`;
    else {
      const seen = new Set();
      out.options = ref.options.map((option, index) => {
        const value = isObject(option) && typeof option.value === 'string' ? option.value.trim() : '';
        const label = isObject(option) ? str(option.label) : '';
        if (!OPTION_RE.test(value)) errors[`${path}.options.${index}.value`] = 'Утга a-z0-9_- (40 хүртэл).';
        else if (seen.has(value)) errors[`${path}.options.${index}.value`] = 'Давхардсан утга.';
        seen.add(value);
        if (!label || label.length > 100) errors[`${path}.options.${index}.label`] = 'Нэр 1–100 тэмдэгт.';
        return { value, label };
      });
    }
  }
  if (ref.type === 'file') {
    const accept = ref.accept === undefined ? [...DEFAULT_FILE.accept] : ref.accept;
    if (!Array.isArray(accept) || !accept.length || accept.some(format => !FILE_FORMAT_KEYS.includes(format)) || new Set(accept).size !== accept.length) errors[`${path}.accept`] = 'Дор хаяж нэг формат (pdf, jpg, png, webp).';
    else out.accept = [...accept];
    const maxSizeMb = ref.maxSizeMb ?? DEFAULT_FILE.maxSizeMb;
    if (!Number.isInteger(maxSizeMb) || maxSizeMb < 1 || maxSizeMb > LIMITS.fileMaxMb) errors[`${path}.maxSizeMb`] = `1–${LIMITS.fileMaxMb} МБ.`;
    else out.maxSizeMb = maxSizeMb;
    const maxFiles = ref.maxFiles ?? DEFAULT_FILE.maxFiles;
    if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > LIMITS.customFileMaxFiles) errors[`${path}.maxFiles`] = `1–${LIMITS.customFileMaxFiles} файл.`;
    else out.maxFiles = maxFiles;
  }
  return out;
}

function validateStepsSet(steps, path, errors, { requireLive }) {
  if (!Array.isArray(steps)) { errors[path] = 'Алхмууд буруу байна.'; return []; }
  if (steps.length > LIMITS.steps) errors[path] = `Алхам ${LIMITS.steps}-аас ихгүй.`;
  const stepIds = new Set();
  const keys = new Set();
  let fieldCount = 0;
  let requiredFiles = 0;
  const out = steps.slice(0, LIMITS.steps).map((step, stepIndex) => {
    const stepPath = `${path}.${stepIndex}`;
    if (!isObject(step)) { errors[stepPath] = 'Алхам буруу байна.'; return null; }
    const id = typeof step.id === 'string' ? step.id.trim() : '';
    if (!STEP_ID_RE.test(id)) errors[`${stepPath}.id`] = 'ID a-z0-9_- (40 хүртэл).';
    else if (stepIds.has(id)) errors[`${stepPath}.id`] = 'Давхардсан алхмын ID.';
    stepIds.add(id);
    if (step.title !== undefined && typeof step.title !== 'string') errors[`${stepPath}.title`] = 'Текст байна.';
    const title = str(step.title);
    if (!title || title.length > 80) errors[`${stepPath}.title`] = 'Гарчиг 1–80 тэмдэгт.';
    const description = str(step.description);
    if (description.length > 300) errors[`${stepPath}.description`] = '300 тэмдэгтээс хэтрэхгүй.';
    if (!Array.isArray(step.fields)) { errors[`${stepPath}.fields`] = 'Талбарууд буруу байна.'; return { id, title, description, fields: [] }; }
    if (requireLive && !step.fields.length) errors[`${stepPath}.fields`] = 'Алхамд дор хаяж нэг талбар байна.';
    const fields = step.fields.map((ref, fieldIndex) => {
      const fieldPath = `${stepPath}.fields.${fieldIndex}`;
      fieldCount += 1;
      const field = validateFieldRef(ref, fieldPath, errors);
      if (!field) return null;
      if (keys.has(field.key)) errors[`${fieldPath}.key`] = field.kind === 'preset' ? 'Энэ widget аль хэдийн нэмэгдсэн.' : 'Давхардсан түлхүүр.';
      keys.add(field.key);
      const type = field.kind === 'preset' ? PRESET_BY_KEY[field.key].type : field.type;
      if (type === 'file' && field.required) requiredFiles += 1;
      return field;
    }).filter(Boolean);
    return { id, title, description, fields };
  }).filter(Boolean);
  if (fieldCount > LIMITS.fieldsPerConfig) errors[path] = `Талбар ${LIMITS.fieldsPerConfig}-аас ихгүй.`;
  if (requiredFiles > LIMITS.filesTotal) errors[path] = `Заавал файлын талбар ${LIMITS.filesTotal}-аас ихгүй.`;
  if (requireLive) {
    if (!out.length) errors[path] = 'Идэвхтэй маягтад дор хаяж нэг алхам байна.';
    for (const key of ALWAYS_REQUIRED_PRESETS) if (!keys.has(key)) errors[`${path}.${key}`] = `"${PRESET_BY_KEY[key].label}" талбар заавал байна.`;
  }
  return out;
}

function validateAssigneeId(value, path, errors) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !OBJECT_ID_RE.test(value)) { errors[path] = 'Ажилтны ID буруу байна.'; return ''; }
  return value;
}

function validateDateOrNull(value, path, errors) {
  if (value === undefined || value === null || value === '') return null;
  if (!isValidDateString(value)) { errors[path] = 'YYYY-MM-DD огноо.'; return null; }
  return value;
}

// -> { ok, errors: { [path]: msg }, value: normalized config (without version/updatedBy) }
export function validateConfig(config) {
  const errors = {};
  if (!isObject(config)) return { ok: false, errors: { _form: 'Тохиргоо буруу байна.' }, value: null };
  const productKey = config.productKey;
  if (!PRODUCT_KEYS.has(productKey)) errors.productKey = 'Бүтээгдэхүүн буруу байна.';
  for (const name of ['isActive', 'baseProductEnabled']) if (config[name] !== undefined && typeof config[name] !== 'boolean') errors[name] = 'true/false байна.';
  const isActive = config.isActive === true;
  const value = {
    productKey,
    isActive,
    baseProductEnabled: config.baseProductEnabled !== false,
    defaultAssigneeId: validateAssigneeId(config.defaultAssigneeId, 'defaultAssigneeId', errors),
    steps: validateStepsSet(config.steps ?? [], 'steps', errors, { requireLive: isActive }),
    subProducts: [],
  };
  const subs = config.subProducts ?? [];
  if (!Array.isArray(subs)) errors.subProducts = 'Дэд бүтээгдэхүүн буруу байна.';
  else {
    if (subs.length > LIMITS.subProducts) errors.subProducts = `Дэд бүтээгдэхүүн ${LIMITS.subProducts}-аас ихгүй.`;
    const ids = new Set();
    value.subProducts = subs.slice(0, LIMITS.subProducts).map((sub, index) => {
      const path = `subProducts.${index}`;
      if (!isObject(sub)) { errors[path] = 'Дэд бүтээгдэхүүн буруу байна.'; return null; }
      const id = typeof sub.id === 'string' ? sub.id.trim() : '';
      if (!SUB_ID_RE.test(id)) errors[`${path}.id`] = 'Холбоосын нэр a-z0-9- (2–40).';
      else if (ids.has(id)) errors[`${path}.id`] = 'Давхардсан холбоосын нэр.';
      ids.add(id);
      const name = str(sub.name);
      if (!name || name.length > 120) errors[`${path}.name`] = 'Нэр 1–120 тэмдэгт.';
      const description = str(sub.description);
      if (description.length > 500) errors[`${path}.description`] = '500 тэмдэгтээс хэтрэхгүй.';
      const startDate = validateDateOrNull(sub.startDate, `${path}.startDate`, errors);
      const endDate = validateDateOrNull(sub.endDate, `${path}.endDate`, errors);
      if (startDate && endDate && startDate > endDate) errors[`${path}.endDate`] = 'Дуусах огноо эхлэхээс өмнө байна.';
      for (const flag of ['isActive', 'inheritSteps']) if (sub[flag] !== undefined && typeof sub[flag] !== 'boolean') errors[`${path}.${flag}`] = 'true/false байна.';
      if (sub.order !== undefined && sub.order !== null && (typeof sub.order !== 'number' || !Number.isFinite(sub.order))) errors[`${path}.order`] = 'Тоо байна.';
      const inheritSteps = sub.inheritSteps !== false;
      const subActive = sub.isActive === true;
      return {
        id, name, description, startDate, endDate,
        isActive: subActive,
        order: typeof sub.order === 'number' && Number.isFinite(sub.order) ? sub.order : index + 1,
        inheritSteps,
        steps: inheritSteps ? [] : validateStepsSet(sub.steps ?? [], `${path}.steps`, errors, { requireLive: subActive }),
        defaultAssigneeId: validateAssigneeId(sub.defaultAssigneeId, `${path}.defaultAssigneeId`, errors),
      };
    }).filter(Boolean);
    if (isActive && !value.baseProductEnabled && !value.subProducts.some(sub => sub.isActive)) errors.baseProductEnabled = 'Үндсэн бүтээгдэхүүн хаалттай бол дор хаяж нэг идэвхтэй дэд бүтээгдэхүүн байна.';
  }
  return { ok: Object.keys(errors).length === 0, errors, value };
}

// ---------- Answers validation ----------
function ageOn(birth, today) {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

function parseInteger(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\s*-?[\d\s,]+\s*$/.test(value)) return Number(value.replace(/[\s,]/g, ''));
  return Number.NaN;
}

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() && /^-?[\d\s,]*\.?\d+$/.test(value.trim())) return Number(value.replace(/[\s,]/g, ''));
  return Number.NaN;
}

const intInRange = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;

function validatePreset(def, raw, { today }) {
  switch (def.widget) {
    case 'full_name': {
      if (raw !== undefined && raw !== null && !isObject(raw)) return { error: 'Овог, нэрээ оруулна уу.' };
      const lastName = str(raw?.lastName);
      const firstName = str(raw?.firstName);
      if (!lastName && !firstName) return { empty: true };
      if (lastName.length > 100 || firstName.length > 100) return { error: 'Овог, нэр 100 тэмдэгтээс хэтрэхгүй.' };
      if (def.required && (!lastName || !firstName)) return { error: !lastName ? 'Овгоо оруулна уу.' : 'Нэрээ оруулна уу.' };
      return { value: { lastName, firstName } };
    }
    case 'birth_date': {
      if (isEmpty(raw)) return { empty: true };
      if (!isValidDateString(raw)) return { error: 'Огноог YYYY-MM-DD хэлбэрээр оруулна уу.' };
      const age = ageOn(raw, today);
      if (raw > today || age < 18 || age > 100) return { error: 'Нас 18–100 байх ёстой.' };
      return { value: raw };
    }
    case 'register_number': {
      if (isEmpty(raw)) return { empty: true };
      if (typeof raw !== 'string') return { error: 'Регистрийн дугаар буруу байна.' };
      const value = raw.replace(/\s+/g, '').toUpperCase();
      if (!REGISTER_RE.test(value)) return { error: 'Регистрийн дугаарыг 2 кирилл үсэг, 8 оронтой тоогоор оруулна уу.' };
      return { value };
    }
    case 'phone': {
      if (isEmpty(raw)) return { empty: true };
      if (typeof raw !== 'string' && typeof raw !== 'number') return { error: 'Утасны дугаараа зөв оруулна уу.' };
      const value = String(raw).trim().replace(/[\s()-]/g, '');
      if (!PHONE_RE.test(value)) return { error: 'Утасны дугаараа зөв оруулна уу.' };
      return { value };
    }
    case 'email': {
      if (isEmpty(raw)) return { empty: true };
      if (typeof raw !== 'string') return { error: 'И-мэйл хаягаа зөв оруулна уу.' };
      const value = raw.trim().toLowerCase();
      if (value.length > 254 || !EMAIL_RE.test(value)) return { error: 'И-мэйл хаягаа зөв оруулна уу.' };
      return { value };
    }
    case 'loan_amount':
    case 'loan_term': {
      if (isEmpty(raw)) return { empty: true };
      const value = parseInteger(raw);
      if (!intInRange(value, def.min, def.max)) return { error: def.widget === 'loan_amount' ? 'Зээлийн дүнгээ зөв оруулна уу.' : 'Хугацаа 1–120 сар байна.' };
      return { value };
    }
    case 'borrower_type':
    case 'collateral_type': {
      if (isEmpty(raw)) return { empty: true };
      if (!def.options.some(option => option.value === raw)) return { error: 'Сонголтоос сонгоно уу.' };
      return { value: raw };
    }
    case 'other_loans': {
      if (raw === undefined || raw === null) return { empty: true };
      if (!isObject(raw) || (raw.hasActiveLoans !== undefined && raw.hasActiveLoans !== null && typeof raw.hasActiveLoans !== 'boolean')) return { error: 'Тийм эсвэл үгүй гэж сонгоно уу.' };
      if (raw.hasActiveLoans === undefined || raw.hasActiveLoans === null) return { empty: true };
      if (!raw.hasActiveLoans) return { value: { hasActiveLoans: false, loans: [] } };
      const rows = raw.loans;
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > OTHER_LOANS_MAX_ROWS) return { error: `Идэвхтэй зээлээ 1–${OTHER_LOANS_MAX_ROWS} мөрөөр оруулна уу.` };
      const loans = [];
      const rowErrors = {};
      rows.forEach((row, index) => {
        const lender = isObject(row) ? str(row.lender) : '';
        const balance = isObject(row) ? parseInteger(row.balance) : Number.NaN;
        const monthlyPayment = isObject(row) ? parseInteger(row.monthlyPayment) : Number.NaN;
        if (!lender || lender.length > 120) rowErrors[`loans.${index}.lender`] = 'Банк/ББСБ-ын нэрийг оруулна уу.';
        if (!intInRange(balance, 0, MAX_AMOUNT)) rowErrors[`loans.${index}.balance`] = 'Үлдэгдлийг зөв оруулна уу.';
        if (!intInRange(monthlyPayment, 0, MAX_AMOUNT)) rowErrors[`loans.${index}.monthlyPayment`] = 'Сарын төлбөрийг зөв оруулна уу.';
        loans.push({ lender, balance, monthlyPayment });
      });
      if (Object.keys(rowErrors).length) return { error: 'Зээлийн мэдээллээ шалгана уу.', nested: rowErrors };
      return { value: { hasActiveLoans: true, loans } };
    }
    default: {
      // text / textarea presets: address, repayment_source, purpose, org_name
      if (isEmpty(raw)) return { empty: true };
      if (typeof raw !== 'string') return { error: 'Текст оруулна уу.' };
      const value = raw.trim();
      if (value.length > def.maxLength) return { error: `${def.maxLength} тэмдэгтээс хэтрэхгүй.` };
      return { value };
    }
  }
}

function validateCustom(def, raw) {
  if (def.type === 'yesno') {
    if (raw === undefined || raw === null || raw === '') return { empty: true };
    if (typeof raw !== 'boolean') return { error: 'Тийм эсвэл үгүй гэж сонгоно уу.' };
    return { value: raw };
  }
  if (isEmpty(raw)) return { empty: true };
  if (def.type === 'text') {
    if (typeof raw !== 'string') return { error: 'Текст оруулна уу.' };
    const value = raw.trim();
    if (value.length > (def.maxLength || 200)) return { error: `${def.maxLength || 200} тэмдэгтээс хэтрэхгүй.` };
    return { value };
  }
  if (def.type === 'number') {
    const value = parseNumber(raw);
    if (!Number.isFinite(value)) return { error: 'Тоо оруулна уу.' };
    if (def.min !== null && def.min !== undefined && value < def.min) return { error: `${def.min}-аас багагүй байна.` };
    if (def.max !== null && def.max !== undefined && value > def.max) return { error: `${def.max}-аас ихгүй байна.` };
    return { value };
  }
  if (def.type === 'date') {
    if (!isValidDateString(raw)) return { error: 'Огноог YYYY-MM-DD хэлбэрээр оруулна уу.' };
    if (def.min && raw < def.min) return { error: `${def.min}-аас хойш огноо оруулна уу.` };
    if (def.max && raw > def.max) return { error: `${def.max}-аас өмнөх огноо оруулна уу.` };
    return { value: raw };
  }
  if (def.type === 'select') {
    if (!(def.options || []).some(option => option.value === raw)) return { error: 'Сонголтоос сонгоно уу.' };
    return { value: raw };
  }
  return { empty: true };
}

export function isFieldVisible(def, answers) {
  if (!def?.showWhen) return true;
  return isObject(answers) && answers[def.showWhen.key] === def.showWhen.equals;
}

// steps: StepStored[] or resolved Step[]; answers: raw object. Files are not validated here.
// -> { ok, errors: { [fieldKey | 'fieldKey.loans.0.balance']: msg }, value: normalized answers (allow-listed) }
export function validateAnswers(steps, answers, { now = new Date() } = {}) {
  if (!isObject(answers)) return { ok: false, errors: { _form: 'Хариулт буруу байна.' }, value: {} };
  const today = ubDate(now);
  const errors = {};
  const value = {};
  for (const def of asFieldDefs(steps)) {
    if (def.type === 'file') continue;
    if (!isFieldVisible(def, answers)) continue;
    const raw = answers[def.key];
    const result = def.kind === 'preset' ? validatePreset(def, raw, { today }) : validateCustom(def, raw);
    if (result.error) {
      errors[def.key] = result.error;
      if (result.nested) for (const [path, message] of Object.entries(result.nested)) errors[`${def.key}.${path}`] = message;
    } else if (result.empty) {
      if (def.required) errors[def.key] = `"${def.label}" заавал бөглөнө.`;
    } else value[def.key] = result.value;
  }
  return { ok: Object.keys(errors).length === 0, errors, value };
}

// -> { [fieldKey]: { storageField, accept: [mime], formats: [key], maxBytes, maxFiles, required, label } }
export function fileRulesFor(steps) {
  const rules = {};
  for (const def of asFieldDefs(steps)) {
    if (def.type !== 'file') continue;
    const formats = def.accept && def.accept.length ? def.accept : DEFAULT_FILE.accept;
    rules[def.key] = {
      storageField: def.kind === 'preset' ? PRESET_BY_KEY[def.key].storage : def.key,
      accept: formats.map(format => FILE_FORMATS[format]),
      formats: [...formats],
      maxBytes: (def.maxSizeMb || DEFAULT_FILE.maxSizeMb) * 1024 * 1024,
      maxFiles: def.maxFiles || DEFAULT_FILE.maxFiles,
      required: def.required === true,
      label: def.label,
    };
  }
  return rules;
}

// Rule for preset file keys outside a snapshot (legacy requests) and the generic 'additional' key.
export function presetFileRule(key) {
  if (key === ADDITIONAL_FILE_KEY) return { storageField: ADDITIONAL_FILE_KEY, accept: Object.values(FILE_FORMATS), formats: [...FILE_FORMAT_KEYS], maxBytes: LIMITS.fileMaxMb * 1024 * 1024, maxFiles: LIMITS.customFileMaxFiles, required: false, label: STORAGE_FIELD_LABELS.additional };
  const preset = PRESET_BY_KEY[key];
  if (!preset || preset.type !== 'file') return null;
  return fileRulesFor([{ fields: [{ kind: 'preset', key }] }])[key];
}

export function storageFieldToPresetKey(storageField) {
  const preset = PRESET_WIDGETS.find(item => item.type === 'file' && item.storage === storageField);
  return preset ? preset.key : null;
}

// normalized answers -> top-level LoanRequest fields (§3.3).
export function mirrorAnswers(value = {}, { productKey } = {}) {
  const out = {};
  const userType = value.borrower_type === 'organization' ? 'organization' : 'individual';
  out.userType = userType;
  const name = value.full_name;
  if (name) {
    if (userType === 'organization') out.contactName = [name.lastName, name.firstName].filter(Boolean).join(' ');
    else { out.lastname = name.lastName; out.firstname = name.firstName; }
  }
  if (userType === 'organization' && value.org_name) out.orgName = value.org_name;
  if (value.register_number) out.regNo = value.register_number;
  if (value.phone) {
    out.phone = value.phone;
    if (userType === 'organization') out.contactPhone = value.phone;
  }
  if (value.email) out.email = value.email;
  if (value.address) out.address = value.address;
  if (value.loan_amount !== undefined) out.amount = value.loan_amount;
  if (value.loan_term !== undefined) out.term = value.loan_term;
  if (value.purpose) out.purpose = value.purpose;
  if (value.repayment_source) out.repaymentSource = value.repayment_source;
  if (productKey) out.selectedProduct = productKey;
  return out;
}

const presetRef = (key, required = false) => ({ kind: 'preset', key, required });

// Default config mirroring the current quick form (§6.3). Not persisted by the API.
export function buildDefaultConfig(productKey) {
  return {
    productKey,
    isActive: false,
    baseProductEnabled: true,
    defaultAssigneeId: '',
    steps: [
      { id: 'contact', title: 'Холбоо барих', description: '', fields: [presetRef('borrower_type', true), presetRef('full_name', true), presetRef('org_name', true), presetRef('phone', true), presetRef('email', true)] },
      { id: 'loan', title: 'Зээлийн хэрэгцээ', description: '', fields: [presetRef('loan_amount', true), presetRef('loan_term', true), presetRef('repayment_source', true), presetRef('purpose'), presetRef('collateral_type')] },
      { id: 'documents', title: 'Баримт', description: '', fields: ['id_reference', 'address_reference', 'ndsh_reference', 'bank_statement', 'zms_reference', 'car_photos', 'property_docs'].map(key => presetRef(key)) },
    ],
    subProducts: [],
  };
}
