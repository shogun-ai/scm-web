import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Login from './pages/Login';
import Shell from './pages/Shell';
import { API } from './api';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('zentro_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zentro_user')); } catch { return null; }
  });

  const handleLogin = useCallback((t, u) => {
    localStorage.setItem('zentro_token', t);
    localStorage.setItem('zentro_user', JSON.stringify(u));
    setToken(t); setUser(u);
  }, []);

  const handleLogout = useCallback(() => {
    const t = localStorage.getItem('zentro_token');
    if (t) fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {});
    localStorage.removeItem('zentro_token');
    localStorage.removeItem('zentro_user');
    setToken(null); setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', handleLogout);
    return () => window.removeEventListener('auth:expired', handleLogout);
  }, [handleLogout]);

  if (!token || !user) return <Login onLogin={handleLogin} />;
  return <Shell user={user} onLogout={handleLogout} />;
}
