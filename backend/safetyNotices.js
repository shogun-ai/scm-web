export const SAFETY_NOTICE_LIMIT = 30;
export const SAFETY_NOTICE_DOCUMENT_ID = 'homepage';
import { DEFAULT_SAFETY_NOTICES } from './defaultSafetyNotices.js';
export { DEFAULT_SAFETY_NOTICES } from './defaultSafetyNotices.js';

export class SafetyNoticeError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value, keys) => isObject(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validateSafetyNoticeUpdate(input) {
    const invalid = () => { throw new SafetyNoticeError(400, 'Сэрэмжлүүлгийн мэдээлэл буруу байна. Гарчиг 120, тайлбар 2000 тэмдэгтээс хэтрэхгүй байх ёстой.'); };
    if (!hasExactKeys(input, ['notices', 'revision']) || !Number.isSafeInteger(input.revision)
        || input.revision < 0 || input.revision >= Number.MAX_SAFE_INTEGER
        || !Array.isArray(input.notices) || input.notices.length > SAFETY_NOTICE_LIMIT) invalid();
    const ids = new Set();
    const notices = input.notices.map(notice => {
        if (!hasExactKeys(notice, ['id', 'title', 'body', 'isPublished', 'order', 'imageUrl'])
            || typeof notice.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(notice.id)
            || ids.has(notice.id) || typeof notice.title !== 'string' || typeof notice.body !== 'string'
            || !notice.title.trim() || !notice.body.trim() || notice.title.length > 120 || notice.body.length > 2000
            || typeof notice.isPublished !== 'boolean' || !Number.isSafeInteger(notice.order)
            || notice.order < 0 || notice.order > 1000000 || typeof notice.imageUrl !== 'string'
            || notice.imageUrl.length > 500 || !/^$|^https:\/\/\S+$/.test(notice.imageUrl)) invalid();
        ids.add(notice.id);
        return {
            id: notice.id, title: notice.title.trim(), body: notice.body.trim(), isPublished: notice.isPublished,
            order: notice.order, imageUrl: notice.imageUrl,
        };
    });
    return { notices, revision: input.revision };
}

export function safetyNoticeResponse(document, publicOnly = false) {
    const source = document ? document.notices : DEFAULT_SAFETY_NOTICES;
    const notices = source.slice(0, SAFETY_NOTICE_LIMIT)
        .filter(notice => !publicOnly || notice.isPublished === true)
        .map(({ id, title, body, isPublished, order, imageUrl }) => ({ id, title, body, isPublished, order, imageUrl }))
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return publicOnly ? { notices } : { notices, revision: document ? document.revision : 0 };
}

export async function readSafetyNotices(Model, publicOnly = false) {
    const document = await Model.findById(SAFETY_NOTICE_DOCUMENT_ID)
        .select({ notices: { $slice: SAFETY_NOTICE_LIMIT }, revision: 1 }).lean();
    return safetyNoticeResponse(document, publicOnly);
}

export async function saveSafetyNotices(Model, input) {
    const { notices, revision } = validateSafetyNoticeUpdate(input);
    const conflict = () => new SafetyNoticeError(409, 'Өөр админ мэдээллийг шинэчилсэн байна. Дахин ачаалж, өөрчлөлтөө оруулна уу.');
    try {
        // The fixed _id also protects the first save: a concurrent upsert gets E11000.
        const document = await Model.findOneAndUpdate(
            { _id: SAFETY_NOTICE_DOCUMENT_ID, revision },
            { $set: { notices, revision: revision + 1 } },
            { new: true, upsert: revision === 0, runValidators: true, setDefaultsOnInsert: false },
        ).lean();
        if (!document) throw conflict();
        return safetyNoticeResponse(document);
    } catch (error) {
        if (error.code === 11000) throw conflict();
        throw error;
    }
}

export const isSafetyNoticeRequest = req => /^\/api\/(?:admin\/)?safety-notices\/?$/i.test(req.path || '');

// Match existing in-process abuse controls, with a hard bound on retained IPs.
export function createSafetyNoticeGuard({ max = 600, windowMs = 60000, maxKeys = 5000, now = Date.now, keyFn = req => req.ip || req.socket?.remoteAddress || 'unknown' } = {}) {
    const buckets = new Map();
    return (req, res, next) => {
        const timestamp = now();
        for (const [key, bucket] of buckets) if (bucket.resetAt <= timestamp) buckets.delete(key);
        const key = keyFn(req);
        let bucket = buckets.get(key);
        if (!bucket && buckets.size >= maxKeys) {
            res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
            return res.status(429).json({ message: 'Хүсэлт олширсон байна. Түр хүлээгээд дахин оролдоно уу.' });
        }
        if (!bucket) { bucket = { count: 0, resetAt: timestamp + windowMs }; buckets.set(key, bucket); }
        if (++bucket.count > max) {
            res.set('Retry-After', String(Math.ceil((bucket.resetAt - timestamp) / 1000)));
            return res.status(429).json({ message: 'Хүсэлт олширсон байна. Түр хүлээгээд дахин оролдоно уу.' });
        }
        return next();
    };
}
