import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, GripVertical, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import MessengerEmulator from './MessengerEmulator';
import Button from './ui/Button';
import Tabs from './ui/Tabs';
import { Check, FileButton, IconButton, InlineNote, Panel, SUBCARD } from './tabs/cms/editorKit';

const SECTIONS = [['menu', 'Үндсэн цэс'], ['loans', 'Зээл'], ['trust', 'Итгэлцэл'], ['payment', 'Төлөлт'], ['contact', 'Холбоо барих']];
const BUTTON_TYPES = [['node', 'Цэс рүү очих'], ['terms', 'Нөхцөл, шаардлага'], ['apply', 'Хүсэлт гаргах'], ['calculator', 'Тооцоолуур'], ['url', 'Холбоос'], ['call', 'Залгах'], ['post', 'Пост']];
const NODE_OPTIONS = [['loans', 'Зээл'], ['trust', 'Итгэлцэл'], ['ads', 'Идэвхтэй зээлийн зар'], ['payment', 'Төлөлт хийх'], ['contact', 'Холбоо барих'], ['restart', 'Дахин эхлүүлэх']];
const MAX_TITLE = 80;
const MAX_BTN_TITLE = 20;
const MAX_BUTTONS = 3;

const inputCls = 'adm-field w-full';
const LABEL = 'adm-label mb-1.5 block';
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const newId = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const normalizeButton = (b) => ({ type: BUTTON_TYPES.some(([t]) => t === b?.type) ? b.type : 'node', title: str(b?.title), value: str(b?.value) });
const normalizeCard = (c) => ({
  id: str(c?.id) || newId(),
  title: str(c?.title),
  subtitle: str(c?.subtitle),
  imageUrl: str(c?.imageUrl),
  productKey: c?.productKey ? str(c.productKey) : '',
  active: c?.active !== false,
  buttons: (Array.isArray(c?.buttons) ? c.buttons : []).slice(0, MAX_BUTTONS).map(normalizeButton),
});

// Tolerant parsing: a section may be an array of cards or { cards|items, isDefault }.
const parseSection = (raw) => {
  if (Array.isArray(raw)) return { cards: raw.map(normalizeCard), isDefault: false };
  const list = Array.isArray(raw?.cards) ? raw.cards : Array.isArray(raw?.items) ? raw.items : [];
  return { cards: list.map(normalizeCard), isDefault: raw?.isDefault === true };
};

const moveItem = (list, from, to) => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const isHttps = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };
const isPhone = (v) => /^\+?[0-9][0-9\s-]{6,19}$/.test(v.trim());

const validateSection = (cards) => {
  for (let i = 0; i < cards.length; i += 1) {
    const c = cards[i];
    const n = `Карт #${i + 1}`;
    if (!c.title.trim()) return `${n}: гарчиг заавал.`;
    if (c.title.length > MAX_TITLE || c.subtitle.length > MAX_TITLE) return `${n}: гарчиг/тайлбар ${MAX_TITLE} тэмдэгтээс хэтрэхгүй.`;
    if (c.imageUrl && !/^(https?:\/\/|\/)/i.test(c.imageUrl.trim())) return `${n}: зургийн холбоос буруу.`;
    for (let j = 0; j < c.buttons.length; j += 1) {
      const b = c.buttons[j];
      const bn = `${n}, товч #${j + 1}`;
      if (!b.title.trim() || b.title.length > MAX_BTN_TITLE) return `${bn}: гарчиг заавал, ${MAX_BTN_TITLE} хүртэлх тэмдэгт.`;
      const v = b.value.trim();
      if (['terms', 'apply', 'calculator'].includes(b.type) && !v && !c.productKey) return `${bn}: бүтээгдэхүүн сонгоно уу.`;
      if (b.type === 'node' && !v) return `${bn}: очих цэсээ сонгоно уу.`;
      if (b.type === 'url' && !isHttps(v)) return `${bn}: холбоос https:// -ээр эхлэх ёстой.`;
      if (b.type === 'call' && !isPhone(v)) return `${bn}: утасны дугаар буруу.`;
      if (b.type === 'post' && !v) return `${bn}: постын ID оруулна уу.`;
    }
  }
  return '';
};

function ButtonRow({ button, index, count, card, products, idPrefix, onChange, onMove, onRemove }) {
  const id = `${idPrefix}-b${index}`;
  const set = (patch) => onChange({ ...button, ...patch });
  const productType = ['terms', 'apply', 'calculator'].includes(button.type);
  const onType = (type) => {
    const base = { type, title: button.title };
    if (type === 'node') base.value = 'loans';
    else if (['terms', 'apply', 'calculator'].includes(type)) base.value = card.productKey || '';
    else base.value = '';
    onChange(base);
  };
  return <li className="rounded-xl bg-black/20 p-3 ring-1 ring-inset ring-white/[0.06]">
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <div>
        <label htmlFor={`${id}-t`} className={LABEL}>Төрөл</label>
        <select id={`${id}-t`} value={button.type} onChange={(e) => onType(e.target.value)} className={inputCls}>
          {BUTTON_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-n`} className={LABEL}>Гарчиг <span className="adm-tnum normal-case tracking-normal">({button.title.length}/{MAX_BTN_TITLE})</span></label>
        <input id={`${id}-n`} value={button.title} maxLength={MAX_BTN_TITLE} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${id}-v`} className={LABEL}>Утга</label>
        {button.type === 'node' && <select id={`${id}-v`} value={button.value} onChange={(e) => set({ value: e.target.value })} className={inputCls}>
          {NODE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>}
        {productType && <select id={`${id}-v`} value={button.value} onChange={(e) => set({ value: e.target.value })} className={inputCls}>
          <option value="">{card.productKey ? '— Картын бүтээгдэхүүн —' : '— Сонгоно уу —'}</option>
          {products.map((p) => <option key={p.productKey} value={p.productKey}>{p.title || p.productKey}</option>)}
        </select>}
        {button.type === 'url' && <input id={`${id}-v`} type="url" value={button.value} onChange={(e) => set({ value: e.target.value })} placeholder="https://" className={inputCls} />}
        {button.type === 'call' && <input id={`${id}-v`} type="tel" value={button.value} onChange={(e) => set({ value: e.target.value })} placeholder="+976..." className={inputCls} />}
        {button.type === 'post' && <input id={`${id}-v`} value={button.value} onChange={(e) => set({ value: e.target.value })} placeholder="Постын ID" className={inputCls} />}
      </div>
      <div className="flex">
        <IconButton label={`Товч #${index + 1}-ийг дээш`} icon={<ArrowUp size={16} aria-hidden="true" />} onClick={() => onMove(-1)} disabled={index === 0} />
        <IconButton label={`Товч #${index + 1}-ийг доош`} icon={<ArrowDown size={16} aria-hidden="true" />} onClick={() => onMove(1)} disabled={index === count - 1} />
        <IconButton danger label={`Товч #${index + 1}-ийг хасах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={onRemove} />
      </div>
    </div>
  </li>;
}

function CardForm({ card, index, count, products, apiUrl, dragProps, onChange, onMove, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);
  const id = `bc-${card.id}`;
  const set = (patch) => onChange({ ...card, ...patch });
  const setButton = (j, b) => set({ buttons: card.buttons.map((x, k) => (k === j ? b : x)) });

  const upload = async (file) => {
    if (!file) return;
    setUploading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${apiUrl}/api/upload`, fd, { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      if (res.data?.url) set({ imageUrl: res.data.url }); else setUploadError('Upload амжилтгүй.');
    } catch { setUploadError('Зураг upload хийж чадсангүй.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return <div className={`${SUBCARD} ${card.active ? '' : 'opacity-75'}`} {...dragProps}>
    <div className="mb-3 flex flex-wrap items-center gap-1">
      <span className="flex h-11 w-7 cursor-grab items-center justify-center text-[var(--adm-ink-3)] active:cursor-grabbing" aria-hidden="true" title="Чирж зөөх"><GripVertical size={18} /></span>
      <span className="adm-tnum text-sm font-semibold text-white">Карт #{index + 1}</span>
      <Check className="ml-3" checked={card.active} onChange={(e) => set({ active: e.target.checked })} label="Идэвхтэй" />
      <div className="ml-auto flex flex-wrap">
        <IconButton label={`Карт #${index + 1}-ийг эхэнд гаргах`} icon={<ChevronsUp size={16} aria-hidden="true" />} onClick={() => onMove('first')} disabled={index === 0} />
        <IconButton label={`Карт #${index + 1}-ийг урагш`} icon={<ArrowUp size={16} aria-hidden="true" />} onClick={() => onMove(-1)} disabled={index === 0} />
        <IconButton label={`Карт #${index + 1}-ийг хойш`} icon={<ArrowDown size={16} aria-hidden="true" />} onClick={() => onMove(1)} disabled={index === count - 1} />
        <IconButton label={`Карт #${index + 1}-ийг сүүлд оруулах`} icon={<ChevronsDown size={16} aria-hidden="true" />} onClick={() => onMove('last')} disabled={index === count - 1} />
        <IconButton danger label={`Карт #${index + 1}-ийг устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={onRemove} />
      </div>
    </div>
    <div className="mb-3 flex flex-wrap gap-2">
      <Button variant="secondary" className="!min-h-9 !px-3 !text-xs" onClick={() => onMove('first')} disabled={index === 0}>Эхэнд гаргах</Button>
      <Button variant="secondary" className="!min-h-9 !px-3 !text-xs" onClick={() => onMove('last')} disabled={index === count - 1}>Сүүлд оруулах</Button>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label htmlFor={`${id}-title`} className={LABEL}>Гарчиг * <span className="adm-tnum normal-case tracking-normal">({card.title.length}/{MAX_TITLE})</span></label>
        <input id={`${id}-title`} value={card.title} maxLength={MAX_TITLE} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${id}-sub`} className={LABEL}>Тайлбар <span className="adm-tnum normal-case tracking-normal">({card.subtitle.length}/{MAX_TITLE})</span></label>
        <input id={`${id}-sub`} value={card.subtitle} maxLength={MAX_TITLE} onChange={(e) => set({ subtitle: e.target.value })} className={inputCls} />
      </div>
      <div className="md:col-span-2">
        <label htmlFor={`${id}-img`} className={LABEL}>Зураг (URL эсвэл upload)</label>
        <div className="flex items-center gap-2">
          {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-11 w-20 shrink-0 rounded-lg object-cover ring-1 ring-white/10" /> : <div className="h-11 w-20 shrink-0 rounded-lg bg-white/[0.05]" aria-hidden="true" />}
          <input id={`${id}-img`} value={card.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://..." className={`${inputCls} min-w-0`} />
          <FileButton label="Upload" id={`${id}-file`} inputRef={fileRef} busy={uploading} icon={uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />} onFile={(file) => upload(file)} />
        </div>
        {uploadError && <p role="alert" className="mt-1.5 text-xs text-[#FFC9D3]">{uploadError}</p>}
      </div>
      <div className="md:col-span-2">
        <label htmlFor={`${id}-prod`} className={LABEL}>Холбосон бүтээгдэхүүн</label>
        <select id={`${id}-prod`} value={card.productKey} onChange={(e) => set({ productKey: e.target.value })} className={inputCls}>
          <option value="">— Бүтээгдэхүүнгүй —</option>
          {products.map((p) => <option key={p.productKey} value={p.productKey}>{p.title || p.productKey}</option>)}
        </select>
      </div>
    </div>
    <div className="mt-4 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="adm-label">Товчнууд <span className="adm-tnum">({card.buttons.length}/{MAX_BUTTONS})</span></h4>
        <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => set({ buttons: [...card.buttons, { type: 'node', title: '', value: 'loans' }] })} disabled={card.buttons.length >= MAX_BUTTONS}>Товч нэмэх</Button>
      </div>
      <ul className="space-y-2">
        {card.buttons.map((b, j) => <ButtonRow key={j} button={b} index={j} count={card.buttons.length} card={card} products={products} idPrefix={id}
          onChange={(nb) => setButton(j, nb)}
          onMove={(d) => set({ buttons: moveItem(card.buttons, j, j + d) })}
          onRemove={() => set({ buttons: card.buttons.filter((_, k) => k !== j) })} />)}
      </ul>
    </div>
  </div>;
}

// D21: GET/PUT /api/admin/bot-cards, POST /api/admin/bot-cards/reset/:section
export default function BotCardsEditor({ apiUrl }) {
  const [sections, setSections] = useState({});
  const [defaults, setDefaults] = useState({});
  const [defaultImage, setDefaultImage] = useState('');
  const [products, setProducts] = useState([]);
  const [active, setActive] = useState('menu');
  const [preview, setPreview] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const apply = useCallback((d) => {
    const secs = d && typeof d.sections === 'object' && d.sections ? d.sections : {};
    const next = {}; const defs = {};
    SECTIONS.forEach(([key]) => {
      const p = parseSection(secs[key]);
      next[key] = p.cards;
      defs[key] = p.isDefault || d?.isDefault?.[key] === true || (d?.defaults && d.defaults[key] === true);
    });
    setSections(next); setDefaults(defs);
    const img = d?.defaultImageUrl ?? d?.botDefaultImageUrl ?? d?.bot_default_image_url;
    if (typeof img === 'string') setDefaultImage(img);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cardsRes, prodRes] = await Promise.all([
        axios.get(`${apiUrl}/api/admin/bot-cards`, { headers: getAuthHeaders(), timeout: 20000 }),
        axios.get(`${apiUrl}/api/products/content`, { timeout: 20000 }).catch(() => ({ data: [] })),
      ]);
      apply(cardsRes.data);
      const list = Array.isArray(prodRes.data) ? prodRes.data : [];
      setProducts(list.filter((p) => p && p.productKey && p.isActive !== false && p.productKey !== 'trust'));
    } catch (err) { setError(err.response?.data?.message || 'Ботын картыг ачаалж чадсангүй.'); }
    finally { setLoading(false); }
  }, [apiUrl, apply]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => sections[active] || [], [sections, active]);
  const setCards = (updater) => {
    setSections((s) => ({ ...s, [active]: typeof updater === 'function' ? updater(s[active] || []) : updater }));
    setMessage('');
  };
  const selectSection = (key) => { setActive(key); setPreview(key); setMessage(''); setError(''); };

  const payloadSections = () => Object.fromEntries(SECTIONS.map(([key]) => [key, (sections[key] || []).map((c) => ({
    id: c.id, title: c.title.trim(), subtitle: c.subtitle.trim(), imageUrl: c.imageUrl.trim(), productKey: c.productKey || null, active: c.active,
    buttons: c.buttons.map((b) => ({ type: b.type, title: b.title.trim(), value: b.value.trim() || (['terms', 'apply', 'calculator'].includes(b.type) ? c.productKey : '') })),
  }))]));

  const save = async () => {
    setError(''); setMessage('');
    for (const [key, label] of SECTIONS) {
      const problem = validateSection(sections[key] || []);
      if (problem) { setError(`${label}: ${problem}`); setActive(key); setPreview(key); return; }
    }
    if (defaultImage.trim() && !/^(https?:\/\/|\/)/i.test(defaultImage.trim())) { setError('Үндсэн зургийн холбоос буруу.'); return; }
    setSaving(true);
    try {
      const res = await axios.put(`${apiUrl}/api/admin/bot-cards`, { sections: payloadSections(), defaultImageUrl: defaultImage.trim() }, { headers: getAuthHeaders(), timeout: 30000 });
      if (res.data && typeof res.data.sections === 'object') apply(res.data);
      else setDefaults({});
      setMessage('Хадгалагдлаа.');
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    const label = SECTIONS.find(([k]) => k === active)?.[1];
    if (!window.confirm(`“${label}” хэсгийг анхны тохиргоо руу буцаах уу? Таны засвар устна.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await axios.post(`${apiUrl}/api/admin/bot-cards/reset/${active}`, {}, { headers: getAuthHeaders(), timeout: 30000 });
      const d = res.data || {};
      const raw = d.cards ?? d.section ?? d.sections?.[active];
      if (raw) {
        const p = parseSection(raw);
        setSections((s) => ({ ...s, [active]: p.cards })); setDefaults((s) => ({ ...s, [active]: true }));
      } else await load();
      setMessage('Анхны тохиргоо руу буцлаа.');
    } catch (err) { setError(err.response?.data?.message || 'Буцаах үйлдэл амжилтгүй.'); }
    finally { setSaving(false); }
  };

  const addCard = () => setCards((l) => [...l, { id: newId(), title: '', subtitle: '', imageUrl: '', productKey: '', active: true, buttons: [] }]);
  const removeCard = (i) => {
    if (!window.confirm(`Карт #${i + 1}-ийг устгах уу?`)) return;
    setCards((l) => l.filter((_, k) => k !== i));
  };
  const moveCard = (i, how) => setCards((l) => moveItem(l, i, how === 'first' ? 0 : how === 'last' ? l.length - 1 : i + how));

  const dragProps = (i) => ({
    draggable: true,
    onDragStart: (e) => { if (e.target !== e.currentTarget) return; setDragging(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* ignore */ } },
    onDragOver: (e) => { if (dragging !== null) { e.preventDefault(); setOverIndex(i); } },
    onDrop: (e) => { e.preventDefault(); if (dragging !== null) moveCard(dragging, i - dragging); setDragging(null); setOverIndex(null); },
    onDragEnd: () => { setDragging(null); setOverIndex(null); },
  });

  if (loading) return <p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ботын картыг ачаалж байна…</p>;

  const activeLabel = SECTIONS.find(([k]) => k === active)?.[1];
  return <Panel title="Ботын карт" description="Картын дараалал нь Messenger болон сайтын чатботод харагдах дараалал. Чирж зөөх эсвэл сумаар солино." bodyClassName="space-y-4">
    <Tabs label="Ботын хэсэг" panelId="bot-cards-panel" value={active} onChange={selectSection}
      items={SECTIONS.map(([key, label]) => ({ id: key, label: <>{label}{defaults[key] && <span className="sr-only"> (анхны тохиргоо)</span>}</>, dot: defaults[key] ? '#F3CB55' : undefined }))} />

    <div id="bot-cards-panel" role="tabpanel" aria-label={activeLabel} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-3">
        {defaults[active] && <InlineNote kind="warn" className="!text-xs">Энэ хэсэг анхны (default) тохиргоотой. Засаад хадгалбал өөрийн тохиргоо болно.</InlineNote>}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={addCard}>Карт нэмэх</Button>
          <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={reset} disabled={saving}>Анхны тохиргоо руу буцаах</Button>
        </div>
        {cards.length === 0 && <p className="text-sm text-[var(--adm-ink-3)]">Карт алга.</p>}
        <ul className="space-y-3">
          {cards.map((card, i) => <li key={card.id} className={overIndex === i && dragging !== null && dragging !== i ? 'rounded-2xl ring-2 ring-[var(--hue)] ring-offset-2 ring-offset-[#0C1020]' : ''}>
            <CardForm card={card} index={i} count={cards.length} products={products} apiUrl={apiUrl} dragProps={dragProps(i)}
              onChange={(nc) => setCards((l) => l.map((c, k) => (k === i ? nc : c)))}
              onMove={(how) => moveCard(i, how)} onRemove={() => removeCard(i)} />
          </li>)}
        </ul>

        <div className={SUBCARD}>
          <label htmlFor="bot-default-image" className={LABEL}>Үндсэн зураг (зураггүй картад)</label>
          <div className="flex items-center gap-2">
            {defaultImage ? <img src={defaultImage} alt="" className="h-11 w-20 shrink-0 rounded-lg object-cover ring-1 ring-white/10" /> : <div className="h-11 w-20 shrink-0 rounded-lg bg-white/[0.05]" aria-hidden="true" />}
            <input id="bot-default-image" value={defaultImage} onChange={(e) => { setDefaultImage(e.target.value); setMessage(''); }} placeholder="https://... (хоосон бол сайтын лого)" className={`${inputCls} min-w-0`} />
          </div>
        </div>

        {message && <InlineNote kind="ok">{message}</InlineNote>}
        {error && <InlineNote kind="err">{error}</InlineNote>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button icon={<Save size={16} aria-hidden="true" />} busy={saving} onClick={save} disabled={saving}>Хадгалах</Button>
          <Button variant="secondary" onClick={load} disabled={saving}>Буцаах</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="adm-label mb-3">Урьдчилсан харагдац · <span className="normal-case tracking-normal text-[var(--adm-ink-2)]">{SECTIONS.find(([k]) => k === preview)?.[1]}</span></p>
        <div className="relative">
          {/* Soft hue bloom behind the phone — light, not a block. */}
          <div className="pointer-events-none absolute inset-x-6 top-10 bottom-10 rounded-[3rem] bg-[radial-gradient(60%_50%_at_50%_40%,color-mix(in_srgb,var(--hue)_28%,transparent),transparent_70%)] blur-2xl" aria-hidden="true" />
          <div className="relative"><MessengerEmulator section={preview} cards={sections[preview] || []} defaultImageUrl={defaultImage} onNavigate={setPreview} /></div>
        </div>
      </div>
    </div>
  </Panel>;
}
