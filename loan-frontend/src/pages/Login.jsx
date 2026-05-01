import { useState } from 'react';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://scm-okjs.onrender.com';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || data?.non_field_errors?.[0] || 'Нэвтрэх мэдээлэл буруу байна.');
      } else {
        const token = data.token || data.access;
        const user = data.user || { email };
        localStorage.setItem('loan_token', token);
        localStorage.setItem('loan_user', JSON.stringify(user));
        onLogin(token, user);
      }
    } catch {
      setError('Сервертэй холбогдоход алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: "linear-gradient(135deg, rgba(0,35,55,0.76), rgba(0,59,92,0.58)), url('/bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/20" />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="px-8 py-9">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="SCM" className="h-14 mx-auto mb-5 object-contain" />
            <h1 className="text-3xl font-bold text-white mb-2">Нэвтрэх</h1>
            <p className="text-slate-300 text-sm">Зээлийн удирдлагын системд тавтай морил</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                И-мэйл
              </label>
              <input
                type="email"
                className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                Нууц үг
              </label>
              <input
                type="password"
                className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#003B5C] hover:bg-[#005A8E] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Түр хүлээнэ үү...' : 'Нэвтрэх'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
