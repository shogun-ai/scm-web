import { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useMediaQuery } from '../theme/hooks';

// Glass filter toolbar. `search` stays visible everywhere; `filters` sit inline on desktop and collapse
// behind a "Шүүлтүүр" button into a bottom sheet below 768px (Escape, scrim, scroll lock) — same as the loan board.
export default function Toolbar({ search, filters, activeCount = 0, resultCount, label = 'Хайх, шүүх', columns = 4 }) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const titleRef = useRef(null);
  const sheetId = useId();
  const sheetOpen = isMobile && open;

  useEffect(() => {
    if (!sheetOpen) return undefined;
    titleRef.current?.focus();
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [sheetOpen]);

  const grid = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' }[columns] || 'md:grid-cols-4';
  return <div className="glass adm-toolbar relative flex flex-col gap-3 p-3 md:flex-row md:items-end md:p-4" role="search" aria-label={label}>
    <span className="adm-card__rim" aria-hidden="true" />
    <div className="relative flex min-w-0 items-end gap-2 md:w-[32%] md:shrink-0">
      <div className="min-w-0 flex-1">{search}</div>
      {filters && <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} aria-controls={sheetId} className="adm-btn adm-mobile-only !px-3" aria-label={`Шүүлтүүр${activeCount ? ` (${activeCount} идэвхтэй)` : ''}`}>
        <SlidersHorizontal size={16} aria-hidden="true" />{activeCount > 0 && <span className="adm-tnum grid h-5 min-w-5 place-items-center rounded-full bg-[var(--hue)] px-1 text-[11px] font-bold text-[#05070D]">{activeCount}</span>}
      </button>}
    </div>
    {filters && <>
      <div className="adm-scrim md:hidden" data-open={sheetOpen ? 'true' : 'false'} onClick={() => setOpen(false)} aria-hidden="true" />
      <div id={sheetId} className="adm-filter-panel" data-open={sheetOpen ? 'true' : 'false'} role={isMobile ? 'dialog' : undefined} aria-modal={sheetOpen ? 'true' : undefined} aria-label={isMobile ? 'Шүүлтүүр' : undefined} inert={isMobile && !open ? true : undefined}>
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-bold text-white outline-none">Шүүлтүүр</h3>
          <button type="button" onClick={() => setOpen(false)} className="adm-icon-btn" aria-label="Шүүлтүүр хаах"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={`grid gap-3 ${grid}`}>{filters}</div>
        <button type="button" onClick={() => setOpen(false)} className="adm-btn adm-mobile-only mt-5 w-full">Үр дүн харах{resultCount != null ? <> · <span className="adm-tnum">{resultCount}</span></> : null}</button>
      </div>
    </>}
  </div>;
}
