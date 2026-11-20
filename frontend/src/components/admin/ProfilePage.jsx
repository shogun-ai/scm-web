import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Monitor, ShieldCheck, ShieldOff, UserCircle } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import { parseUserAgent } from './deviceParser';

const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : '—'; } catch { return '—'; } };
const CARD = 'rounded-2xl border bg-white p-6 shadow-sm';

// Нэг хүсэлтийг бүтэлгүйтсэн ч бусад хэсгийг үргэлжлүүлэн харуулна.
function useFetch(url, params) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    axios.get(url, { headers: getAuthHeaders(), params, timeout: 15000 })
      .then(res => { if (alive) setState({ data: res.data, loading: false, error: '' }); })
      .catch(err => { if (alive) setState({ data: null, loading: false, error: err.response?.data?.message || 'Ачаалж чадсангүй.' }); });
    return () => { alive = false; };
  }, [url, params]);
  return state;
}

const LOGINS_PARAMS = { limit: 20 };
const LOGS_PARAMS = { limit: 50 };

export default function ProfilePage({ apiUrl, user, children }) {
  const me = useFetch(`${apiUrl}/api/me`);
  const logins = useFetch(`${apiUrl}/api/me/logins`, LOGINS_PARAMS);
  const logs = useFetch(`${apiUrl}/api/me/logs`, LOGS_PARAMS);
  const profile = me.data || user || {};
  const loginRows = Array.isArray(logins.data) ? logins.data : [];
  const logRows = Array.isArray(logs.data) ? logs.data : [];
  const roles = [...new Set([profile.role, ...(Array.isArray(profile.roles) ? profile.roles : [])].filter(Boolean))];

  return <div className="max-w-4xl space-y-6 animate-fade-in">
    <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><UserCircle size={26} aria-hidden="true" />Миний профайл</h2>

    <section className={CARD} aria-labelledby="me-info">
      <h3 id="me-info" className="mb-4 text-sm font-bold uppercase tracking-wider text-[#003B5C]">Хувийн мэдээлэл</h3>
      {me.loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      {me.error && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{me.error} Хадгалагдсан мэдээллийг харуулж байна.</p>}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-slate-500">Нэр</dt><dd className="font-medium text-slate-800">{profile.name || '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">Имэйл</dt><dd className="break-all text-slate-800">{profile.email || '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">Мэдэгдлийн имэйл</dt><dd className="break-all text-slate-800">{profile.notificationEmail || <span className="text-slate-400">Бүртгэлгүй</span>}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">Эрх</dt><dd className="text-slate-800">{roles.length ? roles.join(', ') : '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">2FA</dt><dd>{profile.isTwoFAEnabled
          ? <span className="inline-flex items-center gap-1 font-semibold text-green-700"><ShieldCheck size={16} aria-hidden="true" />Идэвхтэй</span>
          : <span className="inline-flex items-center gap-1 font-semibold text-slate-500"><ShieldOff size={16} aria-hidden="true" />Идэвхгүй</span>}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">Бүртгүүлсэн</dt><dd className="text-slate-800">{dt(profile.createdAt)}</dd></div>
      </dl>
    </section>

    {children}

    <section className={CARD} aria-labelledby="me-logins">
      <h3 id="me-logins" className="mb-4 text-sm font-bold uppercase tracking-wider text-[#003B5C]">Нэвтрэлтийн түүх</h3>
      {logins.loading && <p role="status" className="text-sm text-slate-500">Ачаалж байна…</p>}
      {logins.error && <p role="alert" className="text-sm text-red-600">{logins.error}</p>}
      {!logins.loading && !logins.error && loginRows.length === 0 && <p className="text-sm text-slate-500">Нэвтрэлтийн түүх алга.</p>}
      {loginRows.length > 0 && <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Сүүлийн нэвтрэлтүүд</caption>
          <thead className="border-b bg-slate-50 text-xs text-slate-600"><tr><th scope="col" className="px-3 py-2">Огноо</th><th scope="col" className="px-3 py-2">Төхөөрөмж</th><th scope="col" className="px-3 py-2">IP</th></tr></thead>
          <tbody className="divide-y">{loginRows.map((row, index) => <tr key={`${row.at}-${index}`}>
            <td className="whitespace-nowrap px-3 py-2">{dt(row.at)}</td>
            <td className="px-3 py-2"><span className="inline-flex flex-wrap items-center gap-2"><Monitor size={14} className="text-slate-400" aria-hidden="true" />{parseUserAgent(row.userAgent).label}{row.current && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Энэ төхөөрөмж</span>}</span></td>
            <td className="px-3 py-2 font-mono text-xs">{row.ip || '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section className={CARD} aria-labelledby="me-logs">
      <h3 id="me-logs" className="mb-4 text-sm font-bold uppercase tracking-wider text-[#003B5C]">Миний үйлдлийн лог</h3>
      {logs.loading && <p role="status" className="text-sm text-slate-500">Ачаалж байна…</p>}
      {logs.error && <p role="alert" className="text-sm text-red-600">{logs.error}</p>}
      {!logs.loading && !logs.error && logRows.length === 0 && <p className="text-sm text-slate-500">Бичлэг алга.</p>}
      {logRows.length > 0 && <ul className="max-h-96 divide-y overflow-y-auto text-sm">{logRows.map((row, index) => <li key={`${row.date}-${index}`} className="py-2"><p className="text-xs text-slate-500">{dt(row.date)}</p><p className="font-medium text-slate-800">{row.action}</p>{row.details && <p className="break-words text-xs text-slate-600">{typeof row.details === 'string' ? row.details : JSON.stringify(row.details)}</p>}</li>)}</ul>}
    </section>
  </div>;
}
