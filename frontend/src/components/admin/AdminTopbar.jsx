import { Menu } from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import { hueColor } from './theme/spectrum';

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
// Intl 'mn-MN' is missing in some browsers, so the Mongolian date is composed by hand.
const formatToday = (date = new Date()) => `${date.getMonth() + 1}-р сарын ${date.getDate()}, ${WEEKDAYS[date.getDay()]}`;

// Sticky glass topbar. The bottom hairline is white light splitting into the spectrum.
export default function AdminTopbar({ title, hue, menuButtonRef, menuOpen, onOpenMenu, user, onOpenProfile, onLogout }) {
  return <header className="adm-topbar no-print" style={{ '--hue': hueColor(hue) }}>
    <button ref={menuButtonRef} type="button" onClick={onOpenMenu} className="adm-icon-btn adm-menu-btn -ml-1" aria-label="Цэс нээх" aria-expanded={menuOpen}>
      <Menu size={22} aria-hidden="true" />
    </button>
    <div className="min-w-0 flex-1">
      <p className="adm-eyebrow hidden leading-none sm:block">Солонго Капитал · Админ</p>
      <p className="mt-1 flex min-w-0 items-center gap-2 text-[15px] font-bold leading-tight text-white sm:text-base">
        <span className="adm-dot shrink-0" aria-hidden="true" />
        <span className="truncate">{title}</span>
      </p>
    </div>
    <span className="adm-chip adm-date-chip" aria-label={`Өнөөдөр ${formatToday()}`}>
      <span className="adm-tnum">{formatToday()}</span>
    </span>
    <ProfileMenu user={user} onOpenProfile={onOpenProfile} onLogout={onLogout} />
    <span className="adm-prism-line" aria-hidden="true" />
  </header>;
}
