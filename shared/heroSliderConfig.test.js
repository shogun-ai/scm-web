import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidHeroSliderInterval, normalizeHeroSliderInterval } from './heroSliderConfig.js';

test('accepts off and whole seconds inside the supported interval', () => {
  for (const value of [0, 3, 15, 37, 120]) assert.equal(isValidHeroSliderInterval(value), true);
});

test('rejects invalid API values without coercing blanks, booleans or arrays', () => {
  for (const value of ['', '0', '15', ' ', null, undefined, false, true, [], [15], {}, NaN, Infinity, -1, 1, 2, 121, 3.5]) {
    assert.equal(isValidHeroSliderInterval(value), false, `Rejected ${String(value)}`);
  }
});

test('reads legacy numeric strings while preserving explicitly disabled autoplay', () => {
  for (const [value, expected] of [[0, 0], ['0', 0], [37, 37], ['37', 37], [' 120 ', 120]]) {
    assert.equal(normalizeHeroSliderInterval(value), expected);
  }
});

test('falls back to fifteen seconds for missing or corrupt saved values', () => {
  for (const value of ['', ' ', null, undefined, false, [], 'invalid', 1, -3, 121, 3.5, NaN, Infinity]) {
    assert.equal(normalizeHeroSliderInterval(value), 15);
  }
});
