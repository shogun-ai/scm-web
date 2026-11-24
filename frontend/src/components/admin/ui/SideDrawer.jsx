import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Right-hand detail sheet shared by the loan and trust details (same structure everywhere):
// ink header band with the module hue + spectrum line → sticky action bar → sectioned cards (DrawerSection).
// Escape closes (unless an alert dialog is open), focus moves in on open, is trapped, and returns on close.
export default function SideDrawer({ hue = 'green', label, eyebrow, reference, badge, title, subtitle, meta, note, actions, actionsNote, onClose, children }) {
  const drawerRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    drawerRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) closeRef.current?.();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      if (document.querySelector('[role="alertdialog"], [data-nested-dialog]')) return;
      const items = [...drawerRef.current.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);

  return <div className="adm-drawer-overlay fixed inset-0 z-50 flex justify-end" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} data-hue={hue} className="adm-drawer h-full w-full overflow-y-auto outline-none sm:max-w-2xl sm:rounded-l-[28px]">
      <header className="adm-drawer__head p-5 pb-5 sm:rounded-tl-[28px] sm:px-7 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center font-mono text-xs text-[#AEB9CC]">
              {eyebrow && <span className="adm-drawer__eyebrow mr-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.16em]">{eyebrow}</span>}
              {reference}{badge}
            </p>
            <h2 className="mt-2 break-words text-[22px] font-bold leading-tight tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#C5CEDC]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12]" aria-label="Хаах"><X size={20} aria-hidden="true" /></button>
        </div>
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#C5CEDC]">{meta}</div>}
        {note && <div className="mt-2 text-xs text-[#AEB9CC]">{note}</div>}
      </header>

      {actions && <div className="adm-drawer__bar sticky top-0 z-10 px-5 py-3 sm:px-7">
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Үйлдлүүд">{actions}</div>
        {actionsNote && <div className="mt-2 text-xs">{actionsNote}</div>}
      </div>}

      <div className="p-5 sm:px-7">{children}</div>
    </aside>
  </div>;
}
