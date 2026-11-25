import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFileCategory } from './fileCategory.mjs';

const categories = [{ key: 'personal' }, { key: 'income' }, { key: 'collateral' }, { key: 'other' }];
const presets = [
  { key: 'id_reference', label: 'Иргэний үнэмлэхийн лавлагаа', storage: 'file_id', category: 'personal' },
  { key: 'collateral_cadastre', label: 'Кадастрын лавлагаа', storage: 'file_cadastre', category: 'collateral' },
  { key: 'bank_statement', label: 'Дансны хуулга', storage: 'file_bank', category: 'income' },
];
const categoryOf = field => (categories.some(item => item.key === field?.category) ? field.category : 'other');
const opts = { presets, categoryOf, categories };

test('configured field category wins', () => {
  assert.equal(resolveFileCategory({ fieldKey: 'x' }, { key: 'x', category: 'income' }, opts), 'income');
});
test('legacy storage names map to categories', () => {
  assert.equal(resolveFileCategory({ fieldName: 'file_id' }, null, opts), 'personal');
  assert.equal(resolveFileCategory({ fieldName: 'file_sainscore' }, null, opts), 'income');
  assert.equal(resolveFileCategory({ fieldName: 'file_prop_cert' }, null, opts), 'collateral');
  assert.equal(resolveFileCategory({ fieldName: 'file_collateral_other' }, null, opts), 'collateral');
  assert.equal(resolveFileCategory({ fieldName: 'file_cadastre' }, null, opts), 'collateral');
});
test('label fallback matches preset labels', () => {
  assert.equal(resolveFileCategory({ fieldName: 'unknown', label: 'Иргэний үнэмлэхийн лавлагаа' }, null, opts), 'personal');
  assert.equal(resolveFileCategory({ label: 'дансны хуулга 2026' }, null, opts), 'income');
});
test('unknown stays other', () => {
  assert.equal(resolveFileCategory({ fieldName: 'additional', label: 'Нэмэлт' }, null, opts), 'other');
  assert.equal(resolveFileCategory(null, null, opts), 'other');
});
