import { useState } from 'react';
import axios from 'axios';
import { Check, UserPlus } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import { inviteResultText } from './inviteUtils';
import Button from './ui/Button';
import { Field, Input } from './ui/Form';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Нууц үггүй хэрэглэгч нэмэх: урилгын имэйлээр нууц үгээ өөрөө үүсгэнэ.
// Light tone — UsersTab-ийн Modal дотор харагдана.
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

  const set = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));

  return <form onSubmit={submit} className="space-y-4" aria-label="Хэрэглэгч нэмэх" noValidate>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field tone="light" label="Нэр" required>{({ id }) => <Input tone="light" id={id} value={form.name} onChange={set('name')} autoComplete="off" />}</Field>
      <Field tone="light" label="Нэвтрэх имэйл" required>{({ id }) => <Input tone="light" id={id} type="email" value={form.email} onChange={set('email')} autoComplete="off" placeholder="name@scm.mn" />}</Field>
      <Field tone="light" className="sm:col-span-2" label="Мэдэгдлийн имэйл" hint="Заавал биш. Зээлийн хүсэлтийн мэдэгдэл энэ хаяг руу очно.">{({ id, describedBy }) => <Input tone="light" id={id} aria-describedby={describedBy} type="email" value={form.notificationEmail} onChange={set('notificationEmail')} autoComplete="off" />}</Field>
    </div>
    <fieldset>
      <legend className="text-xs font-semibold text-slate-700">Эрх <span className="font-normal text-slate-600">· хамгийн ихдээ 2 сонгоно</span></legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {roles.map(role => {
          const selected = form.roles.includes(role.key);
          const maxed = !selected && form.roles.length >= 2;
          return <label key={role.key} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--drawer-ink)] ${selected ? 'cursor-pointer border-[#0B1530] bg-[#0B1530] text-white' : maxed ? 'cursor-not-allowed border-slate-200 bg-white/60 text-slate-500' : 'cursor-pointer border-slate-300 bg-white text-slate-800 hover:border-slate-500'}`}>
            <input type="checkbox" className="sr-only" checked={selected} disabled={maxed} onChange={() => toggleRole(role.key)} />
            {selected && <Check size={14} aria-hidden="true" />}{role.label}
          </label>;
        })}
      </div>
    </fieldset>
    <p className="text-xs text-slate-600">Нууц үг оруулахгүй. Хэрэглэгчид имэйлээр урилга очиж, 48 цагийн дотор өөрөө нууц үгээ үүсгэнэ.</p>
    {result && <p role={result.ok ? 'status' : 'alert'} className={`rounded-xl border p-3 text-sm ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{result.text}</p>}
    <div className="flex justify-end">
      <Button type="submit" variant="ink" busy={busy} disabled={busy} icon={<UserPlus size={16} aria-hidden="true" />}>Урилга илгээх</Button>
    </div>
  </form>;
}
