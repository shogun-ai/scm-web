import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Lock } from 'lucide-react';
import { passwordPolicyError, stripInviteToken } from './inviteUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

// Урилгын холбоосоор нууц үг үүсгэх маягт (Login компонентоос дуудагдана).
const SetPasswordForm = ({ token, onDone, onCancel }) => {
  const [state, setState] = useState('checking'); // checking | valid | invalid
  const [maskedEmail, setMaskedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    axios.get(`${API_BASE_URL}/api/auth/invite/${encodeURIComponent(token)}`, { timeout: 15000 })
      .then(res => {
        if (!alive) return;
        if (res.data?.valid) { setMaskedEmail(res.data.email || ''); setState('valid'); } else setState('invalid');
      })
      .catch(() => { if (alive) setState('invalid'); });
    return () => { alive = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const policy = passwordPolicyError(password);
    if (policy) { setError(policy); return; }
    if (password !== confirm) { setError('Нууц үг таарахгүй байна.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/set-password`, { token, password });
      stripInviteToken();
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Нууц үг тогтоож чадсангүй. Холбоос хүчингүй эсвэл хугацаа дууссан байж болно.');
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-12 pr-4 py-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#003B5C]';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 [color-scheme:light] [forced-color-adjust:none]">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md animate-fade-in">
        <h1 className="text-2xl font-bold text-[#003B5C] text-center">Нууц үг үүсгэх</h1>
        {state === 'checking' && <p role="status" className="text-center text-gray-400 text-sm mt-6">Урилгыг шалгаж байна...</p>}
        {state === 'invalid' && (
          <div className="mt-6 space-y-4">
            <p role="alert" className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold">Урилгын холбоос хүчингүй эсвэл хугацаа дууссан байна. Админаас дахин урилга илгээхийг хүснэ үү.</p>
            <button type="button" onClick={() => { stripInviteToken(); onCancel(); }} className="w-full border rounded-xl py-3 font-bold text-sm text-slate-600">Нэвтрэх хуудас руу</button>
          </div>
        )}
        {state === 'valid' && (
          <form onSubmit={submit} className="space-y-4 mt-6">
            {maskedEmail && <p className="text-center text-sm text-gray-500">Хаяг: <b>{maskedEmail}</b></p>}
            {error && <div role="alert" className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center font-bold">{error}</div>}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
              <input type="password" aria-label="Шинэ нууц үг" autoComplete="new-password" placeholder="Шинэ нууц үг" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
              <input type="password" aria-label="Нууц үг давтах" autoComplete="new-password" placeholder="Нууц үг давтах" className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400">Хамгийн багадаа 10 тэмдэгт, үсэг болон тоо агуулсан байна.</p>
            <button type="submit" disabled={loading} className="w-full bg-[#003B5C] text-white py-4 rounded-xl font-bold hover:bg-[#002a42] transition shadow-lg disabled:opacity-50">
              {loading ? 'Хадгалж байна...' : 'Нууц үг үүсгэх'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetPasswordForm;
