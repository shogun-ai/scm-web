import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Button from './ui/Button';

// Бүрмөсөн устгахын өмнө хүсэлтийн дугаарыг бичиж баталгаажуулах цонх.
// Олон хүсэлт эсвэл дугааргүй хүсэлтэд "УСТГАХ" гэж бичиж баталгаажуулна.
// Харагдах байдал нь ui/Modal-тай ижил (dark glass), харин z-70 хэвээр — drawer (z-50) болон Modal (z-60)-аас дээр.
export default function ConfirmDeleteDialog({ reference, count = 1, busy = false, error = '', onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);
  const ref = String(reference || '').trim();
  const useWord = count > 1 || !ref;
  const expected = useWord ? 'УСТГАХ' : ref;
  const matches = expected !== '' && typed.trim() === expected;
  useEffect(() => { inputRef.current?.focus(); }, []);

  return <div className="adm-drawer-overlay fixed inset-0 z-[70] grid place-items-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className="adm-drawer adm-modal w-full max-w-md rounded-3xl p-5 sm:p-6" style={{ '--hue': 'var(--sp-rose)', '--drawer-ink': '#FFB8C5' }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onCancel(); } }}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B86]/[0.14] text-[#FFB8C5] ring-1 ring-inset ring-[#FF6B86]/30" aria-hidden="true"><Trash2 size={18} /></span>
        <div className="min-w-0">
          <h3 id="del-title" className="text-lg font-bold text-white">{count > 1 ? `${count} хүсэлтийг устгах` : 'Хүсэлтийг устгах'}</h3>
          <p id="del-desc" className="mt-1 text-sm leading-relaxed text-[#C5CEDC]">{count > 1 ? <>Сонгосон <b>{count}</b> хүсэлт</> : ref ? <>Хүсэлт <b className="font-mono">{ref}</b></> : 'Дугааргүй энэ хүсэлт'} болон бүх файл бүрмөсөн устгагдана, сэргээх боломжгүй.</p>
        </div>
      </div>
      <label className="mt-5 block text-xs font-semibold text-[#C5CEDC]">{useWord ? <>Баталгаажуулахын тулд <b className="font-mono text-[#FFB8C5]">УСТГАХ</b> гэж бичнэ үү</> : 'Баталгаажуулахын тулд хүсэлтийн дугаарыг бичнэ үү'}
        <input ref={inputRef} value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" spellCheck={false} className="adm-field mt-1.5 w-full font-mono" />
      </label>
      {error && <p role="alert" className="adm-note adm-note--err mt-3 !text-xs">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>Болих</Button>
        <Button variant="danger" busy={busy} disabled={busy || !matches} onClick={onConfirm} icon={<Trash2 size={16} aria-hidden="true" />} className={matches && !busy ? '!border-[#E11D48] !bg-[#E11D48] !text-white hover:!bg-[#BE123C]' : ''}>Бүрмөсөн устгах</Button>
      </div>
    </div>
  </div>;
}
