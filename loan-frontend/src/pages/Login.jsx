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
        <div className="lp-brand">
          <img src="/logo.jpg" alt="logo" className="lp-logo" />
        </div>

        {/* Decorative SVG illustration */}
        <svg className="lp-illustration" viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Background circles */}
          <circle cx="210" cy="160" r="140" fill="rgba(255,255,255,0.04)"/>
          <circle cx="210" cy="160" r="100" fill="rgba(255,255,255,0.04)"/>
          {/* Document / loan card */}
          <rect x="120" y="80" width="180" height="140" rx="12" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5"/>
          <rect x="138" y="102" width="80" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
          <rect x="138" y="118" width="120" height="6" rx="3" fill="rgba(255,255,255,0.18)"/>
          <rect x="138" y="132" width="100" height="6" rx="3" fill="rgba(255,255,255,0.18)"/>
          <rect x="138" y="146" width="110" height="6" rx="3" fill="rgba(255,255,255,0.18)"/>
          {/* Approve checkmark badge */}
          <circle cx="270" cy="195" r="22" fill="#22c55e" opacity="0.90"/>
          <polyline points="260,195 267,203 282,186" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Coins stack */}
          <ellipse cx="155" cy="215" rx="22" ry="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
          <ellipse cx="155" cy="208" rx="22" ry="8" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.30)" strokeWidth="1.2"/>
          <ellipse cx="155" cy="201" rx="22" ry="8" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
          {/* Floating dots */}
          <circle cx="90" cy="100" r="5" fill="rgba(255,255,255,0.15)"/>
          <circle cx="330" cy="120" r="4" fill="rgba(255,255,255,0.12)"/>
          <circle cx="340" cy="240" r="6" fill="rgba(255,255,255,0.10)"/>
          <circle cx="80" cy="250" r="4" fill="rgba(255,255,255,0.10)"/>
        </svg>

        <p className="lp-tagline">Зээлийн хүсэлт удирдах систем</p>
        <p className="lp-url">loan.scm.mn</p>
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
