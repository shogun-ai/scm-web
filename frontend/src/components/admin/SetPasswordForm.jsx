import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import AuthShell from './AuthShell';
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

  const inputCls = 'adm-field adm-field--icon w-full';

  return (
    <AuthShell
      eyebrow="Урилга"
      title="Нууц үг үүсгэх"
      subtitle={state === 'valid' ? 'Админ консолд нэвтрэх шинэ нууц үгээ тогтооно уу.' : undefined}
    >
        {state === 'checking' && <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--adm-ink-2)]"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Урилгыг шалгаж байна...</p>}
        {state === 'invalid' && (
          <div className="space-y-5">
            <p role="alert" className="adm-note adm-note--err flex items-start gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Урилгын холбоос хүчингүй эсвэл хугацаа дууссан байна. Админаас дахин урилга илгээхийг хүснэ үү.</span></p>
            <button type="button" onClick={() => { stripInviteToken(); onCancel(); }} className="adm-auth-ghost">Нэвтрэх хуудас руу</button>
          </div>
        )}
        {state === 'valid' && (
          <form onSubmit={submit} className="space-y-5" aria-busy={loading}>
            {maskedEmail && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--adm-ink-2)]">Хаяг: <b className="font-semibold text-white">{maskedEmail}</b></p>}
            {error && <div role="alert" className="adm-note adm-note--err flex items-start gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
            <label className="block">
              <span className="adm-label !text-[var(--adm-ink-2)]">Шинэ нууц үг</span>
              <span className="relative mt-2 block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--adm-ink-3)]" size={18} aria-hidden="true" />
                <input type="password" autoComplete="new-password" aria-describedby="pw-policy" placeholder="Шинэ нууц үг" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} />
              </span>
            </label>
            <label className="block">
              <span className="adm-label !text-[var(--adm-ink-2)]">Нууц үг давтах</span>
              <span className="relative mt-2 block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--adm-ink-3)]" size={18} aria-hidden="true" />
                <input type="password" autoComplete="new-password" placeholder="Нууц үг давтах" className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} />
              </span>
            </label>
            <p id="pw-policy" className="text-xs text-[var(--adm-ink-3)]">Хамгийн багадаа 10 тэмдэгт, үсэг болон тоо агуулсан байна.</p>
            <button type="submit" disabled={loading} className="adm-auth-submit">
              {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Хадгалж байна...</> : 'Нууц үг үүсгэх'}
            </button>
          </form>
        )}
    </AuthShell>
  );
};

export default SetPasswordForm;
