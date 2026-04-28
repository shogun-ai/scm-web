import axios from 'axios';

const isLocal = window.location.hostname === 'localhost';
export const API = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

export function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function loginApi(email, password) {
  const res = await axios.post(`${API}/api/login`, { email, password });
  return res.data;
}

export async function getLoanRequests(token) {
  const res = await axios.get(`${API}/api/loan-requests`, authHeaders(token));
  return res.data;
}

export async function updateLoanStatus(id, data, token) {
  const res = await axios.put(`${API}/api/loan-requests/${id}`, data, authHeaders(token));
  return res.data;
}

export async function getUsers(token) {
  const res = await axios.get(`${API}/api/users`, authHeaders(token));
  return res.data;
}
