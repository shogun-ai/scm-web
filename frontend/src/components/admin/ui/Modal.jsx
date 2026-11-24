import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

// Centered light-glass dialog. Rendered at z-60 so it stacks above a SideDrawer (z-50).
// Escape and backdrop click close (unless busy); focus moves into the dialog and returns on close.
export function Modal({ title, description, onClose, busy = false, footer, size = 'md', role = 'dialog', children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const target = ref.current?.querySelector('[autofocus], input, textarea, select, button:not([data-close])') || ref.current;
    target?.focus();
    return () => previous?.focus?.();
  }, []);
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';
  return <div className="adm-drawer-overlay fixed inset-0 z-[60] grid place-items-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} tabIndex={-1} role={role} aria-modal="true" aria-labelledby={titleId} data-nested-dialog="" className={`adm-drawer adm-modal w-full ${width} rounded-3xl p-5 outline-none sm:p-6`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onClose(); } }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="text-lg font-bold text-slate-900">{title}</h3>
          {description && <p className="mt-1 break-words text-sm text-slate-600">{description}</p>}
        </div>
        <button type="button" data-close="" onClick={onClose} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Хаах"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
    </div>
  </div>;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Батлах', cancelLabel = 'Болих', danger = false, busy = false, onConfirm, onCancel }) {
  return <Modal role="alertdialog" size="sm" title={<span className="flex items-center gap-2">{danger && <AlertTriangle size={18} className="text-red-600" aria-hidden="true" />}{title}</span>} onClose={onCancel} busy={busy}
    footer={<><Button variant="light" disabled={busy} onClick={onCancel}>{cancelLabel}</Button><Button variant={danger ? 'lightDanger' : 'ink'} busy={busy} disabled={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
    {message && <p className="text-sm text-slate-700">{message}</p>}
  </Modal>;
}
