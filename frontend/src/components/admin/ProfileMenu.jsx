import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';

// Баруун дээд буланд байрлах профайл цэс.
export default function ProfileMenu({ user, onOpenProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = event => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const name = user?.name || user?.email || 'Профайл';
  const initial = String(name).trim().charAt(0).toUpperCase() || '?';

  return <div ref={ref} className="fixed right-4 top-3 z-30 no-print">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-[#003B5C] shadow-sm hover:bg-slate-50">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#003B5C] text-sm font-bold text-white" aria-hidden="true">{initial}</span>
      <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div role="menu" aria-label="Профайл цэс" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenProfile(); }} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"><UserCircle size={16} aria-hidden="true" />Миний профайл</button>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-medium text-red-600 hover:bg-red-50"><LogOut size={16} aria-hidden="true" />Гарах</button>
    </div>}
  </div>;
}
