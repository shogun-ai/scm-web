import { Fragment, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Bot, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import BotCardsEditor from './BotCardsEditor';

const MAX_ACCOUNTS = 10;
const MAX_WELCOME = 500;
const CATEGORY_LABELS = { loan: 'Зээлийн пост', safety: 'Аюулгүй байдал', news: 'Мэдээ мэдээлэл' };
const CATEGORY_OPTIONS = [['auto', 'Автомат'], ['loan', 'Зээлийн пост'], ['safety', 'Аюулгүй байдал'], ['news', 'Мэдээ мэдээлэл']];
const emptyAccount = () => ({ bank: '', accountNumber: '', accountName: '', iban: '', note: '' });
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const normalizeAccount = (a) => ({
  bank: str(a?.bank), accountNumber: str(a?.accountNumber), accountName: str(a?.accountName), iban: str(a?.iban), note: str(a?.note),
});

const inputCls = 'min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';

const formatDate = (value) => {
  const t = Date.parse(value);
  return Number.isNaN(t) ? '' : new Date(t).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' });
};

// Resulting bot buttons (mirrors backend postButtons) for the admin preview.
const previewButtons = (category, productKey, hasPermalink, products) => {
  const valid = category === 'loan' && productKey && products.some((p) => p.productKey === productKey);
  if (valid) return ['Хүсэлт гаргах', 'Нөхцөл, шаардлага', 'Тооцоолуур'];
  if (category === 'loan') return ['Хүсэлт гаргах', ...(hasPermalink ? ['Пост үзэх'] : []), 'Холбоо барих'];
  return [...(hasPermalink ? ['Пост үзэх'] : []), 'Холбоо барих'];
};

function PostRow({ post, products, apiUrl, onSaved }) {
  const initialChoice = post.meta ? post.meta.category : 'auto';
  const [choice, setChoice] = useState(initialChoice);
  const [productKey, setProductKey] = useState(post.meta?.productKey || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const effective = choice === 'auto' ? post.suggested?.category || 'news' : choice;
  const buttons = previewButtons(effective, productKey, Boolean(post.permalink), products);
  const dirty = choice !== initialChoice || (choice === 'loan' && productKey !== (post.meta?.productKey || ''));
  const lines = str(post.message).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3).join(' · ');

  const save = async () => {
    setBusy(true); setError(''); setDone('');
    try {
      if (choice === 'auto') {
        await axios.delete(`${apiUrl}/api/admin/bot-posts/${encodeURIComponent(post.id)}`, { headers: getAuthHeaders(), timeout: 20000 });
        onSaved(post.id, null);
      } else {
        const body = choice === 'loan' ? { category: choice, productKey: productKey || undefined } : { category: choice };
        const res = await axios.put(`${apiUrl}/api/admin/bot-posts/${encodeURIComponent(post.id)}`, body, { headers: getAuthHeaders(), timeout: 20000 });
        onSaved(post.id, res.data?.meta || { category: choice, productKey: productKey || null });
      }
      setDone('Хадгалагдлаа.');
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setBusy(false); }
  };

  return <li className="rounded-xl border border-slate-200 p-4">
    <div className="flex gap-3">
      {post.imageUrl ? <img src={post.imageUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{formatDate(post.createdTime)}</p>
        <p className="line-clamp-3 text-sm text-slate-800">{lines || '(текстгүй пост)'}</p>
        {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#003B5C] underline">Постыг нээх</a>}
      </div>
    </div>
    <fieldset className="mt-3">
      <legend className="mb-1 text-xs font-semibold text-slate-600">Ангилал</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {CATEGORY_OPTIONS.map(([value, label]) => <label key={value} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="radio" name={`post-cat-${post.id}`} value={value} checked={choice === value} onChange={() => setChoice(value)} />{label}
        </label>)}
      </div>
    </fieldset>
    {choice === 'loan' && <div className="mt-2">
      <label htmlFor={`post-prod-${post.id}`} className="mb-1 block text-xs font-semibold text-slate-600">Бүтээгдэхүүн</label>
      <select id={`post-prod-${post.id}`} value={productKey} onChange={(e) => setProductKey(e.target.value)} className={inputCls}>
        <option value="">— Бүтээгдэхүүнгүй —</option>
        {products.map((p) => <option key={p.productKey} value={p.productKey}>{p.title || p.productKey}</option>)}
      </select>
    </div>}
    <p className="mt-2 text-xs text-slate-500">Автомат санал: {CATEGORY_LABELS[post.suggested?.category] || '—'}</p>
    <p className="mt-1 text-xs text-slate-700">Товчнууд: {buttons.map((b) => <span key={b} className="mr-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-[#003B5C]">{b}</span>)}</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button type="button" onClick={save} disabled={busy || !dirty} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}Хадгалах</button>
      {done && <span role="status" className="text-sm text-emerald-700">{done}</span>}
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
    </div>
  </li>;
}

// D20: Page post categories. GET /api/admin/bot-posts, PUT/DELETE /api/admin/bot-posts/:postId
function PostCategories({ apiUrl }) {
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [res, prodRes] = await Promise.all([
        axios.get(`${apiUrl}/api/admin/bot-posts`, { headers: getAuthHeaders(), timeout: 30000 }),
        axios.get(`${apiUrl}/api/products/content`, { timeout: 20000 }).catch(() => ({ data: null })),
      ]);
      const d = res.data && typeof res.data === 'object' ? res.data : {};
      setPosts(Array.isArray(d.posts) ? d.posts : []);
      // Product keys come from ProductContent (same source the backend validates against).
      const fromContent = Array.isArray(prodRes.data)
        ? prodRes.data.filter((p) => p && p.productKey && p.isActive !== false && p.productKey !== 'trust')
        : null;
      const fallback = Array.isArray(d.products) ? d.products.filter((p) => p && p.productKey) : [];
      setProducts(fromContent && fromContent.length ? fromContent : fallback);
    } catch (err) { setError(err.response?.data?.message || 'Постын жагсаалтыг ачаалж чадсангүй.'); }
    finally { setLoading(false); }
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const onSaved = (id, meta) => setPosts((list) => list.map((p) => (p.id === id ? { ...p, meta } : p)));

  return <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="bot-posts-heading">
    <div className="mb-1 flex items-center justify-between gap-3">
      <h3 id="bot-posts-heading" className="font-bold text-slate-800">Пост ангилал</h3>
      <button type="button" onClick={load} disabled={loading} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Дахин ачаалах</button>
    </div>
    <p className="mb-3 text-sm text-slate-600">“Идэвхтэй зээлийн зар” цэс Page-ийн сүүлийн 6 постыг харуулна. Ангилал сонгоогүй бол автоматаар тодорхойлно. Facebook руу юу ч нийтлэхгүй.</p>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    {!loading && !error && posts.length === 0 && <p className="text-sm text-slate-500">Пост олдсонгүй (Facebook холболтыг шалгана уу).</p>}
    <ul className="space-y-3">
      {posts.map((post, index) => <Fragment key={post.id}>
        {index === 6 && <li aria-hidden="true" className="list-none"><p className="my-2 text-xs font-semibold text-slate-500">Доорх постууд ботод харагдахгүй (сүүлийн 6-аас хойших).</p></li>}
        <PostRow post={post} products={products} apiUrl={apiUrl} onSaved={onSaved} />
      </Fragment>)}
    </ul>
  </section>;
}

// Ботын агуулга: GET/PUT /api/admin/bot-content { welcomeText, paymentAccounts[] }
export default function BotContentPanel({ apiUrl }) {
  const [welcomeText, setWelcomeText] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${apiUrl}/api/admin/bot-content`, { headers: getAuthHeaders(), timeout: 20000 });
      const d = res.data && typeof res.data === 'object' ? res.data : {};
      setWelcomeText(str(d.welcomeText));
      setAccounts(Array.isArray(d.paymentAccounts) ? d.paymentAccounts.slice(0, MAX_ACCOUNTS).map(normalizeAccount) : []);
    } catch (err) { setError(err.response?.data?.message || 'Ботын агуулгыг ачаалж чадсангүй.'); }
    finally { setLoading(false); }
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const update = (i, field, value) => setAccounts((list) => list.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  const remove = (i) => setAccounts((list) => list.filter((_, idx) => idx !== i));
  const move = (i, dir) => setAccounts((list) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const add = () => setAccounts((list) => (list.length >= MAX_ACCOUNTS ? list : [...list, emptyAccount()]));

  const validate = () => {
    if (welcomeText.length > MAX_WELCOME) return `Мэндчилгээ ${MAX_WELCOME} тэмдэгтээс хэтрэхгүй байх ёстой.`;
    for (let i = 0; i < accounts.length; i += 1) {
      const a = accounts[i];
      if (!a.bank.trim() || !a.accountNumber.trim() || !a.accountName.trim()) return `Данс #${i + 1}: банк, дансны дугаар, хүлээн авагчийн нэр заавал.`;
    }
    return '';
  };

  const save = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      const payload = {
        welcomeText: welcomeText.trim(),
        paymentAccounts: accounts.map((a) => ({
          bank: a.bank.trim(), accountNumber: a.accountNumber.trim(), accountName: a.accountName.trim(), iban: a.iban.trim(), note: a.note.trim(),
        })),
      };
      const res = await axios.put(`${apiUrl}/api/admin/bot-content`, payload, { headers: getAuthHeaders(), timeout: 20000 });
      const d = res.data && typeof res.data === 'object' ? res.data : {};
      if (typeof d.welcomeText === 'string') setWelcomeText(d.welcomeText);
      if (Array.isArray(d.paymentAccounts)) setAccounts(d.paymentAccounts.slice(0, MAX_ACCOUNTS).map(normalizeAccount));
      setMessage('Хадгалагдлаа.');
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };

  const filled = accounts.filter((a) => a.bank.trim() || a.accountNumber.trim() || a.accountName.trim());

  return <div className="max-w-6xl space-y-6 animate-fade-in">
    <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><Bot size={24} aria-hidden="true" />Ботын агуулга</h2>
    <p className="text-sm text-slate-600">Сайтын чатбот болон Messenger бот нэг агуулга ашиглана.</p>
    {loading ? <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p> : (
      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <label htmlFor="bot-welcome" className="mb-1 block text-sm font-semibold text-slate-800">Мэндчилгээний текст</label>
          <textarea id="bot-welcome" value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} maxLength={MAX_WELCOME} rows={3} placeholder="Сайн байна уу! Солонго Капитал ББСБ. Танд юугаар туслах вэ?" className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20" />
          <p className="mt-1 text-right text-xs text-slate-500">{welcomeText.length}/{MAX_WELCOME}</p>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800">Төлбөр хүлээн авах данс ({accounts.length}/{MAX_ACCOUNTS})</h3>
            <button type="button" onClick={add} disabled={accounts.length >= MAX_ACCOUNTS} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#003B5C] px-4 text-sm font-semibold text-[#003B5C] disabled:opacity-50"><Plus size={16} aria-hidden="true" />Данс нэмэх</button>
          </div>
          {accounts.length === 0 && <p className="text-sm text-slate-500">Данс бүртгээгүй байна.</p>}
          <ul className="space-y-4">
            {accounts.map((a, i) => <li key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700">Данс #{i + 1}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Данс #${i + 1}-ийг дээш`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 disabled:opacity-40"><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === accounts.length - 1} aria-label={`Данс #${i + 1}-ийг доош`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 disabled:opacity-40"><ArrowDown size={16} aria-hidden="true" /></button>
                  <button type="button" onClick={() => remove(i)} aria-label={`Данс #${i + 1}-ийг устгах`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-700"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div><label htmlFor={`bot-bank-${i}`} className="mb-1 block text-xs font-semibold text-slate-600">Банк *</label><input id={`bot-bank-${i}`} value={a.bank} onChange={(e) => update(i, 'bank', e.target.value)} maxLength={80} className={inputCls} /></div>
                <div><label htmlFor={`bot-num-${i}`} className="mb-1 block text-xs font-semibold text-slate-600">Дансны дугаар *</label><input id={`bot-num-${i}`} value={a.accountNumber} onChange={(e) => update(i, 'accountNumber', e.target.value)} maxLength={40} inputMode="numeric" className={inputCls} /></div>
                <div><label htmlFor={`bot-name-${i}`} className="mb-1 block text-xs font-semibold text-slate-600">Хүлээн авагчийн нэр *</label><input id={`bot-name-${i}`} value={a.accountName} onChange={(e) => update(i, 'accountName', e.target.value)} maxLength={120} className={inputCls} /></div>
                <div><label htmlFor={`bot-iban-${i}`} className="mb-1 block text-xs font-semibold text-slate-600">IBAN (заавал биш)</label><input id={`bot-iban-${i}`} value={a.iban} onChange={(e) => update(i, 'iban', e.target.value)} maxLength={40} className={inputCls} /></div>
                <div className="md:col-span-2"><label htmlFor={`bot-note-${i}`} className="mb-1 block text-xs font-semibold text-slate-600">Гүйлгээний утга / тайлбар (заавал биш)</label><input id={`bot-note-${i}`} value={a.note} onChange={(e) => update(i, 'note', e.target.value)} maxLength={200} className={inputCls} /></div>
              </div>
            </li>)}
          </ul>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="bot-preview-heading">
          <h3 id="bot-preview-heading" className="mb-3 font-bold text-slate-800">“Төлөлт хийх” мессежийн урьдчилсан харагдац</h3>
          <div className="max-w-sm space-y-2 rounded-3xl rounded-tl-none border border-gray-100 bg-slate-50 p-4 text-[13px] leading-relaxed text-gray-700">
            <p className="font-bold text-[#003B5C]">Төлбөр хүлээн авах данснууд:</p>
            {filled.length === 0 && <p className="text-slate-500">Данс бүртгээгүй.</p>}
            {filled.map((a, i) => <div key={i} className="space-y-0.5 border-t border-slate-200 pt-2">
              <p className="font-semibold">{a.bank || '—'}</p>
              <p>Данс: {a.accountNumber || '—'}</p>
              <p>Хүлээн авагч: {a.accountName || '—'}</p>
              {a.iban.trim() && <p>IBAN: {a.iban}</p>}
              {a.note.trim() && <p>Гүйлгээний утга: {a.note}</p>}
            </div>)}
          </div>
        </section>

        {message && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}Хадгалах</button>
          <button type="button" onClick={load} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Буцаах</button>
        </div>
      </form>
    )}
    <div className="max-w-none"><BotCardsEditor apiUrl={apiUrl} /></div>
    <PostCategories apiUrl={apiUrl} />
    {loading === false && error && !message && accounts.length === 0 && !welcomeText && (
      <button type="button" onClick={load} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Дахин ачаалах</button>
    )}
  </div>;
}
