import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Paperclip, ShieldCheck, Trash2 } from 'lucide-react';
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';

const PRODUCT_IDS = { 1: 'biz_loan', 2: 'car_purchase_loan', 3: 'cons_loan', 5: 'credit_card', 6: 're_loan', 7: 'line_loan' };
const DOCUMENTS = [
  { key: 'file_id', label: 'Иргэний үнэмлэх / лавлагаа' },
  { key: 'file_address', label: 'Хаягийн лавлагаа' },
  { key: 'file_social', label: 'НДШ-ийн лавлагаа' },
  { key: 'file_bank', label: 'Дансны хуулгууд' },
  { key: 'file_credit', label: 'Зээлийн мэдээллийн лавлагаа / ЗМС' },
  { key: 'file_car_photos', label: 'Тээврийн хэрэгслийн зураг' },
  { key: 'file_prop_map', label: 'Үл хөдлөх болон бусад барьцааны зураг' },
];
const STEPS = ['Холбоо барих', 'Зээлийн хэрэгцээ', 'Баримт ба илгээлт'];
const MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-[#102d43] placeholder:text-slate-400 focus:border-[#102d43] focus:outline-none focus:ring-2 focus:ring-[#102d43]/15 disabled:opacity-60';

function Field({ label, error, children, optional = false }) {
  const errorId = children?.props?.id ? `${children.props.id}-error` : undefined;
  return <label className="block text-sm font-medium text-[#102d43]">
    <span className="mb-2 flex items-center gap-2">{label}{optional && <span className="text-xs font-normal text-slate-500">Заавал биш</span>}</span>
    {children}
    {error && <span id={errorId} className="mt-2 block text-xs text-red-700" role="alert">{error}</span>}
  </label>;
}

export default function QuickLoanRequest({ onBack, initialProduct }) {
  const queryProduct = new URLSearchParams(window.location.search).get('product');
  const productKey = queryProduct || PRODUCT_IDS[initialProduct?.id] || initialProduct?.productKey || '';
  const loanType = productKey === 'car_loan' ? 'car_purchase_loan' : productKey;
  const [form, setForm] = useState({ borrowerType: loanType === 'line_loan' ? 'organization' : 'individual', name: '', orgName: '', phone: '', email: '', loanType, amount: '', term: '', repaymentSource: '', purpose: '', collateralType: '', consent: false });
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reference, setReference] = useState('');
  const formRef = useRef(null);
  const successRef = useRef(null);
  const submittingRef = useRef(false);
  const allFiles = Object.values(files).flat();
  const apiUrl = import.meta.env.VITE_API_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

  useEffect(() => { if (reference) successRef.current?.focus(); }, [reference]);

  const update = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setSubmitError('');
  };
  const validate = currentStep => {
    const next = {};
    if (currentStep === 0 || currentStep === 'all') {
      if (!form.name.trim()) next.name = 'Нэрээ оруулна уу.';
      if (form.borrowerType === 'organization' && !form.orgName.trim()) next.orgName = 'Байгууллагын нэрээ оруулна уу.';
      if (!/^\+?\d{8,15}$/.test(form.phone.replace(/[\s()-]/g, ''))) next.phone = 'Утасны дугаараа зөв оруулна уу.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Зөв имэйл хаяг оруулна уу.';
    }
    if (currentStep === 1 || currentStep === 'all') {
      if (!LOAN_PRODUCTS.some(product => product.id === form.loanType)) next.loanType = 'Зээлийн төрлөө сонгоно уу.';
      if (!Number.isSafeInteger(Number(form.amount)) || Number(form.amount) <= 0 || Number(form.amount) > 1e12) next.amount = 'Хүсэж буй зээлийн дүнгээ зөв оруулна уу.';
      if (!Number.isInteger(Number(form.term)) || Number(form.term) < 1 || Number(form.term) > 120) next.term = '1–120 сарын хугацаа оруулна уу.';
      if (!form.repaymentSource.trim()) next.repaymentSource = 'Зээлээ ямар орлогоос төлөхөө бичнэ үү.';
    }
    if ((currentStep === 2 || currentStep === 'all') && !form.consent) next.consent = 'Мэдээллээ хүсэлт судлуулах зорилгоор боловсруулахыг зөвшөөрнө үү.';
    setErrors(next);
    if (Object.keys(next).length) {
      if (currentStep === 'all') setStep(next.name || next.phone || next.email || next.orgName ? 0 : next.loanType || next.amount || next.term || next.repaymentSource ? 1 : 2);
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return false;
    }
    return true;
  };
  const move = next => {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); formRef.current?.querySelector('input, select, textarea')?.focus({ preventScroll: true }); });
  };
  const attach = (key, incoming) => {
    setUploadError('');
    const additions = Array.from(incoming);
    if (additions.some(file => !MIME_TYPES.includes(file.type))) { setUploadError('PDF, JPG, PNG, WEBP файл сонгоно уу.'); return; }
    if (additions.some(file => file.size > 10 * 1024 * 1024 || file.size === 0)) { setUploadError('Файл бүр хоосон биш, 10 MB хүртэл хэмжээтэй байна.'); return; }
    if ((files[key]?.length || 0) + additions.length > (key === 'file_bank' ? 4 : 3)) { setUploadError(key === 'file_bank' ? 'Дансны хуулга 4 хүртэл файл байна.' : 'Энэ хэсэгт 3 хүртэл файл нэмнэ үү.'); return; }
    if (allFiles.length + additions.length > 12 || [...allFiles, ...additions].reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) { setUploadError('Нийт 12 файл, 50 MB хүртэл хавсаргах боломжтой.'); return; }
    setFiles(previous => ({ ...previous, [key]: [...(previous[key] || []), ...additions] }));
  };
  const submit = async event => {
    event.preventDefault();
    if (step < 2) { if (validate(step)) move(step + 1); return; }
    if (submittingRef.current || !validate('all')) return;
    submittingRef.current = true;
    setLoading(true);
    setSubmitError('');
    setProgress(0);
    try {
      const payload = new FormData();
      for (const key of ['borrowerType', 'orgName', 'phone', 'email', 'loanType', 'amount', 'term', 'repaymentSource', 'purpose', 'collateralType']) payload.append(key, String(form[key]).trim());
      payload.append(form.borrowerType === 'organization' ? 'contactName' : 'firstName', form.name.trim());
      payload.append('consent', 'true');
      Object.entries(files).forEach(([key, list]) => list.forEach(file => payload.append(key, file)));
      const response = await axios.post(`${apiUrl}/api/loans/quick`, payload, { onUploadProgress: event => { if (event.total) setProgress(Math.round(event.loaded / event.total * 100)); } });
      if (!response.data?.applicationReference) throw new Error('Хүсэлтийн дугаар буцаж ирсэнгүй.');
      setReference(response.data.applicationReference);
      setFiles({});
    } catch (error) {
      setSubmitError(error.response?.status === 429 ? 'Хүсэлт илгээх давтамжийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.' : error.response?.data?.message || 'Хүсэлт илгээж чадсангүй. Мэдээлэл, файлууд тань энэ дэлгэцэд хадгалагдсан тул дахин оролдоорой.');
    } finally { submittingRef.current = false; setLoading(false); }
  };
  const props = key => ({ id: key, name: key, value: form[key], onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${key}-error` : undefined, disabled: loading, className: INPUT });

  return <main className="sc-public-page min-h-screen bg-[#f7f8f6] pb-20 pt-28 text-[#102d43] md:pt-32">
    <div className="mx-auto max-w-6xl px-5 md:px-8">
      <button type="button" onClick={onBack} disabled={loading} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-[#102d43]"><ArrowLeft size={17} aria-hidden="true" />Нүүр хуудас</button>
      {reference ? <section ref={successRef} tabIndex={-1} className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 text-center md:p-12" role="status">
        <CheckCircle2 size={48} className="mx-auto mb-6 text-emerald-700" aria-hidden="true" /><h1 className="text-3xl font-semibold">Хүсэлт бүртгэгдлээ</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">Таны хүсэлт, хавсаргасан баримтууд бүртгэгдсэн. Ажилтан судалж, шаардлагатай нэмэлт мэдээллийн талаар тантай холбогдоно.</p>
        <p className="mt-7 rounded-xl bg-slate-50 p-4 text-sm">Хүсэлтийн дугаар <strong className="mt-2 block text-lg font-semibold tracking-wide">{reference}</strong></p>
        <button type="button" onClick={onBack} className="mt-8 rounded-xl bg-[#102d43] px-6 py-3 font-medium text-white">Нүүр хуудас руу буцах</button>
      </section> : <>
        <div className="mb-10 max-w-3xl"><p className="mb-3 text-xs font-semibold tracking-[0.12em] text-[#806735]">ЗЭЭЛИЙН ХҮСЭЛТ</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Хэрэгцээгээ хэлээрэй.<br />Бид хамт шийдэл хайя.</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">Эхний хүсэлтэд үндсэн мэдээлэл хангалттай. Бэлэн байгаа баримтаа хавсаргаад илгээгээрэй.</p></div>
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <ol className="mb-6 grid grid-cols-3 gap-3" aria-label="Хүсэлтийн алхмууд">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={`border-t-2 pt-3 text-xs leading-relaxed md:text-sm ${index <= step ? 'border-[#102d43] text-[#102d43]' : 'border-slate-200 text-slate-500'}`}><span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
            <form ref={formRef} onSubmit={submit} noValidate className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
              <fieldset disabled={loading}>
                <legend className="mb-6 text-xl font-semibold">{STEPS[step]}</legend>
                {step === 0 && <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3" role="group" aria-label="Хүсэлт гаргагчийн төрөл">{[['individual', 'Иргэн'], ['organization', 'Байгууллага']].map(([value, label]) => <button key={value} type="button" aria-pressed={form.borrowerType === value} onClick={() => update('borrowerType', value)} className={`min-h-12 rounded-xl border px-4 py-3 text-sm font-medium ${form.borrowerType === value ? 'border-[#102d43] bg-[#102d43] text-white' : 'border-slate-200 text-slate-600'}`}>{label}</button>)}</div>
                  {form.borrowerType === 'organization' && <Field label="Байгууллагын нэр" error={errors.orgName}><input {...props('orgName')} autoComplete="organization" maxLength={200} /></Field>}
                  <Field label={form.borrowerType === 'organization' ? 'Холбоо барих хүний нэр' : 'Таны нэр'} error={errors.name}><input {...props('name')} autoComplete="name" maxLength={100} /></Field>
                  <div className="grid gap-5 sm:grid-cols-2"><Field label="Утасны дугаар" error={errors.phone}><input {...props('phone')} type="tel" autoComplete="tel" placeholder="9911 2233" maxLength={30} /></Field><Field label="Имэйл хаяг" error={errors.email}><input {...props('email')} type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} /></Field></div>
                  <p className="text-sm leading-relaxed text-slate-500">Эдгээр мэдээллээр бид таны хүсэлтийн талаар холбогдоно.</p>
                </div>}
                {step === 1 && <div className="space-y-5">
                  <Field label="Ямар зээл хэрэгтэй вэ?" error={errors.loanType}><select {...props('loanType')}><option value="">Зээлийн төрөл сонгох</option>{LOAN_PRODUCTS.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
                  <div className="grid gap-5 sm:grid-cols-2"><Field label="Зээлийн дүн · ₮" error={errors.amount}><input {...props('amount')} type="number" inputMode="numeric" min="1" max="1000000000000" step="1" placeholder="20000000" /></Field><Field label="Хугацаа · сар" error={errors.term}><input {...props('term')} type="number" inputMode="numeric" min="1" max="120" step="1" placeholder="24" /></Field></div>
                  <Field label="Ямар эх үүсвэрээс эргэн төлөх вэ?" error={errors.repaymentSource}><textarea {...props('repaymentSource')} rows={3} maxLength={1000} placeholder="Жишээ: цалин, бизнесийн орлого, түрээсийн орлого…" /></Field>
                  <Field label="Зээлийн зориулалт" optional><textarea {...props('purpose')} rows={2} maxLength={1000} /></Field>
                  <Field label="Барьцаа хөрөнгө" optional><select {...props('collateralType')}><option value="">Одоогоор тодорхойгүй</option><option value="real_estate">Үл хөдлөх хөрөнгө</option><option value="vehicle">Тээврийн хэрэгсэл</option><option value="account_revenue">Дансны орлого</option><option value="contract">Гэрээ / бусад</option><option value="none">Барьцаа хөрөнгөгүй</option></select></Field>
                </div>}
                {step === 2 && <div className="space-y-6">
                  <p className="text-sm leading-relaxed text-slate-600">Бэлэн байгаа баримтаа нэмээрэй. Одоогоор байхгүй материалыг ажилтантай холбогдсоны дараа нөхөж болно.</p>
                  <p className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">PDF, JPG, PNG, WEBP · файл бүр 10 MB хүртэл · нийт 12 файл, 50 MB хүртэл. Дансны хуулга 4, бусад төрөл тус бүр 3 хүртэл файл байна.</p>
                  <details className="rounded-xl border border-slate-200 p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Баримт хавсаргах · {allFiles.length} файл</summary><div className="mt-4 space-y-5">
                  {DOCUMENTS.map(document => <div key={document.key} className="border-b border-slate-200 pb-5"><label className="mb-3 block text-sm font-medium" htmlFor={document.key}>{document.label}</label><input id={document.key} name={document.key} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={event => { attach(document.key, event.target.files); event.target.value = ''; }} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:text-sm file:font-medium file:text-[#102d43]" />
                    {(files[document.key] || []).map((file, index) => <div key={`${file.name}-${index}`} className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><Paperclip size={14} className="shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 break-all">{file.name} <span className="text-slate-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></span><button type="button" onClick={() => setFiles(previous => ({ ...previous, [document.key]: previous[document.key].filter((_, position) => position !== index) }))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700" aria-label={`${file.name} файлыг хасах`}><Trash2 size={16} /></button></div>)}
                  </div>)}
                  </div></details>
                  {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"><input type="checkbox" checked={form.consent} onChange={event => update('consent', event.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'consent-error' : undefined} className="mt-1 h-5 w-5 shrink-0 accent-[#102d43]" /><span>Миний мэдээлэл, баримтыг зээлийн хүсэлт судлах зорилгоор боловсруулахыг <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">нууцлалын бодлогын</a> дагуу зөвшөөрч байна.</span></label>
                  {errors.consent && <p id="consent-error" role="alert" className="text-xs text-red-700">{errors.consent}</p>}
                </div>}
              </fieldset>
              {submitError && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm leading-relaxed text-red-700">{submitError}</p>}
              {loading && <p role="status" className="mt-6 text-sm text-slate-600">{progress < 100 ? `Файл, мэдээлэл илгээж байна… ${progress}%` : 'Хүсэлт бүртгэж байна…'} Энэ дэлгэцийг нээлттэй байлгана уу.</p>}
              <div className="mt-8 flex flex-wrap justify-between gap-4 border-t border-slate-200 pt-6"><button type="button" disabled={loading || step === 0} onClick={() => move(step - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 py-3 text-sm text-slate-600 disabled:opacity-30"><ArrowLeft size={16} aria-hidden="true" />Буцах</button><button type="submit" disabled={loading} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#102d43] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#164866] disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}{step === 2 ? 'Хүсэлт илгээх' : 'Үргэлжлүүлэх'}<ArrowRight size={17} aria-hidden="true" /></button></div>
            </form>
          </div>
          <aside className="rounded-2xl bg-[#102d43] p-6 text-white lg:sticky lg:top-28"><ShieldCheck size={26} className="mb-4 text-[#e2c56e]" aria-hidden="true" /><h2 className="text-lg font-semibold">Таны хүсэлтийн тойм</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="mb-1 text-white/65">Зээлийн төрөл</dt><dd>{LOAN_PRODUCTS.find(product => product.id === form.loanType)?.name || 'Сонгоогүй'}</dd></div><div><dt className="mb-1 text-white/65">Хүссэн дүн</dt><dd className="text-xl font-semibold tabular-nums">{Number(form.amount) > 0 ? `${Number(form.amount).toLocaleString('mn-MN')} ₮` : '—'}</dd></div><div><dt className="mb-1 text-white/65">Хугацаа</dt><dd>{form.term ? `${form.term} сар` : '—'}</dd></div><div><dt className="mb-1 text-white/65">Хавсаргасан баримт</dt><dd>{allFiles.length} файл</dd></div></dl>
            <p className="mt-6 border-t border-white/20 pt-5 text-xs leading-relaxed text-white/70">Хүсэлт бүртгэгдэх нь зээл батлагдсан гэсэн үг биш. Эцсийн нөхцөл, шийдвэрийг судалгааны дараа ажилтан танилцуулна.</p>
          </aside>
        </div>
      </>}
    </div>
  </main>;
}
