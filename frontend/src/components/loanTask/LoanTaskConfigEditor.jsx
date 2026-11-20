import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Save, Settings2 } from 'lucide-react';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import { buildDefaultConfig, resolveSteps, validateConfig } from '@shared/loanWidgets';
import StepsEditor from './StepsEditor';
import CopyStepsPanel from './CopyStepsPanel';
import SubProductEditor from './SubProductEditor';
import TaskLoanForm from './TaskLoanForm';
import { errorMessage, fetchAdminConfigs, fetchAssignees, saveAdminConfig } from './api';

const BOX = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20';
const TABS = [['form', 'Маягт'], ['subs', 'Дэд бүтээгдэхүүн'], ['assign', 'Хуваарилалт'], ['preview', 'Урьдчилан харах']];

const clone = value => JSON.parse(JSON.stringify(value));
// Client-only helper props must never reach the API.
const toPayload = config => {
  const { updatedAt, updatedBy, expectedVersion, isDefault, source, ...rest } = config; // eslint-disable-line no-unused-vars
  return { ...rest, expectedVersion: config.version ?? 0, subProducts: (config.subProducts || []).map(({ status, slugTouched, saved, ...sub }) => sub) }; // eslint-disable-line no-unused-vars
};
const prepare = config => ({ ...clone(config), subProducts: (config.subProducts || []).map(sub => ({ ...sub, saved: true })) });

export default function LoanTaskConfigEditor({ apiUrl }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [selectedKey, setSelectedKey] = useState(LOAN_PRODUCTS[0]?.id);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);
  const [tab, setTab] = useState('form');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [assignees, setAssignees] = useState([]);
  const [confirmActive, setConfirmActive] = useState(false);
  const [copySource, setCopySource] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // Replace this product's steps with the current default form (unsaved until "Хадгалах").
  const resetToDefault = () => {
    const defaults = buildDefaultConfig(selectedKey);
    update({ steps: defaults.steps });
    setConfirmReset(false);
    setErrors({});
    setMessage({ type: 'ok', text: 'Анхны маягт ачааллаа. "Хадгалах" дарснаар хэрэгжинэ.' });
  };

  const load = useCallback(async (keepKey) => {
    setStatus('loading'); setLoadError('');
    try {
      const data = await fetchAdminConfigs(apiUrl);
      const list = Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
      const key = keepKey || selectedKey;
      const entry = list.find(item => item.productKey === key) || list[0];
      if (entry) { setSelectedKey(entry.productKey); setDraft(prepare(entry.config)); setDirty(false); }
      setStatus('ready');
    } catch (err) { setLoadError(errorMessage(err, 'Тохиргоо ачаалж чадсангүй.')); setStatus('error'); }
  }, [apiUrl, selectedKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [apiUrl]);
  useEffect(() => { fetchAssignees(apiUrl).then(rows => setAssignees(Array.isArray(rows) ? rows : [])).catch(() => setAssignees([])); }, [apiUrl]);

  const entryFor = key => products.find(item => item.productKey === key);
  // D12: product without a saved config -> backend serves the default draft (version 0).
  const isDefaultEntry = item => Boolean(item && (item.isDefault || item.config?.isDefault || item.source === 'default'));
  const selectProduct = key => {
    if (key === selectedKey) return;
    if (dirty) { setPendingKey(key); return; }
    const entry = entryFor(key);
    if (entry) { setSelectedKey(key); setDraft(prepare(entry.config)); setErrors({}); setMessage({ type: '', text: '' }); setConfirmActive(false); setCopySource(null); setConfirmReset(false); }
  };
  const discardAndSwitch = () => {
    const entry = entryFor(pendingKey);
    if (entry) { setSelectedKey(pendingKey); setDraft(prepare(entry.config)); setDirty(false); setErrors({}); setMessage({ type: '', text: '' }); setCopySource(null); }
    setPendingKey(null);
  };
  const update = patch => { setDraft(previous => ({ ...previous, ...patch })); setDirty(true); setMessage({ type: '', text: '' }); };

  const save = async () => {
    const payload = toPayload(draft);
    let result = { ok: true, errors: {} };
    try { result = validateConfig(payload); } catch { /* server validates */ }
    if (!result.ok) { setErrors(result.errors || {}); setMessage({ type: 'error', text: 'Тохиргоонд алдаа байна. Доорх алдааг засна уу.' }); return; }
    setErrors({}); setSaving(true); setMessage({ type: '', text: '' });
    try {
      const saved = await saveAdminConfig(apiUrl, selectedKey, payload);
      setProducts(previous => previous.map(item => (item.productKey === selectedKey ? { ...item, saved: true, isDefault: false, source: undefined, config: { ...saved, isDefault: false } } : item)));
      setDraft(prepare(saved)); setDirty(false); setConfirmActive(false);
      setMessage({ type: 'ok', text: 'Хадгаллаа.' });
      setCopySource({ key: selectedKey, steps: clone(saved.steps || []) });
    } catch (err) {
      if (err.response?.status === 409) setMessage({ type: 'conflict', text: 'Өөр админ өөрчилсөн. Дахин ачаална уу.' });
      else if (err.response?.status === 400 && err.response.data?.errors) { setErrors(err.response.data.errors); setMessage({ type: 'error', text: err.response.data.message || 'Тохиргоонд алдаа байна.' }); }
      else setMessage({ type: 'error', text: errorMessage(err, 'Хадгалж чадсангүй.') });
    } finally { setSaving(false); }
  };

  const previewProduct = useMemo(() => {
    if (!draft) return null;
    const name = LOAN_PRODUCTS.find(item => item.id === selectedKey)?.name || selectedKey;
    let steps = [];
    try { steps = resolveSteps(draft.steps); } catch { steps = []; }
    return {
      productKey: selectedKey, name, configVersion: draft.version, baseProductEnabled: draft.baseProductEnabled !== false, steps,
      subProducts: (draft.subProducts || []).filter(sub => sub.isActive).map(sub => {
        let subSteps = steps;
        if (sub.inheritSteps === false) { try { subSteps = resolveSteps(sub.steps || []); } catch { subSteps = []; } }
        return { id: sub.id, name: sub.name, description: sub.description, endDate: sub.endDate, steps: subSteps };
      }),
    };
  }, [draft, selectedKey]);

  const onCopied = (key, saved) => setProducts(previous => previous.map(item => (item.productKey === key ? { ...item, saved: true, isDefault: false, source: undefined, config: { ...saved, isDefault: false } } : item)));
  const currentIsDefault = isDefaultEntry(entryFor(selectedKey));

  if (status === 'loading' && !draft) return <p role="status" className="flex items-center gap-2 p-6 text-slate-600"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>;
  if (status === 'error') return <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{loadError} <button type="button" onClick={() => load()} className="ml-2 font-semibold underline">Дахин оролдох</button></div>;
  if (!draft) return null;

  const badge = item => {
    const config = item.config || {};
    const live = (config.subProducts || []).filter(sub => sub.status === 'live').length;
    const isDefault = isDefaultEntry(item);
    const label = isDefault ? 'Анхны тохиргоо' : !item.saved ? 'Тохируулаагүй' : config.isActive ? 'Идэвхтэй' : 'Идэвхгүй';
    const color = isDefault ? 'bg-sky-100 text-sky-800' : !item.saved ? 'bg-slate-100 text-slate-600' : config.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
    return <><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>{label}</span>{live > 0 && <span className="text-[11px] text-slate-500">{live} дэд</span>}</>;
  };

  return <div className="space-y-5">
    <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><Settings2 size={24} aria-hidden="true" />Хүсэлтийн маягт</h2>
    <div className="grid items-start gap-5 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Бүтээгдэхүүн" className="rounded-2xl bg-white p-2 shadow-sm">
        <ul className="space-y-1">{LOAN_PRODUCTS.map(product => { const item = entryFor(product.id) || { saved: false, config: {} }; return <li key={product.id}><button type="button" aria-current={selectedKey === product.id ? 'true' : undefined} onClick={() => selectProduct(product.id)} className={`flex min-h-11 w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left text-sm ${selectedKey === product.id ? 'bg-[#003B5C] text-white' : 'hover:bg-slate-100'}`}><span className="font-medium">{product.name}</span><span className={`flex flex-wrap items-center gap-2 ${selectedKey === product.id ? '[&_span]:!bg-white/90 [&_span]:!text-slate-800' : ''}`}>{badge(item)}</span></button></li>; })}</ul>
      </nav>

      <div className="min-w-0 space-y-5 rounded-2xl bg-white p-5 shadow-sm">
        {currentIsDefault && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Анхны тохиргоо ашиглагдаж байна — хадгалбал энэ бүтээгдэхүүнд тусгай тохиргоо үүснэ.</p>}
        {pendingKey && <div role="alertdialog" aria-label="Хадгалаагүй өөрчлөлт" className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} aria-hidden="true" />Хадгалаагүй өөрчлөлт алдагдана.<button type="button" onClick={discardAndSwitch} className="min-h-10 rounded-lg bg-amber-600 px-3 font-semibold text-white">Хаяад солих</button><button type="button" onClick={() => setPendingKey(null)} className="min-h-10 rounded-lg border border-amber-400 px-3">Үлдэх</button></div>}

        <div role="tablist" aria-label="Тохиргооны хэсэг" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {TABS.map(([key, label]) => <button key={key} type="button" role="tab" id={`cfg-tab-${key}`} aria-selected={tab === key} aria-controls="cfg-panel" onClick={() => setTab(key)} className={`min-h-10 rounded-full px-4 text-sm font-medium ${tab === key ? 'bg-[#003B5C] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>)}
        </div>

        <div role="tabpanel" id="cfg-panel" aria-labelledby={`cfg-tab-${tab}`} className="space-y-5">
          {tab === 'form' && <>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <span className="min-w-0 flex-1 text-slate-600">Талбаруудыг системийн шинэ анхны маягтаар (орлогын эх үүсвэр, барьцааны сонголт гэх мэт) солих.</span>
              {!confirmReset
                ? <button type="button" onClick={() => setConfirmReset(true)} className="min-h-10 rounded-lg border border-[#003B5C] px-3 font-semibold text-[#003B5C] hover:bg-slate-50">Анхны маягтаар шинэчлэх</button>
                : <span role="alertdialog" aria-label="Анхны маягтаар шинэчлэх" className="flex flex-wrap items-center gap-2"><span className="text-amber-900">Одоогийн талбарууд солигдоно.</span><button type="button" onClick={resetToDefault} className="min-h-10 rounded-lg bg-[#003B5C] px-3 font-semibold text-white">Тийм, солих</button><button type="button" onClick={() => setConfirmReset(false)} className="min-h-10 rounded-lg border border-slate-300 px-3">Болих</button></span>}
            </div>
            <div className="space-y-3">
              <label className="flex min-h-10 items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-[#003B5C]" checked={Boolean(draft.isActive)} onChange={event => { update({ isActive: event.target.checked }); setConfirmActive(event.target.checked); }} />Идэвхтэй (нийтийн сайтад шинэ маягт харагдана)</label>
              {confirmActive && draft.isActive && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Хадгалсны дараа нийтийн сайтад шинэ маягт харагдана.</p>}
              <label className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#003B5C]" checked={draft.baseProductEnabled !== false} onChange={event => update({ baseProductEnabled: event.target.checked })} />Үндсэн бүтээгдэхүүнд хүсэлт авах</label>
            </div>
            <StepsEditor steps={draft.steps || []} onChange={steps => update({ steps })} errors={errors} />
          </>}
          {tab === 'subs' && <SubProductEditor productKey={selectedKey} subProducts={draft.subProducts || []} productSteps={draft.steps || []} assignees={assignees} onChange={subProducts => update({ subProducts })} errors={errors} />}
          {tab === 'assign' && <label className="block max-w-md text-sm font-semibold text-slate-700">Бүтээгдэхүүний default хүлээн авагч
            <select className={`${BOX} mt-2 min-h-11 w-full`} value={draft.defaultAssigneeId || ''} onChange={event => update({ defaultAssigneeId: event.target.value })}><option value="">Хуваарилахгүй</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select>
            <span className="mt-2 block text-xs font-normal text-slate-500">Шинэ хүсэлт автоматаар энэ ажилтанд хуваарилагдана. Дэд бүтээгдэхүүн өөрийн хүлээн авагчтай бол түүнийг ашиглана.</span></label>}
          {tab === 'preview' && previewProduct && <div className="overflow-hidden rounded-2xl bg-[#f7f8f6] p-4 md:p-6"><TaskLoanForm key={`${selectedKey}-${draft.version}-${JSON.stringify(draft.steps).length}`} product={previewProduct} preview embedded /></div>}
        </div>

        {Object.keys(errors).length > 0 && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="mb-1 font-semibold">Алдаа:</p><ul className="list-disc space-y-0.5 pl-5">{Object.entries(errors).map(([path, text]) => <li key={path}><span className="font-mono text-xs">{path}</span> — {String(text)}</li>)}</ul></div>}
        {message.text && <p role={message.type === 'ok' ? 'status' : 'alert'} className={`flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{message.type === 'ok' && <CheckCircle2 size={16} aria-hidden="true" />}{message.text}{message.type === 'conflict' && <button type="button" onClick={() => load(selectedKey)} className="font-semibold underline">Дахин ачаалах</button>}</p>}

        {copySource?.key === selectedKey && <CopyStepsPanel key={`${copySource.key}-${draft.version}`} apiUrl={apiUrl} sourceKey={selectedKey} sourceSteps={copySource.steps} products={products} toPayload={toPayload} onApplied={onCopied} onDismiss={() => setCopySource(null)} />}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">Хувилбар {draft.version ?? 0}{dirty ? ' · хадгалаагүй өөрчлөлттэй' : ''}</p>
          <button type="button" onClick={save} disabled={saving || (!dirty && !currentIsDefault)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}Хадгалах</button>
        </div>
      </div>
    </div>
  </div>;
}
