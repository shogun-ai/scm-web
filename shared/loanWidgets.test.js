import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_WIDGETS, PRESET_BY_KEY, resolveField, resolveSteps, validateConfig, validateAnswers, fileRulesFor, mirrorAnswers, buildDefaultConfig, isSubProductLive, subProductStatus, ubDate, slugify, presetFileRule, storageFieldToPresetKey, LIMITS } from './loanWidgets.js';

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
  assert.equal(presetFileRule('bank_statement').maxFiles, 4);
  assert.equal(presetFileRule('additional').maxFiles, 5);
  assert.equal(presetFileRule('phone'), null);
  assert.equal(storageFieldToPresetKey('file_prop_map'), 'property_docs');
});

test('resolveField forces phone/full_name required and hides nothing internal', () => {
  const phone = resolveField({ kind: 'preset', key: 'phone', required: false, label: 'Гар утас' });
  assert.equal(phone.required, true); assert.equal(phone.label, 'Гар утас'); assert.equal(phone.widget, 'phone');
  assert.deepEqual(resolveField(p('org_name')).showWhen, { key: 'borrower_type', equals: 'organization' });
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
  check(c => { c.steps[0].fields.push(p('phone')); }, 'steps.0.fields.5.key');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'bad key', type: 'text', label: 'x' }); }, 'steps.0.fields.5.key');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_a', type: 'text', label: 'x' }, { kind: 'custom', key: 'cf_a', type: 'text', label: 'y' }); }, 'steps.0.fields.6.key');
  check(c => { c.steps[0].fields = c.steps[0].fields.filter(f => f.key !== 'phone'); }, 'steps.phone');
  check(c => { c.steps[0].fields = c.steps[0].fields.filter(f => f.key !== 'full_name'); }, 'steps.full_name');
  check(c => { c.steps = []; }, 'steps');
  check(c => { c.steps[1].id = 'contact'; }, 'steps.1.id');
  check(c => { c.subProducts = [{ id: 'promo', name: 'Promo', startDate: '2027-02-01', endDate: '2027-01-01' }]; }, 'subProducts.0.endDate');
  check(c => { c.subProducts = [{ id: 'promo', name: 'A' }, { id: 'promo', name: 'B' }]; }, 'subProducts.1.id');
  check(c => { c.steps = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, title: 'x', fields: [p('phone', true)] })); }, 'steps');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_f', type: 'file', label: 'F', maxSizeMb: 11 }); }, 'steps.0.fields.5.maxSizeMb');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_f', type: 'file', label: 'F', accept: ['exe'] }); }, 'steps.0.fields.5.accept');
  check(c => { c.steps[0].fields.push({ kind: 'custom', key: 'cf_s', type: 'select', label: 'S', options: [] }); }, 'steps.0.fields.5.options');
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
  assert.deepEqual(required, ['borrower_type', 'full_name', 'org_name', 'phone', 'email', 'loan_amount', 'loan_term', 'repayment_source']);
  assert.equal(config.isActive, false);
  const org = mirrorAnswers({ borrower_type: 'organization', full_name: { lastName: 'Бат', firstName: 'Болд' }, org_name: 'Тест ХХК', phone: '99001234', register_number: 'УБ90050112', loan_amount: 10, loan_term: 2 }, { productKey: 'line_loan' });
  assert.deepEqual(org, { userType: 'organization', contactName: 'Бат Болд', orgName: 'Тест ХХК', regNo: 'УБ90050112', phone: '99001234', contactPhone: '99001234', amount: 10, term: 2, selectedProduct: 'line_loan' });
  assert.equal(slugify('Цагаан сар 2027!'), 'tsagaan-sar-2027');
  assert.ok(PRESET_BY_KEY.other_loans.maxRows === 10);
});
