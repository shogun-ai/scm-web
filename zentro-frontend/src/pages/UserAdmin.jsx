import { useEffect, useState } from 'react';
import { createUser, deleteUser, getLogs, getUsers, updateUser } from '../api';
import { Plus, Trash2 } from 'lucide-react';

export default function UserAdmin() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', roles: '' });
  const load = () => { getUsers().then(setUsers); getLogs().then(setLogs).catch(() => {}); };
  useEffect(load, []);
  const add = async () => { await createUser({ ...form, roles: form.roles.split(',').map(x => x.trim()).filter(Boolean) }); setForm({ name: '', email: '', password: '', role: 'employee', roles: '' }); load(); };
  const saveRoles = async (u, value) => { const roles = value.split(',').map(x => x.trim()).filter(Boolean); const next = await updateUser(u._id, { roles }); setUsers(users.map(x => x._id === u._id ? next : x)); };
  return <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
    <div className="z-card"><h1 className="font-bold text-lg mb-3">Хэрэглэгчийн удирдлага</h1><div className="grid md:grid-cols-2 gap-2 mb-4"><input className="z-input" placeholder="Нэр" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><input className="z-input" placeholder="И-мэйл" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><input className="z-input" placeholder="Нууц үг" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/><input className="z-input" placeholder="roles: admin, loan_officer" value={form.roles} onChange={e => setForm({ ...form, roles: e.target.value })}/><button className="z-btn z-btn-primary" onClick={add}><Plus size={14}/> Нэмэх</button></div><div className="z-table-wrap"><table className="z-table"><thead><tr><th>Нэр</th><th>Role</th><th>Нэмэлт эрх</th><th></th></tr></thead><tbody>{users.map(u => <tr key={u._id}><td>{u.name}<br/><span className="text-xs text-slate-500">{u.email}</span></td><td>{u.role}</td><td><input className="z-input" defaultValue={(u.roles || []).join(', ')} onBlur={e => saveRoles(u, e.target.value)} /></td><td><button className="z-btn z-btn-danger z-btn-sm" onClick={async () => { await deleteUser(u._id); load(); }}><Trash2 size={13}/></button></td></tr>)}</tbody></table></div></div>
    <div className="z-card"><h2 className="font-bold text-lg mb-3">Лог</h2><div className="z-table-wrap"><table className="z-table"><thead><tr><th>Огноо</th><th>Хэрэглэгч</th><th>Үйлдэл</th></tr></thead><tbody>{logs.map(l => <tr key={l._id}><td>{new Date(l.date).toLocaleString('mn-MN')}</td><td>{l.userName}<br/><span className="text-xs text-slate-500">{l.userRole}</span></td><td>{l.action}<br/><span className="text-xs text-slate-500">{l.details}</span></td></tr>)}</tbody></table></div></div>
  </div>;
}
