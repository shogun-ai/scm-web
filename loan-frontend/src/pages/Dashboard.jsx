import { useEffect, useState } from 'react';
import axios from 'axios';
import { API, authHeaders } from '../api';
import LoanOrigination from '../LoanOrigination';
import LoanResearch from '../LoanResearch';
import {
  BarChart3,
  CreditCard,
  FileText,
  Languages,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from 'lucide-react';

const UI_TEXT = {
  mn: {
    appName: 'Зээлийн систем',
    loanRequests: 'Зээлийн хүсэлтүүд',
    documentAnalysis: 'Баримт AI уншилт',
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
    documentAnalysis: 'Document AI reader',
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
  const [theme, setTheme] = useState(() => localStorage.getItem('loan_theme_v2') || 'light');
  const [navigationView, setNavigationView] = useState('requests');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [permissionMap, setPermissionMap] = useState({});
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const text = UI_TEXT[language] || UI_TEXT.mn;
  const isDark = theme === 'dark';

  const sidebarItems = [
    { key: 'requests', label: text.loanRequests, icon: CreditCard },
    { key: 'documentAnalysis', label: text.documentAnalysis, icon: FileText },
    { key: 'exposure', label: text.exposureMonitor, icon: BarChart3 },
  ];

  async function loadRequests() {
    const effectiveToken = token || localStorage.getItem('loan_token') || '';
    if (!effectiveToken) {
      setRequestsError('Нэвтрэх token олдсонгүй. Дахин нэвтэрнэ үү.');
      return;
    }
    setRequestsLoading(true);
    setRequestsError('');
    try {
      const res = await axios.get(`${API}/api/loans`, authHeaders(effectiveToken));
      const nextRequests = Array.isArray(res.data) ? res.data : [];
      setRequests(nextRequests);
      if (nextRequests.length > 0) {
        localStorage.setItem('loan_requests_cache', JSON.stringify(nextRequests));
      }
    } catch (error) {
      const cached = (() => {
        try { return JSON.parse(localStorage.getItem('loan_requests_cache') || '[]'); } catch { return []; }
      })();
      if (Array.isArray(cached) && cached.length > 0) setRequests(cached);
      const status = error.response?.status;
      const detail = error.response?.data?.message || error.response?.data || error.message || 'API алдаа';
      setRequestsError(`Зээлийн хүсэлтүүдийг татаж чадсангүй${status ? ` (${status})` : ''}: ${detail}`);
      if (status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadUsers() {
    const effectiveToken = token || localStorage.getItem('loan_token') || '';
    if (!effectiveToken) return;
    try {
      const res = await axios.get(`${API}/api/users`, authHeaders(effectiveToken));
      setUsersList(res.data || []);
    } catch {}
  }

  async function loadPermissions() {
    const effectiveToken = token || localStorage.getItem('loan_token') || '';
    if (!effectiveToken) return;
    try {
      const res = await axios.get(`${API}/api/config/permissions`, authHeaders(effectiveToken));
      setPermissionMap(res.data || {});
    } catch {}
  }

  useEffect(() => {
    loadRequests();
    loadUsers();
    loadPermissions();
  }, [token]);

  useEffect(() => {
    localStorage.setItem('loan_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('loan_theme_v2', theme);
  }, [theme]);

  return (
    <div className={`loan-shell min-h-screen ${isDark ? 'loan-dark' : 'loan-light'} ${sidebarOpen ? '' : 'loan-sidebar-collapsed'}`}>
      <aside className="loan-sidebar">
        <div className="loan-brand">
          <div className="loan-brand-mark"><img src="/logo.png" alt="SCM Logo" className="h-8 w-8 object-contain" /></div>
          <div className="loan-brand-copy">
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
                onClick={() => {
                  setNavigationView(item.key);
                  if (window.innerWidth < 900) setSidebarOpen(false);
                }}
                className={`loan-sidebar-item ${active ? 'is-active' : ''}`}
                title={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="loan-sidebar-footer">
          <div className="loan-user-avatar">{(user?.name || user?.email || 'S').slice(0, 1).toUpperCase()}</div>
          <div className="loan-user-summary"><p>{user?.name || user?.email || 'SCM user'}</p><span>{user?.role || 'User'}</span></div>
        </div>
      </aside>

      <div className="loan-main">
        <header className="loan-topbar">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(open => !open)} className="loan-icon-control" title={sidebarOpen ? 'Цэс хураах' : 'Цэс нээх'}>
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <LayoutGrid size={17} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{text.appName}</p>
              <p className="text-sm font-black text-slate-100">
                {navigationView === 'exposure'
                  ? text.exposureMonitor
                  : navigationView === 'documentAnalysis'
                    ? text.documentAnalysis
                    : text.loanRequests}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="loan-top-control"
              title={text.theme}
              aria-label={text.theme}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
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

            <span className="hidden text-sm font-bold text-slate-300 xl:inline">{user?.name}</span>
            <span className="hidden rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-black text-slate-950 lg:inline">{user?.role}</span>
            <button onClick={onLogout} className="loan-logout" title={text.logout} aria-label={text.logout}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[1440px]">
            {navigationView !== 'documentAnalysis' && (requestsError || requestsLoading) && (
              <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                requestsError ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}>
                <span>{requestsLoading ? 'Зээлийн хүсэлтүүдийг уншиж байна...' : requestsError}</span>
                <button
                  type="button"
                  onClick={loadRequests}
                  disabled={requestsLoading}
                  className="rounded-xl border border-current bg-white/70 px-3 py-1.5 text-xs font-black disabled:opacity-60"
                >
                  Дахин ачаалах
                </button>
              </div>
            )}
            {navigationView === 'documentAnalysis' ? (
              <LoanResearch apiUrl={API} documentOnly />
            ) : (
              <LoanOrigination
                apiUrl={API}
                user={user}
                requests={requests}
                onRequestsChange={loadRequests}
                usersList={usersList}
                permissionMap={permissionMap}
                language={language}
                theme={theme}
                navigationView={navigationView}
                onNavigationViewChange={setNavigationView}
                showApplicationSwitch={false}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
