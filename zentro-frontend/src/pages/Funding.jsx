import { useEffect, useState } from 'react';
import { getFunding, createFunding, updateFunding, deleteFunding,
         syncFunding, getFinancialStatement, fmt, fmtDate } from '../api';
import { Plus, Trash2, Pencil, X, Check, TrendingDown, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const EMPTY = { name: '', type: 'bank', amount: '', interestRate: '', startDate: '', endDate: '', balance: '', status: 'active', notes: '' };
const TYPE_LABEL   = { bank: 'Банк', investor: 'Хөрөнгө оруулагч', bond: 'Өрийн бичиг', other: 'Бусад' };
const STATUS_LABEL = { active: 'Идэвхтэй', paid: 'Төлөгдсөн', overdue: 'Хугацаа хэтэрсэн' };
const STATUS_COLOR = { active: 'z-badge-blue', paid: 'z-badge-green', overdue: 'z-badge-red' };

export default function Funding() {
  const [stmt, setStmt]   = useState(null);       // гүйлгээнд тулгуурласан тайлан
  const [records, setRecords] = useState([]);     // гараар + auto бүртгэл
  const [tab, setTab]     = useState('statement');
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stmtTab, setStmtTab] = useState('funding'); // funding | loans

  const loadStmt    = () => getFinancialStatement().then(setStmt).catch(() => {});
  const loadRecords = () => getFunding().then(setRecords).catch(() => {});

  useEffect(() => { loadStmt(); loadRecords(); }, []);

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await syncFunding();
      alert(`${r.created} шинэ эх үүсвэр бүртгэгдлээ (нийт ${r.total} гүйлгээ шалгагдлаа)`);
      loadRecords();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSyncing(false); }
  };

  const openNew  = () => { setForm(EMPTY); setModal('new'); };
  const openEdit = (row) => {
    setForm({ ...row, startDate: row.startDate?.slice(0,10)||'', endDate: row.endDate?.slice(0,10)||'' });
    setModal(row);
  };
  const save = async () => {
    setSaving(true);
    try {
      const data = { ...form, amount: +form.amount||0, interestRate: +form.interestRate||0, balance: +form.balance||0 };
      if (modal === 'new') setRecords(p => [await createFunding(data), ...p]);
      else { const u = await updateFunding(modal._id, data); setRecords(p => p.map(r => r._id === u._id ? u : r)); }
      setModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!confirm('Устгах уу?')) return;
    await deleteFunding(id);
    setRecords(p => p.filter(r => r._id !== id));
  };

  const f = stmt?.funding;
  const l = stmt?.loans;

  const TxRow = ({ tx }) => (
    <tr style={{ borderTop: '1px solid #f1f5f9', fontSize: 11 }}>
      <td style={{ padding: '3px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDate(tx.date)}</td>
      <td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 10, color: '#2563eb' }}>dt:{tx.dt} / ct:{tx.ct}</td>
      <td style={{ padding: '3px 8px', color: '#334155', maxWidth: 280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</td>
      <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(tx.amount)} ₮</td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button className={`z-btn z-btn-sm ${tab==='statement'?'z-btn-primary':'z-btn-secondary'}`} onClick={()=>setTab('statement')}>
          <TrendingDown size={13}/> Гүйлгээний тайлан
        </button>
        <button className={`z-btn z-btn-sm ${tab==='records'?'z-btn-primary':'z-btn-secondary'}`} onClick={()=>setTab('records')}>
          Бүртгэл ({records.length})
        </button>
      </div>

      {/* ── ГҮЙЛГЭЭНИЙ ТАЙЛАН ── */}
      {tab === 'statement' && (
        <div className="flex flex-col gap-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button className={`z-btn z-btn-sm ${stmtTab==='funding'?'z-btn-primary':'z-btn-secondary'}`} onClick={()=>setStmtTab('funding')}>
              <ArrowDownLeft size={13}/> Авсан зээл (эх үүсвэр)
            </button>
            <button className={`z-btn z-btn-sm ${stmtTab==='loans'?'z-btn-primary':'z-btn-secondary'}`} onClick={()=>setStmtTab('loans')}>
              <ArrowUpRight size={13}/> Олгосон зээл (активууд)
            </button>
            <button className="z-btn z-btn-secondary z-btn-sm ml-auto" onClick={loadStmt}>
              <RefreshCw size={13}/> Шинэчлэх
            </button>
          </div>

          {!stmt ? <div className="text-slate-400 text-sm p-4">Уншиж байна...</div> : (

            stmtTab === 'funding' ? (
              <div className="flex flex-col gap-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Нийт авсан зээл',   value: f.received,      color: 'blue' },
                    { label: 'Үндсэн буцаасан',    value: f.principalPaid, color: 'green' },
                    { label: 'Хүүгийн зардал',     value: f.interestPaid,  color: 'yellow' },
                    { label: 'Одоогийн үлдэгдэл',  value: f.outstanding,   color: 'red' },
                  ].map(c => (
                    <div key={c.label} className={`border rounded-xl p-3 ${
                      c.color==='blue'?'border-blue-200 bg-blue-50':c.color==='green'?'border-green-200 bg-green-50':
                      c.color==='yellow'?'border-yellow-200 bg-yellow-50':'border-red-200 bg-red-50'}`}>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{c.label}</p>
                      <p className={`text-lg font-bold ${
                        c.color==='blue'?'text-blue-800':c.color==='green'?'text-green-800':
                        c.color==='yellow'?'text-yellow-700':'text-red-700'}`}>{fmt(c.value)} ₮</p>
                    </div>
                  ))}
                </div>

                {/* Received */}
                <div className="z-card">
                  <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                    <ArrowDownLeft size={14} className="text-blue-600"/> Авсан зээлийн гүйлгээнүүд <span className="text-xs font-normal text-slate-400">(ct = 2,021 / 2,020)</span>
                  </h3>
                  {f.recentReceived.length === 0 ? (
                    <p className="text-slate-400 text-sm">ct=2,021 эсвэл ct=2,020 кодтой гүйлгээ байхгүй байна</p>
                  ) : (
                    <div className="z-table-wrap">
                      <table className="z-table">
                        <thead><tr><th>Огноо</th><th>Данс</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                        <tbody>{f.recentReceived.map(tx => <TxRow key={tx._id} tx={tx}/>)}</tbody>
                        <tfoot>
                          <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bfdbfe' }}>
                            <td colSpan={3} style={{ padding: '5px 8px', fontWeight: 700, fontSize: 12 }}>Нийт авсан</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8' }}>{fmt(f.received)} ₮</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Paid back */}
                <div className="z-card">
                  <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                    <ArrowUpRight size={14} className="text-green-600"/> Буцаасан гүйлгээнүүд <span className="text-xs font-normal text-slate-400">(dt = 2,021 / 2,020 / 5,121 / 5,120 / 2,024)</span>
                  </h3>
                  {f.recentPaid.length === 0 ? (
                    <p className="text-slate-400 text-sm">Буцаасан гүйлгээ байхгүй байна</p>
                  ) : (
                    <div className="z-table-wrap">
                      <table className="z-table">
                        <thead><tr><th>Огноо</th><th>Данс</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                        <tbody>{f.recentPaid.map(tx => <TxRow key={tx._id} tx={tx}/>)}</tbody>
                        <tfoot>
                          <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                            <td colSpan={3} style={{ padding: '5px 8px', fontWeight: 700, fontSize: 12 }}>Нийт буцаасан (үндсэн + хүү)</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{fmt(f.principalPaid + f.interestPaid)} ₮</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Loans given */
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Нийт олгосон зээл',   value: l.disbursed,     color: 'blue' },
                    { label: 'Эргэн төлөгдсөн',     value: l.collected,     color: 'green' },
                    { label: 'Хүүгийн орлого',       value: l.interestIncome,color: 'yellow' },
                  ].map(c => (
                    <div key={c.label} className={`border rounded-xl p-3 ${
                      c.color==='blue'?'border-blue-200 bg-blue-50':c.color==='green'?'border-green-200 bg-green-50':'border-yellow-200 bg-yellow-50'}`}>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{c.label}</p>
                      <p className={`text-lg font-bold ${c.color==='blue'?'text-blue-800':c.color==='green'?'text-green-800':'text-yellow-700'}`}>{fmt(c.value)} ₮</p>
                    </div>
                  ))}
                </div>

                <div className="z-card">
                  <h3 className="font-bold text-slate-800 text-sm mb-3">
                    Олгосон зээлийн гүйлгээнүүд <span className="text-xs font-normal text-slate-400">(ct=1,708 / dt=1,210 / dt=1,220)</span>
                  </h3>
                  <div className="z-table-wrap">
                    <table className="z-table">
                      <thead><tr><th>Огноо</th><th>Данс</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                      <tbody>{l.recentDisbursed.map(tx => <TxRow key={tx._id} tx={tx}/>)}</tbody>
                    </table>
                  </div>
                </div>

                <div className="z-card">
                  <h3 className="font-bold text-slate-800 text-sm mb-3">
                    Эргэн төлөлт <span className="text-xs font-normal text-slate-400">(ct=1,210 / 1,220 / 1,270)</span>
                  </h3>
                  <div className="z-table-wrap">
                    <table className="z-table">
                      <thead><tr><th>Огноо</th><th>Данс</th><th>Тайлбар</th><th className="text-right">Дүн</th></tr></thead>
                      <tbody>{l.recentCollected.map(tx => <TxRow key={tx._id} tx={tx}/>)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ── БҮРТГЭЛ ── */}
      {tab === 'records' && (
        <div className="flex flex-col gap-4">
          <div className="z-card flex justify-between items-center">
            <p className="text-xs text-slate-500">Гүйлгээнээс автоматаар бүртгэсэн болон гараар нэмсэн бүртгэлүүд</p>
            <div className="flex gap-2">
              <button className="z-btn z-btn-secondary" disabled={syncing} onClick={doSync}>
                <RefreshCw size={13}/> {syncing ? 'Sync хийж байна...' : 'Гүйлгээнээс sync'}
              </button>
              <button className="z-btn z-btn-primary" onClick={openNew}><Plus size={14}/> Гараар нэмэх</button>
            </div>
          </div>

          <div className="z-table-wrap">
            <table className="z-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Нэр</th><th>Төрөл</th><th className="text-right">Авсан дүн</th>
                  <th className="text-right">Үлдэгдэл</th><th className="text-center">Хүү %</th>
                  <th>Эхлэх</th><th>Статус</th><th style={{width:72}}></th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-slate-400 py-10">
                    Бүртгэл байхгүй — "Гүйлгээнээс sync" дарж автоматаар үүсгэнэ үү
                  </td></tr>
                )}
                {records.map(r => (
                  <tr key={r._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td className="font-semibold text-xs">{r.name}</td>
                    <td>{TYPE_LABEL[r.type]||r.type}</td>
                    <td className="text-right font-semibold text-blue-700">{fmt(r.amount)} ₮</td>
                    <td className="text-right font-bold text-red-600">{fmt(r.balance)} ₮</td>
                    <td className="text-center">{r.interestRate || '—'}%</td>
                    <td>{r.startDate ? fmtDate(r.startDate) : '—'}</td>
                    <td><span className={`z-badge ${STATUS_COLOR[r.status]||'z-badge-gray'}`}>{STATUS_LABEL[r.status]||r.status}</span></td>
                    <td style={{padding:'2px 6px'}}>
                      <div className="flex gap-1">
                        <button className="z-btn z-btn-secondary z-btn-sm" style={{padding:'2px 6px'}} onClick={()=>openEdit(r)}><Pencil size={11}/></button>
                        <button className="z-btn z-btn-danger z-btn-sm"    style={{padding:'2px 6px'}} onClick={()=>remove(r._id)}><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="z-modal-bg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">{modal==='new'?'Эх үүсвэр нэмэх':'Засварлах'}</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div><label className="z-label">Нэр</label><input className="z-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="z-grid-2">
                <div><label className="z-label">Төрөл</label><select className="z-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {Object.entries(TYPE_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="z-label">Статус</label><select className="z-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {Object.entries(STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              </div>
              <div className="z-grid-3">
                <div><label className="z-label">Авсан дүн (₮)</label><input className="z-input" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
                <div><label className="z-label">Үлдэгдэл (₮)</label><input className="z-input" type="number" value={form.balance} onChange={e=>setForm(f=>({...f,balance:e.target.value}))}/></div>
                <div><label className="z-label">Хүү (%)</label><input className="z-input" type="number" value={form.interestRate} onChange={e=>setForm(f=>({...f,interestRate:e.target.value}))}/></div>
              </div>
              <div className="z-grid-2">
                <div><label className="z-label">Эхлэх огноо</label><input className="z-input" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div><label className="z-label">Дуусах огноо</label><input className="z-input" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></div>
              </div>
              <div><label className="z-label">Тэмдэглэл</label><textarea className="z-input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={()=>setModal(null)}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={save} disabled={saving}>{saving?'...':(<><Check size={13}/> Хадгалах</>)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
