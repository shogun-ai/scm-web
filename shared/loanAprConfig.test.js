import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LOAN_APR_CONFIG as defaults, LOAN_APR_CONFIG_KEY, normalizeLoanAprConfig, isValidLoanAprConfig } from './loanAprConfig.js';

test('defaults contain exact key, fee options and all regulatory sections', () => {
  assert.equal(LOAN_APR_CONFIG_KEY, 'loan_apr_settings');
  assert.equal(isValidLoanAprConfig(defaults), true);
  assert.deepEqual(defaults.serviceFeeOptions, [50000, 100000]);
  for (const [text, section] of [[defaults.includedText, '2.4'], [defaults.excludedText, '2.5']]) {
    assert.equal(text.split('\n').length, 5);
    text.split('\n').forEach((line, index) => assert.ok(line.startsWith(`${section}.${index + 1} `)));
  }
});
test('normalization defaults invalid fields individually and preserves editable empty strings', () => {
  for (const raw of [null, undefined, [], 'bad', 3]) assert.deepEqual(normalizeLoanAprConfig(raw), defaults);
  const value = normalizeLoanAprConfig({ title: '', insuranceLabel: 'Өөр', serviceFeeOptions: [1, 1], defaultInsuranceCost: -1 });
  assert.equal(value.title, '');
  assert.equal(value.insuranceLabel, 'Өөр');
  assert.deepEqual(value.serviceFeeOptions, defaults.serviceFeeOptions);
  assert.equal(value.defaultInsuranceCost, 0);
  value.serviceFeeOptions[0] = 0;
  assert.equal(defaults.serviceFeeOptions[0], 50000);
});
test('strict validation requires all known fields and bounded strings', () => {
  assert.equal(isValidLoanAprConfig({}), false);
  assert.equal(isValidLoanAprConfig({ ...defaults, unexpected: true }), false);
  for (const key of Object.keys(defaults)) {
    const missing = { ...defaults };
    delete missing[key];
    assert.equal(isValidLoanAprConfig(missing), false, key);
    assert.equal(isValidLoanAprConfig({ ...defaults, [key]: null }), false, key);
    if (typeof defaults[key] === 'string') {
      assert.equal(isValidLoanAprConfig({ ...defaults, [key]: '' }), true, key);
      assert.equal(isValidLoanAprConfig({ ...defaults, [key]: 'x'.repeat(20001) }), false, key);
    }
  }
});
test('fee and insurance values must be safe nonnegative integers', () => {
  for (const fees of [[1], [1, 2, 3], [1, 1], [-1, 1], ['1', 2], [1.5, 2], [Infinity, 2], [Number.MAX_SAFE_INTEGER + 1, 2]]) {
    assert.equal(isValidLoanAprConfig({ ...defaults, serviceFeeOptions: fees }), false);
  }
  assert.equal(isValidLoanAprConfig({ ...defaults, serviceFeeOptions: [0, Number.MAX_SAFE_INTEGER] }), true);
  for (const cost of [-1, .5, Infinity, NaN, '0', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isValidLoanAprConfig({ ...defaults, defaultInsuranceCost: cost }), false);
  }
});
test('protected config handlers reject invalid APR before any writes and persist valid settings', async () => {
  const source = readFileSync(new URL('../backend/server.js', import.meta.url), 'utf8');
  const start = source.indexOf("app.put('/api/config/:key'");
  const end = source.indexOf('// ============================================================', source.indexOf("app.post('/api/config/bulk'"));
  const routes = {};
  const writes = [];
  const app = {
    put: (path, ...handlers) => { routes[path] = handlers; },
    post: (path, ...handlers) => { routes[path] = handlers; },
  };
  const authenticate = () => {};
  const authorize = () => {};
  const model = { findOneAndUpdate: async (...args) => { writes.push(args); } };
  // Execute the real route registrations without starting the server or connecting to MongoDB.
  new Function('app', 'SiteConfig', 'authenticateUser', 'requireAdmin', 'isValidLoanAprConfig',
    'LOAN_APR_CONFIG_KEY', 'isValidHeroSliderInterval', 'chatbotCache', source.slice(start, end))(
    app, model, authenticate, authorize, isValidLoanAprConfig, LOAN_APR_CONFIG_KEY, () => true, null,
  );
  const invoke = async (path, body) => {
    const handlers = routes[path];
    assert.equal(handlers[0], authenticate);
    assert.equal(handlers[1], authorize);
    const response = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handlers[2]({ params: { key: LOAN_APR_CONFIG_KEY }, body }, response);
    return response;
  };
  for (const path of ['/api/config/:key', '/api/config/bulk']) {
    const invalid = { ...defaults, serviceFeeOptions: [50000, -1] };
    const invalidBody = path.endsWith('bulk') ? { unrelated: 42, [LOAN_APR_CONFIG_KEY]: invalid } : { value: invalid };
    writes.length = 0;
    assert.equal((await invoke(path, invalidBody)).code, 400);
    assert.equal(writes.length, 0, 'invalid bulk must not partially write other keys');
    const validBody = path.endsWith('bulk') ? { [LOAN_APR_CONFIG_KEY]: defaults } : { value: defaults };
    assert.equal((await invoke(path, validBody)).code, 200);
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0][0], { key: LOAN_APR_CONFIG_KEY });
    assert.deepEqual(writes[0][1].value, defaults);
    assert.equal(writes[0][1].group, 'rates');
    assert.equal(typeof writes[0][1].label, 'string');
    assert.equal(writes[0][2].upsert, true);
  }
});
