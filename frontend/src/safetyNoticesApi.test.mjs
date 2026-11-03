import assert from 'node:assert/strict';
import test from 'node:test';

const originalWindow = globalThis.window;
globalThis.window = { location: { hostname: 'localhost' } };
const { safePosterUrl, requestSafetyNotices } = await import('./safetyNoticesApi.js');
if (originalWindow === undefined) delete globalThis.window;
else globalThis.window = originalWindow;

test('poster URLs accept and normalize absolute HTTPS links', () => {
  assert.equal(safePosterUrl('https://example.com/poster?q=1#image'), 'https://example.com/poster?q=1#image');
  assert.equal(safePosterUrl('HTTPS://EXAMPLE.COM'), 'https://example.com/');
});

test('poster URLs reject unsafe schemes, credentials, malformed addresses and controls', () => {
  const invalid = [
    '', null, undefined, 1, {},
    'javascript:alert(1)', 'data:text/html,test', 'http://example.com', '//example.com',
    'https://user:pass@example.com', 'https:///example.com', 'https://',
    'https://example.com/a b', 'https://example.com/\n',
    `https://example.com/${String.fromCharCode(0)}`,
    `https://example.com/${String.fromCharCode(127)}`,
    `https://example.com/${String.fromCharCode(92)}other`,
    `https://example.com/${'a'.repeat(2000)}`,
  ];
  for (const value of invalid) assert.equal(safePosterUrl(value), '', `Rejected ${JSON.stringify(value)}`);
});

test('legacy responses without poster links keep both links empty', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ notices: [], revision: 1 }) }));
  assert.deepEqual((await requestSafetyNotices({ token: 'test-token' })).posterLinks, { safety: '', gambling: '' });
});

test('public response removes unsafe poster URLs without hiding valid links', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({ notices: [], posterLinks: { safety: 'javascript:alert(1)', gambling: 'https://example.com/poster' } }),
  }));
  assert.deepEqual((await requestSafetyNotices()).posterLinks, { safety: '', gambling: 'https://example.com/poster' });
});

test('admin save sends poster links and the same revision with its authenticated notices update', async t => {
  const posterLinks = { safety: 'https://example.com/one', gambling: 'https://example.com/two' };
  const signal = new AbortController().signal;
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, json: async () => ({ notices: [], revision: 4, posterLinks }),
  }));
  const result = await requestSafetyNotices({ token: 'test-token', notices: [], revision: 3, posterLinks, signal });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, 'http://localhost:5000/api/admin/safety-notices');
  assert.equal(options.method, 'PUT');
  assert.equal(options.headers.Authorization, 'Bearer test-token');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.signal, signal);
  assert.deepEqual(JSON.parse(options.body), { notices: [], revision: 3, posterLinks });
  assert.deepEqual(result.posterLinks, posterLinks);
});

test('legacy caller omits posterLinks from save payload instead of clearing saved links', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, json: async () => ({ notices: [], revision: 2 }),
  }));
  await requestSafetyNotices({ token: 'test-token', notices: [], revision: 1 });
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), { notices: [], revision: 1 });
});

test('revision conflicts reject instead of reporting a successful save', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 409 }));
  await assert.rejects(requestSafetyNotices({ token: 'test-token', notices: [], revision: 1 }), /Өөр админ/);
});
