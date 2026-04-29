import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, authHeaders } from '../api';
import LoanOrigination from '../LoanOrigination';
import PermissionMatrix from '../PermissionMatrix';
import { LayoutDashboard, CreditCard, Shield, LogOut } from 'lucide-react';
import logo from '../assets/hero.png';

const TABS = [
  { key: 'los',   label: 'Зээлийн систем', icon: CreditCard },
  { key: 'roles', label: 'Эрх удирдлага',  icon: Shield     },
];

export default function Dashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState('los');
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);

  async function loadRequests() {
    try {
      const res = await axios.get(`${API}/api/loans`, authHeaders(token));
      setRequests(res.data || []);
    } catch {}
  }

  async function loadUsers() {
    try {
      const res = await axios.get(`${API}/api/users`, authHeaders(token));
      setUsersList(res.data || []);
    } catch {}
  }

  useEffect(() => {
    loadRequests();
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2744 100%)' }}>
      {/* Header */}
      <header className="text-white flex items-center justify-between px-6 py-3 shadow-xl border-b border-white/10" style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="SCM Logo" className="h-8 object-contain" />
          <span className="text-xs text-slate-500 ml-2 border-l border-slate-700 pl-3">loan.scm.mn</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.name}</span>
          <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded-full font-semibold">{user?.role}</span>
          <button onClick={onLogout} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition">
            <LogOut className="w-4 h-4" /> Гарах
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 px-6 border-b border-white/10" style={{ background: 'rgba(15,23,42,0.8)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4">
        {tab === 'los' && (
          <LoanOrigination
            apiUrl={API}
            user={user}
            requests={requests}
            onRequestsChange={loadRequests}
            usersList={usersList}
          />
        )}
        {tab === 'roles' && (
          <PermissionMatrix apiUrl={API} token={token} user={user} />
        )}
      </main>
    </div>
  );
}
