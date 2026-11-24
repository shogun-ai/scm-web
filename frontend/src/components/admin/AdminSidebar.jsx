import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import logoWhite from '../../assets/logo-white.png';
import { hueColor } from './theme/spectrum';

const EXPAND_DWELL_MS = 280;

// Collapsed icon rail → expands on hover dwell / keyboard focus; can be pinned open.
// Below md it becomes an off-canvas drawer controlled by the topbar menu button.
export default function AdminSidebar({ groups, pinned, onTogglePin, isMobile, mobileOpen, onCloseMobile }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [tip, setTip] = useState(null);
  const timer = useRef(0);
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const closeRef = useRef(null);

  const expanded = isMobile ? mobileOpen : (pinned || hoverOpen || focusOpen);
  const showTips = !isMobile && !expanded;

  useEffect(() => () => clearTimeout(timer.current), []);

  // Slide the active indicator to the current item (DOM write only, no re-render).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const bar = indicatorRef.current;
    if (!nav || !bar) return;
    const active = nav.querySelector('[aria-current="page"]');
    if (!active) { bar.style.opacity = '0'; return; }
    const top = active.offsetTop + (active.offsetHeight - 22) / 2;
    bar.style.transform = `translate3d(0, ${top}px, 0)`;
    bar.style.setProperty('--hue', active.style.getPropertyValue('--item-hue'));
    bar.style.opacity = '1';
  });

  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;
    closeRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape') onCloseMobile(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobile, mobileOpen, onCloseMobile]);

  const onPointerEnter = event => {
    if (isMobile || pinned || event.pointerType === 'touch') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setHoverOpen(true); setTip(null); }, EXPAND_DWELL_MS);
  };
  const onPointerLeave = () => {
    clearTimeout(timer.current);
    setHoverOpen(false);
    setTip(null);
  };
  const onFocus = event => {
    if (isMobile) return;
    if (event.target.matches?.(':focus-visible')) setFocusOpen(true);
  };
  const onBlur = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusOpen(false);
  };
  const onKeyDown = event => {
    if (event.key === 'Escape' && !pinned && !isMobile) { setFocusOpen(false); setHoverOpen(false); }
  };

  const showTip = (event, label) => {
    if (!showTips) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2 });
  };

  let index = 0;
  return <>
    <div className="adm-scrim md:hidden" data-open={isMobile && mobileOpen ? 'true' : 'false'} onClick={onCloseMobile} aria-hidden="true" />
    <aside
      className="adm-rail no-print"
      aria-label="Үндсэн цэс"
      role={isMobile && mobileOpen ? 'dialog' : undefined}
      aria-modal={isMobile && mobileOpen ? 'true' : undefined}
      data-expanded={expanded ? 'true' : 'false'}
      data-overlay={pinned ? 'false' : 'true'}
      data-mobile-open={isMobile && mobileOpen ? 'true' : 'false'}
      inert={isMobile && !mobileOpen ? true : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <div className="adm-rail__brand">
        <span className="adm-rail__mark" aria-hidden="true"><img src={logoWhite} alt="" draggable="false" /></span>
        <span className="adm-fade min-w-0 flex-1 leading-tight">
          <span className="block text-[14px] font-bold tracking-tight text-white">Солонго Капитал</span>
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--adm-ink-3)]">Админ консол</span>
        </span>
        {isMobile && <button ref={closeRef} type="button" onClick={onCloseMobile} className="adm-icon-btn -mr-2" aria-label="Цэс хаах"><X size={20} aria-hidden="true" /></button>}
      </div>

      <nav ref={navRef} className="adm-rail__nav" aria-label="Админ цэс">
        <span ref={indicatorRef} className="adm-rail__indicator" aria-hidden="true" />
        {groups.map((group, groupIndex) => {
          const headingId = group.heading ? `adm-nav-${group.id}` : undefined;
          return <div key={group.id} role={group.heading ? 'group' : undefined} aria-labelledby={headingId} className={groupIndex === 0 ? '' : 'adm-rail__group'}>
            {group.heading && <div className="adm-rail__heading">
              <span className="adm-rail__heading-rule" aria-hidden="true" />
              <p id={headingId} className="adm-rail__heading-text adm-fade" style={{ '--i': index }}>{group.heading}</p>
            </div>}
            {group.items.map(item => {
              const Icon = item.icon;
              const i = index++;
              return <button
                key={item.key}
                type="button"
                className="adm-nav-item"
                style={{ '--item-hue': hueColor(item.hue) }}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => { item.onSelect(); if (isMobile) onCloseMobile(); }}
                onPointerEnter={event => showTip(event, item.label)}
                onPointerLeave={() => setTip(null)}
              >
                <span className="adm-nav-item__icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="adm-fade truncate" style={{ '--i': i }}>{item.label}</span>
              </button>;
            })}
          </div>;
        })}
      </nav>

      {!isMobile && <div className="adm-rail__foot">
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          className="adm-nav-item"
          style={{ '--item-hue': 'var(--sp-cyan)' }}
          onPointerEnter={event => showTip(event, pinned ? 'Цэсийг буулгах' : 'Цэсийг нээлттэй тогтоох')}
          onPointerLeave={() => setTip(null)}
        >
          <span className="adm-nav-item__icon">{pinned ? <PinOff size={18} strokeWidth={1.8} aria-hidden="true" /> : <Pin size={18} strokeWidth={1.8} aria-hidden="true" />}</span>
          <span className="adm-fade">{pinned ? 'Цэсийг буулгах' : 'Цэсийг тогтоох'}</span>
        </button>
      </div>}
    </aside>
    {showTips && <div className="adm-tip no-print" role="presentation" data-show={tip ? 'true' : 'false'} style={{ top: tip?.top ?? 0 }}>{tip?.label}</div>}
  </>;
}
