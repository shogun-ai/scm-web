import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthShell from './admin/AuthShell';
import SetPasswordForm from './admin/SetPasswordForm';
import { readInviteToken } from './admin/inviteUtils';

const Login = ({ onLogin, onBack }) => {
  const [step, setStep] = useState(1); // 1: Email/Pass, 2: 2FA Code
  const [formData, setFormData] = useState({ email: '', password: '', token: '' });
  const [userId, setUserId] = useState(null); // 2FA үед хэрэг болно
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState(readInviteToken);
  const [notice, setNotice] = useState('');

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

  if (inviteToken) {
    return <SetPasswordForm token={inviteToken} onDone={() => { setInviteToken(''); setNotice('Нууц үг үүслээ — нэвтэрнэ үү'); }} onCancel={() => setInviteToken('')} />;
  }

  return (
    <AuthShell
      eyebrow={step === 1 ? 'Админ консол' : 'Алхам 2 / 2'}
      title={step === 1 ? 'Нэвтрэх' : '2FA баталгаажуулалт'}
      subtitle={step === 1 ? 'Админ эрхээр нэвтэрч хүсэлтүүдээ удирдана.' : 'Google Authenticator апп дээрх 6 оронтой кодыг оруулна уу.'}
      onBack={onBack}
    >
        {notice && <div role="status" className="adm-note adm-note--ok mb-5 flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{notice}</span></div>}
        {error && <div role="alert" className="adm-note adm-note--err mb-5 flex items-start gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
            {step === 1 && (
                <>
                    <label className="block">
                        <span className="adm-label !text-[var(--adm-ink-2)]">Имэйл хаяг</span>
                        <span className="relative mt-2 block">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--adm-ink-3)]" size={18} aria-hidden="true" />
                            <input type="email" placeholder="name@scm.mn" autoComplete="username" className="adm-field adm-field--icon w-full"
                                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        </span>
                    </label>
                    <label className="block">
                        <span className="adm-label !text-[var(--adm-ink-2)]">Нууц үг</span>
                        <span className="relative mt-2 block">
                            <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--adm-ink-3)]" size={18} aria-hidden="true" />
                            <input type="password" placeholder="••••••••••" autoComplete="current-password" className="adm-field adm-field--icon w-full"
                                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                        </span>
                    </label>
                </>
            )}

            {step === 2 && (
                <label className="block">
                    <span className="adm-label flex items-center gap-2 !text-[var(--adm-ink-2)]"><ShieldCheck size={14} className="text-[#8FF0C8]" aria-hidden="true" />Баталгаажуулах код</span>
                    <input type="text" placeholder="000000" maxLength={6} inputMode="numeric" autoComplete="one-time-code" aria-describedby="otp-help" className="adm-field adm-field--code mt-2 w-full"
                        value={formData.token} onChange={(e) => setFormData({...formData, token: e.target.value.replace(/\s/g, '')})} autoFocus />
                    <span id="otp-help" className="mt-2 block text-xs text-[var(--adm-ink-3)]">Код 30 секунд тутам шинэчлэгдэнэ.</span>
                </label>
            )}

            <button type="submit" disabled={loading} className="adm-auth-submit">
                {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Уншиж байна...</> : step === 1 ? <>Үргэлжлүүлэх<ArrowRight size={18} aria-hidden="true" /></> : 'Баталгаажуулах'}
            </button>
        </form>
    </AuthShell>
  );
};

export default Login;
