import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import TaskField, { Reveal } from './TaskField';
import FileCategoryCards from './FileCategoryCards';
import { trackLead } from '../../utils/metaPixel';
import { API_URL, errorMessage, fetchPublicProduct, submitPublicRequest } from './api';
import { allFields, checkFileSelection, errorFor, hiddenKeys, isFileField, isVisible, pruneHidden, stepIndexForErrors, validateSteps, visibleSteps } from './taskFormUtils';

const REVIEW_TITLE = 'Хянах ба илгээх';

const initialRaw = productKey => {
  const raw = {};
  if (productKey === 'line_loan') raw.borrower_type = 'organization';
  return raw;
};

export default function TaskLoanForm({ product: initialProduct, subProductId = '', onBack, preview = false, apiUrl = API_URL, embedded = false }) {
  const [product, setProduct] = useState(initialProduct);
  const subs = useMemo(() => (Array.isArray(product.subProducts) ? product.subProducts : []), [product]);
  const baseEnabled = product.baseProductEnabled !== false;
  const requestedSub = subProductId && subs.find(sub => sub.id === subProductId) ? subProductId : null;
  const autoSelect = requestedSub ?? (subs.length === 0 ? '' : (!baseEnabled && subs.length === 1 ? subs[0].id : null));
  const [selected, setSelected] = useState(autoSelect);
  const [step, setStep] = useState(0);
  const [rawState, setRaw] = useState(() => initialRaw(initialProduct.productKey));
  const [interacted, setInteracted] = useState(false);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reference, setReference] = useState('');
  const formRef = useRef(null);
  const successRef = useRef(null);
  const submittingRef = useRef(false);

  const canChangeSub = subs.length > 0 && !requestedSub && !(!baseEnabled && subs.length === 1);
  const activeSub = selected ? subs.find(sub => sub.id === selected) : null;
  const allSteps = useMemo(() => (selected === null ? [] : ((activeSub ? activeSub.steps : product.steps) || [])), [selected, activeSub, product]);
  // Answers of hidden fields never count; steps without visible fields are skipped.
  const raw = useMemo(() => pruneHidden(allSteps, rawState), [allSteps, rawState]);
  const steps = useMemo(() => visibleSteps(allSteps, raw), [allSteps, raw]);
  const reviewIndex = steps.length;
  const isReview = step >= reviewIndex;
  const titles = [...steps.map(item => item.title), REVIEW_TITLE];
  const currentStep = steps[Math.min(step, reviewIndex)];
  const allFileList = Object.values(files).flat();

  useEffect(() => { if (reference) successRef.current?.focus(); }, [reference]);

  const focusFirstInvalid = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  const move = next => {
    setStep(next);
    setInteracted(false);
    setErrors({});
    setNotice('');
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); formRef.current?.querySelector('input, select, textarea')?.focus({ preventScroll: true }); });
  };
  const change = (key, value) => {
    setInteracted(true);
    setRaw(previous => pruneHidden(allSteps, { ...previous, [key]: value }));
    setFiles(previous => {
      const hidden = hiddenKeys(allSteps, { ...raw, [key]: value });
      return Object.keys(previous).some(name => hidden.has(name) && previous[name]?.length) ? Object.fromEntries(Object.entries(previous).filter(([name]) => !hidden.has(name))) : previous;
    });
    setErrors(previous => { const next = { ...previous }; Object.keys(next).forEach(path => { if (path === key || path.startsWith(`${key}.`)) delete next[path]; }); return next; });
    setSubmitError('');
  };
  const addFiles = (field, incoming) => {
    setUploadError('');
    const existing = files[field.key] || [];
    const message = checkFileSelection(field, existing, incoming, allFileList.length, allFileList.reduce((sum, file) => sum + file.size, 0));
    if (message) { setUploadError(`${field.label}: ${message}`); return; }
    setFiles(previous => ({ ...previous, [field.key]: [...existing, ...incoming] }));
    setErrors(previous => ({ ...previous, [field.key]: undefined }));
  };
  const removeFile = (field, index) => setFiles(previous => ({ ...previous, [field.key]: (previous[field.key] || []).filter((_, position) => position !== index) }));

  const selectSub = id => {
    setSelected(id);
    setStep(0);
    setErrors({});
  };

  const next = () => {
    const result = validateSteps([currentStep], raw, files, allSteps);
    setErrors(result.errors);
    if (!result.ok) { focusFirstInvalid(); return; }
    move(step + 1);
  };

  const submit = async event => {
    event.preventDefault();
    if (!isReview) { next(); return; }
    if (preview || submittingRef.current) return;
    const result = validateSteps(steps, raw, files, allSteps);
    if (!result.ok) {
      setErrors(result.errors);
      const index = stepIndexForErrors(steps, result.errors);
      if (index >= 0) { setStep(index); focusFirstInvalid(); }
      return;
    }
    if (!consent) { setErrors({ consent: 'Мэдээллээ хүсэлт судлуулах зорилгоор боловсруулахыг зөвшөөрнө үү.' }); focusFirstInvalid(); return; }
    submittingRef.current = true;
    setLoading(true); setSubmitError(''); setNotice(''); setProgress(0);
    try {
      const payload = new FormData();
      payload.append('productKey', product.productKey);
      payload.append('subProductId', selected || '');
      payload.append('configVersion', String(product.configVersion));
      payload.append('answers', JSON.stringify(result.value));
      payload.append('consent', 'true');
      payload.append('website', honeypot);
      // D23: chat entry points link here with ?source=messenger|webchat; the backend stores it as the request channel.
      const sourceParam = new URLSearchParams(window.location.search).get('source');
      if (sourceParam === 'messenger' || sourceParam === 'webchat') payload.append('channel', sourceParam);
      const hidden = hiddenKeys(allSteps, raw);
      for (const field of allFields(steps)) {
        if (isFileField(field) && !hidden.has(field.key)) (files[field.key] || []).forEach(file => payload.append(field.key, file));
      }
      const response = await submitPublicRequest(apiUrl, payload, ev => { if (ev.total) setProgress(Math.round(ev.loaded / ev.total * 100)); });
      if (!response?.applicationReference) throw new Error('missing reference');
      setReference(response.applicationReference);
      trackLead(product.productKey);
      setFiles({});
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.code === 'CONFIG_CHANGED') {
        try {
          const fresh = (await fetchPublicProduct(apiUrl, product.productKey, 5000, { fresh: true }))?.product;
          if (fresh) { setProduct(fresh); if (selected && !(fresh.subProducts || []).some(sub => sub.id === selected)) setSelected(null); }
        } catch { /* keep current form */ }
        setStep(0);
        setNotice('Маягт шинэчлэгдсэн. Бөглөсөн хариултаа шалгаад дахин илгээнэ үү.');
      } else if (error.response?.status === 400 && data?.errors && typeof data.errors === 'object') {
        setErrors(data.errors);
        const index = stepIndexForErrors(steps, data.errors);
        if (index >= 0) { setStep(index); focusFirstInvalid(); }
        setSubmitError(data.message || 'Мэдээллээ шалгаад дахин илгээнэ үү.');
      } else if (error.response?.status === 404 && data?.code === 'PRODUCT_UNAVAILABLE') {
        setSubmitError('Энэ бүтээгдэхүүн/хөтөлбөрийн хүсэлт авах хугацаа дууссан байна. Хуудсыг шинэчилж дахин оролдоно уу.');
      } else {
        setSubmitError(errorMessage(error, 'Хүсэлт илгээж чадсангүй. Мэдээлэл, файлууд тань энэ дэлгэцэд хадгалагдсан тул дахин оролдоорой.'));
      }
    } finally { submittingRef.current = false; setLoading(false); }
  };

  const visibleFields = (currentStep?.fields || []).filter(field => isVisible(field, raw));
  const renderField = field => <Reveal key={field.key} animate={interacted}><TaskField field={field} value={raw[field.key]} error={errorFor(errors, field.key)} disabled={loading} onChange={change} files={files[field.key] || []} onAddFiles={addFiles} onRemoveFile={removeFile} /></Reveal>;

  const Wrapper = embedded ? 'div' : 'main';
  const wrapperClass = embedded ? '' : 'sc-public-page min-h-screen bg-[#f7f8f6] pb-20 pt-28 text-[#102d43] md:pt-32';

  return <Wrapper className={wrapperClass}>
    <div className={embedded ? '' : 'mx-auto max-w-6xl px-5 md:px-8'}>
      {!embedded && <button type="button" onClick={onBack} disabled={loading} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-[#102d43]"><ArrowLeft size={17} aria-hidden="true" />Нүүр хуудас</button>}
      {reference ? <section ref={successRef} tabIndex={-1} className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 text-center md:p-12" role="status">
        <CheckCircle2 size={48} className="mx-auto mb-6 text-emerald-700" aria-hidden="true" /><h1 className="text-3xl font-semibold">Хүсэлт бүртгэгдлээ</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">Таны хүсэлт, хавсаргасан баримтууд бүртгэгдсэн. Ажилтан судалж, шаардлагатай нэмэлт мэдээллийн талаар тантай холбогдоно.</p>
        <p className="mt-7 rounded-xl bg-slate-50 p-4 text-sm">Хүсэлтийн дугаар <strong className="mt-2 block text-lg font-semibold tracking-wide">{reference}</strong></p>
        {String(raw.email || '').trim() && <p className="mt-4 text-sm text-slate-600">Баталгаажуулах имэйл илгээх болно.</p>}
        {onBack && <button type="button" onClick={onBack} className="mt-8 rounded-xl bg-[#102d43] px-6 py-3 font-medium text-white">Нүүр хуудас руу буцах</button>}
      </section> : <>
        <div className="mb-10 max-w-3xl"><p className="mb-3 text-xs font-semibold tracking-[0.12em] text-[#806735]">ЗЭЭЛИЙН ХҮСЭЛТ</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.name}{activeSub ? <span className="mt-1 block text-xl font-medium text-slate-600 md:text-2xl">{activeSub.name}</span> : null}</h1>{activeSub?.description && <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{activeSub.description}</p>}</div>
        {preview && <p role="note" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Урьдчилан харах горим — хүсэлт илгээгдэхгүй.</p>}
        {selected === null ? <section aria-labelledby="sub-pick" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
          <h2 id="sub-pick" className="mb-2 text-xl font-semibold">Хөтөлбөр сонгох</h2>
          <p className="mb-6 text-sm text-slate-600">Хүсэлт гаргах хөтөлбөрөө сонгоно уу.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {baseEnabled && <button type="button" onClick={() => selectSub('')} className="min-h-11 rounded-2xl border border-slate-200 p-5 text-left hover:border-[#102d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102d43]"><span className="block font-semibold">Үндсэн бүтээгдэхүүн</span><span className="mt-1 block text-sm text-slate-600">{product.name}</span></button>}
            {subs.map(sub => <button key={sub.id} type="button" onClick={() => selectSub(sub.id)} className="min-h-11 rounded-2xl border border-slate-200 p-5 text-left hover:border-[#102d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102d43]"><span className="block font-semibold">{sub.name}</span>{sub.description && <span className="mt-1 block text-sm text-slate-600">{sub.description}</span>}{sub.endDate && <span className="mt-2 block text-xs text-[#806735]">{sub.endDate} хүртэл</span>}</button>)}
          </div>
        </section> : <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <ol className="mb-6 flex gap-3 overflow-x-auto pb-1" aria-label="Хүсэлтийн алхмууд">{titles.map((label, index) => <li key={`${label}-${index}`} aria-current={index === step ? 'step' : undefined} className={`min-w-[7.5rem] flex-1 border-t-2 pt-3 text-xs leading-relaxed md:text-sm ${index <= step ? 'border-[#102d43] text-[#102d43]' : 'border-slate-200 text-slate-500'}`}><span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
            <form ref={formRef} onSubmit={submit} noValidate className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
              <p className="mb-1 text-xs text-slate-500">Алхам {step + 1}/{titles.length} · {titles[step]}</p>
              <fieldset disabled={loading}>
                <legend className="mb-2 text-xl font-semibold">{titles[step]}</legend>
                <p className="mb-6 text-xs text-slate-500"><span className="text-red-600" aria-hidden="true">*</span> — заавал бөглөх талбар</p>
                {!isReview && <div className="space-y-5">
                  {currentStep?.description && <p className="text-sm leading-relaxed text-slate-600">{currentStep.description}</p>}
                  {visibleFields.filter(field => !isFileField(field)).map(renderField)}
                  <FileCategoryCards fields={visibleFields.filter(isFileField)} files={files} renderField={renderField} />
                  {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
                </div>}
                {isReview && <div className="space-y-6">
                  {steps.map(item => <section key={item.id} aria-label={item.title}><h3 className="mb-3 text-sm font-semibold">{item.title}</h3><dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{item.fields.filter(field => isVisible(field, raw)).map(field => <TaskField key={field.key} field={field} mode="readonly" value={isFileField(field) ? (files[field.key] || []).map(file => ({ fileName: file.name })) : raw[field.key]} />)}</dl></section>)}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></label></div>
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); setErrors(previous => ({ ...previous, consent: undefined })); }} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'consent-error' : undefined} className="mt-1 h-5 w-5 shrink-0 accent-[#102d43]" /><span>Миний мэдээлэл, баримтыг зээлийн хүсэлт судлах зорилгоор боловсруулахыг <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">нууцлалын бодлогын</a> дагуу зөвшөөрч байна.</span></label>
                  {errors.consent && <p id="consent-error" role="alert" className="text-xs text-red-700">{errors.consent}</p>}
                </div>}
              </fieldset>
              {notice && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">{notice}</p>}
              {submitError && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm leading-relaxed text-red-700">{submitError}</p>}
              {loading && <p role="status" className="mt-6 text-sm text-slate-600">{progress < 100 ? `Файл, мэдээлэл илгээж байна… ${progress}%` : 'Хүсэлт бүртгэж байна…'} Энэ дэлгэцийг нээлттэй байлгана уу.</p>}
              <div className="mt-8 flex flex-wrap justify-between gap-4 border-t border-slate-200 pt-6">
                <button type="button" disabled={loading || (step === 0 && !canChangeSub)} onClick={() => (step === 0 ? selectSub(null) : move(step - 1))} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 py-3 text-sm text-slate-600 disabled:opacity-30"><ArrowLeft size={16} aria-hidden="true" />Буцах</button>
                <button type="submit" disabled={loading || (preview && isReview)} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#102d43] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#164866] disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}{isReview ? 'Хүсэлт илгээх' : 'Үргэлжлүүлэх'}<ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            </form>
          </div>
          <aside className="rounded-2xl bg-[#102d43] p-6 text-white lg:sticky lg:top-28"><ShieldCheck size={26} className="mb-4 text-[#e2c56e]" aria-hidden="true" /><h2 className="text-lg font-semibold">Таны хүсэлтийн тойм</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="mb-1 text-white/65">Бүтээгдэхүүн</dt><dd>{product.name}</dd></div>{activeSub && <div><dt className="mb-1 text-white/65">Хөтөлбөр</dt><dd>{activeSub.name}</dd></div>}<div><dt className="mb-1 text-white/65">Хавсаргасан баримт</dt><dd>{allFileList.length} файл</dd></div></dl>
            <p className="mt-6 border-t border-white/20 pt-5 text-xs leading-relaxed text-white/70">Хүсэлт бүртгэгдэх нь зээл батлагдсан гэсэн үг биш. Эцсийн нөхцөл, шийдвэрийг судалгааны дараа ажилтан танилцуулна.</p>
          </aside>
        </div>}
      </>}
    </div>
  </Wrapper>;
}
