import { useEffect, useState } from 'react';
import { getSummary, getLeases, fmt, fmtDate, statusBadge, statusLabel } from '../api';
import { TrendingUp, Users, Car, AlertTriangle } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSummary(), getLeases({ status: 'overdue' })])
      .then(([s, od]) => { setSummary(s); setOverdue(od); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm font-semibold p-6">Уншиж байна...</div>;

  const stats = [
    { label: 'Нийт лизинг', value: summary?.totalLeases || 0, sub: `Идэвхтэй: ${summary?.activeLeases || 0}`, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Хугацаа хэтэрсэн', value: summary?.overdueLeases || 0, sub: 'Шуурхай анхаарах', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Харилцагч', value: summary?.totalClients || 0, sub: `Машин: ${summary?.totalCars || 0}`, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Нийт портфель', value: `${fmt(summary?.totalPortfolio)} ₮`, sub: `Энэ сар: ${fmt(summary?.totalCollected)} ₮`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="z-stat flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs font-700 text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
              <p className="text-xs text-slate-400 font-semibold">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="z-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-bold text-slate-800">Хугацаа хэтэрсэн лизинг ({overdue.length})</h2>
          </div>
          <div className="z-table-wrap">
            <table className="z-table">
              <thead>
                <tr>
                  <th>Гэрээ №</th><th>Харилцагч</th><th>Машин</th><th>Сарын төлбөр</th><th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(l => (
                  <tr key={l._id} className="cursor-pointer" onClick={() => onNavigate('leases')}>
                    <td className="font-bold text-blue-700">{l.contractNumber}</td>
                    <td>{l.client?.firstname || l.client?.orgName} {l.client?.lastname || ''}</td>
                    <td>{l.car?.make} {l.car?.model} {l.car?.year}</td>
                    <td>{fmt(l.monthlyPayment)} ₮</td>
                    <td><span className={statusBadge(l.status)}>{statusLabel[l.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FileText(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
