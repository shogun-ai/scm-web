import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import { buildDefaultConfig, resolveSteps, validateConfig } from '@shared/loanWidgets';
import StepsEditor from './StepsEditor';
import CopyStepsPanel from './CopyStepsPanel';
import SubProductEditor from './SubProductEditor';
import TaskLoanForm from './TaskLoanForm';
import { errorMessage, fetchAdminConfigs, fetchAssignees, saveAdminConfig } from './api';
import Tabs from '../admin/ui/Tabs';
import Button from '../admin/ui/Button';
import { Field, Select, Toggle } from '../admin/ui/Form';
import { Pill } from '../admin/ui/Feedback';
import { ConfirmDialog } from '../admin/ui/Modal';
import { InlineNote, Panel, SubCard } from '../admin/tabs/cms/editorKit';
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
  // D23: the list comes from the backend (LOAN_PRODUCTS + active CMS-only ProductContent products); LOAN_PRODUCTS until it loads.
  const productList = products.length ? products.map(item => ({ id: item.productKey, name: item.name || item.productKey })) : LOAN_PRODUCTS;
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
    try { result = validateConfig(payload, { extraKeys: [selectedKey] }); } catch { /* server validates */ }
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
    const name = products.find(item => item.productKey === selectedKey)?.name || LOAN_PRODUCTS.find(item => item.id === selectedKey)?.name || selectedKey;
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
  }, [draft, selectedKey, products]);

  const onCopied = (key, saved) => setProducts(previous => previous.map(item => (item.productKey === key ? { ...item, saved: true, isDefault: false, source: undefined, config: { ...saved, isDefault: false } } : item)));
  const currentIsDefault = isDefaultEntry(entryFor(selectedKey));

  if (status === 'loading' && !draft) return <p role="status" className="flex items-center gap-2 p-6 text-sm text-[var(--adm-ink-2)]"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>;
  if (status === 'error') return <InlineNote kind="err" className="flex flex-wrap items-center gap-3">{loadError}<Button variant="secondary" onClick={() => load()}>Дахин оролдох</Button></InlineNote>;
  if (!draft) return null;

  const badge = item => {
    const config = item.config || {};
    const live = (config.subProducts || []).filter(sub => sub.status === 'live').length;
    const isDefault = isDefaultEntry(item);
    const label = isDefault ? 'Анхны тохиргоо' : !item.saved ? 'Тохируулаагүй' : config.isActive ? 'Идэвхтэй' : 'Идэвхгүй';
    const hue = isDefault ? 'cyan' : !item.saved ? 'neutral' : config.isActive ? 'green' : 'gold';
    return <><Pill hue={hue} className="!px-2 !py-0.5 !text-[11px]">{label}</Pill>{live > 0 && <span className="text-[11px] text-[var(--adm-ink-3)]">{live} дэд</span>}</>;
  };

  return <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
    <Field label="Бүтээгдэхүүн" className="lg:hidden">{({ id }) => <Select id={id} value={selectedKey} onChange={event => selectProduct(event.target.value)}>
      {productList.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
    </Select>}</Field>
    <Panel as="nav" className="hidden !p-2 lg:sticky lg:top-24 lg:block" bodyClassName="" glint={false}>
      <p className="adm-label px-3 pb-2 pt-2">Бүтээгдэхүүн</p>
      <ul className="space-y-1" aria-label="Бүтээгдэхүүн">{productList.map(product => {
        const item = entryFor(product.id) || { saved: false, config: {} };
        const current = selectedKey === product.id;
        return <li key={product.id}><button type="button" aria-current={current ? 'true' : undefined} onClick={() => selectProduct(product.id)}
          className={`relative flex min-h-11 w-full flex-col items-start gap-1.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 ${current ? 'bg-[linear-gradient(90deg,color-mix(in_srgb,var(--hue)_18%,transparent),rgba(255,255,255,0.03))] text-white shadow-[inset_2px_0_0_var(--hue),inset_0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-[var(--adm-ink-2)] hover:bg-white/[0.05] hover:text-white'}`}>
          <span className="font-medium leading-snug">{product.name}</span>
          <span className="flex flex-wrap items-center gap-2">{badge(item)}</span>
        </button></li>;
      })}</ul>
    </Panel>

    <Panel className="min-w-0" bodyClassName="space-y-5">
      {currentIsDefault && <InlineNote kind="info">Анхны тохиргоо ашиглагдаж байна — хадгалбал энэ бүтээгдэхүүнд тусгай тохиргоо үүснэ.</InlineNote>}

      <Tabs label="Тохиргооны хэсэг" panelId="cfg-panel" value={tab} onChange={setTab} items={TABS.map(([id, label]) => ({ id, label }))} />

      <div role="tabpanel" id="cfg-panel" aria-label={(TABS.find(([key]) => key === tab) || [])[1]} className="space-y-5">
        {tab === 'form' && <>
          <SubCard className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1 basis-60 text-sm text-[var(--adm-ink-2)]">Талбаруудыг системийн шинэ анхны маягтаар (орлогын эх үүсвэр, барьцааны сонголт гэх мэт) солих.</span>
            <Button variant="secondary" icon={<RotateCcw size={15} aria-hidden="true" />} onClick={() => setConfirmReset(true)}>Анхны маягтаар шинэчлэх</Button>
          </SubCard>
          <div className="grid gap-1 sm:grid-cols-2">
            <Toggle checked={Boolean(draft.isActive)} onChange={checked => { update({ isActive: checked }); setConfirmActive(checked); }} label="Идэвхтэй (нийтийн сайтад шинэ маягт харагдана)" />
            <Toggle checked={draft.baseProductEnabled !== false} onChange={checked => update({ baseProductEnabled: checked })} label="Үндсэн бүтээгдэхүүнд хүсэлт авах" />
          </div>
          {confirmActive && draft.isActive && <InlineNote kind="warn" className="!text-[13px]">Хадгалсны дараа нийтийн сайтад шинэ маягт харагдана.</InlineNote>}
          <StepsEditor steps={draft.steps || []} onChange={steps => update({ steps })} errors={errors} />
        </>}
        {tab === 'subs' && <SubProductEditor productKey={selectedKey} subProducts={draft.subProducts || []} productSteps={draft.steps || []} assignees={assignees} onChange={subProducts => update({ subProducts })} errors={errors} />}
        {tab === 'assign' && <Field label="Бүтээгдэхүүний default хүлээн авагч" hint="Шинэ хүсэлт автоматаар энэ ажилтанд хуваарилагдана. Дэд бүтээгдэхүүн өөрийн хүлээн авагчтай бол түүнийг ашиглана." className="max-w-md">{({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={draft.defaultAssigneeId || ''} onChange={event => update({ defaultAssigneeId: event.target.value })}><option value="">Хуваарилахгүй</option>{assignees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</Select>}</Field>}
        {tab === 'preview' && previewProduct && <div>
          <p className="adm-label mb-2">Нийтийн сайтын харагдац</p>
          <div className="overflow-hidden rounded-2xl bg-[#f7f8f6] p-4 text-slate-800 shadow-[inset_0_1px_0_#FFFFFF,0_18px_40px_-24px_rgba(0,0,0,0.9)] [color-scheme:light] md:p-6"><TaskLoanForm key={`${selectedKey}-${draft.version}-${JSON.stringify(draft.steps).length}`} product={previewProduct} preview embedded /></div>
        </div>}
      </div>

      {Object.keys(errors).length > 0 && <InlineNote kind="err"><p className="mb-1 font-semibold">Алдаа:</p><ul className="list-disc space-y-0.5 pl-5">{Object.entries(errors).map(([path, text]) => <li key={path}><span className="font-mono text-xs">{path}</span> — {String(text)}</li>)}</ul></InlineNote>}
      {message.text && <InlineNote kind={message.type === 'ok' ? 'ok' : 'err'} className="flex flex-wrap items-center gap-3">{message.type === 'ok' && <CheckCircle2 size={16} aria-hidden="true" />}{message.text}{message.type === 'conflict' && <button type="button" onClick={() => load(selectedKey)} className="min-h-11 font-semibold underline underline-offset-2">Дахин ачаалах</button>}</InlineNote>}

      {copySource?.key === selectedKey && <CopyStepsPanel key={`${copySource.key}-${draft.version}`} apiUrl={apiUrl} sourceKey={selectedKey} sourceSteps={copySource.steps} products={products} toPayload={toPayload} onApplied={onCopied} onDismiss={() => setCopySource(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
        <p className="adm-tnum text-xs text-[var(--adm-ink-3)]">Хувилбар {draft.version ?? 0}{dirty ? <span className="text-[#FFD2B0]"> · хадгалаагүй өөрчлөлттэй</span> : ''}</p>
        <Button icon={<Save size={16} aria-hidden="true" />} busy={saving} onClick={save} disabled={saving || (!dirty && !currentIsDefault)}>Хадгалах</Button>
      </div>
    </Panel>

    {pendingKey && <ConfirmDialog danger title="Хадгалаагүй өөрчлөлт" message="Хадгалаагүй өөрчлөлт алдагдана." confirmLabel="Хаяад солих" cancelLabel="Үлдэх" onConfirm={discardAndSwitch} onCancel={() => setPendingKey(null)} />}
    {confirmReset && <ConfirmDialog title="Анхны маягтаар шинэчлэх" message="Одоогийн талбарууд солигдоно." confirmLabel="Тийм, солих" onConfirm={resetToDefault} onCancel={() => setConfirmReset(false)} />}
  </div>;
}
