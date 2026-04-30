import { useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || data?.non_field_errors?.[0] || 'Нэвтрэх мэдээлэл буруу байна.');
      } else {
        const token = data.token || data.access;
        const user = data.user || { username };
        localStorage.setItem('loan_token', token);
        localStorage.setItem('loan_user', JSON.stringify(user));
        onLogin(token, user);
      }
    } catch (err) {
      setError('Сервертэй холбогдоход алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#003B5C] mb-2">Нэвтрэх</h1>
            <p className="text-slate-500 text-sm">Зээлийн удирдлагын системд тавтай морил</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Хэрэглэгчийн нэр
              </label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
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
      {/* Right panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-gradient-to-br from-[#003B5C] to-[#005A8E] px-8 py-12">
        <div className="text-center text-white">
          <div className="text-6xl mb-6">🏦</div>
          <h2 className="text-3xl font-bold mb-4">Зээлийн удирдлагын систем</h2>
          <p className="text-blue-200 text-lg max-w-sm">
            Зээлийн өргөдөл, батлах үйл явц болон эргэн төлөлтийг үр дүнтэй удирдана.
          </p>
        </div>
      </div>
    </div>
  );
}
