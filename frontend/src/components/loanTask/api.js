import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

export const getAuthHeaders = () => {
  try {
    const token = JSON.parse(localStorage.getItem('scm_auth') || '{}').token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
};

const base = apiUrl => `${apiUrl || API_URL}/api/loan-tasks`;
const auth = () => ({ headers: getAuthHeaders() });
const data = promise => promise.then(response => response.data);

// ---- public ----
export const fetchLoanTaskAvailability = async (apiUrl, timeout = 5000) => {
  try {
    const result = await data(axios.get(`${base(apiUrl)}/public/products`, { timeout }));
    return Boolean(result?.enabled);
  } catch { return false; }
};
export const fetchPublicProducts = (apiUrl, timeout = 5000) => data(axios.get(`${base(apiUrl)}/public/products`, { timeout }));
// fresh: bypass the 60 s browser/CDN cache (e.g. after 409 CONFIG_CHANGED); the backend ignores `t`.
export const fetchPublicProduct = (apiUrl, productKey, timeout = 5000, { fresh = false } = {}) => data(axios.get(`${base(apiUrl)}/public/products/${encodeURIComponent(productKey)}`, { timeout, ...(fresh ? { params: { t: Date.now() } } : {}) }));
export const submitPublicRequest = (apiUrl, formData, onUploadProgress) => data(axios.post(`${base(apiUrl)}/public/submit`, formData, { onUploadProgress }));
export const fetchUploadRequest = (apiUrl, token) => data(axios.get(`${base(apiUrl)}/upload/${encodeURIComponent(token)}`, { timeout: 15000 }));
export const submitUploadFiles = (apiUrl, token, formData, onUploadProgress) => data(axios.post(`${base(apiUrl)}/upload/${encodeURIComponent(token)}`, formData, { onUploadProgress }));

// ---- admin / staff ----
export const fetchAdminConfigs = apiUrl => data(axios.get(`${base(apiUrl)}/admin/configs`, auth()));
export const saveAdminConfig = (apiUrl, productKey, config) => data(axios.put(`${base(apiUrl)}/admin/configs/${encodeURIComponent(productKey)}`, config, auth()));
export const fetchAssignees = apiUrl => data(axios.get(`${apiUrl || API_URL}/api/loan-requests/assignees`, auth()));
export const fetchTaskList = (apiUrl, params) => data(axios.get(base(apiUrl), { ...auth(), params }));
export const fetchTaskSummary = (apiUrl, params) => data(axios.get(`${base(apiUrl)}/summary`, { ...auth(), params }));
export const fetchTaskDetail = (apiUrl, id) => data(axios.get(`${base(apiUrl)}/${id}`, auth()));
export const postTaskAction = (apiUrl, id, action) => data(axios.post(`${base(apiUrl)}/${id}/actions`, action, auth()));
export const postTaskFiles = (apiUrl, id, formData) => data(axios.post(`${base(apiUrl)}/${id}/files`, formData, auth()));
export const postDocRequest = (apiUrl, id, body) => data(axios.post(`${base(apiUrl)}/${id}/doc-request`, body, auth()));
export const postTaskMessage = (apiUrl, id, body) => data(axios.post(`${base(apiUrl)}/${id}/message`, body, auth()));

export const errorMessage = (error, fallback = 'Алдаа гарлаа. Дахин оролдоно уу.') => {
  if (error?.response?.status === 503 && error.response.data?.code === 'DISABLED') return 'Энэ боломж одоогоор идэвхгүй байна.';
  if (error?.response?.status === 429) return 'Хүсэлт илгээх давтамжийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.';
  return error?.response?.data?.message || fallback;
};

// ---- D22: authenticated file proxy ----
// Cloudinary serves private files as nameless octet-stream attachments, so files are fetched through the
// backend proxy with the auth header and shown from a blob URL carrying the real type and file name.
export const parseDispositionFileName = header => {
  if (typeof header !== 'string') return '';
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star) { try { return decodeURIComponent(star[1].trim()); } catch { /* fall through to the ASCII form */ } }
  const plain = /filename\s*=\s*"([^"]*)"/i.exec(header);
  return plain ? plain[1] : '';
};
const FILE_ERRORS = { 401: 'Нэвтрэх хугацаа дууссан байна.', 403: 'Файл харах эрхгүй байна.', 404: 'Файл олдсонгүй.', 413: 'Файл хэт том байна.', 429: 'Хэт олон хүсэлт илгээлээ. Түр хүлээнэ үү.', 502: 'Файлыг татаж чадсангүй. Дахин оролдоно уу.' };
export async function openLoanFile(apiUrl, requestId, fileRef, { download = false, fileName = '' } = {}) {
  // The tab is opened synchronously (inside the click) so popup blockers allow it; it is navigated after the fetch.
  const tab = download ? null : window.open('about:blank', '_blank');
  if (tab) tab.opener = null;
  try {
    const response = await axios.get(`${apiUrl || API_URL}/api/loan-requests/${encodeURIComponent(requestId)}/files/${encodeURIComponent(fileRef)}`, {
      ...auth(), params: download ? { download: 1 } : undefined, responseType: 'blob', timeout: 60000,
    });
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const blobUrl = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    if (download) {
      const link = document.createElement('a');
      link.href = blobUrl; link.download = parseDispositionFileName(response.headers?.['content-disposition']) || fileName || 'file';
      document.body.appendChild(link); link.click(); link.remove();
    } else if (tab) tab.location.href = blobUrl;
    else window.open(blobUrl, '_blank', 'noopener');
  } catch (error) {
    tab?.close();
    const status = error?.response?.status;
    throw new Error(FILE_ERRORS[status] || (error?.code === 'ECONNABORTED' ? 'Файл татах хугацаа хэтэрлээ.' : 'Файлыг нээж чадсангүй. Дахин оролдоно уу.'));
  }
}

// ---- D16: delete (admin + setting) ----
export const deleteLoanRequest = (apiUrl, id) => data(axios.delete(`${apiUrl || API_URL}/api/loan-requests/${id}`, auth()));
