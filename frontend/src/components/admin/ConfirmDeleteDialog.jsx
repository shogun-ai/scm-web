import { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

// Бүрмөсөн устгахын өмнө хүсэлтийн дугаарыг бичиж баталгаажуулах цонх.
// Олон хүсэлт эсвэл дугааргүй хүсэлтэд "УСТГАХ" гэж бичиж баталгаажуулна.
export default function ConfirmDeleteDialog({ reference, count = 1, busy = false, error = '', onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);
  const ref = String(reference || '').trim();
  const useWord = count > 1 || !ref;
  const expected = useWord ? 'УСТГАХ' : ref;
  const matches = expected !== '' && typed.trim() === expected;
  useEffect(() => { inputRef.current?.focus(); }, []);

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onCancel(); } }}>
      <h3 id="del-title" className="flex items-center gap-2 text-lg font-bold text-red-700"><Trash2 size={18} aria-hidden="true" />{count > 1 ? `${count} хүсэлтийг устгах` : 'Хүсэлтийг устгах'}</h3>
      <p id="del-desc" className="mt-2 text-sm text-slate-700">{count > 1 ? <>Сонгосон <b>{count}</b> хүсэлт</> : ref ? <>Хүсэлт <b className="font-mono">{ref}</b></> : 'Дугааргүй энэ хүсэлт'} болон бүх файл бүрмөсөн устгагдана, сэргээх боломжгүй.</p>
      <label className="mt-4 block text-xs font-semibold text-slate-600">{useWord ? <>Баталгаажуулахын тулд <b className="font-mono">УСТГАХ</b> гэж бичнэ үү</> : 'Баталгаажуулахын тулд хүсэлтийн дугаарыг бичнэ үү'}
        <input ref={inputRef} value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" spellCheck={false} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Болих</button>
        <button type="button" disabled={busy || !matches} onClick={onConfirm} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}Бүрмөсөн устгах</button>
      </div>
    </div>
  </div>;
}
