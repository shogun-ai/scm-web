import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';

// Профайл цэс — админ topbar-ийн баруун талд байрлана.
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

  return <div ref={ref} className="relative no-print">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm font-semibold text-[var(--adm-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-white/[0.08]">
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-[conic-gradient(from_200deg,var(--sp-rose),var(--sp-gold),var(--sp-green),var(--sp-cyan),var(--sp-indigo),var(--sp-violet),var(--sp-rose))] p-[1.5px]" aria-hidden="true">
        <span className="grid h-full w-full place-items-center rounded-full bg-[#0E1326] text-sm font-bold text-white">{initial}</span>
      </span>
      <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      <ChevronDown size={16} aria-hidden="true" className={`text-[var(--adm-ink-3)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="menu" aria-label="Профайл цэс" className="adm-rise absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0E1326]/95 py-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="border-b border-white/[0.07] px-4 pb-2.5 pt-1.5">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {user?.email && user?.name && <p className="truncate text-xs text-[var(--adm-ink-3)]">{user.email}</p>}
      </div>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenProfile(); }} className="mt-1 flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-medium text-[var(--adm-ink-2)] hover:bg-white/[0.06] hover:text-white"><UserCircle size={16} aria-hidden="true" />Миний профайл</button>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }} className="flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-medium text-[#FF9DB0] hover:bg-[#FF6B86]/10"><LogOut size={16} aria-hidden="true" />Гарах</button>
    </div>}
  </div>;
}
