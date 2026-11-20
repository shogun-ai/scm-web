import { useState } from 'react';
import axios from 'axios';
import { Loader2, UserPlus } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import { inviteResultText } from './inviteUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD = 'min-h-11 rounded-xl border bg-slate-50 p-3 text-sm focus:border-[#003B5C] focus:outline-none';

// Нууц үггүй хэрэглэгч нэмэх: урилгын имэйлээр нууц үгээ өөрөө үүсгэнэ.
export default function InviteUserForm({ apiUrl, roles, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', notificationEmail: '', roles: [] });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const toggleRole = key => setForm(previous => ({
    ...previous,
    roles: previous.roles.includes(key) ? previous.roles.filter(item => item !== key) : (previous.roles.length >= 2 ? previous.roles : [...previous.roles, key]),
  }));

  const submit = async event => {
    event.preventDefault();
    const email = form.email.trim();
    const notificationEmail = form.notificationEmail.trim();
    if (!form.name.trim()) { setResult({ ok: false, text: 'Нэрээ бичнэ үү.' }); return; }
    if (!EMAIL_RE.test(email)) { setResult({ ok: false, text: 'Имэйл хаяг буруу байна.' }); return; }
    if (notificationEmail && !EMAIL_RE.test(notificationEmail)) { setResult({ ok: false, text: 'Мэдэгдлийн имэйл буруу байна.' }); return; }
    setBusy(true); setResult(null);
    try {
      const body = { name: form.name.trim(), email, roles: form.roles, role: form.roles.includes('admin') ? 'admin' : 'employee' };
      if (notificationEmail) body.notificationEmail = notificationEmail;
      const res = await axios.post(`${apiUrl}/api/users`, body, { headers: getAuthHeaders(), timeout: 30000 });
      setResult(inviteResultText(email, res.data?.invite?.email?.result));
      setForm({ name: '', email: '', notificationEmail: '', roles: [] });
      onCreated?.();
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.message || 'Хэрэглэгч нэмж чадсангүй.' });
    } finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="invite-title">
    <h3 id="invite-title" className="font-black text-[#003B5C]">Хэрэглэгч нэмэх</h3>
    <p className="text-xs text-slate-500">Нууц үг оруулахгүй. Хэрэглэгчид имэйлээр урилга очиж, 48 цагийн дотор өөрөө нууц үгээ үүсгэнэ.</p>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold text-slate-600">Нэр<input className={`${FIELD} mt-1 w-full`} value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} autoComplete="off" /></label>
      <label className="text-xs font-semibold text-slate-600">Имэйл<input type="email" className={`${FIELD} mt-1 w-full`} value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} autoComplete="off" /></label>
      <label className="text-xs font-semibold text-slate-600">Мэдэгдлийн имэйл (заавал биш)<input type="email" className={`${FIELD} mt-1 w-full`} value={form.notificationEmail} onChange={event => setForm(previous => ({ ...previous, notificationEmail: event.target.value }))} autoComplete="off" /></label>
    </div>
    <fieldset>
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Эрх (хамгийн ихдээ 2 сонгоно)</legend>
      <div className="flex flex-wrap gap-2">
        {roles.map(role => {
          const selected = form.roles.includes(role.key);
          const maxed = !selected && form.roles.length >= 2;
          return <label key={role.key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all focus-within:ring-2 focus-within:ring-[#003B5C]/40 ${selected ? 'border-[#003B5C] bg-[#003B5C] text-white' : maxed ? 'cursor-not-allowed border-slate-200 text-slate-400 opacity-40' : 'border-slate-200 text-slate-600 hover:border-[#003B5C]'}`}>
            <input type="checkbox" className="sr-only" checked={selected} disabled={maxed} onChange={() => toggleRole(role.key)} />{role.label}
          </label>;
        })}
      </div>
    </fieldset>
    {result && <p role={result.ok ? 'status' : 'alert'} className={`rounded-lg p-3 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{result.text}</p>}
    <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-6 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}Урилга илгээх</button>
  </form>;
}
