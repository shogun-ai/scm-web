import { useEffect, useState } from 'react';
import axios from 'axios';
import { API, authHeaders } from '../api';
import LoanOrigination from '../LoanOrigination';
import {
  BarChart3,
  CreditCard,
  Languages,
  LayoutGrid,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';

const UI_TEXT = {
  mn: {
    appName: 'Зээлийн систем',
    loanRequests: 'Зээлийн хүсэлтүүд',
    exposureMonitor: 'Эрсдэлийн хяналт',
    dashboard: 'Хянах самбар',
    logout: 'Гарах',
    language: 'Хэл',
    theme: 'Горим',
    dark: 'Dark',
    light: 'Light',
  },
  en: {
    appName: 'Loan system',
    loanRequests: 'Loan requests',
    exposureMonitor: 'Exposure monitor',
    dashboard: 'Dashboard',
    logout: 'Logout',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
  },
};

export default function Dashboard({ token, user, onLogout }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('loan_language') || 'mn');
  const [theme, setTheme] = useState(() => localStorage.getItem('loan_theme') || 'dark');
  const [navigationView, setNavigationView] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const text = UI_TEXT[language] || UI_TEXT.mn;
  const isDark = theme === 'dark';

  const sidebarItems = [
    { key: 'requests', label: text.loanRequests, icon: CreditCard },
    { key: 'exposure', label: text.exposureMonitor, icon: BarChart3 },
  ];

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

  useEffect(() => {
    localStorage.setItem('loan_theme', theme);
  }, [theme]);

  return (
    <div className={`loan-shell min-h-screen ${isDark ? 'loan-dark' : 'loan-light'}`}>
      <aside className="loan-sidebar">
        <div className="loan-brand">
          <img src="/logo.png" alt="SCM Logo" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">loan.scm.mn</p>
            <p className="text-sm font-black text-slate-100">{text.appName}</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{text.dashboard}</p>
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const active = navigationView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setNavigationView(item.key)}
                className={`loan-sidebar-item ${active ? 'is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="loan-main">
        <header className="loan-topbar">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <LayoutGrid size={17} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{text.appName}</p>
              <p className="text-sm font-black text-slate-100">
                {navigationView === 'exposure' ? text.exposureMonitor : text.loanRequests}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="loan-top-control"
              title={text.theme}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {isDark ? text.dark : text.light}
            </button>

            <div className="loan-lang-control">
              <Languages className="w-4 h-4 text-slate-400" />
              {['mn', 'en'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? 'is-active' : ''}
                  title={text.language}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <span className="hidden text-sm font-bold text-slate-300 md:inline">{user?.name}</span>
            <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-black text-slate-950">{user?.role}</span>
            <button onClick={onLogout} className="loan-logout">
              <LogOut className="w-4 h-4" /> {text.logout}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[1440px]">
            <LoanOrigination
              apiUrl={API}
              user={user}
              requests={requests}
              onRequestsChange={loadRequests}
              usersList={usersList}
              language={language}
              theme={theme}
              navigationView={navigationView}
              onNavigationViewChange={setNavigationView}
              showApplicationSwitch={false}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
