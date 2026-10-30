import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, ClipboardList, Loader2, RefreshCw, Search, X } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Шинэ / шийдээгүй', created: 'Ажилтан үүсгэсэн', assigned: 'Хуваарилсан',
  studying: 'Судалж байна', data_collection: 'Баримт бүрдүүлж байна', assessment: 'Үнэлгээ',
  committee: 'Хорооны хяналт', returned: 'Буцаасан', approved: 'Зөвшөөрсөн',
  rejected: 'Татгалзсан', resolved: 'Нөхцөлтэй зөвшөөрсөн', closed: 'Хаасан', disbursed: 'Олгосон',
};
const PRODUCTS = {
  biz_loan: 'Бизнесийн зээл', car_purchase_loan: 'Автомашин худалдан авах',
  car_coll_loan: 'Автомашин барьцаалсан', cons_loan: 'Хэрэглээний зээл',
  credit_card: 'Кредит карт', re_loan: 'Үл хөдлөх барьцаалсан', line_loan: 'Шугмын зээл',
};
const DECISIONS = { approved: 'Зөвшөөрөх', rejected: 'Татгалзах', resolved: 'Нөхцөлтэй зөвшөөрөх' };
const tokenHeaders = () => {
  try {
    const token = JSON.parse(localStorage.getItem('scm_auth') || '{}').token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
};
const nameOf = item => item.userType === 'organization'
  ? item.orgName || 'Байгууллага'
  : [item.lastname, item.firstname].filter(Boolean).join(' ') || 'Нэр бүртгээгүй';
const errorMessage = error => error.response?.data?.message || 'Хүсэлтийг боловсруулж чадсангүй. Дахин оролдоно уу.';
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003B5C]/30';

export default function LoanRequestQueue({ apiUrl, user, usersList = [], onOpen, onResearch, onItemsChange, refreshKey = 0 }) {
  const roles = useMemo(() => [...new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean))], [user]);
  const isManager = roles.some(role => ['admin', 'director'].includes(role));
  const [mine, setMine] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [openingId, setOpeningId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const editRef = useRef(null);
  const [assignees, setAssignees] = useState(null);
  const eligibleUsers = (Array.isArray(assignees) ? assignees : Array.isArray(usersList) ? usersList : []).filter(item =>
    item.isActive !== false && item.active !== false && [item.role, ...(Array.isArray(item.roles) ? item.roles : [])].some(role => ['admin', 'director', 'loan_officer', 'finance_manager'].includes(role)));

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${apiUrl}/api/config/permissions`, { headers: tokenHeaders(), signal: controller.signal })
      .then(response => setPermissions(response.data && typeof response.data === 'object' ? response.data : {}))
      .catch(() => {});
    return () => controller.abort();
  }, [apiUrl]);

  useEffect(() => {
    if (!isManager) return;
    const controller = new AbortController();
    axios.get(`${apiUrl}/api/loan-requests/assignees`, { headers: tokenHeaders(), signal: controller.signal })
      .then(response => setAssignees(Array.isArray(response.data) ? response.data : []))
      .catch(failure => { if (!axios.isCancel(failure)) setError('Хариуцагчийн жагсаалтыг ачаалж чадсангүй. Шинэчлэх товчийг дарж дахин оролдоно уу.'); });
    return () => controller.abort();
  }, [apiUrl, isManager, reload]);

  const canDecide = decision => roles.includes('admin') || (permissions !== null && roles.some(role => {
    const level = permissions?.[role]?.[`los_committee:${DECISIONS[decision]}`];
    return (level || (role === 'director' ? 'full' : 'none')) === 'full';
  }));

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    setError('');
    axios.get(`${apiUrl}/api/loan-requests`, {
      headers: tokenHeaders(), signal: controller.signal,
      params: { page, limit: 20, ...(status ? { status } : {}), ...(query ? { search: query } : {}), ...(!isManager || mine ? { mine: true } : {}) },
    }).then(response => {
      if (!mounted) return;
      if (!Array.isArray(response.data?.items)) throw new Error('invalid_response');
      const total = Number(response.data.total) || 0;
      const pages = Math.max(1, Number(response.data.pages) || Math.ceil(total / 20));
      if (page > pages) { setPage(pages); return; }
      setData({ items: response.data.items, total, pages });
      onItemsChange?.(response.data.items);
    }).catch(failure => {
      if (mounted && !axios.isCancel(failure)) { setError(errorMessage(failure)); setLoadError(true); }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; controller.abort(); };
  }, [apiUrl, page, status, query, mine, isManager, reload, refreshKey, onItemsChange]);

  const editRequestId = edit?.item._id;
  useEffect(() => {
    if (!editRequestId) return;
    editRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    editRef.current?.querySelector('select')?.focus({ preventScroll: true });
  }, [editRequestId]);

  const openCase = useCallback(async (item, callback) => {
    setOpeningId(item._id);
    setError('');
    try {
      const response = await axios.get(`${apiUrl}/api/loan-requests/${item._id}`, { headers: tokenHeaders() });
      if (!response.data?._id) throw new Error('invalid_response');
      callback?.(response.data);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setOpeningId(null); }
  }, [apiUrl]);

  const saveEdit = async event => {
    event.preventDefault();
    if (!edit || saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = {};
      if (edit.status !== edit.item.status) payload.status = edit.status;
      if (edit.note.trim()) payload.note = edit.note.trim();
      if (isManager && edit.assigneeId !== (edit.item.assignee?.userId || '')) payload.assigneeId = edit.assigneeId;
      if (!Object.keys(payload).length) { setEdit(null); return; }
      await axios.patch(`${apiUrl}/api/loan-requests/${edit.item._id}`, payload, { headers: tokenHeaders() });
      setEdit(null);
      setNotice('Хүсэлтийн өөрчлөлт хадгалагдлаа.');
      setReload(value => value + 1);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  };
  const finalStatuses = ['approved', 'rejected', 'resolved', 'disbursed', 'closed'];
  const availableStatuses = edit && finalStatuses.includes(edit.item.status)
    ? [edit.item.status, ...(isManager && edit.item.status !== 'closed' ? ['closed'] : [])]
    : [...(isManager ? ['pending'] : []), 'assigned', 'data_collection', 'studying', 'assessment', 'committee', 'returned', ...Object.keys(DECISIONS).filter(canDecide)];

  return (
    <div className="space-y-4 text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="text-lg font-bold text-[#003B5C]">{isManager && !mine ? 'Зээлийн хүсэлтийн дараалал' : 'Надад хуваарилсан хүсэлтүүд'}</h3><p className="mt-1 text-xs text-slate-500">Хүсэлт дээр ажиллана. Харилцагчийн тусдаа бүртгэл үүсгэх шаардлагагүй.</p></div>
        <button type="button" onClick={() => setReload(value => value + 1)} disabled={loading} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw size={14} /> Шинэчлэх</button>
      </div>
      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <form onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }} className="flex min-w-0 flex-1 gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Нэр, утас, хүсэлтийн дугаараар хайх</span><input value={search} onChange={event => setSearch(event.target.value)} maxLength={100} placeholder="Нэр, утас, хүсэлтийн дугаар…" className={inputClass} /></label>
          <button type="submit" aria-label="Хайх" className="rounded-lg bg-[#003B5C] px-3 text-white"><Search size={18} /></button>
        </form>
        <label><span className="sr-only">Статусаар шүүх</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className={inputClass}><option value="">Бүх статус</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {isManager && <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={mine} onChange={event => { setMine(event.target.checked); setPage(1); }} /> Надад хуваарилсан</label>}
      </div>
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <div role="status" className="flex items-center justify-center gap-3 rounded-xl border bg-white py-16"><Loader2 size={20} className="animate-spin" /> Хүсэлтүүдийг ачаалж байна…</div> : loadError ? <button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border bg-white px-4 py-2 text-sm">Дахин ачаалах</button> : !data.items.length ? <div className="rounded-xl border bg-white px-5 py-14 text-center"><ClipboardList size={30} className="mx-auto mb-3 text-slate-400" /><p className="font-semibold">Хүсэлт олдсонгүй.</p><p className="mt-2 text-sm text-slate-500">{query || status ? 'Хайлтын нөхцөл эсвэл статусын шүүлтүүрээ өөрчилнө үү.' : 'Шинэ хүсэлт эсвэл хуваарилалт хийгдэхэд энд харагдана.'}</p></div> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1080px] text-left text-xs"><caption className="sr-only">Зээлийн хүсэлтүүд</caption><thead className="border-b bg-slate-50 text-slate-500"><tr>{['Хүсэлт гаргагч', 'Бүтээгдэхүүн', 'Дүн / хугацаа', 'Төлөлтийн эх үүсвэр', 'Хариуцагч', 'Статус', 'Үйлдэл'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y">{data.items.map(item => <tr key={item._id} className="hover:bg-slate-50">
              <td className="px-4 py-4"><p className="font-semibold text-[#003B5C]">{nameOf(item)}</p><p className="mt-1">{item.phone || item.contactPhone || '—'}</p><p className="mt-1 text-[10px] text-slate-400">{item.applicationReference || `SCM-${String(item._id).slice(-6).toUpperCase()}`}</p></td>
              <td className="px-4 py-4">{PRODUCTS[item.selectedProduct] || item.selectedProduct || '—'}</td><td className="px-4 py-4"><p className="font-semibold tabular-nums">{Number(item.amount || 0).toLocaleString('mn-MN')} ₮</p><p className="mt-1 text-slate-500">{item.term || '—'} сар</p></td>
              <td className="max-w-48 break-words px-4 py-4">{item.repaymentSource || '—'}</td><td className="px-4 py-4">{item.assignee?.name || 'Хуваарилаагүй'}</td><td className="px-4 py-4"><span className="inline-block rounded-full bg-slate-100 px-2 py-1 font-medium">{STATUS_LABELS[item.status] || item.status || 'Шинэ'}</span></td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={openingId !== null} onClick={() => openCase(item, onOpen)} className="rounded-lg border px-2.5 py-2 font-semibold hover:bg-slate-100 disabled:opacity-50">Дэлгэрэнгүй</button><button type="button" disabled={openingId !== null} onClick={() => openCase(item, onResearch)} className="rounded-lg bg-[#003B5C] px-2.5 py-2 font-semibold text-white disabled:opacity-50">Судлах</button>{(isManager || !finalStatuses.includes(item.status)) && <button type="button" onClick={() => { setError(''); setNotice(''); setEdit({ item, status: item.status || 'pending', assigneeId: item.assignee?.userId || '', note: '' }); }} className="rounded-lg border px-2.5 py-2 font-semibold hover:bg-slate-100">Удирдах</button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {!loading && !loadError && data.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><p>Нийт {data.total} хүсэлт · Хуудас {page} / {data.pages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 disabled:opacity-40"><ArrowLeft size={14} /> Өмнөх</button><button type="button" disabled={page >= data.pages} onClick={() => setPage(value => value + 1)} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Дараах <ArrowRight size={14} /></button></div></div>}
      {edit && <form ref={editRef} onSubmit={saveEdit} className="rounded-xl border-2 border-[#003B5C]/30 bg-white p-5 space-y-4" aria-label="Хүсэлтийн статус, хуваарилалт">
        <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-[#003B5C]">{nameOf(edit.item)} · Хүсэлт удирдах</h4><button type="button" onClick={() => setEdit(null)} disabled={saving} aria-label="Удирдах хэсгийг хаах"><X size={20} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs font-semibold block">Статус<select value={edit.status} onChange={event => setEdit(previous => ({ ...previous, status: event.target.value }))} className={inputClass}>{!availableStatuses.includes(edit.status) && <option value={edit.status}>{STATUS_LABELS[edit.status] || edit.status}</option>}{availableStatuses.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
          {isManager && <label className="space-y-2 text-xs font-semibold block">Хариуцагч<select value={edit.assigneeId} onChange={event => setEdit(previous => ({ ...previous, assigneeId: event.target.value }))} className={inputClass}><option value="">Хуваарилаагүй</option>{edit.assigneeId && !eligibleUsers.some(item => item._id === edit.assigneeId) && <option value={edit.assigneeId}>{edit.item.assignee?.name || 'Одоогийн хариуцагч'}</option>}{eligibleUsers.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}
        </div>
        <label className="block text-xs font-semibold space-y-2">Тайлбар / буцаасан шалтгаан<textarea required={['returned', 'rejected'].includes(edit.status) && edit.status !== edit.item.status} value={edit.note} maxLength={2000} rows={3} onChange={event => setEdit(previous => ({ ...previous, note: event.target.value }))} className={inputClass} /></label>
        <p className="text-xs text-slate-500">Зөвшөөрөх, татгалзах, нөхцөлтэй зөвшөөрөх шийдвэр нь зээлийн хорооны эрхээр хязгаарлагдана.</p>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#003B5C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />} Өөрчлөлт хадгалах</button>
      </form>}
    </div>
  );
}

