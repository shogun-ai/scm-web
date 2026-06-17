import { useEffect, useState } from 'react';
import { getCollateral, createCollateral, updateCollateral, deleteCollateral,
         getClients, getLeases, fmt } from '../api';
import { Plus, Trash2, Pencil, X, Check, Shield } from 'lucide-react';

const EMPTY = { clientId: '', leaseId: '', type: 'other', description: '', estimatedValue: '', registrationNo: '', status: 'active', notes: '' };
const TYPE_LABEL   = { car: 'Машин', property: 'Үл хөдлөх хөрөнгө', equipment: 'Тоног төхөөрөмж', machinery: 'Машин механизм', other: 'Бусад' };
const STATUS_LABEL = { active: 'Идэвхтэй', released: 'Чөлөөлөгдсөн', seized: 'Хурааж авсан' };
const STATUS_COLOR = { active: 'z-badge-blue', released: 'z-badge-green', seized: 'z-badge-red' };

export default function Collateral() {
  const [rows, setRows]       = useState([]);
  const [clients, setClients] = useState([]);
  const [leases, setLeases]   = useState([]);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    Promise.all([
      getCollateral(),
      getClients({ limit: 1000 }),
      getLeases({ limit: 1000 }),
    ]).then(([c, cl, le]) => { setRows(c); setClients(cl.clients || cl); setLeases(le.leases || le); })
      .catch(() => {});
  }, []);

  const reload = async () => {
    const data = await getCollateral();
    setRows(data);
  };

  const openNew  = () => { setForm(EMPTY); setModal('new'); };
  const openEdit = (row) => {
    setForm({ ...row, clientId: row.clientId?._id || row.clientId || '', leaseId: row.leaseId?._id || row.leaseId || '', estimatedValue: row.estimatedValue || '' });
    setModal(row);
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...form, estimatedValue: +form.estimatedValue || 0 };
      if (!data.clientId) delete data.clientId;
      if (!data.leaseId)  delete data.leaseId;
      if (modal === 'new') {
        await createCollateral(data);
      } else {
        await updateCollateral(modal._id, data);
      }
      await reload();
      setModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Устгах уу?')) return;
    await deleteCollateral(id);
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const clientName = (c) => c ? `${c.firstname || c.orgName || ''} ${c.lastname || ''}`.trim() : '—';
  const leaseName  = (l) => l ? l.contractNumber : '—';

  const filtered = rows.filter(r =>
    (!filterType   || r.type   === filterType) &&
    (!filterStatus || r.status === filterStatus)
  );

  const totalValue = rows.filter(r => r.status === 'active').reduce((s, r) => s + (r.estimatedValue || 0), 0);

  const fld = (label, key, type = 'text', opts = null) => (
    <div>
      <label className="z-label">{label}</label>
      {opts ? (
        <select className="z-select" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
          <option value="">— Сонгох —</option>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Нийт барьцааны дүн', value: `${fmt(totalValue)} ₮`, color: 'blue' },
          { label: 'Идэвхтэй барьцаа', value: rows.filter(r => r.status === 'active').length, color: 'green' },
          { label: 'Нийт барьцаа', value: rows.length, color: 'gray' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-3 ${
            c.color === 'blue' ? 'border-blue-200 bg-blue-50' :
            c.color === 'green' ? 'border-green-200 bg-green-50' :
            'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-semibold text-slate-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color === 'blue' ? 'text-blue-800' : c.color === 'green' ? 'text-green-800' : 'text-slate-700'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="z-card flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Shield size={16} className="text-slate-500" />
          <span className="font-bold text-slate-700 text-sm">Барьцааны бүртгэл</span>
        </div>
        <div>
          <label className="z-label">Төрөл</label>
          <select className="z-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 160 }}>
            <option value="">Бүгд</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="z-label">Статус</label>
          <select className="z-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
            <option value="">Бүгд</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button className="z-btn z-btn-primary" onClick={openNew}><Plus size={14} /> Нэмэх</button>
      </div>

      {/* Table */}
      <div className="z-table-wrap">
        <table className="z-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Харилцагч</th><th>Гэрээ №</th><th>Төрөл</th><th>Тайлбар</th>
              <th className="text-right">Үнэлгээ</th><th>Бүртгэлийн №</th><th>Статус</th>
              <th style={{ width: 72 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-400 py-10">Барьцаа байхгүй</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td className="font-semibold">{clientName(r.clientId)}</td>
                <td className="font-mono text-blue-700 text-xs">{leaseName(r.leaseId)}</td>
                <td>{TYPE_LABEL[r.type] || r.type}</td>
                <td>{r.description}</td>
                <td className="text-right font-semibold">{fmt(r.estimatedValue)} ₮</td>
                <td className="font-mono text-slate-500 text-xs">{r.registrationNo || '—'}</td>
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
              <h3 className="font-bold text-slate-800">{modal === 'new' ? 'Барьцаа нэмэх' : 'Засварлах'}</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div className="z-grid-2">
                <div>
                  <label className="z-label">Харилцагч</label>
                  <select className="z-select" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">— Сонгох —</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{clientName(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="z-label">Гэрээ</label>
                  <select className="z-select" value={form.leaseId} onChange={e => setForm(f => ({ ...f, leaseId: e.target.value }))}>
                    <option value="">— Сонгох —</option>
                    {leases.map(l => <option key={l._id} value={l._id}>{l.contractNumber}</option>)}
                  </select>
                </div>
              </div>
              <div className="z-grid-2">
                {fld('Төрөл', 'type', 'text', TYPE_LABEL)}
                {fld('Статус', 'status', 'text', STATUS_LABEL)}
              </div>
              <div>{fld('Тайлбар (барьцааны нэр, товч тодорхойлолт)', 'description')}</div>
              <div className="z-grid-2">
                {fld('Үнэлгээний дүн (₮)', 'estimatedValue', 'number')}
                {fld('Бүртгэлийн дугаар', 'registrationNo')}
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
