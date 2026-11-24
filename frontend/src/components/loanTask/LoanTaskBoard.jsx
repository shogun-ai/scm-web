import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, History, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@shared/loanTaskStatus';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import TaskStatusBadge from './TaskStatusBadge';
import ChannelBadge from './ChannelBadge';
import { isManagerUser } from './configHelpers';
import LoanTaskDetail from './LoanTaskDetail';
import ConfirmDeleteDialog from '../admin/ConfirmDeleteDialog';
import { deleteLoanRequest, errorMessage, fetchAssignees, fetchTaskList, fetchTaskSummary, postTaskAction } from './api';

const SELECT = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';
const money = value => (Number(value) > 0 ? `${Number(value).toLocaleString('mn-MN')} ₮` : '—');
const date = value => { try { return value ? new Date(value).toLocaleDateString('mn-MN') : '—'; } catch { return '—'; } };

export default function LoanTaskBoard({ apiUrl, user, onOpenLegacy }) {
  const manager = isManagerUser(user);
  const [filters, setFilters] = useState({ status: 'all', assignee: manager ? 'all' : 'me', productKey: '', subProductId: '', source: 'all', sort: 'newest' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ key: '', list: { items: [], total: 0, pages: 1 }, counts: null, error: '' });
  const [tick, setTick] = useState(0);
  const [assignees, setAssignees] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [rowError, setRowError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [flash, setFlash] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => { const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [searchInput]);
  useEffect(() => {
    if (!manager) return;
    fetchAssignees(apiUrl).then(rows => setAssignees(Array.isArray(rows) ? rows : [])).catch(() => setAssignees([]));
  }, [apiUrl, manager]);

  const queryKey = JSON.stringify([filters, search, page, tick, apiUrl]);
  useEffect(() => {
    let cancelled = false;
    const query = { page, limit: 20, sort: filters.sort };
    if (filters.status !== 'all') query.status = filters.status;
    if (filters.assignee !== 'all') query.assignee = filters.assignee;
    if (filters.productKey) query.productKey = filters.productKey;
    if (filters.subProductId) query.subProductId = filters.subProductId;
    if (filters.source !== 'all') query.source = filters.source;
    if (search) query.search = search;
    const summaryQuery = {};
    if (filters.assignee !== 'all') summaryQuery.assignee = filters.assignee;
    if (filters.productKey) summaryQuery.productKey = filters.productKey;
    (async () => {
      try {
        const [data, summary] = await Promise.all([fetchTaskList(apiUrl, query), fetchTaskSummary(apiUrl, summaryQuery).catch(() => null)]);
        if (!cancelled) setResult({ key: queryKey, list: { items: Array.isArray(data?.items) ? data.items : [], total: data?.total || 0, pages: data?.pages || 1 }, counts: summary?.counts && typeof summary.counts === 'object' ? summary : null, error: '' });
      } catch (err) {
        if (!cancelled) setResult(previous => ({ ...previous, key: queryKey, error: errorMessage(err, 'Жагсаалт ачаалж чадсангүй.') }));
      }
    })();
    return () => { cancelled = true; };
  }, [apiUrl, filters, search, page, queryKey]);
  const load = () => setTick(value => value + 1);
  const { list, counts, error } = result;
  const status = result.key !== queryKey ? 'loading' : error ? 'error' : 'ready';

  const setFilter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value, ...(key === 'productKey' ? { subProductId: '' } : {}) })); setPage(1); };
  const subOptions = useMemo(() => {
    const seen = new Map();
    list.items.forEach(item => { if (item.subProductId) seen.set(item.subProductId, item.subProductName || item.subProductId); });
    return [...seen.entries()];
  }, [list.items]);

  const quickAssign = async (item, assigneeId) => {
    setRowError('');
    try {
      await postTaskAction(apiUrl, item._id, { type: 'assign', assigneeId, expectedRevision: item.taskRevision || 0 });
      load();
    } catch (err) {
      setRowError(err.response?.status === 409 ? 'Өөр хүн өөрчилсөн байна. Жагсаалтыг шинэчиллээ.' : errorMessage(err));
      load();
    }
  };

  const deleteMessage = err => (err.response?.data?.code === 'DELETE_DISABLED' ? 'Устгах тохиргоо унтраалттай байна. Тохиргоо → Устгах тохиргоо хэсгээс асаана уу.' : errorMessage(err, 'Устгаж чадсангүй.'));
  const deletable = list.items.filter(item => item.canDelete);
  const selectedIds = deletable.filter(item => selected.has(item._id)).map(item => item._id);
  const toggleSelect = id => setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allSelected = deletable.length > 0 && selectedIds.length === deletable.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(deletable.map(item => item._id)));

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true); setDeleteError('');
    if (deleting.bulk) {
      let done = 0; let lastError = '';
      for (const id of deleting.ids) {
        try { await deleteLoanRequest(apiUrl, id); done += 1; } catch (err) { lastError = deleteMessage(err); if (err.response?.data?.code === 'DELETE_DISABLED') break; }
      }
      setDeleteBusy(false); setSelected(new Set()); load();
      if (lastError && done === 0) { setDeleteError(lastError); return; }
      setFlash(`${done} хүсэлт устгагдлаа.${lastError ? ` ${deleting.ids.length - done} хүсэлтийг устгаж чадсангүй: ${lastError}` : ''}`);
      setDeleting(null);
      return;
    }
    try {
      await deleteLoanRequest(apiUrl, deleting._id);
      setFlash(`Хүсэлт ${deleting.applicationReference || ''} устгагдлаа.`);
      setDeleting(null); load();
    } catch (err) {
      setDeleteError(deleteMessage(err));
    } finally { setDeleteBusy(false); }
  };
  const deleteButton = (item, mobile) => (item.canDelete ? <button type="button" onClick={() => { setDeleteError(''); setDeleting(item); }} aria-label={`${item.applicationReference || 'Хүсэлт'} — устгах`} className={`inline-flex items-center justify-center gap-1 border border-red-300 bg-white font-semibold text-red-700 hover:bg-red-50 ${mobile ? 'mt-2 min-h-11 w-full rounded-xl text-sm' : 'ml-2 min-h-10 rounded-lg px-3 text-xs'}`}><Trash2 size={14} aria-hidden="true" />Устгах</button> : null);

  const chips = [['all', 'Бүгд', counts?.total], ...TASK_STATUSES.map(code => [code, TASK_STATUS_LABELS[code], counts?.counts?.[code]])];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><ClipboardList size={24} aria-hidden="true" />Зээлийн хүсэлт</h2>
      <div className="flex flex-wrap items-center gap-2">
        {manager && onOpenLegacy && <div className="flex flex-col items-start gap-1 sm:items-end">
          <button type="button" onClick={onOpenLegacy} aria-describedby="legacy-los-note" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"><History size={16} aria-hidden="true" />Хуучин зээлийн үйл явц</button>
          <p id="legacy-los-note" className="max-w-xs text-xs text-slate-500">Тэнд харагдах төлөв энэ самбарын төлөвөөс тусдаа бөгөөд хоорондоо шинэчлэгдэхгүй.</p>
        </div>}
        <button type="button" onClick={load} disabled={status === 'loading'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-medium text-white disabled:opacity-60"><RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />Шинэчлэх</button>
      </div>
    </div>

    <div className="flex flex-wrap gap-2" role="group" aria-label="Төлвөөр шүүх">
      {chips.map(([code, label, count]) => <button key={code} type="button" aria-pressed={filters.status === code} onClick={() => setFilter('status', code)} className={`min-h-10 rounded-full border px-4 text-sm font-medium ${filters.status === code ? 'border-[#003B5C] bg-[#003B5C] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{label}{count != null ? <span className="ml-2 tabular-nums opacity-80">{count}</span> : null}</button>)}
    </div>

    <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <label className="relative block text-xs font-semibold text-slate-600 sm:col-span-2">Хайх
        <Search size={16} className="pointer-events-none absolute bottom-3.5 left-3 text-slate-400" aria-hidden="true" />
        <input type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={80} placeholder="Дугаар, нэр, утас" className={`${SELECT} mt-1 w-full pl-9`} />
      </label>
      <label className="block text-xs font-semibold text-slate-600">Хариуцагч
        <select className={`${SELECT} mt-1 w-full`} value={filters.assignee} disabled={!manager} onChange={event => setFilter('assignee', event.target.value)}>
          {manager ? <><option value="all">Бүгд</option><option value="me">Надад</option><option value="unassigned">Хуваарилаагүй</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</> : <option value="me">Надад</option>}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-600">Бүтээгдэхүүн
        <select className={`${SELECT} mt-1 w-full`} value={filters.productKey} onChange={event => setFilter('productKey', event.target.value)}><option value="">Бүгд</option>{LOAN_PRODUCTS.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
      </label>
      <label className="block text-xs font-semibold text-slate-600">Дэд бүтээгдэхүүн
        <select className={`${SELECT} mt-1 w-full`} value={filters.subProductId} onChange={event => setFilter('subProductId', event.target.value)}><option value="">Бүгд</option>{subOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </label>
      <label className="block text-xs font-semibold text-slate-600">Эх үүсвэр
        <select className={`${SELECT} mt-1 w-full`} value={filters.source} onChange={event => setFilter('source', event.target.value)}><option value="all">Бүгд</option><option value="task">Шинэ маягт</option><option value="legacy">Хуучин</option><option value="messenger">Messenger</option><option value="webchat">Вэб чат</option></select>
      </label>
      <label className="block text-xs font-semibold text-slate-600">Эрэмбэ
        <select className={`${SELECT} mt-1 w-full`} value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="newest">Шинэ нь эхэнд</option><option value="oldest">Хуучин нь эхэнд</option></select>
      </label>
    </div>

    {flash && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{flash}</p>}
    {rowError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{rowError}</p>}
    {status === 'error' && <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Дахин оролдох</button></div>}
    {status === 'loading' && list.items.length === 0 && <p role="status" className="flex items-center gap-2 p-6 text-slate-600"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
    {status === 'ready' && list.items.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-slate-500">Хүсэлт олдсонгүй.</p>}

    {list.items.length > 0 && <>
      {selectedIds.length > 0 && <div role="region" aria-label="Сонгосон хүсэлтүүд" className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 shadow-sm">
        <span className="font-semibold">{selectedIds.length} хүсэлт сонгосон</span>
        <button type="button" onClick={() => { setDeleteError(''); setDeleting({ bulk: true, ids: selectedIds }); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-red-600 px-3 font-semibold text-white"><Trash2 size={14} aria-hidden="true" />Сонгосныг устгах</button>
        <button type="button" onClick={() => setSelected(new Set())} className="min-h-10 rounded-lg border border-red-300 bg-white px-3">Сонголт цуцлах</button>
      </div>}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Зээлийн хүсэлтийн жагсаалт</caption>
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{deletable.length > 0 && <th scope="col" className="w-10 px-4 py-3"><input type="checkbox" aria-label="Энэ хуудасны устгаж болох бүх хүсэлтийг сонгох" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-red-600" /></th>}{['Дугаар', 'Нэр', 'Бүтээгдэхүүн', 'Дүн', 'Төлөв', 'Хариуцагч', 'Огноо', ''].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{list.items.map(item => <tr key={item._id} className={selected.has(item._id) ? 'bg-red-50/60' : 'hover:bg-slate-50'}>
            {deletable.length > 0 && <td className="px-4 py-3">{item.canDelete && <input type="checkbox" aria-label={`${item.applicationReference || 'Дугааргүй хүсэлт'} сонгох`} checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} className="h-4 w-4 accent-red-600" />}</td>}
            <td className="px-4 py-3 font-mono text-xs">{item.applicationReference || '—'}<ChannelBadge channel={item.channel} /></td>
            <td className="px-4 py-3 font-medium">{item.displayName || '—'}<span className="block text-xs font-normal text-slate-500">{item.phone}</span></td>
            <td className="px-4 py-3">{item.productName || item.productKey || '—'}{item.subProductName && <span className="block text-xs text-slate-500">{item.subProductName}</span>}</td>
            <td className="px-4 py-3 tabular-nums">{money(item.amount)}</td>
            <td className="px-4 py-3"><TaskStatusBadge status={item.taskStatus} outcome={item.outcome} legacy={item.taskStatusSource === 'legacy'} /></td>
            <td className="px-4 py-3">{manager ? <select aria-label={`${item.applicationReference || 'Хүсэлт'} — хариуцагч`} className={`${SELECT} max-w-[11rem]`} value={item.assignee?.userId || ''} onChange={event => quickAssign(item, event.target.value)}><option value="">Хуваарилаагүй</option>{item.assignee?.userId && !assignees.some(person => person._id === item.assignee.userId) && <option value={item.assignee.userId}>{item.assignee.name}</option>}{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select> : (item.assignee?.name || '—')}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{date(item.createdAt)}</td>
            <td className="px-4 py-3"><button type="button" onClick={() => setOpenId(item._id)} className="min-h-10 rounded-lg bg-[#003B5C] px-3 text-xs font-semibold text-white">Нээх</button>{deleteButton(item, false)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">{list.items.map(item => <li key={item._id} className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2"><div>{item.canDelete && <label className="mb-1 flex min-h-9 items-center gap-2 text-xs text-red-700"><input type="checkbox" checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} className="h-4 w-4 accent-red-600" />Сонгох</label>}<p className="font-mono text-xs text-slate-500">{item.applicationReference || '—'}<ChannelBadge channel={item.channel} /></p><p className="font-semibold">{item.displayName || '—'}</p></div><TaskStatusBadge status={item.taskStatus} outcome={item.outcome} legacy={item.taskStatusSource === 'legacy'} /></div>
        <p className="mt-2 text-sm text-slate-600">{item.productName || item.productKey || '—'}{item.subProductName ? ` · ${item.subProductName}` : ''}</p>
        <p className="mt-1 text-sm tabular-nums">{money(item.amount)} · {date(item.createdAt)}</p>
        <p className="mt-1 text-xs text-slate-500">Хариуцагч: {item.assignee?.name || '—'}</p>
        <button type="button" onClick={() => setOpenId(item._id)} className="mt-3 min-h-11 w-full rounded-xl bg-[#003B5C] text-sm font-semibold text-white">Нээх</button>
        {deleteButton(item, true)}
      </li>)}</ul>
      <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Хуудаслалт">
        <button type="button" disabled={page <= 1 || status === 'loading'} onClick={() => setPage(page - 1)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-40">Өмнөх</button>
        <span className="text-slate-600">{page} / {list.pages} · нийт {list.total}</span>
        <button type="button" disabled={page >= list.pages || status === 'loading'} onClick={() => setPage(page + 1)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-40">Дараах</button>
      </nav>
    </>}

    {openId && <LoanTaskDetail apiUrl={apiUrl} id={openId} user={user} assignees={assignees} onClose={() => setOpenId(null)} onChanged={load} onDeleted={() => { setOpenId(null); setFlash('Хүсэлт устгагдлаа.'); load(); }} />}
    {deleting && <ConfirmDeleteDialog reference={deleting.bulk ? '' : deleting.applicationReference} count={deleting.bulk ? deleting.ids.length : 1} busy={deleteBusy} error={deleteError} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
  </div>;
}
