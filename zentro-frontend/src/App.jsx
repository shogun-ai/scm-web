import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Login from './pages/Login';
import Shell from './pages/Shell';
import PublicSite from './pages/PublicSite';
import { API } from './api';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('zentro_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zentro_user')); } catch { return null; }
  });
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next) => {
    window.history.pushState({}, '', next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogin = useCallback((t, u) => {
    localStorage.setItem('zentro_token', t);
    localStorage.setItem('zentro_user', JSON.stringify(u));
    setToken(t); setUser(u); go('/admin');
  }, [go]);

  const handleLogout = useCallback(() => {
    const t = localStorage.getItem('zentro_token');
    if (t) fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {});
    localStorage.removeItem('zentro_token');
    localStorage.removeItem('zentro_user');
    setToken(null); setUser(null); go('/');
  }, [go]);

  useEffect(() => {
    window.addEventListener('auth:expired', handleLogout);
    return () => window.removeEventListener('auth:expired', handleLogout);
  }, [handleLogout]);

  if (path === '/login') return <Login onLogin={handleLogin} onBack={() => go('/')} />;
  if (token && user && path.startsWith('/admin')) return <Shell user={user} onLogout={handleLogout} />;
  return <PublicSite onLogin={() => go('/login')} />;
}
