import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { getPublicConfig, loginApi } from '../api';

export default function Login({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => { getPublicConfig().then(setConfig).catch(() => setConfig({})); }, []);

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

  const brand = config?.brandName || 'Zentro Prime Capital';

  return (
    <div className="zp-login-page">
      <section className="zp-login-panel">
        <div className="zp-login-copy">
          {onBack && <button type="button" className="zp-back" onClick={onBack}><ArrowLeft size={16} /> Веб рүү буцах</button>}
          <a className="zp-logo zp-login-brand" href="/">
            {config?.logoUrl ? <img className="zp-logo-img" src={config.logoUrl} alt={brand} /> : <span>Z</span>}{brand}
          </a>
          <h1>Админ системд нэвтрэх</h1>
          <p>Харилцагч, шуурхай зээл, төлөлт, веб хүсэлт болон тайлангаа нэг дор удирдана.</p>
        </div>
        <form onSubmit={submit} className="zp-login-form">
          <div className="zp-login-icon"><KeyRound size={22} /></div>
          <h2>Нэвтрэх</h2>
          <label>И-мэйл</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          <label>Нууц үг</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="zp-login-error">{error}</p>}
          <button disabled={loading}>{loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}</button>
        </form>
      </section>
    </div>
  );
}
