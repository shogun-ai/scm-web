import axios from 'axios';

const isLocal = window.location.hostname === 'localhost';
export const API = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

export function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ─── Centralized axios instance ───────────────────────────────────────────────
// Auto-attaches token; fires 'auth:expired' on 401 so App.jsx can log out cleanly.
export const apiClient = axios.create({ baseURL: API });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('loan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('loan_token');
      localStorage.removeItem('loan_user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function loginApi(email, password) {
  const res = await axios.post(`${API}/api/auth/login`, { email, password });
  return res.data;
}

export async function getLoanRequests(token) {
  const res = await axios.get(`${API}/api/loans`, authHeaders(token));
  return res.data;
}

export async function updateLoanStatus(id, data, token) {
  const res = await axios.put(`${API}/api/loans/${id}`, data, authHeaders(token));
  return res.data;
}

export async function getUsers(token) {
  const res = await axios.get(`${API}/api/users`, authHeaders(token));
  return res.data;
}
