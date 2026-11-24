import { Fragment, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import BotCardsEditor from './BotCardsEditor';
import Button from './ui/Button';
import { Pill } from './ui/Feedback';
import { IconButton, InlineNote, Panel, SUBCARD } from './tabs/cms/editorKit';

const MAX_ACCOUNTS = 10;
const MAX_WELCOME = 500;
const CATEGORY_LABELS = { loan: 'Зээлийн пост', safety: 'Аюулгүй байдал', news: 'Мэдээ мэдээлэл' };
const CATEGORY_OPTIONS = [['auto', 'Автомат'], ['loan', 'Зээлийн пост'], ['safety', 'Аюулгүй байдал'], ['news', 'Мэдээ мэдээлэл']];
const emptyAccount = () => ({ bank: '', accountNumber: '', accountName: '', iban: '', note: '' });
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const normalizeAccount = (a) => ({
  bank: str(a?.bank), accountNumber: str(a?.accountNumber), accountName: str(a?.accountName), iban: str(a?.iban), note: str(a?.note),
});

const inputCls = 'adm-field w-full';
const LABEL = 'adm-label mb-1.5 block';

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

  return <li className={`${SUBCARD} space-y-3`}>
    <div className="flex gap-3">
      {post.imageUrl ? <img src={post.imageUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" /> : <div className="h-16 w-16 shrink-0 rounded-xl bg-white/[0.05]" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{formatDate(post.createdTime)}</p>
        <p className="mt-0.5 line-clamp-3 text-sm text-[var(--adm-ink)]">{lines || '(текстгүй пост)'}</p>
        {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#A6E6FF] underline underline-offset-2 hover:text-white">Постыг нээх</a>}
      </div>
    </div>
    <fieldset>
      <legend className="adm-label mb-1">Ангилал</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map(([value, label]) => <label key={value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm ring-1 ring-inset transition-colors ${choice === value ? 'bg-[color-mix(in_srgb,var(--hue)_14%,transparent)] text-white ring-[color-mix(in_srgb,var(--hue)_50%,transparent)]' : 'text-[var(--adm-ink-2)] ring-white/[0.08] hover:bg-white/[0.04]'}`}>
          <input type="radio" className="h-4 w-4 accent-[var(--hue)]" name={`post-cat-${post.id}`} value={value} checked={choice === value} onChange={() => setChoice(value)} />{label}
        </label>)}
      </div>
    </fieldset>
    {choice === 'loan' && <div className="max-w-md">
      <label htmlFor={`post-prod-${post.id}`} className="adm-label mb-1.5 block">Бүтээгдэхүүн</label>
      <select id={`post-prod-${post.id}`} value={productKey} onChange={(e) => setProductKey(e.target.value)} className={inputCls}>
        <option value="">— Бүтээгдэхүүнгүй —</option>
        {products.map((p) => <option key={p.productKey} value={p.productKey}>{p.title || p.productKey}</option>)}
      </select>
    </div>}
    <p className="text-xs text-[var(--adm-ink-3)]">Автомат санал: <span className="text-[var(--adm-ink-2)]">{CATEGORY_LABELS[post.suggested?.category] || '—'}</span></p>
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--adm-ink-3)]">Товчнууд: {buttons.map((b) => <Pill key={b} hue="cyan" dot={false} className="!py-0.5">{b}</Pill>)}</p>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" icon={<Save size={16} aria-hidden="true" />} busy={busy} onClick={save} disabled={busy || !dirty}>Хадгалах</Button>
      {done && <span role="status" className="text-sm text-[#8FF0C8]">{done}</span>}
      {error && <span role="alert" className="text-sm text-[#FFC9D3]">{error}</span>}
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

  return <Panel title="Пост ангилал" description="“Идэвхтэй зээлийн зар” цэс Page-ийн сүүлийн 6 постыг харуулна. Ангилал сонгоогүй бол автоматаар тодорхойлно. Facebook руу юу ч нийтлэхгүй."
    actions={<Button variant="secondary" icon={<RefreshCw size={15} aria-hidden="true" />} onClick={load} disabled={loading}>Дахин ачаалах</Button>}>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
    {error && <InlineNote kind="err">{error}</InlineNote>}
    {!loading && !error && posts.length === 0 && <p className="text-sm text-[var(--adm-ink-3)]">Пост олдсонгүй (Facebook холболтыг шалгана уу).</p>}
    <ul className="grid gap-3 xl:grid-cols-2">
      {posts.map((post, index) => <Fragment key={post.id}>
        {index === 6 && <li aria-hidden="true" className="list-none xl:col-span-2"><p className="my-1 flex items-center gap-3 text-xs font-semibold text-[var(--adm-ink-3)]"><span className="h-px flex-1 bg-white/10" />Доорх постууд ботод харагдахгүй (сүүлийн 6-аас хойших).<span className="h-px flex-1 bg-white/10" /></p></li>}
        <PostRow post={post} products={products} apiUrl={apiUrl} onSaved={onSaved} />
      </Fragment>)}
    </ul>
  </Panel>;
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

  return <div className="space-y-4 md:space-y-5">
    {loading ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p> : (
      <form onSubmit={save} className="grid items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4 md:space-y-5">
          <Panel title="Мэндчилгээний текст" description="Ботын эхний мессеж.">
            <textarea id="bot-welcome" aria-label="Мэндчилгээний текст" value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} maxLength={MAX_WELCOME} rows={3} placeholder="Сайн байна уу! Солонго Капитал ББСБ. Танд юугаар туслах вэ?" className="adm-field w-full resize-y py-2.5 leading-relaxed" />
            <p className="adm-tnum !mt-1.5 text-right text-xs text-[var(--adm-ink-3)]">{welcomeText.length}/{MAX_WELCOME}</p>
          </Panel>

          <Panel title={<>Төлбөр хүлээн авах данс <span className="adm-tnum font-normal text-[var(--adm-ink-3)]">({accounts.length}/{MAX_ACCOUNTS})</span></>}
            actions={<Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={add} disabled={accounts.length >= MAX_ACCOUNTS}>Данс нэмэх</Button>}>
            {accounts.length === 0 && <p className="text-sm text-[var(--adm-ink-3)]">Данс бүртгээгүй байна.</p>}
            <ul className="space-y-3">
              {accounts.map((a, i) => <li key={i} className={SUBCARD}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="adm-tnum text-sm font-semibold text-white">Данс #{i + 1}</span>
                  <div className="flex">
                    <IconButton label={`Данс #${i + 1}-ийг дээш`} icon={<ArrowUp size={16} aria-hidden="true" />} onClick={() => move(i, -1)} disabled={i === 0} />
                    <IconButton label={`Данс #${i + 1}-ийг доош`} icon={<ArrowDown size={16} aria-hidden="true" />} onClick={() => move(i, 1)} disabled={i === accounts.length - 1} />
                    <IconButton danger label={`Данс #${i + 1}-ийг устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => remove(i)} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><label htmlFor={`bot-bank-${i}`} className={LABEL}>Банк *</label><input id={`bot-bank-${i}`} value={a.bank} onChange={(e) => update(i, 'bank', e.target.value)} maxLength={80} className={inputCls} /></div>
                  <div><label htmlFor={`bot-num-${i}`} className={LABEL}>Дансны дугаар *</label><input id={`bot-num-${i}`} value={a.accountNumber} onChange={(e) => update(i, 'accountNumber', e.target.value)} maxLength={40} inputMode="numeric" className={`${inputCls} adm-tnum`} /></div>
                  <div><label htmlFor={`bot-name-${i}`} className={LABEL}>Хүлээн авагчийн нэр *</label><input id={`bot-name-${i}`} value={a.accountName} onChange={(e) => update(i, 'accountName', e.target.value)} maxLength={120} className={inputCls} /></div>
                  <div><label htmlFor={`bot-iban-${i}`} className={LABEL}>IBAN (заавал биш)</label><input id={`bot-iban-${i}`} value={a.iban} onChange={(e) => update(i, 'iban', e.target.value)} maxLength={40} className={inputCls} /></div>
                  <div className="md:col-span-2"><label htmlFor={`bot-note-${i}`} className={LABEL}>Гүйлгээний утга / тайлбар (заавал биш)</label><input id={`bot-note-${i}`} value={a.note} onChange={(e) => update(i, 'note', e.target.value)} maxLength={200} className={inputCls} /></div>
                </div>
              </li>)}
            </ul>
          </Panel>

          {message && <InlineNote kind="ok">{message}</InlineNote>}
          {error && <InlineNote kind="err">{error}</InlineNote>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" icon={<Save size={16} aria-hidden="true" />} busy={saving} disabled={saving}>Хадгалах</Button>
            <Button variant="secondary" onClick={load} disabled={saving}>Буцаах</Button>
          </div>
        </div>

        <section className="xl:sticky xl:top-24" aria-labelledby="bot-preview-heading">
          <h3 id="bot-preview-heading" className="adm-label mb-2">“Төлөлт хийх” мессежийн урьдчилсан харагдац</h3>
          {/* Chat-bubble preview keeps the light Messenger look. */}
          <div className="max-w-sm space-y-2 rounded-3xl rounded-tl-md bg-[#F0F0F0] p-4 text-[13px] leading-relaxed text-gray-800 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] [color-scheme:light]">
            <p className="font-bold text-[#003B5C]">Төлбөр хүлээн авах данснууд:</p>
            {filled.length === 0 && <p className="text-slate-600">Данс бүртгээгүй.</p>}
            {filled.map((a, i) => <div key={i} className="space-y-0.5 border-t border-slate-300 pt-2">
              <p className="font-semibold">{a.bank || '—'}</p>
              <p>Данс: {a.accountNumber || '—'}</p>
              <p>Хүлээн авагч: {a.accountName || '—'}</p>
              {a.iban.trim() && <p>IBAN: {a.iban}</p>}
              {a.note.trim() && <p>Гүйлгээний утга: {a.note}</p>}
            </div>)}
          </div>
        </section>
      </form>
    )}
    <BotCardsEditor apiUrl={apiUrl} />
    <PostCategories apiUrl={apiUrl} />
    {loading === false && error && !message && accounts.length === 0 && !welcomeText && (
      <Button variant="secondary" onClick={load}>Дахин ачаалах</Button>
    )}
  </div>;
}
