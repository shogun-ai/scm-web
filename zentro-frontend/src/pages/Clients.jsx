import { useEffect, useState, useCallback } from 'react';
import { getClients, createClient, updateClient, statusBadge, statusLabel } from '../api';
import { Plus, Search, X, ChevronRight } from 'lucide-react';

const EMPTY = {
  type: 'individual', lastname: '', firstname: '', register: '', phone: '', phone2: '',
  email: '', address: '', dob: '', orgName: '', orgRegNo: '', directorName: '',
  directorRegister: '', researchId: '', status: 'active', notes: '',
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | client_obj
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => getClients({ q }).then(setClients), [q]);
  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setModal('new'); };
  const openEdit = (c) => { setForm(c); setModal(c); };
  const close    = () => setModal(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'new') {
        const c = await createClient(form);
        setClients(prev => [c, ...prev]);
      } else {
        const c = await updateClient(modal._id, form);
        setClients(prev => prev.map(x => x._id === c._id ? c : x));
      }
      close();
    } finally { setSaving(false); }
  };

  const isOrg = form.type === 'organization';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="z-search">
          <Search size={14} className="z-search-icon" />
          <input className="z-input" placeholder="Хайх..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="z-btn z-btn-primary" onClick={openNew}><Plus size={14} /> Харилцагч нэмэх</button>
      </div>

      <div className="z-table-wrap">
        <table className="z-table">
          <thead>
            <tr><th>Нэр / Байгууллага</th><th>Регистр / РД</th><th>Утас</th><th>Төрөл</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-8">Харилцагч олдсонгүй</td></tr>
            )}
            {clients.map(c => (
              <tr key={c._id} className="cursor-pointer" onClick={() => openEdit(c)}>
                <td className="font-semibold">
                  {c.type === 'individual' ? `${c.lastname || ''} ${c.firstname}` : c.orgName}
                </td>
                <td className="font-mono text-sm">{c.type === 'individual' ? c.register : c.orgRegNo}</td>
                <td>{c.phone}</td>
                <td><span className={statusBadge(c.type) + ' text-xs'}>{statusLabel[c.type]}</span></td>
                <td><span className={statusBadge(c.status)}>{c.status === 'active' ? 'Идэвхтэй' : c.status === 'blacklist' ? 'Хар жагсаалт' : 'Идэвхгүй'}</span></td>
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
              <h3 className="font-bold text-slate-800">{modal === 'new' ? 'Харилцагч нэмэх' : 'Харилцагч засах'}</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={close}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div>
                <label className="z-label">Харилцагчийн төрөл</label>
                <select className="z-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="individual">Иргэн</option>
                  <option value="organization">Байгууллага</option>
                </select>
              </div>
              {!isOrg ? (
                <>
                  <div className="z-grid-2">
                    <div><label className="z-label">Овог</label><input className="z-input" value={form.lastname} onChange={e => set('lastname', e.target.value)} /></div>
                    <div><label className="z-label">Нэр *</label><input className="z-input" value={form.firstname} onChange={e => set('firstname', e.target.value)} /></div>
                  </div>
                  <div className="z-grid-2">
                    <div><label className="z-label">Регистр</label><input className="z-input" value={form.register} onChange={e => set('register', e.target.value)} /></div>
                    <div><label className="z-label">Төрсөн огноо</label><input className="z-input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
                  </div>
                </>
              ) : (
                <>
                  <div><label className="z-label">Байгууллагын нэр *</label><input className="z-input" value={form.orgName} onChange={e => set('orgName', e.target.value)} /></div>
                  <div className="z-grid-2">
                    <div><label className="z-label">РД</label><input className="z-input" value={form.orgRegNo} onChange={e => set('orgRegNo', e.target.value)} /></div>
                    <div><label className="z-label">Захирлын нэр</label><input className="z-input" value={form.directorName} onChange={e => set('directorName', e.target.value)} /></div>
                  </div>
                  <div><label className="z-label">Захирлын регистр</label><input className="z-input" value={form.directorRegister} onChange={e => set('directorRegister', e.target.value)} /></div>
                </>
              )}
              <div className="z-grid-2">
                <div><label className="z-label">Утас</label><input className="z-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                <div><label className="z-label">Утас 2</label><input className="z-input" value={form.phone2} onChange={e => set('phone2', e.target.value)} /></div>
              </div>
              <div><label className="z-label">И-мэйл</label><input className="z-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div><label className="z-label">Хаяг</label><input className="z-input" value={form.address} onChange={e => set('address', e.target.value)} /></div>
              <div><label className="z-label">Дотоод судалгааны ID</label><input className="z-input" value={form.researchId} onChange={e => set('researchId', e.target.value)} /></div>
              <div>
                <label className="z-label">Статус</label>
                <select className="z-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Идэвхтэй</option>
                  <option value="inactive">Идэвхгүй</option>
                  <option value="blacklist">Хар жагсаалт</option>
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
