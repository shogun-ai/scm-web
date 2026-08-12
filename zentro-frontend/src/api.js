import axios from 'axios';

const isLocal = window.location.hostname === 'localhost';
export const API = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zentro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zentro_token');
      localStorage.removeItem('zentro_user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginApi = (email, password) =>
  axios.post(`${API}/api/auth/login`, { email, password }).then(r => r.data);

// ─── Clients ──────────────────────────────────────────────────────────────────
export const getClients   = (params) => api.get('/api/zentro/clients', { params }).then(r => r.data);
export const getClient    = (id) => api.get(`/api/zentro/clients/${id}`).then(r => r.data);
export const createClient = (data) => api.post('/api/zentro/clients', data).then(r => r.data);
export const updateClient = (id, data) => api.put(`/api/zentro/clients/${id}`, data).then(r => r.data);

// ─── Cars ─────────────────────────────────────────────────────────────────────
export const getCars   = (params) => api.get('/api/zentro/cars', { params }).then(r => r.data);
export const getCar    = (id) => api.get(`/api/zentro/cars/${id}`).then(r => r.data);
export const createCar = (data) => api.post('/api/zentro/cars', data).then(r => r.data);
export const updateCar = (id, data) => api.put(`/api/zentro/cars/${id}`, data).then(r => r.data);

// ─── Leases ───────────────────────────────────────────────────────────────────
export const getLeases      = (params) => api.get('/api/zentro/leases', { params }).then(r => r.data);
export const getLease       = (id) => api.get(`/api/zentro/leases/${id}`).then(r => r.data);
export const createLease    = (data) => api.post('/api/zentro/leases', data).then(r => r.data);
export const updateLease    = (id, data) => api.put(`/api/zentro/leases/${id}`, data).then(r => r.data);
export const rescheduleLease = (id, data) => api.put(`/api/zentro/leases/${id}/reschedule`, data).then(r => r.data);

// ─── Payments ─────────────────────────────────────────────────────────────────
export const getPayments    = (params) => api.get('/api/zentro/payments', { params }).then(r => r.data);
export const createPayment  = (data) => api.post('/api/zentro/payments', data).then(r => r.data);
export const bankImport     = (data) => api.post('/api/zentro/payments/bank-import', data).then(r => r.data);
export const deletePayment  = (id) => api.delete(`/api/zentro/payments/${id}`).then(r => r.data);

// ─── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions    = (params) => api.get('/api/zentro/transactions', { params }).then(r => r.data);
export const getTransactionCodes = () => api.get('/api/zentro/transactions/codes').then(r => r.data);
export const createTransaction  = (data) => api.post('/api/zentro/transactions', data).then(r => r.data);
export const importTransactions = (data) => api.post('/api/zentro/transactions/import', data).then(r => r.data);
export const getImportBatches   = () => api.get('/api/zentro/import-batches').then(r => r.data);
export const deleteImportBatch  = (id) => api.delete(`/api/zentro/import-batches/${id}`).then(r => r.data);
export const updateTransaction  = (id, data) => api.put(`/api/zentro/transactions/${id}`, data).then(r => r.data);
export const deleteTransaction  = (id) => api.delete(`/api/zentro/transactions/${id}`).then(r => r.data);
export const recodeTransactions = () => api.post('/api/zentro/transactions/recode').then(r => r.data);
export const getCodeRules    = () => api.get('/api/zentro/code-rules').then(r => r.data);
export const saveCodeRule    = (data) => api.post('/api/zentro/code-rules', data).then(r => r.data);
export const deleteCodeRule  = (id) => api.delete(`/api/zentro/code-rules/${id}`).then(r => r.data);
export const getCodeCombos   = () => api.get('/api/zentro/code-combos').then(r => r.data);

// ─── Funding (Эх үүсвэр) ──────────────────────────────────────────────────────
export const getFunding              = ()     => api.get('/api/zentro/funding').then(r => r.data);
export const createFunding           = (data) => api.post('/api/zentro/funding', data).then(r => r.data);
export const updateFunding           = (id,d) => api.put(`/api/zentro/funding/${id}`, d).then(r => r.data);
export const deleteFunding           = (id)   => api.delete(`/api/zentro/funding/${id}`).then(r => r.data);
export const syncFunding             = ()     => api.post('/api/zentro/funding/sync').then(r => r.data);
export const syncFundingPayments     = ()     => api.post('/api/zentro/funding/sync-payments').then(r => r.data);
export const getFundingPayments      = (id)   => api.get(`/api/zentro/funding/${id}/payments`).then(r => r.data);
export const getFinancialStatement   = ()     => api.get('/api/zentro/reports/financial-statement').then(r => r.data);

// ─── Collateral (Барьцаа) ─────────────────────────────────────────────────────
export const getCollateral   = (p)      => api.get('/api/zentro/collateral', { params: p }).then(r => r.data);
export const createCollateral= (data)   => api.post('/api/zentro/collateral', data).then(r => r.data);
export const updateCollateral= (id, d)  => api.put(`/api/zentro/collateral/${id}`, d).then(r => r.data);
export const deleteCollateral= (id)     => api.delete(`/api/zentro/collateral/${id}`).then(r => r.data);

// ─── NPL / Provision ─────────────────────────────────────────────────────────
export const getNpl          = ()       => api.get('/api/zentro/reports/npl').then(r => r.data);
export const accrueInterest  = (date)   => api.post('/api/zentro/transactions/accrue', { date }).then(r => r.data);

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getPortfolio      = () => api.get('/api/zentro/reports/portfolio').then(r => r.data);
export const getSummary        = (params) => api.get('/api/zentro/reports/summary', { params }).then(r => r.data);
export const getAccountBalances = (params) => api.get('/api/zentro/reports/balances', { params }).then(r => r.data);

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n) => (n || 0).toLocaleString('mn-MN');
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('mn-MN') : '—';
export const statusLabel = {
  active: 'Идэвхтэй', completed: 'Дууссан', overdue: 'Хугацаа хэтэрсэн', cancelled: 'Цуцлагдсан',
  pending: 'Хүлээгдэж буй', paid: 'Төлөгдсөн', partial: 'Хагас', individual: 'Иргэн', organization: 'Байгууллага',
  available: 'Сул', leased: 'Лизинглэгдсэн', sold: 'Зарагдсан', manual: 'Гараар', bank_import: 'Банкны хуулга',
};
export const statusBadge = (s) => {
  const cls = { active: 'blue', completed: 'green', overdue: 'red', cancelled: 'gray',
    paid: 'green', partial: 'yellow', pending: 'gray', available: 'green', leased: 'blue', sold: 'gray' };
  return `z-badge z-badge-${cls[s] || 'gray'}`;
};

export const getPublicConfig = () => axios.get(`${API}/api/zentro/public/config`).then(r => r.data);
export const submitPublicLoanRequest = (data) => axios.post(`${API}/api/zentro/public/loan-requests`, data).then(r => r.data);
export const getAdminWebConfig = () => api.get('/api/zentro/admin/web-config').then(r => r.data);
export const updateAdminWebConfig = (data) => api.put('/api/zentro/admin/web-config', data).then(r => r.data);
export const getZentroLoanRequests = (params) => api.get('/api/zentro/admin/loan-requests', { params }).then(r => r.data);
export const updateZentroLoanRequest = (id, data) => api.put(`/api/zentro/admin/loan-requests/${id}`, data).then(r => r.data);
export const convertZentroLoanRequest = (id) => api.post(`/api/zentro/admin/loan-requests/${id}/convert-client`).then(r => r.data);
export const getUsers = () => api.get('/api/users').then(r => r.data);
export const createUser = (data) => api.post('/api/users', data).then(r => r.data);
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/api/users/${id}`).then(r => r.data);
export const getLogs = () => api.get('/api/logs').then(r => r.data);
