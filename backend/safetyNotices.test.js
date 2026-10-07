import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SAFETY_NOTICES, validateSafetyNoticeUpdate, safetyNoticeResponse, readSafetyNotices, saveSafetyNotices, createSafetyNoticeGuard, isSafetyNoticeRequest } from './safetyNotices.js';
import SafetyNoticeConfig from './models/SafetyNoticeConfig.js';

const notice = overrides => ({ ...DEFAULT_SAFETY_NOTICES[0], ...overrides });
const input = overrides => ({ notices: [notice()], revision: 0, ...overrides });

test('complete initial guidance fits admin validation and includes emergency and official contacts', () => {
    const { notices } = validateSafetyNoticeUpdate({ notices: DEFAULT_SAFETY_NOTICES, revision: 0 });
    assert.equal(notices.length, 8);
    assert.ok(notices.find(item => item.id === 'emergency').body.includes('51-26-5666'));
    assert.ok(notices.find(item => item.id === 'official-channels').body.includes('info@scm.mn'));
});

test('validates plain text, trims content, and accepts deleting every notice', () => {
    assert.deepEqual(validateSafetyNoticeUpdate({ notices: [], revision: 7 }), { notices: [], revision: 7 });
    const result = validateSafetyNoticeUpdate(input({ notices: [notice({ title: ' Гарчиг ', body: ' Тайлбар\nхоёр ', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/notice.png' })] }));
    assert.equal(result.notices[0].title, 'Гарчиг');
    assert.equal(result.notices[0].body, 'Тайлбар\nхоёр');
    assert.equal(result.notices[0].imageUrl, 'https://res.cloudinary.com/demo/image/upload/v1/notice.png');
    assert.equal(validateSafetyNoticeUpdate(input({ notices: [notice({ imageUrl: '' })] })).notices[0].imageUrl, '');
});

test('rejects malformed payloads, duplicate ids, unsafe keys, and unbounded fields', () => {
    const cases = [null, [], {}, input({ revision: '0' }), input({ revision: -1 }), input({ revision: 0.5 }),
        input({ revision: Number.MAX_SAFE_INTEGER }), input({ notices: {} }), input({ admin: true }),
        input({ notices: [notice(), notice()] }), input({ notices: Array.from({ length: 31 }, (_, i) => notice({ id: `n-${i}` })) }),
        ...[{ id: '' }, { id: 'bad.id' }, { id: { $ne: null } }, { title: '' }, { title: ' ' }, { title: 'a'.repeat(121) },
            { body: 'a'.repeat(2001) }, { body: [] }, { isPublished: 'false' }, { order: 0.5 }, { order: -1 },
            { order: 1000001 }, { unexpected: true }, { imageUrl: 'http://insecure.example.com/x.png' },
            { imageUrl: 'javascript:alert(1)' }, { imageUrl: 'data:image/png;base64,AA==' }, { imageUrl: `https://a.com/${'a'.repeat(500)}` },
            { imageUrl: 123 }, { imageUrl: null }].map(change => input({ notices: [notice(change)] }))];
    for (const payload of cases) assert.throws(() => validateSafetyNoticeUpdate(payload), error => error.status === 400);
});

test('defaults appear only for missing document; empty saves and all drafts stay empty publicly', () => {
    assert.equal(safetyNoticeResponse(null).revision, 0);
    assert.equal(safetyNoticeResponse(null, true).notices.length, DEFAULT_SAFETY_NOTICES.length);
    assert.deepEqual(safetyNoticeResponse({ notices: [], revision: 1 }, true), { notices: [] });
    assert.deepEqual(safetyNoticeResponse({ notices: [notice({ isPublished: false })], revision: 1 }, true), { notices: [] });
    const response = safetyNoticeResponse({ notices: [notice({ id: 'b', order: 2, private: 'secret' }), notice({ id: 'a', order: 0 })], revision: 3 }, true);
    assert.deepEqual(response.notices.map(n => n.id), ['a', 'b']);
    assert.equal('private' in response.notices[1], false);
    assert.equal('revision' in response, false);
});

test('read uses singleton id, bounded projection, lean and no writes', async () => {
    const Model = { findById(id) {
        assert.equal(id, 'homepage');
        return { select(projection) {
            assert.deepEqual(projection, { notices: { $slice: 30 }, revision: 1 });
            return { async lean() { return null; } };
        } };
    } };
    assert.equal((await readSafetyNotices(Model, true)).notices.length, DEFAULT_SAFETY_NOTICES.length);
});

// In-memory atomic model reproduces Mongo's fixed-id duplicate-key and CAS outcomes.
function memoryModel() {
    let state = null;
    return { findOneAndUpdate(filter, update, options) {
        assert.equal(filter._id, 'homepage');
        assert.equal(options.runValidators, true);
        assert.equal(options.new, true);
        assert.equal(options.setDefaultsOnInsert, false);
        return { async lean() {
            if (!state && options.upsert) state = { ...update.$set };
            else if (state && state.revision === filter.revision) state = { ...update.$set };
            else if (options.upsert) throw Object.assign(new Error('duplicate'), { code: 11000 });
            else return null;
            return structuredClone(state);
        } };
    } };
}

test('concurrent first saves have a single winner; later stale writes fail; deletion persists', async () => {
    const Model = memoryModel();
    const results = await Promise.allSettled([saveSafetyNotices(Model, input()), saveSafetyNotices(Model, input())]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
    const deleted = await saveSafetyNotices(Model, { notices: [], revision: 1 });
    assert.deepEqual(deleted, { notices: [], revision: 2 });
    await assert.rejects(saveSafetyNotices(Model, input({ revision: 1 })), error => error.status === 409);
    await assert.rejects(saveSafetyNotices(Model, input({ revision: 0 })), error => error.status === 409);
});

test('database errors propagate instead of returning defaults or false success', async () => {
    const Model = { findOneAndUpdate() { return { async lean() { throw new Error('offline'); } }; } };
    await assert.rejects(saveSafetyNotices(Model, input()), /offline/);
    const neverWrite = { findOneAndUpdate() { assert.fail('invalid input must not reach database'); } };
    await assert.rejects(saveSafetyNotices(neverWrite, input({ revision: null })), error => error.status === 400);
});

test('Mongoose schema validates without opening a connection', async () => {
    await new SafetyNoticeConfig({ _id: 'homepage', notices: [notice()], revision: 1 }).validate();
    await new SafetyNoticeConfig({ _id: 'homepage', notices: [], revision: 2 }).validate();
    await assert.rejects(new SafetyNoticeConfig({ _id: 'other', notices: [notice(), notice()], revision: 0 }).validate());
});

test('abuse guard caps buckets and request rate, expires buckets, ignores forged forwarding header', () => {
    let timestamp = 0;
    const guard = createSafetyNoticeGuard({ max: 2, windowMs: 1000, maxKeys: 1, now: () => timestamp });
    let passed = 0;
    const response = { set(key, value) { this[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    const req = { ip: '1.2.3.4', headers: { 'x-forwarded-for': 'forged' } };
    guard(req, response, () => passed++);
    guard(req, response, () => passed++);
    guard(req, response, () => passed++);
    assert.equal(passed, 2);
    assert.equal(response.code, 429);
    assert.equal(response['Retry-After'], '1');
    guard({ ip: '5.6.7.8' }, response, () => passed++);
    assert.equal(passed, 2);
    timestamp = 1000;
    guard({ ip: '5.6.7.8' }, response, () => passed++);
    assert.equal(passed, 3);
});

test('request guards cover Express case-insensitive and trailing-slash paths only', () => {
    for (const path of ['/api/safety-notices', '/api/admin/safety-notices/', '/API/ADMIN/SAFETY-NOTICES']) assert.equal(isSafetyNoticeRequest({ path }), true);
    for (const path of ['/api/blogs', '/api/safety-notices/other']) assert.equal(isSafetyNoticeRequest({ path }), false);
});

test('independent public and admin guards isolate visitors from authenticated admin identities', () => {
    const publicGuard = createSafetyNoticeGuard({ max: 1 });
    const adminGuard = createSafetyNoticeGuard({ max: 1, keyFn: req => String(req.user._id) });
    const response = { set() {}, status(code) { this.code = code; return this; }, json() {} };
    const visitor = { ip: 'shared-proxy' };
    const adminA = { ip: 'shared-proxy', user: { _id: 'admin-a' } };
    const adminB = { ip: 'shared-proxy', user: { _id: 'admin-b' } };
    let passed = 0;
    const next = () => passed++;
    publicGuard(visitor, response, next);
    publicGuard(visitor, response, next);
    assert.equal(response.code, 429);
    assert.equal(passed, 1);
    adminGuard(adminA, response, next);
    assert.equal(passed, 2, 'public exhaustion must not affect admin');
    adminGuard({ ...adminA, ip: 'different-peer' }, response, next);
    assert.equal(passed, 2, 'same authenticated user retains their bucket across peers');
    adminGuard(adminB, response, next);
    assert.equal(passed, 3, 'different administrators have separate buckets behind a shared proxy');
});
