import { useMemo, useState } from 'react';
import { ArrowUpRight, Handshake } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';
import Tabs from '../ui/Tabs';
import DataTable from '../ui/DataTable';
import { EmptyState, Pill } from '../ui/Feedback';
import { Field, SearchInput, Select } from '../ui/Form';

const date = value => { try { return value ? new Date(value).toLocaleDateString('mn-MN') : '—'; } catch { return '—'; } };
const name = trust => `${trust.lastname || ''} ${trust.firstname || ''}`.trim() || 'Нэргүй';
const STATUS = [
  { id: 'all', label: 'Бүгд' },
  { id: 'pending', label: 'Хүлээгдэж байна', dot: '#F3CB55' },
  { id: 'resolved', label: 'Шийдсэн', dot: '#34D399' },
];

// Итгэлцлийн хүсэлтүүд — алтан (gold) спектрийн өнгөтэй жагсаалт. Шүүлт нь ачаалсан жагсаалт дээр клиент талд хийгдэнэ.
export default function TrustsTab({ setContactNote, setSelectedTrust, trusts }) {
  const [status, setStatus] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');
  const list = useMemo(() => (Array.isArray(trusts) ? trusts : []), [trusts]);

  const counts = useMemo(() => ({ all: list.length, pending: list.filter(t => t.status !== 'resolved').length, resolved: list.filter(t => t.status === 'resolved').length }), [list]);
  const assignees = useMemo(() => [...new Set(list.map(t => t.assignee?.name).filter(Boolean))].sort(), [list]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = list.filter(t => (status === 'all' || (status === 'resolved' ? t.status === 'resolved' : t.status !== 'resolved'))
      && (assignee === 'all' || (assignee === 'none' ? !t.assignee?.name : t.assignee?.name === assignee))
      && (!q || `${name(t)} ${t.phone || ''} ${t.email || ''}`.toLowerCase().includes(q)));
    return [...filtered].sort((a, b) => (sort === 'newest' ? 1 : -1) * (new Date(b.createdAt) - new Date(a.createdAt)));
  }, [list, status, assignee, sort, query]);
  const open = trust => { setSelectedTrust(trust); setContactNote(trust.contactNote || ''); };
  const activeCount = [assignee !== 'all', sort !== 'newest'].filter(Boolean).length;

  const statusPill = t => <Pill hue={t.status === 'resolved' ? 'green' : 'gold'}>{t.status === 'resolved' ? 'Шийдсэн' : 'Хүлээгдэж байна'}</Pill>;
  const openBtn = (t, wide) => <button type="button" onClick={() => open(t)} className={wide ? 'adm-btn flex-1' : 'adm-row-btn'} aria-label={`${name(t)} — итгэлцлийн хүсэлт нээх`}>Нээх<ArrowUpRight size={wide ? 16 : 14} aria-hidden="true" /></button>;
  const columns = [
    { key: 'date', header: 'Огноо', hideOnCard: true, className: 'adm-tnum whitespace-nowrap text-xs text-[var(--adm-ink-3)]', render: t => date(t.createdAt) },
    { key: 'name', header: 'Нэр', hideOnCard: true, className: 'min-w-[10rem]', render: t => <><span className="font-semibold text-white">{name(t)}</span>{t.email && <span className="block break-all text-xs text-[var(--adm-ink-3)]">{t.email}</span>}</> },
    { key: 'phone', header: 'Утас', className: 'adm-tnum whitespace-nowrap', render: t => t.phone || '—' },
    { key: 'amount', header: 'Дүн', align: 'right', className: 'adm-tnum whitespace-nowrap', render: t => <span className="font-semibold text-white">{t.amount || '—'}</span> },
    { key: 'assignee', header: 'Хариуцагч', cardWide: true, render: t => (t.assignee?.name ? <span className="font-medium text-[var(--adm-ink)]">{t.assignee.name}</span> : <span className="text-[var(--adm-ink-3)]">Хуваарилаагүй</span>) },
    { key: 'status', header: 'Төлөв', hideOnCard: true, render: statusPill },
    { key: 'action', header: '', hideOnCard: true, className: 'whitespace-nowrap', render: t => openBtn(t, false) },
  ];

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-gold)' }}>
    <PageHeader hue="gold" icon={Handshake} eyebrow="Итгэлцэл" title="Итгэлцлийн хүсэлтүүд" count={list.length} countLabel="хүсэлт" description={counts.pending ? `${counts.pending} хүлээгдэж байна` : undefined} />
    <Tabs label="Төлвөөр шүүх" value={status} onChange={setStatus} items={STATUS.map(item => ({ ...item, count: counts[item.id] }))} />
    <Toolbar
      columns={2}
      activeCount={activeCount}
      resultCount={rows.length}
      search={<SearchInput value={query} onChange={event => setQuery(event.target.value)} maxLength={80} placeholder="Нэр, утас, имэйл" />}
      filters={<>
        <Field label="Хариуцагч">{({ id }) => <Select id={id} value={assignee} onChange={event => setAssignee(event.target.value)}>
          <option value="all">Бүгд</option><option value="none">Хуваарилаагүй</option>{assignees.map(person => <option key={person} value={person}>{person}</option>)}
        </Select>}</Field>
        <Field label="Эрэмбэ">{({ id }) => <Select id={id} value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Шинэ нь эхэнд</option><option value="oldest">Хуучин нь эхэнд</option></Select>}</Field>
      </>}
    />
    {rows.length === 0
      ? <EmptyState icon={Handshake} title={list.length ? 'Шүүлтэд тохирох хүсэлт алга' : 'Хүсэлт байхгүй байна.'} description={list.length ? 'Шүүлтүүр эсвэл хайлтаа өөрчилж үзнэ үү.' : undefined} />
      : <DataTable
        caption="Итгэлцлийн хүсэлтийн жагсаалт"
        columns={columns}
        rows={rows}
        cardTitle={t => <><p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{date(t.createdAt)}</p><p className="mt-1 truncate text-[15px] font-semibold text-white">{name(t)}</p></>}
        cardAside={statusPill}
        cardFooter={t => openBtn(t, true)}
      />}
  </div>;
}
