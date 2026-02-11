import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Send, CheckCircle, Loader, AlertCircle } from 'lucide-react';

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
        if (value !== '' && !/^[\u0400-\u04FF\s\-]+$/.test(value)) {
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

  if (showSuccess) {
      return (
        <div className="min-h-screen bg-[#1a4153] flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full animate-scale-up shadow-2xl">
                <div className="w-16 h-16 bg-green-100 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} strokeWidth={3}/>
                </div>
                <h2 className="text-xl font-bold text-[#1a4153] mb-2">Хүсэлт амжилттай!</h2>
                <p className="text-gray-600 mb-6 text-sm">Таны итгэлцлийн хүсэлтийг хүлээн авлаа. Бид тантай удахгүй холбогдох болно.</p>
                <button onClick={onBack} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] transition">Ойлголоо</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#1a4153] flex flex-col items-center justify-center p-4 relative font-sans">
        <button onClick={onBack} className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 font-bold text-sm uppercase transition-colors">
            <ArrowLeft size={18}/> Буцах
        </button>

        <div className="w-full max-w-2xl animate-fade-in">
            <h1 className="text-lg md:text-2xl font-bold text-[#D4AF37] text-center mb-8 leading-relaxed">
                Та итгэлцлийн талаар мэдээлэл авах бол <br/> доорх мэдээллүүдийг оруулна уу
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Овог (Зөвхөн Кирил)" className="bg-[#2a5569] text-white placeholder-white/50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37] w-full" />
                    <input name="firstname" value={formData.firstname} onChange={handleChange} placeholder="Нэр (Зөвхөн Кирил)" className="bg-[#2a5569] text-white placeholder-white/50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37] w-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Утасны дугаар (Зөвхөн тоо)" className="bg-[#2a5569] text-white placeholder-white/50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Имэйл хаяг" className="bg-[#2a5569] text-white placeholder-white/50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
                </div>

                <input name="amount" value={formData.amount} onChange={handleChange} placeholder="Итгэлцлийн дүн (Ойролцоогоор)" className="w-full bg-[#2a5569] text-white placeholder-white/50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />

                <button type="submit" disabled={loading} className="w-full bg-[#00A651] text-white font-bold text-lg py-4 rounded-xl hover:bg-[#008f45] transition-all shadow-lg mt-4 flex items-center justify-center gap-2">
                    {loading ? <><Loader className="animate-spin" size={20}/> Илгээж байна...</> : <>Илгээх <Send size={20}/></>}
                </button>
            </form>
        </div>
    </div>
  );
};

export default TrustRequest;