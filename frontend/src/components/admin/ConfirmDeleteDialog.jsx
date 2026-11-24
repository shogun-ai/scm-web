import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Button from './ui/Button';

// Бүрмөсөн устгахын өмнө хүсэлтийн дугаарыг бичиж баталгаажуулах цонх.
// Олон хүсэлт эсвэл дугааргүй хүсэлтэд "УСТГАХ" гэж бичиж баталгаажуулна.
// Харагдах байдал нь ui/Modal-тай ижил (light glass), харин z-70 хэвээр — drawer (z-50) болон Modal (z-60)-аас дээр.
export default function ConfirmDeleteDialog({ reference, count = 1, busy = false, error = '', onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);
  const ref = String(reference || '').trim();
  const useWord = count > 1 || !ref;
  const expected = useWord ? 'УСТГАХ' : ref;
  const matches = expected !== '' && typed.trim() === expected;
  useEffect(() => { inputRef.current?.focus(); }, []);

  return <div className="adm-drawer-overlay fixed inset-0 z-[70] grid place-items-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className="adm-drawer adm-modal w-full max-w-md rounded-3xl p-5 sm:p-6" style={{ '--hue': 'var(--sp-rose)', '--drawer-ink': '#BE123C' }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onCancel(); } }}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200" aria-hidden="true"><Trash2 size={18} /></span>
        <div className="min-w-0">
          <h3 id="del-title" className="text-lg font-bold text-slate-900">{count > 1 ? `${count} хүсэлтийг устгах` : 'Хүсэлтийг устгах'}</h3>
          <p id="del-desc" className="mt-1 text-sm leading-relaxed text-slate-700">{count > 1 ? <>Сонгосон <b>{count}</b> хүсэлт</> : ref ? <>Хүсэлт <b className="font-mono">{ref}</b></> : 'Дугааргүй энэ хүсэлт'} болон бүх файл бүрмөсөн устгагдана, сэргээх боломжгүй.</p>
        </div>
      </div>
      <label className="mt-5 block text-xs font-semibold text-slate-700">{useWord ? <>Баталгаажуулахын тулд <b className="font-mono text-rose-700">УСТГАХ</b> гэж бичнэ үү</> : 'Баталгаажуулахын тулд хүсэлтийн дугаарыг бичнэ үү'}
        <input ref={inputRef} value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" spellCheck={false} className="adm-lfield mt-1.5 font-mono" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="light" disabled={busy} onClick={onCancel}>Болих</Button>
        <Button variant="lightDanger" busy={busy} disabled={busy || !matches} onClick={onConfirm} icon={<Trash2 size={16} aria-hidden="true" />} className={matches && !busy ? '!border-red-700 !bg-red-700 !text-white hover:!bg-red-800' : ''}>Бүрмөсөн устгах</Button>
      </div>
    </div>
  </div>;
}
