import { useEffect, useState, useCallback } from 'react';
import {
  getLeases, getLease, createLease, getClients, getCars,
  createPayment, statusBadge, statusLabel, fmt, fmtDate
} from '../api';
import { Plus, X, ChevronRight, Calendar, CreditCard } from 'lucide-react';

const EMPTY_LEASE = {
  clientId: '', carId: '', startDate: '', termMonths: 24,
  leaseValue: '', downPayment: 0, interestRate: 18, researchRef: '', notes: '',
};

export default function Leases() {
  const [leases, setLeases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | {type:'detail', lease, payments}
  const [detail, setDetail] = useState(null);
  const [clients, setClients] = useState([]);
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState(EMPTY_LEASE);
  const [saving, setSaving] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', description: '' });

  const load = useCallback(() =>
    getLeases(statusFilter ? { status: statusFilter } : {}).then(setLeases), [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const openNew = async () => {
    const [cls, crs] = await Promise.all([getClients({}), getCars({ status: 'available' })]);
    setClients(cls); setCars(crs);
    setForm(EMPTY_LEASE); setModal('new');
  };

  const openDetail = async (l) => {
    const d = await getLease(l._id);
    setDetail(d); setModal('detail');
  };

  const close = () => { setModal(null); setDetail(null); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const lease = await createLease(form);
      setLeases(prev => [lease, ...prev]);
      close();
    } catch (e) {
      alert(e.response?.data?.message || 'Алдаа гарлаа');
    } finally { setSaving(false); }
  };

  const openPay = (leaseId) => {
    setPayForm({ date: new Date().toISOString().slice(0, 10), amount: '', description: '' });
    setPayModal(leaseId);
  };

  const savePay = async () => {
    setSaving(true);
    try {
      await createPayment({ leaseId: payModal, ...payForm });
      setPayModal(null);
      if (detail) {
        const d = await getLease(detail.lease._id);
        setDetail(d);
      }
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Алдаа');
    } finally { setSaving(false); }
  };

  const STATUSES = ['', 'active', 'overdue', 'completed', 'cancelled'];

  const scheduleColor = (s) => ({
    paid: 'text-green-700 bg-green-50', partial: 'text-yellow-700 bg-yellow-50',
    overdue: 'text-red-700 bg-red-50', pending: 'text-slate-600 bg-slate-50',
  }[s] || 'text-slate-600 bg-slate-50');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} className={`z-btn z-btn-sm ${statusFilter === s ? 'z-btn-primary' : 'z-btn-secondary'}`}
              onClick={() => setStatusFilter(s)}>
              {s === '' ? 'Бүгд' : statusLabel[s] || s}
            </button>
          ))}
        </div>
        <button className="z-btn z-btn-primary ml-auto" onClick={openNew}><Plus size={14} /> Гэрээ үүсгэх</button>
      </div>

      <div className="z-table-wrap">
        <table className="z-table">
          <thead>
            <tr><th>Гэрээ №</th><th>Харилцагч</th><th>Машин</th><th>Зээлийн дүн</th><th>Сарын төлбөр</th><th>Хүү</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {leases.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">Лизинг олдсонгүй</td></tr>}
            {leases.map(l => (
              <tr key={l._id} className="cursor-pointer" onClick={() => openDetail(l)}>
                <td className="font-bold text-blue-700">{l.contractNumber}</td>
                <td>{l.client?.firstname || l.client?.orgName} {l.client?.lastname || ''}</td>
                <td>{l.car?.make} {l.car?.model} {l.car?.year}<br/>
                  <span className="text-xs text-slate-400 font-mono">{l.car?.plateNumber}</span></td>
                <td>{fmt(l.loanAmount)} ₮</td>
                <td className="font-semibold">{fmt(l.monthlyPayment)} ₮</td>
                <td>{l.interestRate}%</td>
                <td><span className={statusBadge(l.status)}>{statusLabel[l.status]}</span></td>
                <td><ChevronRight size={14} className="text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New lease modal */}
      {modal === 'new' && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && close()}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Лизинг гэрээ үүсгэх</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div>
                <label className="z-label">Харилцагч *</label>
                <select className="z-select" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                  <option value="">— сонгоно уу —</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.firstname || c.orgName} {c.lastname || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="z-label">Машин * (Сул машинууд)</label>
                <select className="z-select" value={form.carId} onChange={e => set('carId', e.target.value)}>
                  <option value="">— сонгоно уу —</option>
                  {cars.map(c => (
                    <option key={c._id} value={c._id}>{c.make} {c.model} {c.year} — {c.plateNumber}</option>
                  ))}
                </select>
              </div>
              <div className="z-grid-2">
                <div><label className="z-label">Эхлэх огноо *</label><input className="z-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
                <div><label className="z-label">Хугацаа (сар) *</label><input className="z-input" type="number" value={form.termMonths} onChange={e => set('termMonths', +e.target.value)} /></div>
              </div>
              <div className="z-grid-2">
                <div><label className="z-label">Лизингийн үнэ *</label><input className="z-input" type="number" value={form.leaseValue} onChange={e => set('leaseValue', +e.target.value)} /></div>
                <div><label className="z-label">Урьдчилгаа</label><input className="z-input" type="number" value={form.downPayment} onChange={e => set('downPayment', +e.target.value)} /></div>
              </div>
              <div>
                <label className="z-label">Жилийн хүү (%) *</label>
                <input className="z-input" type="number" step="0.1" value={form.interestRate} onChange={e => set('interestRate', +e.target.value)} />
              </div>
              {form.leaseValue && form.interestRate && form.termMonths && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-semibold">Тооцоолол:</p>
                  <p className="text-sm font-bold text-blue-800">
                    Зээлийн дүн: {fmt(form.leaseValue - (form.downPayment || 0))} ₮ ·
                    Сарын төлбөр (ойролцоо): {fmt(calcMonthly(form.leaseValue - (form.downPayment || 0), form.interestRate, form.termMonths))} ₮
                  </p>
                </div>
              )}
              <div><label className="z-label">loan.scm.mn судалгааны дугаар</label><input className="z-input" value={form.researchRef} onChange={e => set('researchRef', e.target.value)} /></div>
              <div><label className="z-label">Тэмдэглэл</label><textarea className="z-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={close}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={save} disabled={saving}>{saving ? 'Үүсгэж байна...' : 'Гэрээ үүсгэх'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {modal === 'detail' && detail && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && close()}>
          <div className="z-modal z-modal-lg">
            <div className="z-modal-head">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Лизинг гэрээ</p>
                <h3 className="font-bold text-slate-800 text-lg">{detail.lease.contractNumber}</h3>
              </div>
              <div className="flex gap-2">
                <button className="z-btn z-btn-primary z-btn-sm" onClick={() => openPay(detail.lease._id)}>
                  <CreditCard size={13} /> Төлөлт бүртгэх
                </button>
                <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
              </div>
            </div>
            <div className="z-modal-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <Info label="Харилцагч" value={`${detail.lease.client?.lastname || ''} ${detail.lease.client?.firstname || detail.lease.client?.orgName}`} />
                <Info label="Машин" value={`${detail.lease.car?.make} ${detail.lease.car?.model} ${detail.lease.car?.year}`} />
                <Info label="Лизингийн үнэ" value={`${fmt(detail.lease.leaseValue)} ₮`} />
                <Info label="Урьдчилгаа" value={`${fmt(detail.lease.downPayment)} ₮`} />
                <Info label="Зээлийн дүн" value={`${fmt(detail.lease.loanAmount)} ₮`} />
                <Info label="Хүү (жилийн)" value={`${detail.lease.interestRate}%`} />
                <Info label="Сарын төлбөр" value={`${fmt(detail.lease.monthlyPayment)} ₮`} />
                <Info label="Статус" value={<span className={statusBadge(detail.lease.status)}>{statusLabel[detail.lease.status]}</span>} />
              </div>

              <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><Calendar size={14} /> Хугацааны хуваарь</h4>
              <div className="z-table-wrap mb-5" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="z-table text-xs">
                  <thead>
                    <tr><th>#</th><th>Огноо</th><th>Үндсэн</th><th>Хүү</th><th>Нийт</th><th>Үлдэгдэл</th><th>Төлсөн</th><th>Статус</th></tr>
                  </thead>
                  <tbody>
                    {detail.lease.schedule?.map(item => (
                      <tr key={item.month} className={item.status === 'overdue' ? 'bg-red-50' : ''}>
                        <td>{item.month}</td>
                        <td>{fmtDate(item.dueDate)}</td>
                        <td>{fmt(item.principal)} ₮</td>
                        <td>{fmt(item.interest)} ₮</td>
                        <td className="font-semibold">{fmt(item.total)} ₮</td>
                        <td>{fmt(item.balance)} ₮</td>
                        <td>{item.paidAmount > 0 ? <span className="text-green-700 font-bold">{fmt(item.paidAmount)} ₮</span> : '—'}</td>
                        <td><span className={`z-badge text-xs ${scheduleColor(item.status)}`}>{statusLabel[item.status] || item.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detail.payments?.length > 0 && (
                <>
                  <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><CreditCard size={14} /> Төлөлтийн түүх</h4>
                  <div className="z-table-wrap">
                    <table className="z-table text-xs">
                      <thead>
                        <tr><th>Огноо</th><th>Дүн</th><th>Эх үүсвэр</th><th>Тайлбар</th></tr>
                      </thead>
                      <tbody>
                        {detail.payments.map(p => (
                          <tr key={p._id}>
                            <td>{fmtDate(p.date)}</td>
                            <td className="font-bold text-green-700">{fmt(p.amount)} ₮</td>
                            <td><span className={`z-badge ${p.source === 'manual' ? 'z-badge-blue' : 'z-badge-yellow'}`}>{statusLabel[p.source]}</span></td>
                            <td className="text-slate-500">{p.description || p.bankReference || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick payment modal */}
      {payModal && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Төлөлт бүртгэх</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => setPayModal(null)}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div><label className="z-label">Огноо</label><input className="z-input" type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className="z-label">Дүн (₮)</label><input className="z-input" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} /></div>
              <div><label className="z-label">Тайлбар</label><input className="z-input" value={payForm.description} onChange={e => setPayForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={() => setPayModal(null)}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={savePay} disabled={saving}>{saving ? '...' : 'Бүртгэх'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function calcMonthly(P, annualRate, n) {
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.round(P / n);
  return Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}
