import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, ClipboardList, Loader2, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@shared/loanTaskStatus';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import TaskStatusBadge from './TaskStatusBadge';
import ChannelBadge from './ChannelBadge';
import { isManagerUser } from './configHelpers';
import LoanTaskDetail from './LoanTaskDetail';
import ConfirmDeleteDialog from '../admin/ConfirmDeleteDialog';
import { useMediaQuery } from '../admin/theme/hooks';
import { deleteLoanRequest, errorMessage, fetchAssignees, fetchTaskList, fetchTaskSummary, postTaskAction } from './api';

const STATUS_DOTS = { new: '#4CC6FF', assigned: '#7C8CFF', additional_docs: '#F3CB55', in_review: '#B794FF', rejected: '#FF6B86', resolved: '#34D399' };
const money = value => (Number(value) > 0 ? `${Number(value).toLocaleString('mn-MN')} ₮` : '—');
const date = value => { try { return value ? new Date(value).toLocaleDateString('mn-MN') : '—'; } catch { return '—'; } };

// Хуучин зээлийн үйл явц (legacy LOS) руу орох товч UI-аас бүрэн хасагдсан.
export default function LoanTaskBoard({ apiUrl, user }) {
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTitleRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  // Мобайл шүүлтүүрийн sheet: Escape-ээр хаагдана, нээлттэй үед арын хуудас гүйлгэгдэхгүй.
  useEffect(() => {
    if (!isMobile || !filtersOpen) return undefined;
    filterTitleRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape') setFiltersOpen(false); };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [isMobile, filtersOpen]);

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
  const deleteButton = (item, mobile) => (item.canDelete ? <button type="button" onClick={() => { setDeleteError(''); setDeleting(item); }} aria-label={`${item.applicationReference || 'Хүсэлт'} — устгах`} className={`adm-row-btn adm-row-btn--danger ${mobile ? 'adm-row-btn--lg' : ''}`}><Trash2 size={14} aria-hidden="true" /><span className="sr-only">Устгах</span></button> : null);

  const chips = [['all', 'Бүгд', counts?.total], ...TASK_STATUSES.map(code => [code, TASK_STATUS_LABELS[code], counts?.counts?.[code]])];
  const activeFilterCount = [filters.assignee !== (manager ? 'all' : 'me'), filters.productKey, filters.subProductId, filters.source !== 'all', filters.sort !== 'newest'].filter(Boolean).length;
  const filterSheetOpen = isMobile && filtersOpen;

  // Fixed-position dialogs live outside the space-y stack so they don't inherit a top margin.
  return <div className="adm-board" style={{ '--hue': 'var(--sp-green)' }}><div className="space-y-4 md:space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="adm-eyebrow flex items-center gap-2 !text-[#7FE3B8]"><ClipboardList size={14} aria-hidden="true" />Зээл</p>
        <h2 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-white md:text-[30px]">Зээлийн хүсэлт</h2>
        <p className="mt-1 text-sm text-[var(--adm-ink-2)]"><span className="adm-tnum font-semibold text-white">{list.total}</span> хүсэлт{status === 'loading' ? ' · шинэчилж байна…' : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filterSheetOpen} aria-controls="loan-filter-sheet" className="adm-btn adm-mobile-only" style={{ '--hue': 'var(--sp-green)' }}><SlidersHorizontal size={16} aria-hidden="true" />Шүүлтүүр{activeFilterCount > 0 && <span className="adm-tnum grid h-5 min-w-5 place-items-center rounded-full bg-[#34D399] px-1 text-[11px] font-bold text-[#052E1C]">{activeFilterCount}</span>}</button>
        <button type="button" onClick={load} disabled={status === 'loading'} className="adm-btn disabled:opacity-60" style={{ '--hue': 'var(--sp-green)' }}><RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" /><span className="hidden sm:inline">Шинэчлэх</span><span className="sr-only sm:hidden">Шинэчлэх</span></button>
      </div>
    </div>

    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label="Төлвөөр шүүх">
      {chips.map(([code, label, count]) => <button key={code} type="button" aria-pressed={filters.status === code} onClick={() => setFilter('status', code)} className="adm-chip-btn">
        {code !== 'all' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOTS[code] }} aria-hidden="true" />}
        {label}{count != null ? <span className="adm-chip-btn__count adm-tnum">{count}</span> : null}
      </button>)}
    </div>

    <div className="glass adm-toolbar relative flex flex-col gap-3 p-3 md:flex-row md:items-end md:p-4" role="search" aria-label="Хүсэлт хайх, шүүх">
      <span className="adm-card__rim" aria-hidden="true" />
      <label className="relative block min-w-0 md:w-[30%] md:shrink-0"><span className="adm-label">Хайх</span>
        <Search size={16} className="pointer-events-none absolute bottom-3.5 left-3 text-[var(--adm-ink-3)]" aria-hidden="true" />
        <input type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={80} placeholder="Дугаар, нэр, утас" className="adm-field mt-1.5 w-full !pl-9" />
      </label>
      <div className="adm-scrim md:hidden" data-open={filterSheetOpen ? 'true' : 'false'} onClick={() => setFiltersOpen(false)} aria-hidden="true" />
      <div id="loan-filter-sheet" className="adm-filter-panel" data-open={filterSheetOpen ? 'true' : 'false'} role={isMobile ? 'dialog' : undefined} aria-modal={filterSheetOpen ? 'true' : undefined} aria-labelledby={isMobile ? 'loan-filter-title' : undefined} inert={isMobile && !filtersOpen ? true : undefined}>
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h3 id="loan-filter-title" ref={filterTitleRef} tabIndex={-1} className="text-lg font-bold text-white outline-none">Шүүлтүүр</h3>
          <button type="button" onClick={() => setFiltersOpen(false)} className="adm-icon-btn" aria-label="Шүүлтүүр хаах"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="block min-w-0"><span className="adm-label">Хариуцагч</span>
            <select className="adm-field mt-1.5 w-full" value={filters.assignee} disabled={!manager} onChange={event => setFilter('assignee', event.target.value)}>
              {manager ? <><option value="all">Бүгд</option><option value="me">Надад</option><option value="unassigned">Хуваарилаагүй</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</> : <option value="me">Надад</option>}
            </select>
          </label>
          <label className="block min-w-0"><span className="adm-label">Бүтээгдэхүүн</span>
            <select className="adm-field mt-1.5 w-full" value={filters.productKey} onChange={event => setFilter('productKey', event.target.value)}><option value="">Бүгд</option>{LOAN_PRODUCTS.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
          </label>
          <label className="block min-w-0"><span className="adm-label">Дэд бүтээгдэхүүн</span>
            <select className="adm-field mt-1.5 w-full" value={filters.subProductId} onChange={event => setFilter('subProductId', event.target.value)}><option value="">Бүгд</option>{subOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          </label>
          <label className="block min-w-0"><span className="adm-label">Эх үүсвэр</span>
            <select className="adm-field mt-1.5 w-full" value={filters.source} onChange={event => setFilter('source', event.target.value)}><option value="all">Бүгд</option><option value="task">Шинэ маягт</option><option value="legacy">Хуучин</option><option value="messenger">Messenger</option><option value="webchat">Вэб чат</option></select>
          </label>
          <label className="block min-w-0"><span className="adm-label">Эрэмбэ</span>
            <select className="adm-field mt-1.5 w-full" value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="newest">Шинэ нь эхэнд</option><option value="oldest">Хуучин нь эхэнд</option></select>
          </label>
        </div>
        <button type="button" onClick={() => setFiltersOpen(false)} className="adm-btn adm-mobile-only mt-5 w-full" style={{ '--hue': 'var(--sp-green)' }}>Үр дүн харах · <span className="adm-tnum">{list.total}</span></button>
      </div>
    </div>

    {flash && <p role="status" className="adm-note adm-note--ok">{flash}</p>}
    {rowError && <p role="alert" className="adm-note adm-note--err">{rowError}</p>}
    {status === 'error' && <div role="alert" className="adm-note adm-note--err">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Дахин оролдох</button></div>}
    {status === 'loading' && list.items.length === 0 && <p role="status" className="glass flex items-center gap-2 p-6 text-[var(--adm-ink-2)]"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
    {status === 'ready' && list.items.length === 0 && <p className="glass p-10 text-center text-[var(--adm-ink-2)]">Хүсэлт олдсонгүй.</p>}

    {list.items.length > 0 && <>
      {selectedIds.length > 0 && <div role="region" aria-label="Сонгосон хүсэлтүүд" className="sticky top-[76px] z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF6B86]/30 bg-[#2A0F1A]/90 p-3 text-sm text-[#FFD3DC] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <span className="font-semibold">{selectedIds.length} хүсэлт сонгосон</span>
        <button type="button" onClick={() => { setDeleteError(''); setDeleting({ bulk: true, ids: selectedIds }); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#E11D48] px-3 font-semibold text-white hover:bg-[#BE123C]"><Trash2 size={14} aria-hidden="true" />Сонгосныг устгах</button>
        <button type="button" onClick={() => setSelected(new Set())} className="min-h-10 rounded-xl border border-white/15 px-3 text-white hover:bg-white/[0.06]">Сонголт цуцлах</button>
      </div>}

      <div className="glass relative hidden md:block">
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="adm-table-wrap">
          <table className="adm-table w-full text-left text-sm">
            <caption className="sr-only">Зээлийн хүсэлтийн жагсаалт</caption>
            <thead><tr>{deletable.length > 0 && <th scope="col" className="w-10"><input type="checkbox" aria-label="Энэ хуудасны устгаж болох бүх хүсэлтийг сонгох" checked={allSelected} onChange={toggleAll} className="adm-check" /></th>}{['Дугаар', 'Нэр', 'Бүтээгдэхүүн', 'Дүн', 'Төлөв', 'Хариуцагч', 'Огноо', ''].map(label => <th key={label} scope="col" className={label === 'Дүн' ? 'text-right' : ''}>{label || <span className="sr-only">Үйлдэл</span>}</th>)}</tr></thead>
            <tbody>{list.items.map(item => <tr key={item._id} className="adm-row" data-selected={selected.has(item._id) ? 'true' : undefined}>
              {deletable.length > 0 && <td>{item.canDelete && <input type="checkbox" aria-label={`${item.applicationReference || 'Дугааргүй хүсэлт'} сонгох`} checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} className="adm-check" />}</td>}
              <td className="whitespace-nowrap font-mono text-[12.5px] text-[var(--adm-ink-2)]">{item.applicationReference || '—'}{item.channel && item.channel !== 'web' && <span className="mt-1 block"><ChannelBadge channel={item.channel} tone="dark" className="" /></span>}</td>
              <td className="min-w-[9rem]"><span className="font-semibold text-white">{item.displayName || '—'}</span><span className="block text-xs text-[var(--adm-ink-3)]">{item.phone}</span></td>
              <td className="min-w-[9rem] text-[var(--adm-ink-2)]">{item.productName || item.productKey || '—'}{item.subProductName && <span className="block text-xs text-[var(--adm-ink-3)]">{item.subProductName}</span>}</td>
              <td className="adm-tnum whitespace-nowrap text-right font-semibold text-white">{money(item.amount)}</td>
              <td><TaskStatusBadge status={item.taskStatus} outcome={item.outcome} legacy={item.taskStatusSource === 'legacy'} tone="dark" /></td>
              <td>{manager ? <select aria-label={`${item.applicationReference || 'Хүсэлт'} — хариуцагч`} className="adm-field adm-field--sm w-[9.5rem]" value={item.assignee?.userId || ''} onChange={event => quickAssign(item, event.target.value)}><option value="">Хуваарилаагүй</option>{item.assignee?.userId && !assignees.some(person => person._id === item.assignee.userId) && <option value={item.assignee.userId}>{item.assignee.name}</option>}{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select> : <span className="text-[var(--adm-ink-2)]">{item.assignee?.name || '—'}</span>}</td>
              <td className="adm-tnum whitespace-nowrap text-xs text-[var(--adm-ink-3)]">{date(item.createdAt)}</td>
              <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><button type="button" onClick={() => setOpenId(item._id)} className="adm-row-btn" aria-label={`${item.applicationReference || 'Хүсэлт'} — нээх`}>Нээх<ArrowUpRight size={14} aria-hidden="true" /></button>{deleteButton(item, false)}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">{list.items.map(item => <li key={item._id} className="glass relative p-4" data-selected={selected.has(item._id) ? 'true' : undefined}>
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-[var(--adm-ink-3)]">{item.applicationReference || '—'}<ChannelBadge channel={item.channel} tone="dark" /></p>
            <p className="mt-1 truncate text-[15px] font-semibold text-white">{item.displayName || '—'}</p>
          </div>
          <TaskStatusBadge status={item.taskStatus} outcome={item.outcome} legacy={item.taskStatusSource === 'legacy'} tone="dark" className="shrink-0 justify-end" />
        </div>
        <dl className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="col-span-2"><dt className="sr-only">Бүтээгдэхүүн</dt><dd className="text-[var(--adm-ink-2)]">{item.productName || item.productKey || '—'}{item.subProductName ? ` · ${item.subProductName}` : ''}</dd></div>
          <div><dt className="adm-label">Дүн</dt><dd className="adm-tnum mt-0.5 font-semibold text-white">{money(item.amount)}</dd></div>
          <div><dt className="adm-label">Огноо</dt><dd className="adm-tnum mt-0.5 text-[var(--adm-ink-2)]">{date(item.createdAt)}</dd></div>
          <div className="col-span-2"><dt className="adm-label">Хариуцагч</dt><dd className="mt-0.5 text-[var(--adm-ink-2)]">{item.assignee?.name || '—'}</dd></div>
        </dl>
        <div className="relative mt-4 flex gap-2">
          {item.canDelete && <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-[#FFB8C5]"><input type="checkbox" checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} className="adm-check" />Сонгох</label>}
          <button type="button" onClick={() => setOpenId(item._id)} className="adm-btn flex-1" style={{ '--hue': 'var(--sp-green)' }}>Нээх<ArrowUpRight size={16} aria-hidden="true" /></button>
          {deleteButton(item, true)}
        </div>
      </li>)}</ul>

      <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Хуудаслалт">
        <button type="button" disabled={page <= 1 || status === 'loading'} onClick={() => setPage(page - 1)} className="adm-row-btn adm-row-btn--lg disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" />Өмнөх</button>
        <span className="adm-tnum text-[var(--adm-ink-2)]">{page} / {list.pages} · нийт {list.total}</span>
        <button type="button" disabled={page >= list.pages || status === 'loading'} onClick={() => setPage(page + 1)} className="adm-row-btn adm-row-btn--lg disabled:opacity-40">Дараах<ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </>}
    </div>

    {openId && <LoanTaskDetail apiUrl={apiUrl} id={openId} user={user} assignees={assignees} onClose={() => setOpenId(null)} onChanged={load} onDeleted={() => { setOpenId(null); setFlash('Хүсэлт устгагдлаа.'); load(); }} />}
    {deleting && <ConfirmDeleteDialog reference={deleting.bulk ? '' : deleting.applicationReference} count={deleting.bulk ? deleting.ids.length : 1} busy={deleteBusy} error={deleteError} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
  </div>;
}
