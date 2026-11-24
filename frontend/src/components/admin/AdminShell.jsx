import { useCallback, useEffect, useRef, useState } from 'react';
import './theme/admin-theme.css';
import './theme/admin-data.css';
import AuroraBackground from './AuroraBackground';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import GlassSheet from './theme/GlassSheet';
import { useDocumentVisible, useMediaQuery } from './theme/hooks';

const PIN_KEY = 'scm_admin_rail_pinned';
const readPinned = () => { try { return localStorage.getItem(PIN_KEY) === '1'; } catch { return false; } };

// Admin chrome: aurora canvas, collapsible rail, glass topbar and the content column.
// `sheet` wraps legacy light-UI tabs in a pearl glass sheet so their forms/tables stay legible.
export default function AdminShell({ groups, title, hue, sheet = true, user, onOpenProfile, onLogout, children }) {
  const [pinned, setPinned] = useState(readPinned);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const visible = useDocumentVisible();
  const menuButtonRef = useRef(null);
  const [openedFor, setOpenedFor] = useState(title);

  // Таб/модуль солигдоход мобайл drawer автоматаар хаагдана (render үеийн state тохируулга).
  if (openedFor !== title) {
    setOpenedFor(title);
    if (mobileOpen) setMobileOpen(false);
  }
  const drawerOpen = mobileOpen && isMobile;

  // Drawer нээлттэй үед арын хуудсыг гүйлгэхгүй; хаагдахад (inert арилсны дараа) focus цэсний товч руу буцна.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!drawerOpen) {
      if (wasOpen.current) menuButtonRef.current?.focus();
      wasOpen.current = false;
      return undefined;
    }
    wasOpen.current = true;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [drawerOpen]);

  const togglePin = () => setPinned(value => {
    const next = !value;
    try { localStorage.setItem(PIN_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
    return next;
  });
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return <div className="adm-shell" data-pinned={pinned && !isMobile ? 'true' : 'false'} data-paused={visible ? 'false' : 'true'}>
    <AuroraBackground />
    <AdminSidebar groups={groups} pinned={pinned} onTogglePin={togglePin} isMobile={isMobile} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
    <div className="adm-main" inert={drawerOpen || undefined}>
      <AdminTopbar title={title} hue={hue} menuButtonRef={menuButtonRef} menuOpen={mobileOpen} onOpenMenu={() => setMobileOpen(true)} user={user} onOpenProfile={onOpenProfile} onLogout={onLogout} />
      <main className="adm-content no-print">
        {sheet ? <GlassSheet key={title} hue={hue}>{children}</GlassSheet> : children}
      </main>
    </div>
  </div>;
}
