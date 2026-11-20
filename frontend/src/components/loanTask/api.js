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

// ---- D16: delete (admin + setting) ----
export const deleteLoanRequest = (apiUrl, id) => data(axios.delete(`${apiUrl || API_URL}/api/loan-requests/${id}`, auth()));
