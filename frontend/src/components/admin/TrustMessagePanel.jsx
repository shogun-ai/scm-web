import { useState } from 'react';
import axios from 'axios';
import { Loader2, Mail, Send } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import TrustDocsPanel from './TrustDocsPanel';

const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const STATE = { sent: 'Илгээгдсэн', queued: 'Илгээгдэж байна', failed: 'Илгээж чадсангүй', skipped: 'Илгээгээгүй' };

// Итгэлцлийн хүсэлтийн "Чөлөөт имэйл бичих" диалог + илгээсэн мессежийн түүх.
export default function TrustMessagePanel({ apiUrl, trust, canSend = true, onSent }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [extra, setExtra] = useState([]);
  const email = String(trust?.email || '').trim();
  const history = [...(Array.isArray(trust?.messages) ? trust.messages : []), ...extra];

  const send = async () => {
    const message = text.trim();
    if (!message) { setError('Илгээх мессежээ бичнэ үү.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await axios.post(`${apiUrl}/api/trusts/${trust._id}/message`, { message }, { headers: getAuthHeaders(), timeout: 20000 });
      const state = res.data?.email?.result;
      if (state === 'failed') setError('Мессеж бүртгэгдсэн боловч имэйл илгээж чадсангүй.');
      else setNotice(state === 'skipped' ? 'Мессеж бүртгэгдлээ (имэйл илгээгээгүй).' : 'Имэйл илгээгдлээ');
      setExtra(previous => [...previous, { message, at: new Date().toISOString(), result: state }]);
      setText(''); setOpen(false);
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.code === 'NO_APPLICANT_EMAIL' ? 'Харилцагчийн имэйл бүртгэлгүй байна.' : (err.response?.data?.message || 'Имэйл илгээж чадсангүй.'));
    } finally { setBusy(false); }
  };

  return <>
  <TrustDocsPanel apiUrl={apiUrl} trust={trust} onChanged={onSent} />
  <div className="mt-6 space-y-3 border-t pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-bold uppercase text-gray-400">Харилцагчид имэйл</h3>
      <button type="button" disabled={!email || !canSend} onClick={() => { setError(''); setOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-[#003B5C] hover:bg-slate-50 disabled:opacity-50"><Mail size={16} aria-hidden="true" />Чөлөөт имэйл бичих</button>
    </div>
    {!email && <p className="text-xs text-amber-700">Харилцагчийн имэйл бүртгэлгүй тул имэйл илгээх боломжгүй.</p>}
    {!canSend && email && <p className="text-xs text-slate-500">Танд имэйл илгээх эрх байхгүй.</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p>}
    {error && !open && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    {history.length > 0 && <ol className="max-h-56 space-y-2 overflow-y-auto" aria-label="Илгээсэн имэйлийн түүх">{[...history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
      <p className="text-xs text-slate-500">{dt(entry.at)}{entry.by?.name || entry.actor?.name ? ` · ${entry.by?.name || entry.actor?.name}` : ''}{entry.result ? ` · ${STATE[entry.result] || entry.result}` : ''}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">{entry.message || entry.note}</p>
    </li>)}</ol>}

    {open && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="trust-mail-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!busy) setOpen(false); } }}>
        <h3 id="trust-mail-title" className="text-lg font-bold text-[#003B5C]">Чөлөөт имэйл бичих</h3>
        <p className="mt-1 break-all text-sm text-slate-600">Хүлээн авагч: {email}</p>
        <label className="mt-4 block text-xs font-semibold text-slate-600">Мессеж<textarea autoFocus rows={6} maxLength={2000} value={text} onChange={event => setText(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#003B5C] focus:outline-none focus:ring-2 focus:ring-[#003B5C]/20" /></label>
        <div className="mt-1 flex justify-between text-xs"><span className="text-amber-700">Хувийн мэдээлэл бүү бичнэ үү.</span><span className="text-slate-500">{text.length}/2000</span></div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Болих</button>
          <button type="button" disabled={busy || !text.trim()} onClick={send} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}Илгээх</button>
        </div>
      </div>
    </div>}
  </div>
  </>;
}
