import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, authHeaders } from '../api';
import LoanOrigination from '../LoanOrigination';
import { CreditCard, Languages, LogOut } from 'lucide-react';


const TABS = [
  { key: 'los', labelKey: 'loanSystem', icon: CreditCard },
];

const UI_TEXT = {
  mn: {
    loanSystem: 'Зээлийн систем',
    logout: 'Гарах',
    language: 'Хэл',
  },
  en: {
    loanSystem: 'Loan system',
    logout: 'Logout',
    language: 'Language',
  },
};

export default function Dashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState('los');
  const [language, setLanguage] = useState(() => localStorage.getItem('loan_language') || 'mn');
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const text = UI_TEXT[language] || UI_TEXT.mn;

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

  useEffect(() => {
    localStorage.setItem('loan_language', language);
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2744 100%)' }}>
      {/* Header */}
      <header className="text-white flex items-center justify-between px-6 py-3 shadow-xl border-b border-white/10" style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3">
          <img src='/logo.png' alt="SCM Logo" className="h-8 object-contain" style={{ mixBlendMode: 'multiply' }} />
          <span className="text-xs text-slate-500 ml-2 border-l border-slate-700 pl-3">loan.scm.mn</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            <Languages className="w-4 h-4 text-slate-400 ml-1" />
            {['mn', 'en'].map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  language === lang ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title={text.language}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-300">{user?.name}</span>
          <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded-full font-semibold">{user?.role}</span>
          <button onClick={onLogout} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition">
            <LogOut className="w-4 h-4" /> {text.logout}
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
            {text[t.labelKey]}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto w-full max-w-[1440px]">
          {tab === 'los' && (
            <LoanOrigination
              apiUrl={API}
              user={user}
              requests={requests}
              onRequestsChange={loadRequests}
              usersList={usersList}
              language={language}
            />
          )}
        </div>
      </main>
    </div>
  );
}
