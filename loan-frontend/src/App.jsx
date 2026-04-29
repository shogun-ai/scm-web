import { useState, useEffect } from 'react';
import './index.css';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('loan_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('loan_user')); } catch { return null; }
  });

  function handleLogin(t, u) {
    setToken(t);
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem('loan_token');
    localStorage.removeItem('loan_user');
    setToken(null);
    setUser(null);
  }

  if (!token || !user) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

export default App;
