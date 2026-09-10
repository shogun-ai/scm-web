import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Loader2,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

const PRODUCT_OPTIONS = [
  'Бизнесийн зээл',
  'Автомашины зээл',
  'Хэрэглээний зээл',
  'Итгэлцэл',
  'Кредит карт',
  'Үл хөдлөх барьцаалсан зээл',
  'Шугмын зээл',
];

const CHANNEL_OPTIONS = ['Утас', 'И-мэйл', 'Мессеж', 'Биечлэн уулзах'];
const INITIAL_FORM = {
  customerType: 'personal',
  firstName: '',
  lastName: '',
  fullName: '',
  registerNo: '',
  phone: '',
  email: '',
  preferredChannel: 'Утас',
  companyName: '',
  registrationNumber: '',
  legalForm: '',
  industry: '',
  employeeCount: '',
  revenueRange: '',
  contactPersonTitle: '',
  productInterests: [],
  serviceNeeds: '',
  branchPreference: '',
  notes: '',
  privacyAccepted: false,
  marketingAccepted: false,
};

const Field = ({ label, error, children, className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    {children}
    {error && <span className="block text-xs font-semibold text-red-500">{error}</span>}
  </label>
);

const CustomerOnboarding = ({ onBack }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const fullName = useMemo(() => (
    form.customerType === 'business'
      ? form.fullName.trim()
      : [form.lastName, form.firstName].filter(Boolean).join(' ').trim()
  ), [form.customerType, form.firstName, form.fullName, form.lastName]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const toggleInterest = (interest) => {
    setForm(prev => ({
      ...prev,
      productInterests: prev.productInterests.includes(interest)
        ? prev.productInterests.filter(item => item !== interest)
        : [...prev.productInterests, interest],
    }));
  };

  const validate = () => {
    const next = {};
    if (!form.customerType) next.customerType = 'Харилцагчийн төрөл сонгоно уу';
    if (form.customerType === 'personal') {
      if (!form.firstName.trim()) next.firstName = 'Нэр оруулна уу';
      if (!form.lastName.trim()) next.lastName = 'Овог оруулна уу';
    } else {
      if (!form.companyName.trim()) next.companyName = 'Байгууллагын нэр оруулна уу';
      if (!form.registrationNumber.trim()) next.registrationNumber = 'Регистр оруулна уу';
      if (!form.fullName.trim()) next.fullName = 'Холбоо барих хүний нэр оруулна уу';
    }
    if (!form.phone.trim() && !form.email.trim()) next.phone = 'Утас эсвэл и-мэйл оруулна уу';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'И-мэйл буруу байна';
    if (!form.privacyAccepted) next.privacyAccepted = 'Зөвшөөрөл шаардлагатай';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        customerType: form.customerType,
        personal: {
          firstName: form.firstName,
          lastName: form.lastName,
          registerNumber: form.registerNo,
        },
        business: {
          name: form.companyName,
          registrationNumber: form.registrationNumber,
          legalForm: form.legalForm,
          industry: form.industry,
          contactPosition: form.contactPersonTitle,
        },
        contact: {
          name: fullName,
          phone: form.phone,
          email: form.email,
          preferredChannel: form.preferredChannel,
        },
        preferences: {
          productInterests: form.productInterests,
          serviceNeeds: form.serviceNeeds,
          branch: form.branchPreference,
          notes: form.notes,
          channel: 'web',
        },
        consents: {
          privacyPolicy: form.privacyAccepted,
          dataProcessing: form.privacyAccepted,
          marketing: form.marketingAccepted,
        },
        metadata: {
          source: 'scm-web',
          pagePath: window.location.pathname,
          referrer: document.referrer,
        },
      };
      const response = await axios.post(`${API_URL}/api/onboarding`, payload);
      setResult({ ok: true, requestId: response.data?.requestId });
      setForm(INITIAL_FORM);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setResult({
        ok: false,
        message: error.response?.data?.message || 'Илгээхэд алдаа гарлаа. Дахин оролдоно уу.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const control = (field) => `w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-[#003B5C] outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-[#003B5C]/10 ${errors[field] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <div className="relative bg-[#003B5C] px-4 pb-16 pt-28 text-white md:px-6">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-[#003B5C]/80" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
          >
            <ArrowLeft size={14} /> Буцах
          </button>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Customer onboarding</p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Харилцагчаар бүртгүүлэх</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100 md:text-lg">
                Бид таны мэдээллийг хүлээн авч, тохирох бүтээгдэхүүн үйлчилгээний зөвлөгөөг хариуцсан ажилтнаар хүргүүлнэ.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              {[
                ['1', 'Мэдээлэл'],
                ['2', 'Хэрэгцээ'],
                ['3', 'Холбоо'],
              ].map(([number, label]) => (
                <div key={number} className="text-center">
                  <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-[#D4AF37] text-sm font-black text-[#003B5C]">{number}</div>
                  <p className="text-[11px] font-bold uppercase text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-20 md:px-6">
        {result && (
          <div className={`mb-5 rounded-2xl border p-5 shadow-sm ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-start gap-3">
              <CheckCircle className={result.ok ? 'text-emerald-600' : 'text-red-500'} size={20} />
              <div>
                <p className="font-bold">{result.ok ? 'Хүсэлт амжилттай илгээгдлээ' : 'Хүсэлт илгээгдсэнгүй'}</p>
                <p className="mt-1 text-sm">{result.ok ? `Бүртгэлийн дугаар: ${result.requestId || '-'}` : result.message}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#003B5C] text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#003B5C]">Харилцагчийн төрөл</h2>
                <p className="text-sm text-slate-500">Бүртгэлийн үндсэн ангилал</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['personal', User, 'Иргэн'],
                ['business', Building2, 'Байгууллага'],
              ].map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('customerType', value)}
                  className={`rounded-2xl border p-5 text-center transition ${form.customerType === value ? 'border-[#003B5C] bg-blue-50 ring-4 ring-[#003B5C]/10' : 'border-slate-200 hover:border-[#003B5C]/40'}`}
                >
                  {React.createElement(Icon, { className: 'mx-auto mb-3 text-[#003B5C]', size: 30 })}
                  <span className="text-sm font-black text-[#003B5C]">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Сонирхож буй үйлчилгээ</p>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_OPTIONS.map(option => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => toggleInterest(option)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${form.productInterests.includes(option) ? 'border-[#00A651] bg-[#00A651] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#00A651]'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {form.customerType === 'personal' ? (
                <>
                  <Field label="Овог *" error={errors.lastName}>
                    <input value={form.lastName} onChange={e => update('lastName', e.target.value)} className={control('lastName')} />
                  </Field>
                  <Field label="Нэр *" error={errors.firstName}>
                    <input value={form.firstName} onChange={e => update('firstName', e.target.value)} className={control('firstName')} />
                  </Field>
                  <Field label="Регистр">
                    <input value={form.registerNo} onChange={e => update('registerNo', e.target.value.toUpperCase())} className={control('registerNo')} maxLength={10} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Байгууллагын нэр *" error={errors.companyName} className="md:col-span-2">
                    <input value={form.companyName} onChange={e => update('companyName', e.target.value)} className={control('companyName')} />
                  </Field>
                  <Field label="Байгууллагын регистр *" error={errors.registrationNumber}>
                    <input value={form.registrationNumber} onChange={e => update('registrationNumber', e.target.value)} className={control('registrationNumber')} />
                  </Field>
                  <Field label="Хуулийн хэлбэр">
                    <input value={form.legalForm} onChange={e => update('legalForm', e.target.value)} className={control('legalForm')} placeholder="ХХК, ХК..." />
                  </Field>
                  <Field label="Салбар">
                    <input value={form.industry} onChange={e => update('industry', e.target.value)} className={control('industry')} />
                  </Field>
                  <Field label="Ажилтны тоо">
                    <input value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} className={control('employeeCount')} />
                  </Field>
                  <Field label="Холбоо барих хүн *" error={errors.fullName}>
                    <input value={form.fullName} onChange={e => update('fullName', e.target.value)} className={control('fullName')} />
                  </Field>
                  <Field label="Албан тушаал">
                    <input value={form.contactPersonTitle} onChange={e => update('contactPersonTitle', e.target.value)} className={control('contactPersonTitle')} />
                  </Field>
                </>
              )}

              <Field label="Утас" error={errors.phone}>
                <input value={form.phone} onChange={e => update('phone', e.target.value.replace(/[^0-9+ ]/g, '').slice(0, 16))} className={control('phone')} />
              </Field>
              <Field label="И-мэйл" error={errors.email}>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={control('email')} />
              </Field>
              <Field label="Холбогдох суваг">
                <select value={form.preferredChannel} onChange={e => update('preferredChannel', e.target.value)} className={control('preferredChannel')}>
                  {CHANNEL_OPTIONS.map(option => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Салбар / байршлын хүсэлт">
                <input value={form.branchPreference} onChange={e => update('branchPreference', e.target.value)} className={control('branchPreference')} />
              </Field>
              <Field label="Хэрэгцээ, зорилго" className="md:col-span-2">
                <textarea rows={4} value={form.serviceNeeds} onChange={e => update('serviceNeeds', e.target.value)} className={`${control('serviceNeeds')} resize-none`} />
              </Field>
              <Field label="Нэмэлт тэмдэглэл" className="md:col-span-2">
                <textarea rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} className={`${control('notes')} resize-none`} />
              </Field>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={e => update('privacyAccepted', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#003B5C]"
                />
                <span>Миний мэдээллийг харилцагчийн бүртгэл, үйлчилгээний зөвлөгөөний зорилгоор боловсруулахыг зөвшөөрч байна.</span>
              </label>
              {errors.privacyAccepted && <p className="text-xs font-semibold text-red-500">{errors.privacyAccepted}</p>}
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.marketingAccepted}
                  onChange={e => update('marketingAccepted', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#00A651]"
                />
                <span>Шинэ бүтээгдэхүүн, үйлчилгээний мэдээлэл авахыг зөвшөөрч байна.</span>
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft size={15} /> Буцах
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00A651] px-7 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#008f45] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Илгээх
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
};

export default CustomerOnboarding;
