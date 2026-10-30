import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductTermSections, getProductTermList, updateProductTermList, hasProductTerms } from './productTerms.mjs';

const terms = label => ({ conditions: [`${label} condition`], requirements: [`${label} requirement`] });
const carLoan = () => ({
  productKey: 'car_loan', title: 'Автомашины зээл',
  purchase: { label: 'Purchase', individual: terms('PI'), organization: terms('PO') },
  collateral: { label: 'Collateral', individual: terms('CI'), organization: terms('CO') },
});

test('car editor exposes both loan types and both borrower types, including missing sections', () => {
  const paths = [['purchase', 'individual'], ['purchase', 'organization'], ['collateral', 'individual'], ['collateral', 'organization']];
  assert.deepEqual(getProductTermSections(carLoan()).map(section => section.path), paths);
  assert.deepEqual(getProductTermSections({ productKey: 'car_loan' }).map(section => section.path), paths);
});

test('editing, adding and removing every car list preserves all sibling data and source object', () => {
  for (const section of getProductTermSections(carLoan())) {
    for (const field of ['conditions', 'requirements']) {
      const original = carLoan();
      const snapshot = structuredClone(original);
      let edited = updateProductTermList(original, section.path, field, items => items.map(() => 'Updated'));
      edited = updateProductTermList(edited, section.path, field, items => [...items, 'Added']);
      assert.deepEqual(getProductTermList(edited, section.path, field), ['Updated', 'Added']);
      edited = updateProductTermList(edited, section.path, field, items => items.filter((_, index) => index !== 0));
      const expected = structuredClone(snapshot);
      expected[section.path[0]][section.path[1]][field] = ['Added'];
      assert.deepEqual(JSON.parse(JSON.stringify(edited)), expected, 'save payload must preserve all other sections');
      assert.deepEqual(original, snapshot, 'cancel must leave the original product unchanged');
    }
  }
});

test('missing and malformed lists can be initialized without losing variant label', () => {
  const source = { productKey: 'car_loan', purchase: { label: 'Keep', individual: { conditions: null } } };
  assert.deepEqual(getProductTermList(source, ['purchase', 'individual'], 'conditions'), []);
  const edited = updateProductTermList(source, ['purchase', 'organization'], 'requirements', items => [...items, 'New']);
  assert.equal(edited.purchase.label, 'Keep');
  assert.deepEqual(edited.purchase.organization.requirements, ['New']);
  assert.equal(source.purchase.organization, undefined);
});

test('standard product sections and edits keep their existing flat schema', () => {
  const source = { productKey: 'biz_loan', individual: terms('I'), organization: terms('O') };
  assert.deepEqual(getProductTermSections(source).map(section => section.path), [['individual'], ['organization']]);
  const edited = updateProductTermList(source, ['individual'], 'conditions', () => []);
  assert.deepEqual(edited.individual.conditions, []);
  assert.deepEqual(edited.organization, source.organization);
  assert.deepEqual(getProductTermSections({ productKey: 'trust' }), []);
});

test('public data accepts saved empty conditions and organization-only variants', () => {
  assert.equal(hasProductTerms({ individual: { conditions: [], requirements: ['Keep'] } }), true);
  assert.equal(hasProductTerms({ organization: terms('Org') }), true);
  assert.equal(hasProductTerms({ individual: { conditions: [], requirements: [] } }), true);
  assert.equal(hasProductTerms(undefined), false);
  assert.equal(hasProductTerms({}), false);
  assert.equal(hasProductTerms({ individual: { conditions: 'invalid' } }), false);
});
