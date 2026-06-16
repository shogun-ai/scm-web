import { useEffect, useState } from 'react';
import { getPortfolio, getSummary, fmt, fmtDate, statusBadge, statusLabel } from '../api';
import { AlertTriangle, TrendingUp, Download } from 'lucide-react';

export default function Reports() {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState('overdue');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([getPortfolio(), getSummary({ month })]);
    setPortfolio(p); setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [month]);

  const overdue = portfolio.filter(l => l.overdueAmount > 0).sort((a, b) => b.overdueAmount - a.overdueAmount);
  const active  = portfolio.sort((a, b) => b.remaining - a.remaining);

  const exportCsv = (rows, filename) => {
    const headers = Object.keys(rows[0] || {}).join(',');
    const lines = rows.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const blob = new Blob([headers + '\n' + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  if (loading) return <div className="text-slate-400 text-sm font-semibold">Уншиж байна...</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary stats */}
      <div className="z-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-slate-800">Хураангуй тайлан</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Сар:</span>
            <input className="z-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 160 }} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Нийт портфель" value={`${fmt(summary?.totalPortfolio)} ₮`} color="blue" />
          <StatCard label={`${month}-р сард орж ирсэн`} value={`${fmt(summary?.totalCollected)} ₮`} color="green" />
          <StatCard label="Хугацаа хэтэрсэн" value={summary?.overdueLeases || 0} color="red" />
          <StatCard label="Дууссан гэрээ" value={summary?.completedLeases || 0} color="gray" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`z-btn z-btn-sm ${tab === 'overdue' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('overdue')}>
          <AlertTriangle size={13} /> Хугацаа хэтэрсэн ({overdue.length})
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'portfolio' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('portfolio')}>
          <TrendingUp size={13} /> Нийт портфель ({active.length})
        </button>
      </div>

      {tab === 'overdue' && (
        <div className="z-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Хугацаа хэтэрсэн лизинг</h3>
            <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => exportCsv(overdue.map(l => ({
              'Гэрээ №': l.contractNumber,
              'Харилцагч': l.client?.firstname || l.client?.orgName,
              'Хугацаа хэтэрсэн дүн': l.overdueAmount,
              'Үлдэгдэл': l.remaining,
              'Хоног': l.overdueDays,
            })), 'overdue.csv')}>
              <Download size={13} /> CSV татах
            </button>
          </div>
          <div className="z-table-wrap">
            <table className="z-table">
              <thead>
                <tr><th>Гэрээ №</th><th>Харилцагч</th><th>Машин</th><th>Хугацаа хэтэрсэн дүн</th><th>Үлдэгдэл</th><th>Хоног</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {overdue.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">Хугацаа хэтэрсэн лизинг байхгүй</td></tr>}
                {overdue.map(l => (
                  <tr key={l._id} className={l.overdueDays > 90 ? 'bg-red-50' : l.overdueDays > 30 ? 'bg-yellow-50' : ''}>
                    <td className="font-bold text-blue-700">{l.contractNumber}</td>
                    <td>{l.client?.firstname || l.client?.orgName} {l.client?.lastname || ''}</td>
                    <td>{l.car?.make} {l.car?.model} <span className="font-mono text-xs text-slate-400">{l.car?.plateNumber}</span></td>
                    <td className="font-bold text-red-700">{fmt(l.overdueAmount)} ₮</td>
                    <td>{fmt(l.remaining)} ₮</td>
                    <td className={l.overdueDays > 90 ? 'font-bold text-red-700' : l.overdueDays > 30 ? 'text-yellow-700 font-semibold' : ''}>{l.overdueDays}</td>
                    <td><span className={statusBadge(l.status)}>{statusLabel[l.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="z-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Нийт лизингийн портфель</h3>
            <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => exportCsv(active.map(l => ({
              'Гэрээ №': l.contractNumber,
              'Харилцагч': l.client?.firstname || l.client?.orgName,
              'Сарын төлбөр': l.monthlyPayment,
              'Үлдэгдэл': l.remaining,
              'Статус': statusLabel[l.status] || l.status,
            })), 'portfolio.csv')}>
              <Download size={13} /> CSV татах
            </button>
          </div>
          <div className="z-table-wrap">
            <table className="z-table">
              <thead>
                <tr><th>Гэрээ №</th><th>Харилцагч</th><th>Машин</th><th>Сарын төлбөр</th><th>Үлдэгдэл</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {active.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">Өгөгдөл байхгүй</td></tr>}
                {active.map(l => (
                  <tr key={l._id}>
                    <td className="font-bold text-blue-700">{l.contractNumber}</td>
                    <td>{l.client?.firstname || l.client?.orgName} {l.client?.lastname || ''}</td>
                    <td>{l.car?.make} {l.car?.model} <span className="font-mono text-xs text-slate-400">{l.car?.plateNumber}</span></td>
                    <td>{fmt(l.monthlyPayment)} ₮</td>
                    <td className="font-semibold">{fmt(l.remaining)} ₮</td>
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

function StatCard({ label, value, color }) {
  const colors = { blue: 'border-blue-200 bg-blue-50', green: 'border-green-200 bg-green-50', red: 'border-red-200 bg-red-50', gray: 'border-slate-200 bg-slate-50' };
  const text = { blue: 'text-blue-800', green: 'text-green-800', red: 'text-red-700', gray: 'text-slate-700' };
  return (
    <div className={`border rounded-xl p-3 ${colors[color]}`}>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${text[color]}`}>{value}</p>
    </div>
  );
}
