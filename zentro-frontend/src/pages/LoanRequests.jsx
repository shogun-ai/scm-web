import { useEffect, useState } from 'react';
import { convertZentroLoanRequest, getUsers, getZentroLoanRequests, updateZentroLoanRequest, fmt } from '../api';
import { CheckCircle, UserPlus } from 'lucide-react';

const statuses = { new: 'Шинэ', contacted: 'Холбогдсон', approved: 'Зөвшөөрөх', rejected: 'Татгалзсан', converted: 'Харилцагч болсон' };

export default function LoanRequests() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('');
  const load = () => getZentroLoanRequests(status ? { status } : {}).then(setRows);
  useEffect(() => { load(); getUsers().then(setUsers).catch(() => {}); }, [status]);
  const update = async (id, data) => { const r = await updateZentroLoanRequest(id, data); setRows(rows.map(x => x._id === id ? r : x)); };
  const convert = async (id) => { await convertZentroLoanRequest(id); load(); };
  return <div className="flex flex-col gap-4">
    <div className="z-card flex items-center gap-2 flex-wrap"><h1 className="font-bold text-lg mr-auto">Веб зээлийн хүсэлт</h1>{['', ...Object.keys(statuses)].map(s => <button key={s} className={`z-btn z-btn-sm ${status === s ? 'z-btn-primary' : 'z-btn-secondary'}`} onClick={() => setStatus(s)}>{s ? statuses[s] : 'Бүгд'}</button>)}</div>
    <div className="z-table-wrap"><table className="z-table"><thead><tr><th>Огноо</th><th>Харилцагч</th><th>Зээл</th><th>Барьцаа</th><th>Хариуцагч</th><th>Статус</th><th></th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-10">Хүсэлт байхгүй</td></tr>}{rows.map(r => <tr key={r._id}><td>{new Date(r.createdAt).toLocaleString('mn-MN')}</td><td><b>{r.name}</b><br/><span className="text-xs text-slate-500">{r.phone} {r.register}</span></td><td>{r.productType || '-'}<br/><b>{fmt(r.amount)} ₮</b> · {r.termMonths || '-'} сар</td><td className="max-w-xs">{r.collateral || '-'}</td><td><select className="z-select" value={r.assignedTo?._id || ''} onChange={e => update(r._id, { assignedTo: e.target.value })}><option value="">-</option>{users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}</select></td><td><select className="z-select" value={r.status} onChange={e => update(r._id, { status: e.target.value })}>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td><td><div className="flex gap-1"><button className="z-btn z-btn-secondary z-btn-sm" onClick={() => update(r._id, { status: 'contacted' })}><CheckCircle size={13} /></button><button className="z-btn z-btn-primary z-btn-sm" onClick={() => convert(r._id)}><UserPlus size={13} /> CRM</button></div></td></tr>)}</tbody></table></div>
  </div>;
}
