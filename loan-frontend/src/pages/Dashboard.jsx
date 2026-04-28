import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, authHeaders } from '../api';
import LoanOrigination from '../LoanOrigination';
import LoanExposureMonitor from '../LoanExposureMonitor';
import PermissionMatrix from '../PermissionMatrix';
import { LayoutDashboard, CreditCard, Shield, LogOut, Activity } from 'lucide-react';

const TABS = [
  { key: 'los',      label: 'Зээлийн систем',   icon: CreditCard      },
  { key: 'exposure', label: 'Эрсдэлийн мониторинг', icon: Activity    },
  { key: 'roles',    label: 'Эрх удирдлага',    icon: Shield           },
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white flex items-center justify-between px-6 py-3 shadow">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg tracking-wide">SCM Зээлийн систем</span>
          <span className="text-xs text-gray-400 ml-2">loan.scm.mn</span>
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
      <nav className="bg-white border-b flex gap-1 px-6 shadow-sm">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
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
        {tab === 'exposure' && (
          <LoanExposureMonitor apiUrl={API} token={token} user={user} />
        )}
        {tab === 'roles' && (
          <PermissionMatrix apiUrl={API} token={token} user={user} />
        )}
      </main>
    </div>
  );
}
