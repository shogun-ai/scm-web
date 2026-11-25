import test from 'node:test';
import assert from 'node:assert/strict';
import { dailySeries, weekDelta, productMix, resolutionRate, recentActivity, niceMax, monotonePath, greeting, statsDate, statsSeries, sumCounts, isUsableStats, statsProductMix, statsChannels, loanKpis, seriesDelta } from './dashboardData.js';

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

test('statsSeries aligns dates and rejects malformed input', () => {
  const series = statsSeries([{ date: '2026-11-24', count: 2 }, { date: '2026-11-25', count: '3' }]);
  assert.deepEqual(series.values, [2, 3]);
  assert.equal(series.dates[1].getDate(), 25);
  assert.equal(series.dates[1].getMonth(), 10);
  assert.equal(statsSeries([{ date: 'x', count: 1 }]), null);
  assert.equal(statsSeries(null), null);
  assert.ok(Number.isNaN(statsDate('nope').getTime()));
  assert.equal(sumCounts([{ count: 2 }, { count: 'a' }, { count: 4 }]), 6);
});

test('isUsableStats needs loans or trusts object', () => {
  assert.equal(isUsableStats(null), false);
  assert.equal(isUsableStats({ loans: null, trusts: null }), false);
  assert.equal(isUsableStats({ loans: null, trusts: { total: 1 } }), true);
  assert.equal(isUsableStats([]), false);
});

test('statsProductMix prefers CMS names, drops empty, sorts desc', () => {
  const mix = statsProductMix([{ productKey: 'a', name: 'Raw', count: 2 }, { productKey: 'other', name: 'Бусад', count: 5 }, { productKey: 'b', name: 'B', count: 0 }, { productKey: 'c', name: 'C', count: 2 }], { a: 'Нэр A' });
  assert.deepEqual(mix.map(row => [row.key, row.label, row.value]), [['other', 'Бусад', 5], ['c', 'C', 2], ['a', 'Нэр A', 2]]);
  assert.deepEqual(statsProductMix(undefined), []);
});

test('statsChannels and loanKpis tolerate missing fields', () => {
  assert.deepEqual(statsChannels({ web: 3, messenger: 1 }).map(row => [row.key, row.label, row.value]), [['web', 'Вэб', 3], ['messenger', 'Messenger', 1], ['webchat', 'Вэб чат', 0]]);
  assert.deepEqual(loanKpis(undefined), { total: 0, unassigned: 0, awaitingDocs: 0, resolved30: 0, overdue: 0 });
  assert.deepEqual(loanKpis({ total: 9, unassignedCount: 2, overdueAssigned: 1, byTaskStatus: { additional_docs: 3 }, resolvedPerDay: [{ count: 1 }, { count: 2 }] }), { total: 9, unassigned: 2, awaitingDocs: 3, resolved30: 3, overdue: 1 });
});

test('seriesDelta compares last 7 to previous 7', () => {
  assert.equal(seriesDelta([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]), 7);
  assert.equal(seriesDelta([3]), 3);
  assert.equal(seriesDelta(null), 0);
});
