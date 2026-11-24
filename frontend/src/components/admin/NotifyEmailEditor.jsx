import { useId, useState } from 'react';
import axios from 'axios';
import { Check, Pencil } from 'lucide-react';
import Button from './ui/Button';

const NOTIFY_API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');
const NOTIFY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inline editor for User.notificationEmail (login email is unchanged). Dark tone — users table on the sky.
export default function NotifyEmailEditor({ userId, value, onSaved, label = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const start = () => { setDraft(value || ''); setError(''); setEditing(true); };
  const save = async () => {
    const next = draft.trim();
    if (next && (next.length > 254 || !NOTIFY_EMAIL_RE.test(next))) { setError('Имэйл хаяг буруу байна.'); return; }
    setSaving(true); setError('');
    try {
      await axios.put(`${NOTIFY_API_URL}/api/users/${userId}`, { notificationEmail: next });
      await onSaved();
      setEditing(false);
    } catch (e) { setError(e.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };
  if (!editing) {
    return <div className="flex min-w-0 items-center gap-1.5">
      <span className={`min-w-0 break-all ${value ? 'text-[var(--adm-ink-2)]' : 'text-[#F7DC8A]'}`}>{value || 'Тохируулаагүй'}</span>
      <button type="button" onClick={start} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--adm-ink-3)] transition hover:bg-white/[0.07] hover:text-white" title="Мэдэгдэл хүлээн авах имэйл засах" aria-label={`${label ? `${label} — ` : ''}мэдэгдэл хүлээн авах имэйл засах`}><Pencil size={14} aria-hidden="true" /></button>
    </div>;
  }
  return <div className="min-w-[15rem] space-y-2">
    <label htmlFor={id} className="adm-label">Мэдэгдэл хүлээн авах имэйл</label>
    <input id={id} type="email" value={draft} maxLength={254} autoFocus onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); } }}
      aria-describedby={`${id}-hint${error ? ` ${id}-err` : ''}`} aria-invalid={Boolean(error)} className="adm-field adm-field--sm w-full" placeholder="name@scm.mn" />
    <p id={`${id}-hint`} className="text-[11.5px] leading-snug text-[var(--adm-ink-3)]">Нэвтрэх имэйл өөрчлөгдөхгүй. Зээлийн хүсэлтийн мэдэгдэл энэ хаяг руу очно.</p>
    {error && <p id={`${id}-err`} role="alert" className="text-xs text-[#FFC9D3]">{error}</p>}
    <div className="flex gap-2">
      <Button variant="secondary" className="!min-h-[38px] !px-3 !text-[12.5px]" busy={saving} disabled={saving} onClick={save} icon={<Check size={14} aria-hidden="true" />}>Хадгалах</Button>
      <Button variant="secondary" className="!min-h-[38px] !border-transparent !bg-transparent !px-3 !text-[12.5px] !font-semibold !text-[var(--adm-ink-2)]" disabled={saving} onClick={() => setEditing(false)}>Болих</Button>
    </div>
  </div>;
}
