import { ArrowLeft, ShieldCheck } from 'lucide-react';
import './theme/admin-theme.css';
import './theme/admin-data.css';
import AuroraBackground from './AuroraBackground';
import logoWhite from '../../assets/logo-white.png';
import { useDocumentVisible } from './theme/hooks';

// Prism Sky frame for the admin auth screens (login, 2FA, invite set-password).
// Presentation only — the forms keep their own state, API calls and flow.
// Rendered as a full-screen layer so the public site chrome (navbar, back pill) rendered by App stays underneath.
export default function AuthShell({ eyebrow = 'Админ консол', title, subtitle, onBack, children }) {
  const visible = useDocumentVisible();
  return <div className="adm-shell adm-auth fixed inset-0 z-[60] overflow-y-auto [forced-color-adjust:none]" data-paused={visible ? 'false' : 'true'} style={{ '--hue': 'var(--sp-green)' }}>
    <AuroraBackground />
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="adm-auth__card glass adm-rise relative w-full max-w-[420px]" style={{ '--d': 0 }}>
        <span className="adm-card__rim" aria-hidden="true" />
        <span className="adm-auth__beam" aria-hidden="true" />
        <div className="relative px-6 pb-7 pt-6 sm:px-9 sm:pb-9 sm:pt-8">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <img src={logoWhite} alt="Солонго Капитал ББСБ" className="h-11 w-auto object-contain object-left sm:h-12" draggable="false" />
            {onBack && <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-[var(--adm-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-white">
              <ArrowLeft size={16} aria-hidden="true" />Буцах
            </button>}
          </div>

          <div className="adm-auth__prism mt-6" aria-hidden="true" />

          <header className="adm-rise mt-7" style={{ '--d': 1 }}>
            <p className="adm-eyebrow !text-[#7FE3B8]">{eyebrow}</p>
            <h1 className="adm-hero-text mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-[var(--adm-ink-2)]">{subtitle}</p>}
          </header>

          <div className="adm-rise mt-7" style={{ '--d': 2 }}>{children}</div>
        </div>
      </div>
      <p className="adm-rise relative mt-6 flex items-center justify-center gap-2 text-center text-xs text-[var(--adm-ink-3)]" style={{ '--d': 4 }}>
        <ShieldCheck size={14} aria-hidden="true" />Хамгаалагдсан холболт · хоёр шатлалт баталгаажуулалт
      </p>
    </main>
  </div>;
}
