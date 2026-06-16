import { useState } from 'react';
import { LayoutDashboard, Users, Car, FileText, CreditCard, BarChart3, LogOut, Menu, X } from 'lucide-react';
import Dashboard from './Dashboard';
import Clients from './Clients';
import Cars from './Cars';
import Leases from './Leases';
import Payments from './Payments';
import Reports from './Reports';

const NAV = [
  { id: 'dashboard', label: 'Нүүр', icon: LayoutDashboard },
  { id: 'clients',   label: 'Харилцагч', icon: Users },
  { id: 'cars',      label: 'Машин', icon: Car },
  { id: 'leases',    label: 'Лизинг', icon: FileText },
  { id: 'payments',  label: 'Төлөлт', icon: CreditCard },
  { id: 'reports',   label: 'Тайлан', icon: BarChart3 },
];

export default function Shell({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const pages = { dashboard: Dashboard, clients: Clients, cars: Cars, leases: Leases, payments: Payments, reports: Reports };
  const Page = pages[page];

  return (
    <div className="z-shell">
      {/* Sidebar */}
      <aside className="z-sidebar hidden md:flex">
        <div className="z-brand">
          <div className="z-brand-icon">Z</div>
          <div>
            <p className="text-sm font-bold text-slate-800">Zentro</p>
            <p className="text-xs text-slate-500">Машины лизинг</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`z-nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <button className="z-nav-item text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onLogout}>
          <LogOut size={16} /> Гарах
        </button>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-white flex flex-col p-3 shadow-2xl">
            <div className="z-brand mb-2">
              <div className="z-brand-icon">Z</div>
              <div><p className="text-sm font-bold">Zentro</p></div>
            </div>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`z-nav-item ${page === id ? 'active' : ''}`}
                onClick={() => { setPage(id); setMobileOpen(false); }}>
                <Icon size={16} /> {label}
              </button>
            ))}
            <button className="z-nav-item text-red-500" onClick={onLogout}><LogOut size={16} /> Гарах</button>
          </aside>
        </div>
      )}

      <div className="z-main">
        <header className="z-topbar">
          <div className="flex items-center gap-3">
            <button className="md:hidden z-btn z-btn-secondary z-btn-sm" onClick={() => setMobileOpen(true)}>
              <Menu size={16} />
            </button>
            <p className="font-bold text-slate-700 text-sm">{NAV.find(n => n.id === page)?.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:block">{user?.name || user?.email}</span>
            <button className="z-btn z-btn-secondary z-btn-sm" onClick={onLogout}>
              <LogOut size={13} /> Гарах
            </button>
          </div>
        </header>
        <main className="z-content">
          <Page onNavigate={setPage} />
        </main>
      </div>
    </div>
  );
}
