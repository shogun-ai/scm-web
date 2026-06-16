import { useEffect, useState, useCallback, useRef } from 'react';
import { getPayments, getLeases, createPayment, bankImport, deletePayment, fmt, fmtDate, statusLabel } from '../api';
import { Plus, Upload, Trash2, X, Search } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [leases, setLeases] = useState([]);
  const [leaseFilter, setLeaseFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'manual' | 'import'
  const [form, setForm] = useState({ leaseId: '', date: new Date().toISOString().slice(0, 10), amount: '', description: '', bankReference: '' });
  const [importRows, setImportRows] = useState([]);
  const [importLeaseId, setImportLeaseId] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const load = useCallback(() =>
    getPayments(leaseFilter ? { leaseId: leaseFilter } : {}).then(setPayments), [leaseFilter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getLeases({}).then(setLeases); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const close = () => { setModal(null); setImportRows([]); };

  const saveManual = async () => {
    setSaving(true);
    try {
      const p = await createPayment(form);
      setPayments(prev => [p, ...prev]);
      close();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    // Автоматаар колоны нэрийг тааруулна
    const rows = raw.map(r => {
      const keys = Object.keys(r);
      const dateKey = keys.find(k => /огноо|date|өдөр/i.test(k)) || keys[0];
      const amtKey  = keys.find(k => /дүн|amount|зарлага|орлого|мөнгөн/i.test(k)) || keys[1];
      const refKey  = keys.find(k => /дугаар|reference|гүйлгээ/i.test(k)) || keys[2];
      const descKey = keys.find(k => /тайлбар|description|утга/i.test(k)) || keys[3];
      let dateVal = r[dateKey];
      if (dateVal instanceof Date) dateVal = dateVal.toISOString().slice(0, 10);
      return {
        date: dateVal || '',
        amount: parseFloat(String(r[amtKey]).replace(/[^0-9.-]/g, '')) || 0,
        bankReference: String(r[refKey] || ''),
        description: String(r[descKey] || ''),
      };
    }).filter(r => r.date && r.amount > 0);
    setImportRows(rows);
  };

  const saveImport = async () => {
    if (!importLeaseId) return alert('Гэрээ сонгоно уу');
    setSaving(true);
    try {
      const res = await bankImport({ leaseId: importLeaseId, rows: importRows });
      alert(`${res.imported} төлөлт амжилттай импорт хийгдлээ`);
      load();
      close();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Устгах уу?')) return;
    await deletePayment(id);
    setPayments(prev => prev.filter(p => p._id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="z-search">
          <Search size={14} className="z-search-icon" />
          <select className="z-input" style={{ paddingLeft: 34 }} value={leaseFilter} onChange={e => setLeaseFilter(e.target.value)}>
            <option value="">Бүх гэрээ</option>
            {leases.map(l => (
              <option key={l._id} value={l._id}>{l.contractNumber} — {l.client?.firstname || l.client?.orgName}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="z-btn z-btn-secondary" onClick={() => setModal('import')}><Upload size={14} /> Банкны хуулга</button>
          <button className="z-btn z-btn-primary" onClick={() => { setForm({ leaseId: '', date: new Date().toISOString().slice(0,10), amount:'', description:'', bankReference:'' }); setModal('manual'); }}>
            <Plus size={14} /> Төлөлт нэмэх
          </button>
        </div>
      </div>

      <div className="z-table-wrap">
        <table className="z-table">
          <thead>
            <tr><th>Огноо</th><th>Гэрээ</th><th>Харилцагч</th><th>Дүн</th><th>Эх үүсвэр</th><th>Тайлбар</th><th></th></tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">Төлөлт олдсонгүй</td></tr>}
            {payments.map(p => (
              <tr key={p._id}>
                <td>{fmtDate(p.date)}</td>
                <td className="font-bold text-blue-700">{p.lease?.contractNumber || '—'}</td>
                <td>{p.lease?.client?.firstname || p.lease?.client?.orgName || '—'}</td>
                <td className="font-bold text-green-700">{fmt(p.amount)} ₮</td>
                <td><span className={`z-badge ${p.source === 'manual' ? 'z-badge-blue' : 'z-badge-yellow'}`}>{statusLabel[p.source]}</span></td>
                <td className="text-slate-500 text-xs">{p.description || p.bankReference || '—'}</td>
                <td>
                  <button className="z-btn z-btn-danger z-btn-sm" onClick={() => remove(p._id)}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual payment modal */}
      {modal === 'manual' && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && close()}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Төлөлт бүртгэх</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div>
                <label className="z-label">Гэрээ *</label>
                <select className="z-select" value={form.leaseId} onChange={e => set('leaseId', e.target.value)}>
                  <option value="">— сонгоно уу —</option>
                  {leases.filter(l => ['active','overdue'].includes(l.status)).map(l => (
                    <option key={l._id} value={l._id}>{l.contractNumber} — {l.client?.firstname || l.client?.orgName}</option>
                  ))}
                </select>
              </div>
              <div className="z-grid-2">
                <div><label className="z-label">Огноо</label><input className="z-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
                <div><label className="z-label">Дүн (₮)</label><input className="z-input" type="number" value={form.amount} onChange={e => set('amount', +e.target.value)} /></div>
              </div>
              <div><label className="z-label">Банкны гүйлгээний дугаар</label><input className="z-input" value={form.bankReference} onChange={e => set('bankReference', e.target.value)} /></div>
              <div><label className="z-label">Тайлбар</label><input className="z-input" value={form.description} onChange={e => set('description', e.target.value)} /></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={close}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={saveManual} disabled={saving}>{saving ? '...' : 'Бүртгэх'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank import modal */}
      {modal === 'import' && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && close()}>
          <div className="z-modal z-modal-lg">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Банкны хуулга импорт</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-4">
              <div>
                <label className="z-label">Гэрээ *</label>
                <select className="z-select" value={importLeaseId} onChange={e => setImportLeaseId(e.target.value)}>
                  <option value="">— сонгоно уу —</option>
                  {leases.filter(l => ['active','overdue'].includes(l.status)).map(l => (
                    <option key={l._id} value={l._id}>{l.contractNumber} — {l.client?.firstname || l.client?.orgName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="z-label">Excel файл (.xlsx)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500 font-semibold">Excel файл сонгох</p>
                  <p className="text-xs text-slate-400">Огноо, Дүн, Гүйлгээний дугаар, Тайлбар гэсэн колонтой байх ёстой</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                </div>
              </div>

              {importRows.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-green-700 mb-2">{importRows.length} мөр илрүүллээ:</p>
                  <div className="z-table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    <table className="z-table text-xs">
                      <thead><tr><th>Огноо</th><th>Дүн</th><th>Гүйлгээ №</th><th>Тайлбар</th></tr></thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.date}</td>
                            <td className="font-bold">{fmt(r.amount)} ₮</td>
                            <td className="font-mono text-slate-500">{r.bankReference}</td>
                            <td className="text-slate-500">{r.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={close}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={saveImport} disabled={saving || importRows.length === 0}>
                {saving ? '...' : `${importRows.length} мөр импорт хийх`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
