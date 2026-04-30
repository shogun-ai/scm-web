import { useState, useEffect, useCallback } from 'react';
import './index.css';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('loan_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('loan_user')); } catch { return null; }
  });

  const handleLogin = useCallback((t, u) => {
    setToken(t);
    setUser(u);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('loan_token');
    localStorage.removeItem('loan_user');
    setToken(null);
    setUser(null);
  }, []);

  // Auto-logout when any API call returns 401 (token expired / revoked)
  useEffect(() => {
    window.addEventListener('auth:expired', handleLogout);
    return () => window.removeEventListener('auth:expired', handleLogout);
  }, [handleLogout]);

  if (!token || !user) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

export default App;
