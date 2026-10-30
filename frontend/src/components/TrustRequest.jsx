import React, { useState } from 'react';
import axios from 'axios';
import PublicPageShell from './PublicPageShell';
import { Send, CheckCircle, Loader, AlertCircle } from 'lucide-react';

const TrustRequest = ({ onBack }) => {
  const [formData, setFormData] = useState({
    lastname: '',
    firstname: '',
    phone: '',
    email: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // ==========================================
  // ✅ 1. ЭНД НЭМЭГДЭЖ БАЙНА:
  // (State-үүдийн дараа, handleChange-ийн өмнө)
  // ==========================================
  const isLocal = window.location.hostname === 'localhost';
  const API_BASE_URL = isLocal 
    ? 'http://localhost:5000' 
    : 'https://scm-okjs.onrender.com';
  // ==========================================

  // --- HANDLERS (VALIDATION) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(''); 

    // 1. ЗӨВХӨН ТОО (Утас)
    if (name === 'phone') {
        const numeric = value.replace(/[^0-9]/g, '');
        if (numeric.length > 8) return; 
        setFormData(prev => ({ ...prev, [name]: numeric }));
        return;
    }

    // 2. МӨНГӨН ДҮН (Мянганы нарийвчлалтай)
    if (name === 'amount') {
        const rawValue = value.replace(/[^0-9]/g, '');
        if (rawValue) {
            const formatted = parseInt(rawValue, 10).toLocaleString();
            setFormData(prev => ({ ...prev, [name]: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [name]: '' }));
        }
        return;
    }

    // 3. ЗӨВХӨН КИРИЛ ҮСЭГ (Овог, Нэр)
    if (name === 'lastname' || name === 'firstname') {
        if (value !== '' && !/^[\u0400-\u04FF\s-]+$/.test(value)) {
            return; // Латин үсэг бичигдэхгүй
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        return;
    }

    // Бусад (Email)
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // ⚠️ Энэ мөр "Mailto" цонх гарахаас сэргийлнэ

    if(!formData.lastname || !formData.firstname || !formData.phone || !formData.amount) {
        setError("Та мэдээллээ бүрэн бөглөнө үү!");
        return;
    }

    setLoading(true);
    try {
        // Backend руу илгээх
        // ==========================================
        // ✅ 2. ЭНД ӨӨРЧЛӨГДӨЖ БАЙНА:
        // (http://localhost:5000 гэсэн хатуу линкийг ${API_BASE_URL} болгов)
        // ==========================================
        await axios.post(`${API_BASE_URL}/api/trusts`, formData);
        // ==========================================
        setShowSuccess(true);
    } catch (error) {
        console.error("API Error:", error);
        setError("Сервертэй холбогдож чадсангүй. Та сервер ажиллаж байгаа эсэхийг шалгана уу.");
    } finally {
        setLoading(false);
    }
  };

  if (showSuccess) return (
    <PublicPageShell title="Хүсэлт амжилттай илгээгдлээ" onBack={onBack}>
      <div role="status" className="max-w-xl bg-white border border-slate-200 rounded-2xl p-8">
        <CheckCircle size={40} className="text-[#007A3D] mb-4" />
        <p className="text-slate-600 leading-7">Таны итгэлцлийн хүсэлтийг хүлээн авлаа. Бид тантай удахгүй холбогдох болно.</p>
        <button type="button" onClick={onBack} className="mt-6 rounded-xl bg-[#062842] text-white px-6 py-3">Нүүр хуудас</button>
      </div>
    </PublicPageShell>
  );
  const fields = [
    { name: 'lastname', label: 'Овог', autoComplete: 'family-name' },
    { name: 'firstname', label: 'Нэр', autoComplete: 'given-name' },
    { name: 'phone', label: 'Утасны дугаар', type: 'tel', autoComplete: 'tel', inputMode: 'numeric', pattern: '[0-9]{8}' },
    { name: 'email', label: 'Имэйл хаяг', type: 'email', autoComplete: 'email' },
    { name: 'amount', label: 'Итгэлцлийн дүн (₮)', inputMode: 'numeric' },
  ];
  return (
    <PublicPageShell title="Итгэлцлийн хүсэлт" description="Холбоо барих мэдээлэл болон хөрөнгө оруулах дүнгээ оруулна уу. Манай ажилтан тантай холбогдож дэлгэрэнгүй мэдээлэл өгнө." eyebrow="Хөрөнгө оруулалт" onBack={onBack}>
      <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        {error && <p role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} />{error}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(field => <label key={field.name} className={field.name === 'amount' ? 'sm:col-span-2' : ''}>
            <span className="mb-2 block text-sm font-medium">{field.label}{field.name !== 'email' && ' *'}</span>
            <input name={field.name} type={field.type || 'text'} autoComplete={field.autoComplete} inputMode={field.inputMode} pattern={field.pattern} required={field.name !== 'email'} value={formData[field.name]} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base text-[#062842] focus:outline-none focus:ring-2 focus:ring-[#062842]/20" />
          </label>)}
        </div>
        <button type="submit" disabled={loading} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#062842] px-6 py-4 font-semibold text-white hover:bg-[#0a3857] disabled:opacity-60">{loading ? <><Loader size={18} className="animate-spin" /> Илгээж байна...</> : <>Хүсэлт илгээх <Send size={18} /></>}</button>
      </form>
    </PublicPageShell>
  );
};
export default TrustRequest;
