import { useEffect, useState, useCallback } from 'react';
import { getCars, createCar, updateCar, statusBadge, statusLabel, fmt } from '../api';
import { Plus, Search, X, ChevronRight } from 'lucide-react';

const EMPTY = { make: '', model: '', year: new Date().getFullYear(), color: '', vin: '', plateNumber: '', purchasePrice: '', leaseValue: '', status: 'available', notes: '' };

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => getCars(statusFilter ? { status: statusFilter } : {}).then(setCars), [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setModal('new'); };
  const openEdit = (c) => { setForm(c); setModal(c); };
  const close    = () => setModal(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'new') {
        const c = await createCar(form);
        setCars(prev => [c, ...prev]);
      } else {
        const c = await updateCar(modal._id, form);
        setCars(prev => prev.map(x => x._id === c._id ? c : x));
      }
      close();
    } finally { setSaving(false); }
  };

  const STATUSES = ['', 'available', 'leased', 'sold'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button key={s} className={`z-btn z-btn-sm ${statusFilter === s ? 'z-btn-primary' : 'z-btn-secondary'}`}
              onClick={() => setStatusFilter(s)}>
              {s === '' ? 'Бүгд' : statusLabel[s] || s}
            </button>
          ))}
        </div>
        <button className="z-btn z-btn-primary ml-auto" onClick={openNew}><Plus size={14} /> Машин нэмэх</button>
      </div>

      <div className="z-table-wrap">
        <table className="z-table">
          <thead>
            <tr><th>Машин</th><th>Он</th><th>Өнгө</th><th>Улсын дугаар</th><th>VIN</th><th>Худалдаж авсан үнэ</th><th>Лизингийн үнэ</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {cars.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-8">Машин олдсонгүй</td></tr>}
            {cars.map(c => (
              <tr key={c._id} className="cursor-pointer" onClick={() => openEdit(c)}>
                <td className="font-semibold">{c.make} {c.model}</td>
                <td>{c.year}</td>
                <td>{c.color}</td>
                <td className="font-mono">{c.plateNumber}</td>
                <td className="font-mono text-xs text-slate-500">{c.vin}</td>
                <td>{fmt(c.purchasePrice)} ₮</td>
                <td>{fmt(c.leaseValue)} ₮</td>
                <td><span className={statusBadge(c.status)}>{statusLabel[c.status]}</span></td>
                <td><ChevronRight size={14} className="text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && close()}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">{modal === 'new' ? 'Машин нэмэх' : 'Машин засах'}</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div className="z-grid-2">
                <div><label className="z-label">Марк *</label><input className="z-input" value={form.make} onChange={e => set('make', e.target.value)} placeholder="Toyota" /></div>
                <div><label className="z-label">Загвар *</label><input className="z-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Land Cruiser" /></div>
              </div>
              <div className="z-grid-3">
                <div><label className="z-label">Он</label><input className="z-input" type="number" value={form.year} onChange={e => set('year', e.target.value)} /></div>
                <div><label className="z-label">Өнгө</label><input className="z-input" value={form.color} onChange={e => set('color', e.target.value)} /></div>
                <div><label className="z-label">Улсын дугаар</label><input className="z-input" value={form.plateNumber} onChange={e => set('plateNumber', e.target.value)} /></div>
              </div>
              <div><label className="z-label">VIN дугаар</label><input className="z-input" value={form.vin} onChange={e => set('vin', e.target.value)} /></div>
              <div className="z-grid-2">
                <div><label className="z-label">Худалдаж авсан үнэ</label><input className="z-input" type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} /></div>
                <div><label className="z-label">Лизингийн үнэ</label><input className="z-input" type="number" value={form.leaseValue} onChange={e => set('leaseValue', e.target.value)} /></div>
              </div>
              <div>
                <label className="z-label">Статус</label>
                <select className="z-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="available">Сул</option>
                  <option value="leased">Лизинглэгдсэн</option>
                  <option value="sold">Зарагдсан</option>
                </select>
              </div>
              <div><label className="z-label">Тэмдэглэл</label><textarea className="z-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={close}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={save} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
