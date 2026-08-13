import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Car, FileText, CreditCard, BarChart3, ArrowLeftRight, Database, LogOut, Menu, TrendingDown, Shield, Settings, Inbox, UserCog } from 'lucide-react';
import { getPublicConfig } from '../api';
import Dashboard from './Dashboard';
import Clients from './Clients';
import Cars from './Cars';
import Leases from './Leases';
import Payments from './Payments';
import Reports from './Reports';
import Transactions from './Transactions';
import Funding from './Funding';
import Collateral from './Collateral';
import Data from './Data';
import WebAdmin from './WebAdmin';
import LoanRequests from './LoanRequests';
import UserAdmin from './UserAdmin';

const NAV = [
  { id: 'dashboard', label: 'Нүүр', icon: LayoutDashboard },
  { id: 'requests', label: 'Веб хүсэлт', icon: Inbox },
  { id: 'clients', label: 'Харилцагч', icon: Users },
  { id: 'leases', label: 'Шуурхай зээл', icon: FileText },
  { id: 'collateral', label: 'Барьцаа', icon: Shield },
  { id: 'payments', label: 'Төлөлт', icon: CreditCard },
  { id: 'transactions', label: 'Гүйлгээ', icon: ArrowLeftRight },
  { id: 'reports', label: 'Тайлан', icon: BarChart3 },
  { id: 'cars', label: 'Машин', icon: Car },
  { id: 'funding', label: 'Эх үүсвэр', icon: TrendingDown },
  { id: 'data', label: 'Дата', icon: Database },
  { id: 'webadmin', label: 'Веб админ', icon: Settings },
  { id: 'users', label: 'Хэрэглэгч/лог', icon: UserCog },
];

function ShellBrand({ config }) {
  const brand = config?.brandName || 'Zentro Prime';
  return <div className="z-brand"><div className={`z-brand-icon ${config?.logoUrl ? 'has-logo' : ''}`}>{config?.logoUrl ? <img src={config.logoUrl} alt={brand} /> : 'Z'}</div><div><p className="text-sm font-bold text-slate-900">{brand}</p><p className="text-xs text-slate-500">Ломбард ERP</p></div></div>;
}

export default function Shell({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [config, setConfig] = useState(null);
  useEffect(() => { getPublicConfig().then(setConfig).catch(() => {}); }, []);
  const pages = { dashboard: Dashboard, requests: LoanRequests, clients: Clients, cars: Cars, leases: Leases, payments: Payments, transactions: Transactions, reports: Reports, funding: Funding, collateral: Collateral, data: Data, webadmin: WebAdmin, users: UserAdmin };
  const Page = pages[page] || Dashboard;

  const NavButtons = () => NAV.map(({ id, label, icon: Icon }) => (
    <button key={id} className={`z-nav-item ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setMobileOpen(false); }}>
      <Icon size={16} /> {label}
    </button>
  ));

  return (
    <div className="z-shell">
      <aside className="z-sidebar hidden md:flex">
        <ShellBrand config={config} />
        <nav className="flex flex-col gap-1 flex-1"><NavButtons /></nav>
        <button className="z-nav-item text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onLogout}><LogOut size={16} /> Гарах</button>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} /><aside className="relative w-64 bg-white flex flex-col p-3 shadow-2xl overflow-y-auto"><ShellBrand config={config} /><NavButtons /><button className="z-nav-item text-red-500" onClick={onLogout}><LogOut size={16} /> Гарах</button></aside></div>}
      <div className="z-main">
        <header className="z-topbar"><div className="flex items-center gap-3"><button className="md:hidden z-btn z-btn-secondary z-btn-sm" onClick={() => setMobileOpen(true)}><Menu size={16} /></button><p className="font-bold text-slate-700 text-sm">{NAV.find(n => n.id === page)?.label}</p></div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500 hidden sm:block">{user?.name || user?.email}</span><a className="z-btn z-btn-secondary z-btn-sm" href="/" target="_blank" rel="noreferrer">Веб</a><button className="z-btn z-btn-secondary z-btn-sm" onClick={onLogout}><LogOut size={13} /> Гарах</button></div></header>
        <main className="z-content"><Page onNavigate={setPage} /></main>
      </div>
    </div>
  );
}
