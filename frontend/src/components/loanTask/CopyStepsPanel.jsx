import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import { validateConfig } from '@shared/loanWidgets';
import { errorMessage, fetchAdminConfigs, saveAdminConfig } from './api';

const clone = value => JSON.parse(JSON.stringify(value));
const nameOf = key => LOAN_PRODUCTS.find(item => item.id === key)?.name || key;
const ownStepSubs = config => (config?.subProducts || []).filter(sub => sub.inheritSteps === false);

// Apply the source STEPS only (never subProducts, assignee, isActive, baseProductEnabled or name) to one target.
async function applyToTarget({ apiUrl, key, steps, toPayload }) {
  let data;
  try { data = await fetchAdminConfigs(apiUrl); } catch (err) { return { key, ok: false, message: errorMessage(err, 'Тохиргоо уншиж чадсангүй.') }; }
  const entry = (Array.isArray(data?.products) ? data.products : []).find(item => item.productKey === key);
  if (!entry?.config) return { key, ok: false, message: 'Тохиргоо олдсонгүй.' };
  const config = { ...clone(entry.config), productKey: key, steps: clone(steps) };
  const payload = toPayload({ ...config, version: entry.config.version ?? 0 });
  let result = { ok: true };
  try { result = validateConfig(payload); } catch { /* server validates */ }
  if (!result.ok) {
    const first = Object.entries(result.errors || {})[0];
    return { key, ok: false, message: `Шалгалтын алдаа${first ? `: ${first[0]} — ${first[1]}` : ''}` };
  }
  try {
    const saved = await saveAdminConfig(apiUrl, key, payload);
    return { key, ok: true, config: saved };
  } catch (err) {
    if (err.response?.status === 409) return { key, ok: false, message: 'VERSION_CONFLICT — өөр админ өөрчилсөн. Дахин оролдоно уу.' };
    const errs = err.response?.data?.errors;
    if (err.response?.status === 400 && errs) {
      const first = Object.entries(errs)[0];
      return { key, ok: false, message: `Шалгалтын алдаа: ${first[0]} — ${first[1]}` };
    }
    return { key, ok: false, message: errorMessage(err, 'Хадгалж чадсангүй.') };
  }
}

export default function CopyStepsPanel({ apiUrl, sourceKey, sourceSteps, products, toPayload, onApplied, onDismiss }) {
  const targets = LOAN_PRODUCTS.filter(item => item.id !== sourceKey);
  const [selected, setSelected] = useState([]);
  const [phase, setPhase] = useState('select'); // select | confirm | running | done
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const confirmRef = useRef(null);
  const resultRef = useRef(null);
  const busy = phase === 'running';

  useEffect(() => { if (phase === 'confirm') confirmRef.current?.focus(); if (phase === 'done') resultRef.current?.focus(); }, [phase]);

  const allSelected = targets.length > 0 && selected.length === targets.length;
  const toggle = key => setSelected(previous => (previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]));
  const ordered = keys => targets.map(item => item.id).filter(id => keys.includes(id));
  const entryFor = key => products.find(item => item.productKey === key);

  const run = async (keys, keep = []) => {
    setPhase('running'); setResults(keep);
    const out = [...keep];
    for (const key of keys) {
      setCurrent(key);
      const result = await applyToTarget({ apiUrl, key, steps: sourceSteps, toPayload });
      if (result.ok) onApplied(key, result.config);
      out.push(result); setResults([...out]);
    }
    setCurrent(null); setPhase('done');
  };

  if (targets.length === 0) return null;
  const failedKeys = results.filter(item => !item.ok).map(item => item.key);
  const unaffected = ordered(selected).map(key => ({ key, subs: ownStepSubs(entryFor(key)?.config) })).filter(item => item.subs.length > 0);

  return <section aria-label="Бусад бүтээгдэхүүнд хэрэглэх" className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
    <div className="flex items-start justify-between gap-3">
      <h3 className="flex items-center gap-2 font-semibold"><Copy size={16} aria-hidden="true" />Бусад бүтээгдэхүүнд мөн хэрэглэх</h3>
      <button type="button" onClick={onDismiss} disabled={busy} className="min-h-10 rounded-lg px-3 text-xs underline disabled:opacity-50">Хаах</button>
    </div>

    {(phase === 'select' || phase === 'confirm') && <>
      <fieldset disabled={phase === 'confirm'} className="space-y-1">
        <legend className="mb-1 text-xs text-sky-900">{nameOf(sourceKey)}-ийн талбарууд (алхмууд, шаардлагатай эсэх, нөхцөл, сонголтууд, өөрийн талбар)-ыг сонгосон бүтээгдэхүүнд хуулна.</legend>
        <label className="flex min-h-10 items-center gap-3 font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#003B5C]" checked={allSelected} onChange={event => setSelected(event.target.checked ? targets.map(item => item.id) : [])} />Бүгдийг сонгох</label>
        <div className="grid gap-x-4 sm:grid-cols-2">{targets.map(item => <label key={item.id} className="flex min-h-10 items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[#003B5C]" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />{item.name}</label>)}</div>
      </fieldset>
      {phase === 'select' && <button type="button" disabled={selected.length === 0} onClick={() => setPhase('confirm')} className="min-h-11 rounded-xl bg-[#003B5C] px-4 font-semibold text-white disabled:opacity-50">Үргэлжлүүлэх ({selected.length})</button>}
      {phase === 'confirm' && <div role="alertdialog" aria-labelledby="copy-confirm-title" className="space-y-3 rounded-xl bg-amber-50 p-4 text-amber-900">
        <p id="copy-confirm-title" ref={confirmRef} tabIndex={-1} className="flex items-center gap-2 font-semibold focus:outline-none"><AlertTriangle size={18} aria-hidden="true" />Сонгосон {selected.length} бүтээгдэхүүний талбарууд солигдоно</p>
        <ul className="list-disc pl-5">{ordered(selected).map(key => <li key={key}>{nameOf(key)}</li>)}</ul>
        <p className="text-xs">Нэр, дэд бүтээгдэхүүн, хүлээн авагч, идэвхтэй эсэх, үндсэн бүтээгдэхүүний тохиргоо өөрчлөгдөхгүй.</p>
        {unaffected.length > 0 && <p className="text-xs">Өөрийн маягттай (алхам өвлөдөггүй) дэд бүтээгдэхүүн өөрчлөгдөхгүй: {unaffected.map(item => `${nameOf(item.key)} (${item.subs.map(sub => sub.name || sub.id).join(', ')})`).join('; ')}.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run(ordered(selected))} className="min-h-11 rounded-xl bg-amber-600 px-4 font-semibold text-white">Тийм, хэрэглэх</button>
          <button type="button" onClick={() => setPhase('select')} className="min-h-11 rounded-xl border border-amber-400 px-4">Буцах</button>
        </div>
      </div>}
    </>}

    {busy && <p role="status" className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Хэрэглэж байна… {results.length}/{selected.length}{current ? ` · ${nameOf(current)}` : ''}</p>}

    {(busy || phase === 'done') && results.length > 0 && <div ref={resultRef} tabIndex={-1} className="space-y-2 focus:outline-none">
      {phase === 'done' && <p role="status" className="font-semibold">Дүн: {results.filter(item => item.ok).length} амжилттай, {failedKeys.length} алдаатай.</p>}
      <ul className="space-y-1">{results.map(item => <li key={item.key} className={`flex items-start gap-2 ${item.ok ? 'text-emerald-800' : 'text-red-700'}`}>{item.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-label="Амжилттай" /> : <XCircle size={16} className="mt-0.5 shrink-0" aria-label="Алдаа" />}<span><strong>{nameOf(item.key)}</strong>{item.ok ? ' — хадгаллаа' : ` — ${item.message}`}</span></li>)}</ul>
      {phase === 'done' && failedKeys.length > 0 && <button type="button" onClick={() => run(failedKeys, results.filter(item => item.ok))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 font-semibold text-white"><RefreshCw size={16} aria-hidden="true" />Алдаатайг дахин оролдох ({failedKeys.length})</button>}
    </div>}
  </section>;
}
