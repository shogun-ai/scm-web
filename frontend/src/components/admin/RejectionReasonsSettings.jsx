import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, MessageSquareX, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { errorMessage, fetchRejectionReasons, saveRejectionReasons } from '../loanTask/api';
import Button from './ui/Button';
import { Notice } from './ui/Feedback';
import { Field, Input, Textarea } from './ui/Form';
import { SettingsCard } from './AutomationSettings';

// Татгалзсан шалтгааны загвар (SiteConfig loan_rejection_reasons). GET/PUT /api/loan-rejection-reasons (PUT: зөвхөн админ).
const MAX_ITEMS = 20;
const MAX_TITLE = 60;
const MAX_TEXT = 1000;
const DEFAULTS = [
  { id: 'income', title: 'Өр орлогын харьцаа хангалтгүй', text: 'Таны сарын орлогод эзлэх нийт зээлийн төлбөрийн харьцаа (өр орлогын харьцаа) манай шаардлагаас өндөр байгаа тул хүссэн зээлийг олгох боломжгүй байна.' },
  { id: 'collateral', title: 'Барьцаа шаардлага хангаагүй', text: 'Санал болгосон барьцаа хөрөнгө манай барьцааны шаардлагыг (үнэлгээ, өмчлөл, бүртгэл) хангахгүй байна.' },
  { id: 'credit_history', title: 'Зээлийн муу түүхтэй буюу зээлийн оноо хангалтгүй', text: 'Зээлийн мэдээллийн санд хугацаа хэтэрсэн буюу чанаргүй зээлийн бүртгэл байгаа эсвэл зээлийн оноо шаардлага хангахгүй байгаа тул энэ удаад зөвшөөрөх боломжгүй.' },
  { id: 'documents', title: 'Баримт бүрдээгүй', text: 'Шаардлагатай баримт бичиг хугацаандаа бүрэн ирүүлэгдээгүй байна.' },
  { id: 'mismatch', title: 'Мэдээлэл зөрүүтэй', text: 'Хүсэлтэд дурдсан мэдээлэл болон ирүүлсэн баримт хооронд зөрүү илэрсэн.' },
  { id: 'product_terms', title: 'Бүтээгдэхүүний нөхцөлд нийцээгүй', text: 'Хүсэлт тухайн бүтээгдэхүүний нөхцөл (нас, хугацаа, дүн гэх мэт)-д нийцэхгүй байна.' },
];
const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function RejectionReasonsSettings({ apiUrl }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    fetchRejectionReasons(apiUrl)
      .then(result => { if (alive) setItems(Array.isArray(result?.reasons) ? result.reasons : []); })
      .catch(err => { if (alive) setError(errorMessage(err, 'Загвар ачаалж чадсангүй.')); });
    return () => { alive = false; };
  }, [apiUrl]);

  const edit = next => { setItems(next); setMessage(''); setError(''); };
  const patch = (index, field, value) => edit(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    edit(next);
  };
  const invalid = items ? items.some(item => !item.title.trim() || !item.text.trim()) : false;

  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await saveRejectionReasons(apiUrl, items.map(({ id, title, text }) => ({ id, title: title.trim(), text: text.trim() })));
      setItems(Array.isArray(result?.reasons) ? result.reasons : items);
      setMessage('Хадгаллаа.');
    } catch (err) { setError(errorMessage(err, 'Хадгалж чадсангүй.')); }
    finally { setBusy(false); }
  };

  return <SettingsCard id="rejection-reasons-title" icon={MessageSquareX} title="Татгалзах шалтгааны загвар" description="Хүсэлтийг татгалзахад ажилтан эдгээрээс сонгож, шалтгааны талбарыг автоматаар бөглөнө. Текст харилцагчийн имэйл рүү очно."
    className="" aside={null}>
    {items === null && !error && <p className="text-sm text-[var(--adm-ink-2)]" role="status">Ачаалж байна…</p>}
    {items !== null && <div className="space-y-4">
      {items.length === 0 && <Notice kind="info">Загвар байхгүй байна. Ажилтан шалтгааныг гараар бичнэ.</Notice>}
      <ul className="space-y-3">
        {items.map((item, index) => <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="grid gap-3">
            <Field label={`Гарчиг (${index + 1})`} required hint={`${item.title.length}/${MAX_TITLE}`}>{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={item.title} maxLength={MAX_TITLE} disabled={busy} onChange={event => patch(index, 'title', event.target.value)} />}</Field>
            <Field label="Имэйлд орох текст" required hint={`${item.text.length}/${MAX_TEXT}`}>{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} value={item.text} maxLength={MAX_TEXT} disabled={busy} onChange={event => patch(index, 'text', event.target.value)} />}</Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" icon={<ArrowUp size={15} aria-hidden="true" />} disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`${item.title || 'Загвар'} дээш`}>Дээш</Button>
            <Button variant="secondary" icon={<ArrowDown size={15} aria-hidden="true" />} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`${item.title || 'Загвар'} доош`}>Доош</Button>
            <Button variant="danger" icon={<Trash2 size={15} aria-hidden="true" />} disabled={busy} onClick={() => edit(items.filter((_, i) => i !== index))} aria-label={`${item.title || 'Загвар'} устгах`}>Устгах</Button>
          </div>
        </li>)}
      </ul>
      {invalid && <Notice kind="err">Бүх загварын гарчиг болон текст хоосон байж болохгүй.</Notice>}
      {error && <Notice kind="err">{error}</Notice>}
      {message && <Notice kind="ok">{message}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} disabled={busy || items.length >= MAX_ITEMS} onClick={() => edit([...items, { id: newId(), title: '', text: '' }])}>Загвар нэмэх</Button>
        <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} disabled={busy} onClick={() => edit(DEFAULTS.map(item => ({ ...item })))}>Анхдагч руу буцаах</Button>
        <Button icon={<Save size={16} aria-hidden="true" />} busy={busy} disabled={busy || invalid} onClick={save}>Хадгалах</Button>
      </div>
    </div>}
    {items === null && error && <Notice kind="err">{error}</Notice>}
  </SettingsCard>;
}
