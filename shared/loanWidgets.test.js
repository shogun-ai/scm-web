import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_WIDGETS, PRESET_BY_KEY, resolveField, resolveSteps, validateConfig, validateAnswers, fileRulesFor, mirrorAnswers, buildDefaultConfig, isSubProductLive, subProductStatus, ubDate, slugify, presetFileRule, storageFieldToPresetKey, LIMITS, isFieldVisible, normalizeShowWhen, visibleFieldKeys } from './loanWidgets.js';

const NOW = new Date('2026-11-20T03:00:00Z');
const p = (key, required = false) => ({ kind: 'preset', key, required });
const steps = [{ id: 'all', title: 'Бүгд', fields: [
  p('borrower_type', true), p('full_name', true), p('org_name', true), p('phone', true), p('email'), p('birth_date'), p('register_number'),
  p('loan_amount', true), p('loan_term'), p('other_loans'), p('id_reference', true),
  { kind: 'custom', key: 'cf_branch', type: 'select', label: 'Салбар', required: false, options: [{ value: 'ub', label: 'УБ' }] },
  { kind: 'custom', key: 'cf_married', type: 'yesno', label: 'Гэрлэсэн', required: false },
  { kind: 'custom', key: 'cf_kids', type: 'number', label: 'Хүүхэд', min: 0, max: 10 },
  { kind: 'custom', key: 'cf_since', type: 'date', label: 'Хэзээнээс', min: '2000-01-01', max: '2026-12-31' },
  { kind: 'custom', key: 'cf_note', type: 'text', label: 'Тэмдэглэл', maxLength: 5 },
  { kind: 'custom', key: 'cf_slip', type: 'file', label: 'Цалин', required: true, accept: ['pdf', 'jpg'], maxSizeMb: 5, maxFiles: 2 },
] }];
const base = () => ({ borrower_type: 'individual', full_name: { lastName: 'Бат', firstName: 'Болд' }, phone: '9900-1234', loan_amount: 5000000 });
const err = (answers, key) => {
  const result = validateAnswers(steps, { ...base(), ...answers }, { now: NOW });
  assert.equal(result.ok, false, `${key} should fail`);
  assert.ok(Object.hasOwn(result.errors, key), `${key} missing in ${JSON.stringify(result.errors)}`);
};
const ok = answers => {
  const result = validateAnswers(steps, { ...base(), ...answers }, { now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.value;
};

test('preset values validate formats and ranges', () => {
  assert.equal(ok({ register_number: 'уб90050112' }).register_number, 'УБ90050112');
  err({ register_number: 'UB90050112' }, 'register_number');
  err({ register_number: 'УБ9005011' }, 'register_number');
  assert.equal(ok({}).phone, '99001234');
  err({ phone: 'abcd1234' }, 'phone');
  assert.equal(ok({ email: ' A@B.MN ' }).email, 'a@b.mn');
  err({ email: 'bad' }, 'email');
  for (const amount of [0, -1, 1e12 + 1, 0.5, 'abc']) err({ loan_amount: amount }, 'loan_amount');
  assert.equal(ok({ loan_amount: '1 000 000' }).loan_amount, 1000000);
  for (const term of [0, 121, 1.5]) err({ loan_term: term }, 'loan_term');
  err({ birth_date: '2026-12-01' }, 'birth_date');
  err({ birth_date: '2010-01-01' }, 'birth_date');
  err({ birth_date: '1990-02-30' }, 'birth_date');
  assert.equal(ok({ birth_date: '1990-05-01' }).birth_date, '1990-05-01');
});

test('required/optional, composite name and showWhen', () => {
  err({ full_name: { lastName: '', firstName: 'Болд' } }, 'full_name');
  err({ phone: '' }, 'phone');
  err({ borrower_type: undefined }, 'borrower_type');
  const individual = ok({ org_name: 'Ignored LLC' });
  assert.equal(individual.org_name, undefined, 'hidden field dropped');
  err({ borrower_type: 'organization' }, 'org_name');
  assert.equal(ok({ borrower_type: 'organization', org_name: 'Тест ХХК' }).org_name, 'Тест ХХК');
  const value = ok({ status: 'approved', assignee: { userId: 'x' }, applicationData: {}, unknown: 1 });
  for (const key of ['status', 'assignee', 'applicationData', 'unknown']) assert.equal(Object.hasOwn(value, key), false);
  assert.equal(validateAnswers(steps, null).ok, false);
});

test('other_loans rows (D8)', () => {
  assert.deepEqual(ok({ other_loans: { hasActiveLoans: false } }).other_loans, { hasActiveLoans: false, loans: [] });
  err({ other_loans: { hasActiveLoans: true } }, 'other_loans');
  err({ other_loans: { hasActiveLoans: true, loans: [{ lender: 'Хаан', balance: -1, monthlyPayment: 0 }] } }, 'other_loans.loans.0.balance');
  err({ other_loans: { hasActiveLoans: true, loans: Array.from({ length: 11 }, () => ({ lender: 'X', balance: 1, monthlyPayment: 1 })) } }, 'other_loans');
  err({ other_loans: { hasActiveLoans: 'yes' } }, 'other_loans');
  const value = ok({ other_loans: { hasActiveLoans: true, loans: [{ lender: ' Хаан банк ', balance: '2,000,000', monthlyPayment: 300000 }] } });
  assert.deepEqual(value.other_loans, { hasActiveLoans: true, loans: [{ lender: 'Хаан банк', balance: 2000000, monthlyPayment: 300000 }] });
});

test('custom field types', () => {
  err({ cf_branch: 'darkhan' }, 'cf_branch');
  err({ cf_married: 'yes' }, 'cf_married');
  assert.equal(ok({ cf_married: false }).cf_married, false);
  err({ cf_kids: 11 }, 'cf_kids');
  err({ cf_kids: -1 }, 'cf_kids');
  assert.equal(ok({ cf_kids: '2' }).cf_kids, 2);
  err({ cf_since: '1999-12-31' }, 'cf_since');
  err({ cf_note: '123456' }, 'cf_note');
  assert.equal(ok({ cf_note: ' 12345 ' }).cf_note, '12345');
});

test('fileRulesFor maps presets to legacy storage fields and custom formats', () => {
  const rules = fileRulesFor(steps);
  assert.deepEqual(Object.keys(rules), ['id_reference', 'cf_slip']);
  assert.equal(rules.id_reference.storageField, 'file_id');
  assert.equal(rules.id_reference.required, true);
  assert.deepEqual(rules.cf_slip.accept, ['application/pdf', 'image/jpeg']);
  assert.equal(rules.cf_slip.maxBytes, 5 * 1024 * 1024);
  assert.equal(rules.cf_slip.storageField, 'cf_slip');
  assert.equal(fileRulesFor([{ fields: [p('zms_scoring')] }]).zms_scoring.storageField, 'file_sainscore');
  assert.equal(presetFileRule('bank_statement').maxFiles, 5);
  assert.equal(presetFileRule('additional').maxFiles, 5);
  assert.equal(presetFileRule('phone'), null);
  assert.equal(storageFieldToPresetKey('file_prop_map'), 'property_docs');
});

test('resolveField forces phone/full_name required and hides nothing internal', () => {
  const phone = resolveField({ kind: 'preset', key: 'phone', required: false, label: 'Гар утас' });
  assert.equal(phone.required, true); assert.equal(phone.label, 'Гар утас'); assert.equal(phone.widget, 'phone');
  assert.deepEqual(resolveField(p('org_name')).showWhen, { key: 'borrower_type', op: 'equals', value: 'organization' });
  const custom = resolveField(steps[0].fields.at(-1));
  assert.deepEqual([custom.widget, custom.accept, custom.maxSizeMb, custom.maxFiles], [null, ['pdf', 'jpg'], 5, 2]);
  assert.equal(resolveField({ kind: 'preset', key: 'nope' }), null);
  assert.equal(resolveSteps(steps)[0].fields.length, steps[0].fields.length);
  for (const preset of PRESET_WIDGETS) assert.ok(resolveField(p(preset.key)), preset.key);
});

test('validateConfig rules', () => {
  const config = { ...buildDefaultConfig('cons_loan'), isActive: true };
  assert.equal(validateConfig(config).ok, true);
  const check = (mutate, path) => {
    const c = structuredClone(config); mutate(c);
    const result = validateConfig(c);
    assert.equal(result.ok, false); assert.ok(Object.keys(result.errors).some(key => key.startsWith(path)), `${path} in ${JSON.stringify(result.errors)}`);
  };
  check(c => { c.productKey = 'nope'; }, 'productKey');
  check(c => { c.steps[0].fields.push(p('phone')); }, 'steps.0.fields.8.key');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'bad key', type: 'text', label: 'x' }); }, 'steps.0.fields.8.key');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_a', type: 'text', label: 'x' }, { kind: 'custom', key: 'cf_a', type: 'text', label: 'y' }); }, 'steps.0.fields.9.key');
  check(c => { c.steps[0].fields = c.steps[0].fields.filter(f => f.key !== 'phone'); }, 'steps.phone');
  check(c => { c.steps[0].fields = c.steps[0].fields.filter(f => f.key !== 'full_name'); }, 'steps.full_name');
  check(c => { c.steps = []; }, 'steps');
  check(c => { c.steps[1].id = 'contact'; }, 'steps.1.id');
  check(c => { c.subProducts = [{ id: 'promo', name: 'Promo', startDate: '2027-02-01', endDate: '2027-01-01' }]; }, 'subProducts.0.endDate');
  check(c => { c.subProducts = [{ id: 'promo', name: 'A' }, { id: 'promo', name: 'B' }]; }, 'subProducts.1.id');
  check(c => { c.steps = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, title: 'x', fields: [p('phone', true)] })); }, 'steps');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_f', type: 'file', label: 'F', maxSizeMb: 11 }); }, 'steps.0.fields.8.maxSizeMb');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_f', type: 'file', label: 'F', accept: ['exe'] }); }, 'steps.0.fields.8.accept');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_s', type: 'select', label: 'S', options: [] }); }, 'steps.0.fields.8.options');
  check(c => { c.defaultAssigneeId = 'abc'; }, 'defaultAssigneeId');
  check(c => { c.subProducts = [{ id: 'own', name: 'Own', isActive: true, inheritSteps: false, steps: [{ id: 'a', title: 'A', fields: [p('email')] }] }]; }, 'subProducts.0.steps.phone');
  // Inactive draft may omit required presets.
  assert.equal(validateConfig({ productKey: 'cons_loan', isActive: false, steps: [] }).ok, true);
  const normalized = validateConfig({ ...config, version: 9, updatedBy: { name: 'x' }, extra: 1 }).value;
  assert.deepEqual(Object.keys(normalized).sort(), ['baseProductEnabled', 'defaultAssigneeId', 'isActive', 'productKey', 'steps', 'subProducts']);
  assert.equal(LIMITS.filesTotal, 12);
});

test('sub product live window uses Ulaanbaatar date', () => {
  const sub = { isActive: true, startDate: '2026-11-21', endDate: '2026-11-30' };
  assert.equal(ubDate(new Date('2026-11-20T15:59:59Z')), '2026-11-20');
  assert.equal(ubDate(new Date('2026-11-20T16:00:00Z')), '2026-11-21');
  assert.equal(isSubProductLive(sub, new Date('2026-11-20T15:59:59Z')), false);
  assert.equal(isSubProductLive(sub, new Date('2026-11-20T16:00:00Z')), true);
  assert.equal(subProductStatus(sub, new Date('2026-11-30T16:00:00Z')), 'expired');
  assert.equal(subProductStatus({ ...sub, isActive: false }, NOW), 'inactive');
  assert.equal(subProductStatus({ isActive: true, startDate: null, endDate: null }, NOW), 'live');
});

test('default config mirrors quick form and mirrorAnswers maps storage fields', () => {
  const config = buildDefaultConfig('line_loan');
  const required = config.steps.flatMap(s => s.fields).filter(f => f.required).map(f => f.key);
  assert.deepEqual(required, ['borrower_type', 'full_name', 'org_name', 'phone', 'email', 'birth_date', 'register_number', 'address', 'loan_amount', 'loan_term', 'income_source', 'other_loans', 'collateral_types', 'income_other_note', 'collateral_other_note']);
  assert.equal(config.isActive, false);
  const org = mirrorAnswers({ borrower_type: 'organization', full_name: { lastName: 'Бат', firstName: 'Болд' }, org_name: 'Тест ХХК', phone: '99001234', register_number: 'УБ90050112', loan_amount: 10, loan_term: 2 }, { productKey: 'line_loan' });
  assert.deepEqual(org, { userType: 'organization', contactName: 'Бат Болд', orgName: 'Тест ХХК', regNo: 'УБ90050112', phone: '99001234', contactPhone: '99001234', amount: 10, term: 2, selectedProduct: 'line_loan' });
  assert.equal(slugify('Цагаан сар 2027!'), 'tsagaan-sar-2027');
  assert.ok(PRESET_BY_KEY.other_loans.maxRows === 10);
});

// ---------- D11 conditional fields (§15) ----------
const incomeSteps = (extraDocs = []) => [
  { id: 'a', title: 'A', fields: [p('full_name', true), p('phone', true), p('income_source', true), p('collateral_types')] },
  { id: 'b', title: 'B', fields: [p('ndsh_reference', true), p('bank_statement', true), p('income_other_note', true), p('income_other_file'), p('collateral_property_certificate'), p('collateral_vehicle_certificate'), p('collateral_other_note', true), ...extraDocs] },
];
const person = extra => ({ full_name: { lastName: 'Бат', firstName: 'Болд' }, phone: '99001234', ...extra });

test('isFieldVisible: legacy equals, in, includes and malformed conditions', () => {
  assert.equal(isFieldVisible({ showWhen: { key: 'borrower_type', equals: 'organization' } }, { borrower_type: 'organization' }), true);
  assert.equal(isFieldVisible({ showWhen: { key: 'borrower_type', equals: 'organization' } }, { borrower_type: 'individual' }), false);
  assert.equal(isFieldVisible({ showWhen: { key: 'i', op: 'in', value: ['salary', 'salary_business'] } }, { i: 'salary_business' }), true);
  assert.equal(isFieldVisible({ showWhen: { key: 'i', op: 'in', value: ['salary'] } }, { i: 'business' }), false);
  assert.equal(isFieldVisible({ showWhen: { key: 'c', op: 'includes', value: 'vehicle' } }, { c: ['real_estate', 'vehicle'] }), true);
  assert.equal(isFieldVisible({ showWhen: { key: 'c', op: 'includes', value: ['deposit'] } }, { c: ['vehicle'] }), false);
  assert.equal(isFieldVisible({ showWhen: { key: 'y', op: 'equals', value: 'true' } }, { y: true }), true);
  assert.equal(isFieldVisible({ showWhen: { key: 'y', op: 'equals', value: 'true' } }, {}), false);
  assert.equal(isFieldVisible({ showWhen: null }, {}), true);
  assert.equal(isFieldVisible({ showWhen: { key: 'x', op: 'nope', value: 'a' } }, {}), true, 'malformed -> no condition');
  assert.deepEqual(normalizeShowWhen({ key: 'b', equals: 'organization' }), { key: 'b', op: 'equals', value: 'organization' });
  assert.deepEqual(normalizeShowWhen({ key: 'c', op: 'includes', value: 'vehicle' }), { key: 'c', op: 'includes', value: ['vehicle'] });
});

test('income_source conditions: required only when visible, hidden answers dropped', () => {
  const s = incomeSteps();
  let result = validateAnswers(s, person({ income_source: 'salary', income_other_note: 'x' }), { now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.value.income_other_note, undefined, 'hidden note dropped');
  let rules = fileRulesFor(s, { answers: result.value });
  assert.deepEqual(Object.keys(rules).filter(key => !rules[key].hidden), ['ndsh_reference']);
  assert.equal(rules.ndsh_reference.required, true); assert.equal(rules.bank_statement.required, false); assert.equal(rules.bank_statement.hidden, true);
  result = validateAnswers(s, person({ income_source: 'salary_business' }), { now: NOW });
  rules = fileRulesFor(s, { answers: result.value });
  assert.deepEqual(Object.keys(rules).filter(key => rules[key].required), ['ndsh_reference', 'bank_statement']);
  assert.equal(rules.bank_statement.maxFiles, 5);
  result = validateAnswers(s, person({ income_source: 'other' }), { now: NOW });
  assert.equal(result.ok, false); assert.ok(result.errors.income_other_note);
  result = validateAnswers(s, person({ income_source: 'other', income_other_note: ' Түрээс ' }), { now: NOW });
  assert.equal(result.value.income_other_note, 'Түрээс');
  rules = fileRulesFor(s, { answers: result.value });
  assert.deepEqual(Object.keys(rules).filter(key => !rules[key].hidden), ['income_other_file']);
  assert.equal(validateAnswers(s, person({ income_source: 'gold' }), { now: NOW }).errors.income_source !== undefined, true);
  // Without answers, rules are unconditional (legacy callers).
  assert.equal(fileRulesFor(s).bank_statement.hidden, false);
});

test('collateral_types multiselect validation and includes conditions', () => {
  const s = incomeSteps();
  let result = validateAnswers(s, person({ income_source: 'salary', collateral_types: ['real_estate', 'vehicle', 'vehicle'] }), { now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.value.collateral_types, ['real_estate', 'vehicle']);
  const rules = fileRulesFor(s, { answers: result.value });
  assert.equal(rules.collateral_property_certificate.hidden, false); assert.equal(rules.collateral_vehicle_certificate.hidden, false);
  assert.equal(rules.collateral_property_certificate.storageField, 'file_prop_cert'); assert.equal(rules.collateral_vehicle_certificate.storageField, 'file_car_cert');
  for (const bad of ['vehicle', ['gold'], [1], { a: 1 }]) assert.ok(validateAnswers(s, person({ income_source: 'salary', collateral_types: bad }), { now: NOW }).errors.collateral_types, JSON.stringify(bad));
  assert.equal(validateAnswers(s, person({ income_source: 'salary', collateral_types: [] }), { now: NOW }).value.collateral_types, undefined);
  result = validateAnswers(s, person({ income_source: 'salary', collateral_types: ['other'] }), { now: NOW });
  assert.ok(result.errors.collateral_other_note, 'other note required when other selected');
  // custom multiselect
  const custom = [{ id: 'a', title: 'A', fields: [p('full_name', true), p('phone', true), { kind: 'custom', key: 'cf_goals', type: 'multiselect', label: 'Зорилго', required: true, options: [{ value: 'home', label: 'Байр' }, { value: 'car', label: 'Машин' }] }] }];
  assert.ok(validateAnswers(custom, person({}), { now: NOW }).errors.cf_goals);
  assert.ok(validateAnswers(custom, person({ cf_goals: ['boat'] }), { now: NOW }).errors.cf_goals);
  assert.deepEqual(validateAnswers(custom, person({ cf_goals: ['car', 'home'] }), { now: NOW }).value.cf_goals, ['car', 'home']);
});

test('chained conditions: a field whose target is hidden is hidden too', () => {
  const s = [{ id: 'a', title: 'A', fields: [
    p('full_name', true), p('phone', true),
    { kind: 'custom', key: 'cf_has_car', type: 'yesno', label: 'Машинтай', required: true },
    { kind: 'custom', key: 'cf_car_kind', type: 'select', label: 'Төрөл', required: true, options: [{ value: 'suv', label: 'SUV' }, { value: 'sedan', label: 'Sedan' }], showWhen: { key: 'cf_has_car', op: 'equals', value: 'true' } },
    { kind: 'custom', key: 'cf_suv_note', type: 'text', label: 'SUV тайлбар', required: true, showWhen: { key: 'cf_car_kind', op: 'equals', value: 'suv' } },
  ] }];
  let result = validateAnswers(s, person({ cf_has_car: false, cf_car_kind: 'suv', cf_suv_note: 'x' }), { now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(result.value).filter(key => key.startsWith('cf_')), ['cf_has_car']);
  assert.deepEqual([...visibleFieldKeys(s, { cf_has_car: false, cf_car_kind: 'suv' })], ['full_name', 'phone', 'cf_has_car']);
  result = validateAnswers(s, person({ cf_has_car: true, cf_car_kind: 'suv' }), { now: NOW });
  assert.ok(result.errors.cf_suv_note);
  assert.equal(validateConfig({ productKey: 'cons_loan', isActive: true, steps: s }).ok, true);
});

test('legacy configs: preset default conditions apply only when the target is an earlier field', () => {
  const legacy = [{ id: 'a', title: 'A', fields: [p('full_name', true), p('phone', true), p('ndsh_reference', true), p('bank_statement'), p('org_name')] }];
  const defs = resolveSteps(legacy)[0].fields;
  assert.equal(defs.find(f => f.key === 'ndsh_reference').showWhen, null, 'no income_source -> always visible');
  assert.equal(fileRulesFor(legacy, { answers: {} }).ndsh_reference.required, true);
  assert.equal(validateConfig({ productKey: 'cons_loan', isActive: true, steps: legacy }).ok, true);
  // Target placed after the field -> default dropped as well.
  const late = [{ id: 'a', title: 'A', fields: [p('full_name', true), p('phone', true), p('bank_statement'), p('income_source')] }];
  assert.equal(resolveSteps(late)[0].fields.find(f => f.key === 'bank_statement').showWhen, null);
  // Old resolved snapshots (legacy showWhen shape) keep working.
  const snapshot = [{ id: 'a', title: 'A', fields: [resolveField(p('borrower_type', true)), { ...resolveField(p('org_name', true)), showWhen: { key: 'borrower_type', equals: 'organization' } }] }];
  assert.ok(validateAnswers(snapshot, { borrower_type: 'organization' }, { now: NOW }).errors.org_name);
  assert.equal(validateAnswers(snapshot, { borrower_type: 'individual' }, { now: NOW }).ok, true);
});

test('validateConfig showWhen and option override rules', () => {
  const base = () => ({ productKey: 'cons_loan', isActive: true, steps: structuredClone(incomeSteps()) });
  const fail = (mutate, path) => {
    const c = base(); mutate(c);
    const result = validateConfig(c);
    assert.equal(result.ok, false, path);
    assert.ok(Object.keys(result.errors).some(key => key.startsWith(path)), `${path} in ${JSON.stringify(result.errors)}`);
  };
  const pass = mutate => { const c = base(); mutate(c); const result = validateConfig(c); assert.equal(result.ok, true, JSON.stringify(result.errors)); return result.value; };
  pass(() => {});
  const ndsh = c => c.steps[1].fields[0];
  fail(c => { ndsh(c).showWhen = { key: 'cf_missing', op: 'equals', value: 'x' }; }, 'steps.1.fields.0.showWhen.key');
  fail(c => { c.steps[0].fields[2].showWhen = { key: 'collateral_types', op: 'includes', value: ['vehicle'] }; }, 'steps.0.fields.2.showWhen.key'); // target later
  fail(c => { ndsh(c).showWhen = { key: 'phone', op: 'equals', value: 'x' }; }, 'steps.1.fields.0.showWhen.key'); // text target
  fail(c => { ndsh(c).showWhen = { key: 'ndsh_reference', op: 'equals', value: 'x' }; }, 'steps.1.fields.0.showWhen.key'); // self (cycle)
  fail(c => { ndsh(c).showWhen = { key: 'income_source', op: 'gt', value: 'salary' }; }, 'steps.1.fields.0.showWhen.op');
  fail(c => { ndsh(c).showWhen = { key: 'income_source', op: 'includes', value: ['salary'] }; }, 'steps.1.fields.0.showWhen.op');
  fail(c => { ndsh(c).showWhen = { key: 'collateral_types', op: 'equals', value: 'vehicle' }; }, 'steps.1.fields.0.showWhen.op');
  fail(c => { ndsh(c).showWhen = { key: 'income_source', op: 'equals', value: ['salary', 'business'] }; }, 'steps.1.fields.0.showWhen.value');
  fail(c => { ndsh(c).showWhen = { key: 'income_source', op: 'in', value: ['salary', 'pension'] }; }, 'steps.1.fields.0.showWhen.value');
  fail(c => { ndsh(c).showWhen = { key: 'income_source', op: 'in', value: [] }; }, 'steps.1.fields.0.showWhen.value');
  fail(c => { ndsh(c).showWhen = 'salary'; }, 'steps.1.fields.0.showWhen');
  fail(c => { c.steps[0].fields[1].showWhen = { key: 'full_name', op: 'equals', value: 'x' }; }, 'steps.0.fields.1.showWhen'); // phone always visible
  // Legacy {key, equals} is normalized; explicit null removes a preset default.
  let value = pass(c => { ndsh(c).showWhen = { key: 'income_source', equals: 'salary' }; c.steps[1].fields[1].showWhen = null; });
  assert.deepEqual(value.steps[1].fields[0].showWhen, { key: 'income_source', op: 'equals', value: 'salary' });
  assert.equal(value.steps[1].fields[1].showWhen, null);
  assert.equal(resolveSteps(value.steps)[1].fields[1].showWhen, null, 'null override -> always visible');
  assert.equal(Object.hasOwn(value.steps[1].fields[3], 'showWhen'), false, 'default left implicit');
  // Preset option overrides: labels/new options allowed, keys unique; borrower_type values fixed.
  value = pass(c => { c.steps[0].fields[2].options = [{ value: 'salary', label: 'Цалингийн орлого' }, { value: 'business', label: 'Бизнес' }, { value: 'salary_business', label: 'Хоёул' }, { value: 'other', label: 'Бусад' }, { value: 'pension', label: 'Тэтгэвэр' }]; ndsh(c).showWhen = { key: 'income_source', op: 'in', value: ['salary', 'pension'] }; });
  const resolved = resolveSteps(value.steps);
  assert.equal(resolved[0].fields[2].options[0].label, 'Цалингийн орлого');
  const pension = validateAnswers(resolved, person({ income_source: 'pension' }), { now: NOW });
  assert.equal(pension.ok, true, JSON.stringify(pension.errors));
  assert.equal(fileRulesFor(resolved, { answers: pension.value }).ndsh_reference.required, true, 'ndsh required for pension');
  fail(c => { c.steps[0].fields[2].options = [{ value: 'salary', label: 'A' }, { value: 'salary', label: 'B' }]; }, 'steps.0.fields.2.options.1.value');
  fail(c => { c.steps[0].fields[2].options = [{ value: 'Bad Key', label: 'A' }]; }, 'steps.0.fields.2.options.0.value');
  fail(c => { c.steps[0].fields[2].options = [{ value: 'business', label: 'Бизнес' }, { value: 'other', label: 'Бусад' }]; }, 'steps.1.fields.0.showWhen'); // default needs salary
  fail(c => { c.steps[0].fields.unshift(p('borrower_type')); c.steps[0].fields[0].options = [{ value: 'individual', label: 'Иргэн' }, { value: 'company', label: 'Компани' }]; }, 'steps.0.fields.0.options');
  pass(c => { c.steps[0].fields.unshift(p('borrower_type')); c.steps[0].fields[0].options = [{ value: 'individual', label: 'Хувь хүн' }, { value: 'organization', label: 'ААН' }]; });
  // custom multiselect options validated like select
  fail(c => { c.steps[1].fields.push({ kind: 'custom', key: 'cf_m', type: 'multiselect', label: 'M', options: [] }); }, 'steps.1.fields.7.options');
  pass(c => { c.steps[1].fields.push({ kind: 'custom', key: 'cf_m', type: 'multiselect', label: 'M', options: [{ value: 'a', label: 'A' }], showWhen: { key: 'collateral_types', op: 'includes', value: ['deposit', 'other'] } }); });
});

const mortgageSteps = () => resolveSteps(buildDefaultConfig('mortgage').steps);
test('default configs are valid when activated and wire D11 conditions', () => {
  for (const product of ['biz_loan', 'car_purchase_loan', 'car_coll_loan', 'cons_loan', 'credit_card', 're_loan', 'line_loan', 'mortgage']) {
    const result = validateConfig({ ...buildDefaultConfig(product), isActive: true });
    assert.equal(result.ok, true, `${product}: ${JSON.stringify(result.errors)}`);
  }
  const fields = resolveSteps(buildDefaultConfig('mortgage').steps).flatMap(step => step.fields);
  const byKey = Object.fromEntries(fields.map(field => [field.key, field]));
  assert.deepEqual(byKey.bank_statement.showWhen, { key: 'income_source', op: 'in', value: ['business', 'salary_business'] });
  assert.deepEqual(byKey.income_other_file.showWhen, { key: 'income_source', op: 'equals', value: 'other' });
  assert.deepEqual(byKey.collateral_cadastre.showWhen, { key: 'collateral_types', op: 'includes', value: ['real_estate'] });
  assert.deepEqual(byKey.car_photos.showWhen, { key: 'collateral_types', op: 'includes', value: ['vehicle'] });
  assert.equal(byKey.collateral_types.required, true);
  // D13
  assert.equal(byKey.repayment_source, undefined);
  assert.equal(byKey.income_source.label, 'Эргэн төлөгдөх орлогын эх үүсвэр');
  for (const key of ['birth_date', 'register_number', 'address', 'other_loans']) assert.equal(byKey[key].required, true, key);
  assert.deepEqual(byKey.birth_date.showWhen, { key: 'borrower_type', op: 'equals', value: 'individual' });
  assert.ok(!byKey.address.showWhen);
  assert.ok(PRESET_BY_KEY.repayment_source, 'preset kept for legacy configs');
  const ind = { borrower_type: 'individual', full_name: { lastName: 'Бат', firstName: 'Болд' }, phone: '99001234', email: 'a@b.mn', birth_date: '1990-05-01', register_number: 'уб90050112', address: 'УБ', loan_amount: 1000000, loan_term: 12, income_source: 'other', income_other_note: 'x', other_loans: { hasActiveLoans: false }, collateral_types: ['other'], collateral_other_note: 'y' };
  const vi = validateAnswers(mortgageSteps(), ind);
  assert.equal(vi.ok, true, JSON.stringify(vi.errors));
  const org = { ...ind, borrower_type: 'organization', org_name: 'ХК' }; delete org.birth_date; delete org.register_number;
  const vo = validateAnswers(mortgageSteps(), org);
  assert.equal(vo.ok, true, JSON.stringify(vo.errors));
  const missing = validateAnswers(mortgageSteps(), { ...ind, other_loans: undefined, address: '' });
  assert.ok(missing.errors.other_loans && missing.errors.address);
  assert.equal(mirrorAnswers(vi.value).regNo, 'УБ90050112');
  assert.equal(resolveSteps(buildDefaultConfig('cons_loan').steps).flatMap(step => step.fields).find(field => field.key === 'collateral_types').required, false);
});
