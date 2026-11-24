// Authenticated loan file proxy (design: docs/design/loan-task-management.md §22, D22).
// Cloudinary serves our raw/authenticated uploads as application/octet-stream with a nameless attachment
// disposition, so browsers download an extension-less file. Staff open files through this proxy instead:
// it fetches the bytes server-side and answers with the real Content-Type and the original file name.
import { createIntakeLimiter, isAllowedLoanRemoteUrl } from './loanIntake.js';
import { isPrivateLoanPublicId } from './loanTasks.js';
import { resolvePermissions } from '../shared/permissions.js';

export const FILE_PROXY_MAX_BYTES = 30 * 1024 * 1024;
export const FILE_PROXY_TIMEOUT_MS = 25000;
export const FILE_PROXY_URL_TTL_SECONDS = 120;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const REF_RE = /^(fd|tf)-([A-Za-z0-9]{1,40})$/;
const INDEX_RE = /^\d{1,4}$/;

export const MIME_EXTENSIONS = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/heic': ['heic', 'heif'],
};
const MIME_ALIASES = { 'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg', 'image/heif': 'image/heic' };
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
export const OCTET_STREAM = 'application/octet-stream';

const filesOf = (loan, kind) => (Array.isArray(kind === 'fd' ? loan?.fileDetails : loan?.taskFiles) ? (kind === 'fd' ? loan.fileDetails : loan.taskFiles) : []);

// Stable reference: `fd-<_id>` / `tf-<_id>`, or `fd-<index>` / `tf-<index>` when a subdocument has no _id.
export const fileRefOf = (kind, file, index) => `${kind}-${file?._id ? String(file._id) : index}`;
export const fileProxyPath = (loanId, ref) => `/api/loan-requests/${encodeURIComponent(String(loanId))}/files/${encodeURIComponent(ref)}`;

export function resolveFileRef(loan, ref) {
  const match = REF_RE.exec(typeof ref === 'string' ? ref : '');
  if (!match) return null;
  const [, kind, rest] = match;
  const list = filesOf(loan, kind);
  if (INDEX_RE.test(rest)) {
    const file = list[Number(rest)];
    return file && !file._id ? { kind, file, index: Number(rest) } : null;
  }
  const index = list.findIndex(file => file?._id && String(file._id) === rest);
  return index >= 0 ? { kind, file: list[index], index } : null;
}

// D24: trust request documents live in their own private folder.
export const TRUST_PRIVATE_FOLDER = 'scm_trust_private';
export const isPrivateTrustPublicId = id => typeof id === 'string' && id.length <= 300 && id.startsWith(`${TRUST_PRIVATE_FOLDER}/`) && !id.includes('..');

// Where the bytes may come from: private-folder authenticated files, or legacy https res.cloudinary.com URLs.
export function fileSourceOf(file) {
  if (!file || typeof file !== 'object') return null;
  if (file.deliveryType === 'authenticated') return isPrivateLoanPublicId(file.publicId) || isPrivateTrustPublicId(file.publicId) ? 'private' : null;
  return isAllowedLoanRemoteUrl(file.fileUrl) ? 'legacy' : null;
}
export const isProxyableFile = file => fileSourceOf(file) !== null;

export function sniffMime(buffer) {
  if (!buffer || typeof buffer.subarray !== 'function' || buffer.length < 4) return null;
  const head = (start, end) => buffer.subarray(start, end).toString('latin1');
  if (head(0, 5) === '%PDF-') return 'application/pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 6 && (head(0, 6) === 'GIF87a' || head(0, 6) === 'GIF89a')) return 'image/gif';
  if (buffer.length >= 12 && head(0, 4) === 'RIFF' && head(8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && head(4, 8) === 'ftyp' && HEIC_BRANDS.has(head(8, 12))) return 'image/heic';
  return null;
}

const normalizeMime = value => {
  const mime = typeof value === 'string' ? value.split(';')[0].trim().toLowerCase() : '';
  const canonical = MIME_ALIASES[mime] || mime;
  return Object.hasOwn(MIME_EXTENSIONS, canonical) ? canonical : null;
};

// The bytes decide when they are recognisable (stored mimeType is client supplied and may be wrong);
// otherwise a stored allow-listed mimeType is used; anything else is served as an opaque download.
export function resolveContentType(mimeType, buffer) {
  return sniffMime(buffer) || normalizeMime(mimeType) || OCTET_STREAM;
}

// Clean display name: no path parts, control chars or quotes; extension forced to match the content type.
export function displayFileName(fileName, contentType) {
  const raw = (typeof fileName === 'string' ? fileName : '').normalize('NFC');
  let base = raw.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f"]/g, '').replace(/^\.+/, '').trim().slice(0, 150);
  if (!base) base = 'file';
  const extensions = MIME_EXTENSIONS[contentType];
  if (!extensions) return base;
  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  return extensions.includes(ext) ? base : `${base}.${extensions[0]}`;
}

const rfc5987 = value => encodeURIComponent(value).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
export function contentDisposition(fileName, contentType, { download = false } = {}) {
  const name = displayFileName(fileName, contentType);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).replace(/[^A-Za-z0-9.]/g, '') : '';
  const ascii = `${stem.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+$/, '') || 'file'}${ext}`;
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${rfc5987(name)}`;
}

export function proxyHeaders({ contentType, fileName, download, size }) {
  return {
    'Content-Type': contentType,
    'Content-Disposition': contentDisposition(fileName, contentType, { download }),
    'Content-Length': String(size),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type',
  };
}

export function sourceUrlFor(file, { cloudinary, now = new Date(), ttlSeconds = FILE_PROXY_URL_TTL_SECONDS } = {}) {
  const source = fileSourceOf(file);
  if (source === 'legacy') return file.fileUrl;
  if (source === 'private' && typeof cloudinary?.utils?.private_download_url === 'function') {
    return cloudinary.utils.private_download_url(file.publicId, typeof file.format === 'string' ? file.format : '', {
      resource_type: file.resourceType === 'image' ? 'image' : 'raw', type: 'authenticated', attachment: false,
      expires_at: Math.floor(now.getTime() / 1000) + ttlSeconds,
    });
  }
  return '';
}

export function createFetchFile(http) {
  return async (url, { maxBytes = FILE_PROXY_MAX_BYTES, timeout = FILE_PROXY_TIMEOUT_MS } = {}) => {
    const response = await http.get(url, { responseType: 'arraybuffer', timeout, maxContentLength: maxBytes, maxBodyLength: maxBytes, maxRedirects: 0, validateStatus: status => status === 200 });
    const buffer = Buffer.from(response.data);
    if (buffer.length > maxBytes) throw Object.assign(new Error('too large'), { code: 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' });
    return buffer;
  };
}

const sizeError = error => error?.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || error?.code === 'ERR_BAD_RESPONSE' && /maxContentLength/i.test(error?.message || '');

// Shared by the loan and trust file routes: fetch the bytes server-side and answer with the real type and file name.
export async function serveProxiedFile({ res, file, cloudinary, fetchFile, now = new Date(), maxBytes = FILE_PROXY_MAX_BYTES, download = false, logger = console, tag = '', onServed }) {
  const url = sourceUrlFor(file, { cloudinary, now });
  if (!url) return res.status(503).json({ message: 'Файл татах боломжгүй байна.' });
  let buffer;
  try { buffer = await fetchFile(url, { maxBytes, timeout: FILE_PROXY_TIMEOUT_MS }); } catch (error) {
    if (sizeError(error)) return res.status(413).json({ message: 'Файл хэт том байна.' });
    logger.error?.(`[loan-files] fetch failed ${tag} code=${error?.code || error?.name || 'Error'}`);
    return res.status(502).json({ message: 'Файлыг татаж чадсангүй. Дахин оролдоно уу.' });
  }
  if (!buffer || buffer.length === 0) return res.status(404).json({ message: 'Файл олдсонгүй.' });
  if (buffer.length > maxBytes) return res.status(413).json({ message: 'Файл хэт том байна.' });
  const contentType = resolveContentType(file.mimeType, buffer);
  const headers = proxyHeaders({ contentType, fileName: file.fileName, download, size: buffer.length });
  if (onServed) await onServed();
  res.set(headers);
  return res.status(200).send(buffer);
}

export function registerLoanFileRoutes({
  app, authenticateUser, LoanRequest, cloudinary, http, fetchFile = createFetchFile(http),
  createLog = async () => {}, getPermissions = async user => resolvePermissions(user), now = () => new Date(), logger = console,
  limiter = createIntakeLimiter({ max: 300 }), maxBytes = FILE_PROXY_MAX_BYTES,
}) {
  const requireView = async (req, res, next) => {
    try { req.perms = await getPermissions(req.user); } catch { req.perms = resolvePermissions(req.user); }
    return req.perms.has('loan_requests.view_all') || req.perms.has('loan_requests.view_assigned') ? next() : res.status(403).json({ message: 'Хүсэлт харах эрхгүй байна.' });
  };
  const notFound = res => res.status(404).json({ message: 'Файл олдсонгүй.' });

  app.get('/api/loan-requests/:id/files/:fileRef', authenticateUser, requireView, limiter, async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!OBJECT_ID_RE.test(id)) return res.status(400).json({ message: 'Хүсэлтийн ID буруу байна.' });
      const scope = req.perms.has('loan_requests.view_all') ? {} : { 'assignee.userId': String(req.user?._id || '') };
      const loan = await LoanRequest.findOne({ _id: id, ...scope }).select('fileDetails taskFiles assignee').lean();
      if (!loan) return notFound(res);
      const entry = resolveFileRef(loan, req.params.fileRef);
      if (!entry || !isProxyableFile(entry.file)) return notFound(res);
      return await serveProxiedFile({
        res, file: entry.file, cloudinary, fetchFile, now: now(), maxBytes, download: req.query?.download === '1', logger, tag: `request=${id} ref=${req.params.fileRef}`,
        onServed: () => Promise.resolve(createLog(req.user, req.query?.download === '1' ? 'loan_file_downloaded' : 'loan_file_opened', `${id}: ${req.params.fileRef}${entry.file.label ? ` (${String(entry.file.label).slice(0, 60)})` : ''}`)).catch(() => {}),
      });
    } catch {
      logger.error?.('[loan-files] unexpected error');
      return res.status(500).json({ message: 'Файлыг нээхэд алдаа гарлаа.' });
    }
  });
}
