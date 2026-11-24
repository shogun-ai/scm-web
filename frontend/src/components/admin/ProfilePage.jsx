import { useEffect, useState } from 'react';
import axios from 'axios';
import { History, Loader2, Monitor, UserCircle } from 'lucide-react';
import { PERMISSION_ROLES } from '@shared/permissions';
import { getAuthHeaders } from '../loanTask/api';
import { parseUserAgent } from './deviceParser';
import PageHeader from './ui/PageHeader';
import DataTable from './ui/DataTable';
import { EmptyState, Notice, Pill } from './ui/Feedback';
import { MODULE_HUES } from './theme/spectrum';

const HUE = MODULE_HUES.profile;
const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : '—'; } catch { return '—'; } };
const ROLE_LABEL = Object.fromEntries(PERMISSION_ROLES.map(role => [role.key, role.label]));
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

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

const SectionTitle = ({ id, children, aside }) => <div className="flex items-center justify-between gap-3">
  <h3 id={id} className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--adm-ink-2)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--hue)] shadow-[0_0_8px_var(--hue)]" aria-hidden="true" />{children}</h3>
  {aside}
</div>;

const Loading = () => <p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>;

// Миний профайл — тэнгэр дээр шууд (pearl sheet-гүй).
export default function ProfilePage({ apiUrl, user, children }) {
  const me = useFetch(`${apiUrl}/api/me`);
  const logins = useFetch(`${apiUrl}/api/me/logins`, LOGINS_PARAMS);
  const logs = useFetch(`${apiUrl}/api/me/logs`, LOGS_PARAMS);
  const profile = me.data || user || {};
  const loginRows = Array.isArray(logins.data) ? logins.data : [];
  const logRows = Array.isArray(logs.data) ? logs.data : [];
  const roles = [...new Set([profile.role, ...(Array.isArray(profile.roles) ? profile.roles : [])].filter(Boolean))];

  const loginColumns = [
    { key: 'at', header: 'Огноо', hideOnCard: true, className: 'adm-tnum whitespace-nowrap text-xs text-[var(--adm-ink-3)]', render: row => dt(row.at) },
    { key: 'device', header: 'Төхөөрөмж', hideOnCard: true, render: row => <span className="inline-flex flex-wrap items-center gap-2 text-[var(--adm-ink)]"><Monitor size={14} className="text-[var(--adm-ink-3)]" aria-hidden="true" />{parseUserAgent(row.userAgent).label}{row.current && <Pill hue="green">Энэ төхөөрөмж</Pill>}</span> },
    { key: 'ip', header: 'IP', className: 'font-mono text-xs', render: row => row.ip || '—' },
  ];

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={UserCircle} eyebrow="Бүртгэл" title="Миний профайл" description="Хувийн мэдээлэл, нэвтрэлт ба аюулгүй байдал" />

    <section className="glass relative overflow-hidden p-5 md:p-6" aria-labelledby="me-info">
      <span className="adm-card__rim" aria-hidden="true" />
      <span className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--hue)_22%,transparent),transparent)]" aria-hidden="true" />
      <h3 id="me-info" className="sr-only">Хувийн мэдээлэл</h3>
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(160deg,color-mix(in_srgb,var(--hue)_30%,transparent),rgba(255,255,255,0.04))] text-xl font-bold text-white ring-1 ring-inset ring-[color-mix(in_srgb,var(--hue)_40%,transparent)] shadow-[0_12px_40px_-12px_var(--hue)]" aria-hidden="true">{initials(profile.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-white">{profile.name || '—'}</p>
          <p className="mt-0.5 break-all text-sm text-[var(--adm-ink-2)]">{profile.email || '—'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roles.map(role => <Pill key={role} hue={role === 'admin' ? 'violet' : 'cyan'} dot={false}>{ROLE_LABEL[role] || role}</Pill>)}
            {profile.isTwoFAEnabled ? <Pill hue="green">2FA идэвхтэй</Pill> : <Pill hue="neutral" dot={false}>2FA идэвхгүй</Pill>}
          </div>
        </div>
        <dl className="grid gap-4 border-t border-white/[0.07] pt-4 text-sm sm:grid-cols-2 md:min-w-[22rem] md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div><dt className="adm-label">Мэдэгдлийн имэйл</dt><dd className="mt-1 break-all text-[var(--adm-ink)]">{profile.notificationEmail || <span className="text-[var(--adm-ink-3)]">Бүртгэлгүй</span>}</dd></div>
          <div><dt className="adm-label">Бүртгүүлсэн</dt><dd className="adm-tnum mt-1 text-[var(--adm-ink)]">{dt(profile.createdAt)}</dd></div>
        </dl>
      </div>
      {me.loading && <div className="relative mt-4"><Loading /></div>}
      {me.error && <Notice kind="info" className="relative mt-4 !text-[13px]">{me.error} Хадгалагдсан мэдээллийг харуулж байна.</Notice>}
    </section>

    {children}

    <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-5">
      <section className="min-w-0 space-y-3 xl:col-span-3" aria-labelledby="me-logins">
        <SectionTitle id="me-logins" aside={loginRows.length > 0 && <span className="adm-tnum text-xs text-[var(--adm-ink-3)]">Сүүлийн {loginRows.length}</span>}>Нэвтрэлтийн түүх</SectionTitle>
        {logins.loading && <Loading />}
        {logins.error && <Notice kind="err">{logins.error}</Notice>}
        {!logins.loading && !logins.error && loginRows.length === 0 && <EmptyState icon={Monitor} title="Нэвтрэлтийн түүх алга." />}
        {loginRows.length > 0 && <DataTable caption="Сүүлийн нэвтрэлтүүд" columns={loginColumns} rows={loginRows} rowKey={row => `${row.at}-${row.ip || ''}-${row.userAgent || ''}`}
          cardTitle={row => <><p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{dt(row.at)}</p><p className="mt-1 text-[15px] font-semibold text-white">{parseUserAgent(row.userAgent).label}</p></>}
          cardAside={row => (row.current ? <Pill hue="green">Энэ төхөөрөмж</Pill> : null)} />}
      </section>

      <section className="min-w-0 space-y-3 xl:col-span-2" aria-labelledby="me-logs">
        <SectionTitle id="me-logs" aside={logRows.length > 0 && <span className="adm-tnum text-xs text-[var(--adm-ink-3)]">{logRows.length} бичлэг</span>}>Миний үйлдлийн лог</SectionTitle>
        {logs.loading && <Loading />}
        {logs.error && <Notice kind="err">{logs.error}</Notice>}
        {!logs.loading && !logs.error && logRows.length === 0 && <EmptyState icon={History} title="Бичлэг алга." />}
        {logRows.length > 0 && <div className="glass relative">
          <span className="adm-card__rim" aria-hidden="true" />
          <ol tabIndex={0} aria-label="Миний үйлдлийн лог" className="relative max-h-[30rem] overflow-y-auto px-5 py-4 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">{logRows.map((row, index) => <li key={`${row.date}-${index}`} className="relative border-l border-white/10 pb-4 pl-5 last:pb-0">
            <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-[var(--hue)] shadow-[0_0_8px_var(--hue)]" aria-hidden="true" />
            <p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{dt(row.date)}</p>
            <p className="mt-0.5 font-mono text-[13px] font-medium text-white">{row.action}</p>
            {row.details && <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--adm-ink-2)]">{typeof row.details === 'string' ? row.details : JSON.stringify(row.details)}</p>}
          </li>)}</ol>
        </div>}
      </section>
    </div>
  </div>;
}
