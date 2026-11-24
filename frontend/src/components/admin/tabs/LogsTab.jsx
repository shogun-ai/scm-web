import { useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';
import Tabs from '../ui/Tabs';
import DataTable from '../ui/DataTable';
import Button from '../ui/Button';
import { EmptyState, Notice, Pill } from '../ui/Feedback';
import { Field, SearchInput, Select } from '../ui/Form';
import { MODULE_HUES, SPECTRUM } from '../theme/spectrum';

const HUE = MODULE_HUES.logs;
const when = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : '—'; } catch { return '—'; } };
const text = value => (value == null || value === '' ? '—' : typeof value === 'string' ? value : JSON.stringify(value));
const isLogin = log => log.action === 'loan_login';
const isLoan = log => String(log.action || '').startsWith('loan_');
const actionHue = log => (isLogin(log) ? 'green' : isLoan(log) ? 'gold' : 'indigo');
const KINDS = [
  { id: 'all', label: 'Бүгд' },
  { id: 'login', label: 'Login', dot: SPECTRUM.green },
  { id: 'loan', label: 'Loan үйлдэл', dot: SPECTRUM.gold },
];

// Үйлдлийн лог — тэнгэр дээр шууд. Шүүлт нь ачаалсан жагсаалт дээр клиент талд (API өөрчлөлтгүй).
export default function LogsTab({ logs, refreshLogs }) {
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const list = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);

  const counts = useMemo(() => ({ all: list.length, login: list.filter(isLogin).length, loan: list.filter(isLoan).length }), [list]);
  const roles = useMemo(() => [...new Set(list.map(log => log.userRole).filter(Boolean))].sort(), [list]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(log => (kind === 'all' || (kind === 'login' ? isLogin(log) : isLoan(log)))
      && (role === 'all' || log.userRole === role)
      && (!q || `${log.userName || ''} ${log.action || ''} ${text(log.details)}`.toLowerCase().includes(q)));
  }, [list, kind, role, query]);

  const refresh = async () => {
    setRefreshing(true); setError('');
    try { await refreshLogs(); } catch { setError('Лог шинэчлэхэд алдаа гарлаа'); } finally { setRefreshing(false); }
  };

  const actionPill = log => <Pill hue={actionHue(log)} className="font-mono !font-semibold">{log.action || '—'}</Pill>;
  const columns = [
    { key: 'date', header: 'Огноо', hideOnCard: true, className: 'adm-tnum whitespace-nowrap align-top text-xs text-[var(--adm-ink-3)]', render: log => when(log.date) },
    { key: 'user', header: 'Хэрэглэгч', hideOnCard: true, className: 'align-top', render: log => <span className="font-semibold text-white">{log.userName || '—'}</span> },
    { key: 'role', header: 'Эрх', className: 'align-top text-xs', render: log => log.userRole || '—' },
    { key: 'action', header: 'Үйлдэл', hideOnCard: true, className: 'align-top whitespace-nowrap', render: actionPill },
    { key: 'details', header: 'Дэлгэрэнгүй', cardWide: true, className: 'min-w-[16rem] max-w-xl align-top break-words', render: log => text(log.details) },
  ];

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={Activity} eyebrow="Аудит" title="Үйлдлийн лог" count={list.length} countLabel="бичлэг" description="loan.scm.mn болон админ панел дээрх оролт, зээлийн үйлдлүүд"
      actions={<Button hue={HUE} busy={refreshing} disabled={refreshing} icon={<RefreshCw size={16} aria-hidden="true" />} onClick={refresh}>Шинэчлэх</Button>} />
    {error && <Notice kind="err">{error}</Notice>}
    <Tabs label="Үйлдлийн төрлөөр шүүх" value={kind} onChange={setKind} items={KINDS.map(item => ({ ...item, count: counts[item.id] }))} />
    <Toolbar
      columns={2}
      activeCount={role !== 'all' ? 1 : 0}
      resultCount={rows.length}
      label="Лог хайх, шүүх"
      search={<SearchInput value={query} onChange={event => setQuery(event.target.value)} maxLength={80} placeholder="Хэрэглэгч, үйлдэл, дэлгэрэнгүй" />}
      filters={<Field label="Эрх">{({ id }) => <Select id={id} value={role} onChange={event => setRole(event.target.value)}>
        <option value="all">Бүгд</option>{roles.map(item => <option key={item} value={item}>{item}</option>)}
      </Select>}</Field>}
    />
    {rows.length === 0
      ? <EmptyState icon={Activity} title={list.length ? 'Шүүлтэд тохирох бичлэг алга' : 'Лог бүртгэл алга байна.'} description={list.length ? 'Шүүлтүүр эсвэл хайлтаа өөрчилж үзнэ үү.' : undefined} />
      : <DataTable
        caption="Үйлдлийн лог"
        columns={columns}
        rows={rows}
        cardTitle={log => <><p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{when(log.date)}</p><p className="mt-1 truncate text-[15px] font-semibold text-white">{log.userName || '—'}</p></>}
        cardAside={actionPill}
      />}
  </div>;
}
