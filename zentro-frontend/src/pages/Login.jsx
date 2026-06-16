import { useState } from 'react';
import { loginApi } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await loginApi(email, password);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Нэвтрэх үед алдаа гарлаа');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="z-card w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="z-brand-icon text-lg">Z</div>
          <div>
            <p className="text-base font-bold text-slate-800">Zentro</p>
            <p className="text-xs text-slate-500 font-semibold">Машины лизинг систем</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="z-label">И-мэйл</label>
            <input className="z-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="z-label">Нууц үг</label>
            <input className="z-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
          <button className="z-btn z-btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    </div>
  );
}
