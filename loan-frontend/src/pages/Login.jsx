import { useState } from 'react';
import { loginApi } from '../api';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      if (data.token) {
        localStorage.setItem('loan_token', data.token);
        localStorage.setItem('loan_user', JSON.stringify(data.user));
        onLogin(data.token, data.user);
      } else {
        setError('Нэвтрэх мэдээлэл буруу байна.');
      }
    } catch {
      setError('Нэвтрэх мэдээлэл буруу байна.');
    }
    setLoading(false);
  }

  return (
    <div className="lp-root">
      {/* ── Left brand panel ── */}
      <div className="lp-left">
        <img src='/logo.png' />
      </div>

      {/* ── Right form panel ── */}
      <div className="lp-right">
        <div className="lp-card">
          <h1 className="lp-title">Нэвтрэх</h1>
          <p className="lp-subtitle">Тавтай морилно уу</p>

          <form onSubmit={handleSubmit} className="lp-form">
            <div className="lp-field">
              <label htmlFor="lp-email">И-мэйл хаяг</label>
              <input
                id="lp-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="username"
              />
            </div>

            <div className="lp-field">
              <label htmlFor="lp-password">Нууц үг</label>
              <div className="lp-pass-wrap">
                <input
                  id="lp-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="lp-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {error && <div className="lp-error">{error}</div>}

            <button type="submit" disabled={loading} className="lp-submit">
              {loading ? (
                <span className="lp-spinner" />
              ) : 'Нэвтрэх'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
