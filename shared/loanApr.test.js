import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnnuityPayment, calculateAPR } from './loanApr.js';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(
  actual !== null && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
  `${actual} != ${expected}`,
);
function userFormula(principal, rate, months, costs) {
  const payment = rate === 0 ? (principal + costs) / months
    : ((principal + costs) * rate) / (1 - Math.pow(1 + rate, -months));
  let low = 0;
  let high = 1;
  for (let k = 0; k < 100; k++) {
    const mid = (low + high) / 2;
    const pv = payment * (1 - Math.pow(1 + mid, -months)) / mid;
    if (pv > principal) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 1200;
}

test('matches supplied formula benchmarks', () => {
  for (const args of [[10000000, .03, 24, 150000], [5000000, .015, 12, 50000], [1000000, 0, 36, 100000]]) {
    close(calculateAPR(...args), userFormula(...args));
  }
});
test('zero costs recover nominal annual rate including near zero and maximum term', () => {
  for (const rate of [0, 1e-16, 1e-10, .03, 2]) {
    close(calculateAPR(1000000, rate, 1200, 0), rate * 1200);
  }
});
test('stable zero and near zero annuity', () => {
  close(calculateAnnuityPayment(1200000, 0, 12), 100000);
  close(calculateAnnuityPayment(1200000, 1e-16, 12), 100000);
  assert.equal(calculateAPR(1200000, 0, 12, 0), 0);
  assert.ok(calculateAPR(1200000, 0, 12, 100000) > 0);
});
test('dynamic bound handles monthly IRR above 100 percent', () => {
  close(calculateAPR(100, 0, 1, 1000), 12000);
  close(calculateAPR(100, 2, 1, 1000), 38400);
});
test('APR increases with costs and rate', () => {
  assert.ok(calculateAPR(1000000, .03, 24, 100000) > calculateAPR(1000000, .03, 24, 50000));
  assert.ok(calculateAPR(1000000, .04, 24, 50000) > calculateAPR(1000000, .03, 24, 50000));
});
test('rejects invalid terms, costs and overflow', () => {
  for (const args of [[0, .03, 12], [-1, .03, 12], ['100', .03, 12], [NaN, .03, 12], [Infinity, .03, 12], [100, -.1, 12], [100, NaN, 12], [100, Infinity, 12], [100, .03, 0], [100, .03, 1201], [100, .03, 1.5], [100, .03, '12']]) {
    assert.equal(calculateAnnuityPayment(...args), null);
    assert.equal(calculateAPR(...args, 0), null);
  }
  for (const cost of [-1, NaN, Infinity, '1', null, undefined]) assert.equal(calculateAPR(100, .03, 12, cost), null);
  assert.equal(calculateAPR(Number.MAX_VALUE, .03, 12, Number.MAX_VALUE), null);
  assert.equal(calculateAPR(100, Number.MAX_VALUE, 12, 0), null);
});
