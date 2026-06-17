import { useEffect, useState } from 'react';
import { getPortfolio, getSummary, getAccountBalances, getNpl, accrueInterest, getFinancialStatement, fmt, fmtDate, statusBadge, statusLabel } from '../api';
import { COA, BALANCE_GROUPS, INCOME_GROUPS } from '../chartOfAccounts';
import { AlertTriangle, TrendingUp, Download, Scale, BarChart3, ShieldAlert, Zap, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';

export default function Reports() {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [balData, setBalData]     = useState({ balances: {}, uncoded: 0 });
  const [npl, setNpl]             = useState(null);
  const [stmt, setStmt]           = useState(null);
  const [month, setMonth]         = useState(new Date().toISOString().slice(0, 7));
  const [balStart, setBalStart]   = useState('');
  const [balEnd, setBalEnd]       = useState('');
  const [tab, setTab]             = useState('balance');
  const [loading, setLoading]     = useState(true);
  const [accruing, setAccruing]   = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([getPortfolio(), getSummary({ month })]);
    setPortfolio(p); setSummary(s);
    setLoading(false);
  };

  const loadBalances = async () => {
    const d = await getAccountBalances({ startDate: balStart || undefined, endDate: balEnd || undefined });
    setBalData(d);
  };

  useEffect(() => { load(); }, [month]);
  useEffect(() => { loadBalances(); }, [balStart, balEnd]);
  useEffect(() => { if (tab === 'npl') getNpl().then(setNpl).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'finance') getFinancialStatement().then(setStmt).catch(() => {}); }, [tab]);

  const overdue = portfolio.filter(l => l.overdueAmount > 0).sort((a, b) => b.overdueAmount - a.overdueAmount);
  const active  = [...portfolio].sort((a, b) => b.remaining - a.remaining);

  const exportCsv = (rows, filename) => {
    const headers = Object.keys(rows[0] || {}).join(',');
    const lines = rows.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const blob = new Blob([headers + '\n' + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  // ─── Balance sheet / income statement renderer ───────────────────────────
  const bal = balData.balances;

  const sectionTotal = (codes) => codes.reduce((s, c) => s + (bal[c] || 0), 0);
  const groupTotal   = (group) => group.sections.reduce((s, sec) => s + sectionTotal(sec.codes), 0);

  const renderStatement = (groups, title, dateRange) => {
    const totals = groups.map(g => ({ key: g.key, label: g.label, total: groupTotal(g) }));
    const netIncome = totals.find(t => t.key === 'income')?.total - totals.find(t => t.key === 'expense')?.total;

    return (
      <div className="z-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            {dateRange && <p className="text-xs text-slate-400 mt-0.5">{dateRange}</p>}
          </div>
          {balData.uncoded > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
              <AlertTriangle size={13} className="text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700">{balData.uncoded} гүйлгээ кодгүй байна</span>
            </div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f6fb', borderBottom: '2px solid #cbd8e6' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', width: 70 }}>Данс</th>
              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Нэр</th>
              <th style={{ padding: '6px 14px', textAlign: 'right', width: 140 }}>Дүн /₮/</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const gTotal = groupTotal(group);
              return (
                <>
                  {/* Group header */}
                  <tr key={group.key + '-head'} style={{ background: '#e8f0fb' }}>
                    <td colSpan={2} style={{ padding: '7px 10px', fontWeight: 700, fontSize: 12, color: '#1e3a5f', letterSpacing: '0.03em' }}>
                      {group.label}
                    </td>
                    <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, color: '#1e3a5f' }}>
                      {fmt(Math.round(gTotal))}
                    </td>
                  </tr>

                  {group.sections.map(sec => {
                    const secRows = sec.codes.filter(c => bal[c] !== undefined && bal[c] !== 0);
                    if (secRows.length === 0) return null;
                    const secTotal = sectionTotal(sec.codes);
                    return (
                      <>
                        {/* Section header */}
                        <tr key={sec.label} style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                          <td colSpan={2} style={{ padding: '5px 10px 3px 18px', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            {sec.label}
                          </td>
                          <td style={{ padding: '5px 14px 3px', textAlign: 'right', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {fmt(Math.round(secTotal))}
                          </td>
                        </tr>
                        {/* Account rows */}
                        {secRows.map(code => (
                          <tr key={code} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '3px 10px 3px 28px', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{code}</td>
                            <td style={{ padding: '3px 6px', color: '#334155', fontSize: 11 }}>{COA[code] || code}</td>
                            <td style={{ padding: '3px 14px', textAlign: 'right', fontWeight: 500 }}>
                              {fmt(Math.round(bal[code]))}
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </>
              );
            })}

            {/* Net income row for income statement */}
            {netIncome !== undefined && (
              <tr style={{ borderTop: '2px solid #cbd8e6', background: netIncome >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 13, color: netIncome >= 0 ? '#166534' : '#991b1b' }}>
                  ЦЭВЭР АШИГ (АЛДАГДАЛ)
                </td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, fontSize: 13, color: netIncome >= 0 ? '#166534' : '#991b1b' }}>
                  {fmt(Math.round(netIncome))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    const assets = groupTotal(BALANCE_GROUPS[0]);
    const liabilities = groupTotal(BALANCE_GROUPS[1]);
    const equity = groupTotal(BALANCE_GROUPS[2]);
    const check = assets - liabilities - equity;
    return (
      <div className="flex flex-col gap-4">
        {renderStatement(BALANCE_GROUPS, 'Баланс (Активын тайлан)', balStart || balEnd ? `${balStart || '...'} — ${balEnd || '...'}` : 'Нийт бүх гүйлгээ')}
        {/* Balance check */}
        <div className={`z-card flex items-center gap-3 ${Math.abs(check) < 1 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <Scale size={18} className={Math.abs(check) < 1 ? 'text-green-600' : 'text-yellow-600'} />
          <div className="text-sm">
            <span className="font-bold">Баланс шалгалт: </span>
            <span>Нийт хөрөнгө <b>{fmt(Math.round(assets))}</b> = Өр төлбөр <b>{fmt(Math.round(liabilities))}</b> + Өөрийн хөрөнгө <b>{fmt(Math.round(equity))}</b></span>
            {Math.abs(check) >= 1 && <span className="text-yellow-700 font-semibold"> · Зөрүү: {fmt(Math.round(check))} (кодгүй гүйлгээ байгаа байж магадгүй)</span>}
            {Math.abs(check) < 1 && <span className="text-green-700 font-semibold"> ✓</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderIncomeStatement = () =>
    renderStatement(INCOME_GROUPS, 'Орлого, зардлын тайлан', balStart || balEnd ? `${balStart || '...'} — ${balEnd || '...'}` : 'Нийт бүх гүйлгээ');

  if (loading) return <div className="text-slate-400 text-sm font-semibold p-4">Уншиж байна...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Date filter for financial statements */}
      {(tab === 'balance' || tab === 'income') && (
        <div className="z-card flex flex-wrap items-end gap-3">
          <div>
            <label className="z-label">Эхлэх огноо</label>
            <input className="z-input" type="date" value={balStart} onChange={e => setBalStart(e.target.value)} style={{ width: 150 }} />
          </div>
          <div>
            <label className="z-label">Дуусах огноо</label>
            <input className="z-input" type="date" value={balEnd} onChange={e => setBalEnd(e.target.value)} style={{ width: 150 }} />
          </div>
          {(balStart || balEnd) && (
            <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => { setBalStart(''); setBalEnd(''); }}>
              Шүүлт арилгах
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button className={`z-btn z-btn-sm ${tab === 'balance' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('balance')}>
          <Scale size={13} /> Баланс
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'income' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('income')}>
          <BarChart3 size={13} /> Орлогын тайлан
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'overdue' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('overdue')}>
          <AlertTriangle size={13} /> Хугацаа хэтэрсэн ({overdue.length})
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'portfolio' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('portfolio')}>
          <TrendingUp size={13} /> Портфель ({active.length})
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'summary' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('summary')}>
          Хураангуй
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'npl' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('npl')}>
          <ShieldAlert size={13} /> NPL / Нөөц
        </button>
        <button className={`z-btn z-btn-sm ${tab === 'finance' ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setTab('finance')}>
          <ArrowDownLeft size={13} /> Санхүүжилт
        </button>
      </div>

      {/* ── БАЛАНС ── */}
      {tab === 'balance' && renderBalanceSheet()}

      {/* ── ОРЛОГЫН ТАЙЛАН ── */}
      {tab === 'income' && renderIncomeStatement()}

      {/* ── ХУРААНГУЙ ── */}
      {tab === 'summary' && (
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
      )}

      {/* ── ХУГАЦАА ХЭТЭРСЭН ── */}
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

      {/* ── ПОРТФЕЛЬ ── */}
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
      {/* ── NPL / НӨӨЦ ── */}
      {tab === 'npl' && (
        <div className="flex flex-col gap-4">
          {/* Accrual button */}
          <div className="z-card flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-slate-700 text-sm">Хүүгийн хуримтлал (Accrual)</p>
              <p className="text-xs text-slate-400 mt-0.5">Өнөөдрийн хүүг тооцоолж дансны бичилт үүсгэнэ (dt 1,270 / ct 4,140 зээлийн хүү · dt 5,121 / ct 2,024 зардал)</p>
            </div>
            <button className="z-btn z-btn-primary" disabled={accruing} onClick={async () => {
              setAccruing(true);
              try {
                const r = await accrueInterest(new Date().toISOString().slice(0, 10));
                alert(`${r.created} бичилт үүслээ (${r.date})`);
              } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
              finally { setAccruing(false); }
            }}>
              <Zap size={14} /> {accruing ? 'Тооцоолж байна...' : 'Өнөөдрийн хүү хуримтлуулах'}
            </button>
          </div>

          {!npl ? (
            <div className="text-slate-400 text-sm font-semibold p-4">Уншиж байна...</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Нийт зээлийн портфель"  value={`${fmt(npl.summary.totalPortfolio)} ₮`}   color="blue" />
                <StatCard label="NPL дүн (90+ хоног)"    value={`${fmt(npl.summary.nplAmount)} ₮`}         color="red" />
                <StatCard label="NPL харьцаа"            value={`${npl.summary.nplRatio}%`}                color={npl.summary.nplRatio > 5 ? 'red' : 'green'} />
                <StatCard label="Шаардлагатай нөөц"      value={`${fmt(npl.summary.totalProvision)} ₮`}    color="yellow" />
              </div>

              {/* Bucket summary */}
              <div className="z-card">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Зэрэглэлийн хураангуй (ББСБ-ийн стандарт)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f6fb', borderBottom: '2px solid #cbd8e6' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Зэрэглэл</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Хугацаа (хоног)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Нөөцийн хувь</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Гэрээний тоо</th>
                      <th style={{ padding: '6px 14px', textAlign: 'right' }}>Үлдэгдэл</th>
                      <th style={{ padding: '6px 14px', textAlign: 'right' }}>Шаардлагатай нөөц</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'current',     label: 'Хэвийн',           days: '0',     rate: '1%',   color: '#f0fdf4', textColor: '#166534' },
                      { key: 'watch',       label: 'Анхаарал',          days: '1-30',  rate: '5%',   color: '#fefce8', textColor: '#713f12' },
                      { key: 'substandard', label: 'Хэвийн бус',        days: '31-60', rate: '25%',  color: '#fff7ed', textColor: '#9a3412' },
                      { key: 'doubtful',    label: 'Эргэлзэлтэй',       days: '61-90', rate: '50%',  color: '#fef2f2', textColor: '#991b1b' },
                      { key: 'loss',        label: 'Муу зээл',          days: '90+',   rate: '100%', color: '#fef2f2', textColor: '#7f1d1d' },
                    ].map(b => (
                      <tr key={b.key} style={{ borderTop: '1px solid #e2e8f0', background: b.color }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: b.textColor }}>{b.label}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{b.days}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: b.textColor }}>{b.rate}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{npl.summary.bucketCounts[b.key] || 0}</td>
                        <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 600 }}>{fmt(npl.summary.bucketTotals[b.key] || 0)} ₮</td>
                        <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: b.textColor }}>{fmt(npl.summary.bucketProvisions[b.key] || 0)} ₮</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #cbd8e6', background: '#f8fafc' }}>
                      <td colSpan={3} style={{ padding: '7px 10px', fontWeight: 700 }}>НИЙТ</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>
                        {Object.values(npl.summary.bucketCounts).reduce((s, v) => s + v, 0)}
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700 }}>{fmt(npl.summary.totalPortfolio)} ₮</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{fmt(npl.summary.totalProvision)} ₮</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* NPL detail — doubtful + loss only */}
              {[...npl.buckets.doubtful, ...npl.buckets.loss].length > 0 && (
                <div className="z-card">
                  <h3 className="font-bold text-slate-800 mb-3 text-sm">NPL задаргаа (эргэлзэлтэй + муу зээл)</h3>
                  <div className="z-table-wrap">
                    <table className="z-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr><th>Гэрээ №</th><th>Харилцагч</th><th>Хоног</th><th className="text-right">Үлдэгдэл</th><th className="text-right">Хэтрэлт</th><th className="text-right">Нөөц (%)</th><th className="text-right">Нөөц дүн</th></tr>
                      </thead>
                      <tbody>
                        {[...npl.buckets.doubtful, ...npl.buckets.loss].sort((a, b) => b.overdueDays - a.overdueDays).map(l => (
                          <tr key={l._id} style={{ borderTop: '1px solid #e2e8f0', background: l.bucket === 'loss' ? '#fef2f2' : '#fff7ed' }}>
                            <td className="font-bold text-blue-700">{l.contractNumber}</td>
                            <td>{l.client?.firstname || l.client?.orgName} {l.client?.lastname || ''}</td>
                            <td className="font-bold text-red-700 text-center">{l.overdueDays}</td>
                            <td className="text-right font-semibold">{fmt(l.remaining)} ₮</td>
                            <td className="text-right text-red-600">{fmt(l.overdueAmount)} ₮</td>
                            <td className="text-right text-red-700 font-bold">{l.provisionRate}%</td>
                            <td className="text-right font-bold text-red-800">{fmt(l.provision)} ₮</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* ── САНХҮҮЖИЛТ ── */}
      {tab === 'finance' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => getFinancialStatement().then(setStmt)}>
              <RefreshCw size={13}/> Шинэчлэх
            </button>
          </div>
          {!stmt ? <div className="text-slate-400 text-sm p-4">Уншиж байна...</div> : (
            <>
              {/* Funding summary */}
              <div className="z-card">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <ArrowDownLeft size={14} className="text-blue-600"/> Эх үүсвэр (Авсан зээл)
                  <span className="text-xs font-normal text-slate-400">ct = 2,021 / 2,020</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Нийт авсан"        value={`${fmt(stmt.funding.received)} ₮`}      color="blue" />
                  <StatCard label="Үндсэн буцаасан"   value={`${fmt(stmt.funding.principalPaid)} ₮`} color="green" />
                  <StatCard label="Хүүгийн зардал"    value={`${fmt(stmt.funding.interestPaid)} ₮`}  color="yellow" />
                  <StatCard label="Одоогийн үлдэгдэл" value={`${fmt(stmt.funding.outstanding)} ₮`}   color="red" />
                </div>
              </div>

              {/* Loans summary */}
              <div className="z-card">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-green-600"/> Олгосон зээл (Активууд)
                  <span className="text-xs font-normal text-slate-400">ct = 1,708 · dt = 1,210 / 1,270</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Нийт олгосон"    value={`${fmt(stmt.loans.disbursed)} ₮`}     color="blue" />
                  <StatCard label="Эргэн төлөлт"    value={`${fmt(stmt.loans.collected)} ₮`}     color="green" />
                  <StatCard label="Хүүгийн орлого"  value={`${fmt(stmt.loans.interestIncome)} ₮`} color="yellow" />
                </div>
              </div>

              {/* Net spread */}
              <div className="z-card border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-700 text-sm mb-3">Спред шинжилгээ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-white border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Хүүгийн орлого</p>
                    <p className="text-xl font-bold text-green-700">{fmt(stmt.loans.interestIncome)} ₮</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Хүүгийн зардал</p>
                    <p className="text-xl font-bold text-red-700">{fmt(stmt.funding.interestPaid)} ₮</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg border ${stmt.loans.interestIncome - stmt.funding.interestPaid >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-slate-500 mb-1">Цэвэр хүүгийн орлого (NII)</p>
                    <p className={`text-xl font-bold ${stmt.loans.interestIncome - stmt.funding.interestPaid >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {fmt(stmt.loans.interestIncome - stmt.funding.interestPaid)} ₮
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="z-card">
                  <h4 className="font-semibold text-slate-700 text-xs mb-2">Сүүлийн авсан зээлүүд</h4>
                  <table className="z-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>Огноо</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                    <tbody>
                      {stmt.funding.recentReceived.length === 0 && <tr><td colSpan={3} className="text-slate-400 text-center py-4">—</td></tr>}
                      {stmt.funding.recentReceived.map(tx => (
                        <tr key={tx._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '3px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDate(tx.date)}</td>
                          <td style={{ padding: '3px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(tx.amount)} ₮</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="z-card">
                  <h4 className="font-semibold text-slate-700 text-xs mb-2">Сүүлийн олгосон зээлүүд</h4>
                  <table className="z-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>Огноо</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                    <tbody>
                      {stmt.loans.recentDisbursed.length === 0 && <tr><td colSpan={3} className="text-slate-400 text-center py-4">—</td></tr>}
                      {stmt.loans.recentDisbursed.map(tx => (
                        <tr key={tx._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '3px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDate(tx.date)}</td>
                          <td style={{ padding: '3px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(tx.amount)} ₮</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
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
