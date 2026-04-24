import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import logoColored from '../assets/logo-colored.png';

const Login = ({ onLogin, onBack }) => {
  const [step, setStep] = useState(1); // 1: Email/Pass, 2: 2FA Code
  const [formData, setFormData] = useState({ email: '', password: '', token: '' });
  const [userId, setUserId] = useState(null); // 2FA үед хэрэг болно
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ==========================================
  // ✅ 1. ЭНД НЭМЭГДЭЖ БАЙНА:
  // (const [loading...] мөрийн дараа, handleSubmit-ийн өмнө)
  // ==========================================
  const isLocal = window.location.hostname === 'localhost';
  const API_BASE_URL = import.meta.env.VITE_API_URL || (isLocal
    ? 'http://localhost:5000'
    : 'https://scm-okjs.onrender.com');
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Backend руу хүсэлт илгээх
        // ==========================================
        // ✅ 2. ЭНД ӨӨРЧЛӨГДӨЖ БАЙНА:
        // (https://... гэсэн хатуу линкийг ${API_BASE_URL} болгов)
        // ==========================================
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: formData.email,
            password: formData.password,
            token: formData.token
        });
        // ==========================================

        if (response.data.require2FA) {
            setStep(2); 
            setUserId(response.data.userId);
            setLoading(false);
            return;
        }

        onLogin(response.data.user, response.data.token);
    } catch (err) {
        setError(err.response?.data?.message || 'Нэвтрэхэд алдаа гарлаа');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md animate-fade-in relative">
        <button onClick={onBack} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-sm font-bold uppercase tracking-wider">Буцах</button>
        
        <div className="text-center mb-10">
            <img src={logoColored} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
            <h2 className="text-2xl font-display font-bold text-[#003B5C]">
                {step === 1 ? 'Нэвтрэх' : '2FA Баталгаажуулалт'}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
                {step === 1 ? 'Админ эрхээр нэвтрэх' : 'Google Authenticator кодоо оруулна уу'}
            </p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center mb-6 font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
                <>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input type="email" placeholder="Имэйл хаяг" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#003B5C]" 
                            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input type="password" placeholder="Нууц үг" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#003B5C]" 
                            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                </>
            )}

            {step === 2 && (
                <div className="relative animate-scale-up">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00A651]" size={24}/>
                    <input type="text" placeholder="000000" maxLength={6} inputMode="numeric" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#003B5C] text-center text-xl font-bold tracking-[0.5em]"
                        value={formData.token} onChange={(e) => setFormData({...formData, token: e.target.value.replace(/\s/g, '')})} autoFocus />
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-[#003B5C] text-white py-4 rounded-xl font-bold hover:bg-[#002a42] transition shadow-lg flex items-center justify-center gap-2">
                {loading ? 'Уншиж байна...' : step === 1 ? 'Үргэлжлүүлэх' : 'Баталгаажуулах'} {step === 1 && <ArrowRight size={18}/>}
            </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
