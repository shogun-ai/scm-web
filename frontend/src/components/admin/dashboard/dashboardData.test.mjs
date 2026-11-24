import test from 'node:test';
import assert from 'node:assert/strict';
import { dailySeries, weekDelta, productMix, resolutionRate, recentActivity, niceMax, monotonePath, greeting } from './dashboardData.js';

const now = new Date(2026, 10, 24, 15, 0, 0);
const at = (daysAgo, hour = 10) => new Date(2026, 10, 24 - daysAgo, hour).toISOString();

test('dailySeries buckets by local day, oldest first', () => {
  const series = dailySeries([{ createdAt: at(0) }, { createdAt: at(0, 1) }, { createdAt: at(2) }, { createdAt: at(40) }, { createdAt: 'bad' }], 7, now);
  assert.equal(series.length, 7);
  assert.equal(series[6].value, 2);
  assert.equal(series[4].value, 1);
  assert.equal(series.reduce((sum, point) => sum + point.value, 0), 3);
});

test('dailySeries honours predicate and tolerates non-arrays', () => {
  assert.equal(dailySeries(null, 3, now).length, 3);
  const series = dailySeries([{ createdAt: at(0), status: 'resolved' }, { createdAt: at(0) }], 3, now, item => item.status === 'resolved');
  assert.equal(series[2].value, 1);
});

test('weekDelta compares the last 7 days to the previous 7', () => {
  const delta = weekDelta([{ createdAt: at(0) }, { createdAt: at(6) }, { createdAt: at(8) }, { createdAt: at(20) }], now);
  assert.deepEqual(delta, { current: 2, previous: 1, diff: 1 });
});

test('productMix folds unknown products into Бусад and sorts desc', () => {
  const mix = productMix([{ selectedProduct: 'a' }, { selectedProduct: 'a' }, { selectedProduct: 'zzz' }, {}], { a: 'A' });
  assert.deepEqual(mix.map(row => [row.key, row.count]), [['a', 2], ['other', 2]].sort((x, y) => y[1] - x[1] || (x[0] === 'a' ? -1 : 1)));
  assert.equal(mix.find(row => row.key === 'other').label, 'Бусад');
});

test('resolutionRate and recentActivity', () => {
  assert.equal(resolutionRate([]), 0);
  assert.equal(resolutionRate([{ status: 'resolved' }, { status: 'pending' }, { status: 'resolved' }]), 67);
  const feed = recentActivity([{ createdAt: at(3) }, { createdAt: at(1) }], [{ createdAt: at(2) }, { createdAt: 'x' }], 5);
  assert.deepEqual(feed.map(row => row.kind), ['loan', 'trust', 'loan']);
});

test('niceMax and monotonePath', () => {
  assert.equal(niceMax(0), 4);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(23), 25);
  assert.equal(monotonePath([]), '');
  const path = monotonePath([[0, 10], [10, 10], [20, 0]]);
  assert.match(path, /^M0,10C/);
  assert.ok(!/NaN/.test(path));
});

test('greeting by hour', () => {
  assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Өглөөний мэнд');
  assert.equal(greeting(new Date(2026, 0, 1, 14)), 'Өдрийн мэнд');
  assert.equal(greeting(new Date(2026, 0, 1, 21)), 'Оройн мэнд');
});
