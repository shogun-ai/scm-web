import { useEffect, useState } from 'react';
import { getFunding, createFunding, updateFunding, deleteFunding, fmt, fmtDate } from '../api';
import { Plus, Trash2, Pencil, X, Check, TrendingDown } from 'lucide-react';

const EMPTY = { name: '', type: 'bank', amount: '', interestRate: '', startDate: '', endDate: '', balance: '', status: 'active', notes: '' };
const TYPE_LABEL   = { bank: 'Банк', investor: 'Хөрөнгө оруулагч', bond: 'Өрийн бичиг', other: 'Бусад' };
const STATUS_LABEL = { active: 'Идэвхтэй', paid: 'Төлөгдсөн', overdue: 'Хугацаа хэтэрсэн' };
const STATUS_COLOR = { active: 'z-badge-blue', paid: 'z-badge-green', overdue: 'z-badge-red' };

export default function Funding() {
  const [rows, setRows]   = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFunding().then(setRows).catch(() => {}); }, []);

  const openNew  = () => { setForm(EMPTY); setModal('new'); };
  const openEdit = (row) => {
    setForm({ ...row, amount: row.amount, interestRate: row.interestRate, balance: row.balance,
      startDate: row.startDate?.slice(0, 10) || '', endDate: row.endDate?.slice(0, 10) || '' });
    setModal(row);
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...form, amount: +form.amount || 0, interestRate: +form.interestRate || 0, balance: +form.balance || 0 };
      if (modal === 'new') {
        const created = await createFunding(data);
        setRows(prev => [created, ...prev]);
      } else {
        const updated = await updateFunding(modal._id, data);
        setRows(prev => prev.map(r => r._id === updated._id ? updated : r));
      }
      setModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Устгах уу?')) return;
    await deleteFunding(id);
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const active = rows.filter(r => r.status === 'active');
  const totalAmount  = active.reduce((s, r) => s + (r.amount || 0), 0);
  const totalBalance = active.reduce((s, r) => s + (r.balance || 0), 0);
  const avgRate = active.length ? (active.reduce((s, r) => s + r.interestRate, 0) / active.length).toFixed(2) : 0;

  const fld = (label, key, type = 'text', opts = null) => (
    <div>
      <label className="z-label">{label}</label>
      {opts ? (
        <select className="z-select" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
          {Object.entries(opts).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input className="z-input" type={type} value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Нийт авсан зээл', value: `${fmt(totalAmount)} ₮`, color: 'blue' },
          { label: 'Одоогийн үлдэгдэл', value: `${fmt(totalBalance)} ₮`, color: 'red' },
          { label: 'Дундаж хүү', value: `${avgRate}%`, color: 'yellow' },
          { label: 'Идэвхтэй эх үүсвэр', value: active.length, color: 'green' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-3 ${
            c.color === 'blue' ? 'border-blue-200 bg-blue-50' :
            c.color === 'red'  ? 'border-red-200 bg-red-50' :
            c.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
            'border-green-200 bg-green-50'}`}>
            <p className="text-xs font-semibold text-slate-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${
              c.color === 'blue' ? 'text-blue-800' : c.color === 'red' ? 'text-red-700' :
              c.color === 'yellow' ? 'text-yellow-700' : 'text-green-800'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="z-card flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingDown size={16} className="text-slate-500" />
          <span className="font-bold text-slate-700 text-sm">Эх үүсвэрийн бүртгэл</span>
        </div>
        <button className="z-btn z-btn-primary" onClick={openNew}><Plus size={14} /> Нэмэх</button>
      </div>

      {/* Table */}
      <div className="z-table-wrap">
        <table className="z-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Нэр</th><th>Төрөл</th><th className="text-right">Авсан дүн</th>
              <th className="text-right">Үлдэгдэл</th><th className="text-center">Хүү %</th>
              <th>Эхлэх</th><th>Дуусах</th><th>Статус</th><th style={{ width: 72 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="text-center text-slate-400 py-10">Эх үүсвэр байхгүй</td></tr>
            )}
            {rows.map(r => (
              <tr key={r._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td className="font-semibold">{r.name}</td>
                <td>{TYPE_LABEL[r.type] || r.type}</td>
                <td className="text-right font-semibold text-blue-700">{fmt(r.amount)} ₮</td>
                <td className="text-right font-bold text-red-600">{fmt(r.balance)} ₮</td>
                <td className="text-center">{r.interestRate}%</td>
                <td>{r.startDate ? fmtDate(r.startDate) : '—'}</td>
                <td>{r.endDate   ? fmtDate(r.endDate)   : '—'}</td>
                <td><span className={`z-badge ${STATUS_COLOR[r.status] || 'z-badge-gray'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                <td style={{ padding: '2px 6px' }}>
                  <div className="flex gap-1">
                    <button className="z-btn z-btn-secondary z-btn-sm" style={{ padding: '2px 6px' }} onClick={() => openEdit(r)}><Pencil size={11} /></button>
                    <button className="z-btn z-btn-danger z-btn-sm"    style={{ padding: '2px 6px' }} onClick={() => remove(r._id)}><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">{modal === 'new' ? 'Эх үүсвэр нэмэх' : 'Засварлах'}</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div>{fld('Нэр (банк/хөрөнгө оруулагчийн нэр)', 'name')}</div>
              <div className="z-grid-2">
                {fld('Төрөл', 'type', 'text', TYPE_LABEL)}
                {fld('Статус', 'status', 'text', STATUS_LABEL)}
              </div>
              <div className="z-grid-3">
                {fld('Авсан дүн (₮)', 'amount', 'number')}
                {fld('Одоогийн үлдэгдэл (₮)', 'balance', 'number')}
                {fld('Жилийн хүү (%)', 'interestRate', 'number')}
              </div>
              <div className="z-grid-2">
                {fld('Эхлэх огноо', 'startDate', 'date')}
                {fld('Дуусах огноо', 'endDate', 'date')}
              </div>
              <div>
                <label className="z-label">Тэмдэглэл</label>
                <textarea className="z-input" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={() => setModal(null)}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={save} disabled={saving}>{saving ? '...' : <><Check size={13} /> Хадгалах</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
