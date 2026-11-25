import { useState } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import { DrawerSection } from './ui/Drawer';
import { Modal } from './ui/Modal';
import Button from './ui/Button';

const dt = value => { try { return value ? new Date(value).toLocaleString('mn-MN') : ''; } catch { return ''; } };
const STATE = { sent: 'Илгээгдсэн', queued: 'Илгээгдэж байна', failed: 'Илгээж чадсангүй', skipped: 'Илгээгээгүй' };

// Итгэлцлийн хүсэлтийн "Чөлөөт имэйл бичих" диалог (SideDrawer-ийн үйлдлийн мөрнөөс нээгдэнэ).
// onSent(entry, feedback) — the drawer appends the entry to the trust's message history and refreshes the list.
export function TrustEmailDialog({ apiUrl, trust, onClose, onSent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const email = String(trust?.email || '').trim();

  const send = async () => {
    const message = text.trim();
    if (!message) { setError('Илгээх мессежээ бичнэ үү.'); return; }
    setBusy(true); setError('');
    try {
      const res = await axios.post(`${apiUrl}/api/trusts/${trust._id}/message`, { message }, { headers: getAuthHeaders(), timeout: 20000 });
      const state = res.data?.email?.result;
      const feedback = state === 'failed'
        ? { type: 'error', text: 'Мессеж бүртгэгдсэн боловч имэйл илгээж чадсангүй.' }
        : { type: 'ok', text: state === 'skipped' ? 'Мессеж бүртгэгдлээ (имэйл илгээгээгүй).' : 'Имэйл илгээгдлээ' };
      onSent({ message, at: new Date().toISOString(), result: state }, feedback);
    } catch (err) {
      setError(err.response?.data?.code === 'NO_APPLICANT_EMAIL' ? 'Харилцагчийн имэйл бүртгэлгүй байна.' : (err.response?.data?.message || 'Имэйл илгээж чадсангүй.'));
      setBusy(false);
    }
  };

  return <Modal title="Чөлөөт имэйл бичих" description={`Хүлээн авагч: ${email}`} onClose={onClose} busy={busy}
    footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Болих</Button><Button variant="primary" busy={busy} icon={<Send size={16} aria-hidden="true" />} disabled={busy || !text.trim()} onClick={send}>Илгээх</Button></>}>
    <label className="block text-xs font-semibold text-[#C5CEDC]">Мессеж<textarea autoFocus rows={6} maxLength={2000} value={text} aria-describedby="trust-mail-help" onChange={event => setText(event.target.value)} className="adm-field mt-1 w-full py-2.5" /></label>
    <div className="mt-1 flex justify-between gap-3 text-xs"><span id="trust-mail-help" className="text-[#F7DC8A]">Хувийн мэдээлэл бүү бичнэ үү.</span><span className="text-[#AEB9CC]">{text.length}/2000</span></div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-[#FF6B86]/10 p-2 text-sm text-[#FFC9D3]">{error}</p>}
  </Modal>;
}

// Sent-email history section of the trust drawer.
export function TrustEmailHistory({ trust }) {
  const history = Array.isArray(trust?.messages) ? trust.messages : [];
  return <DrawerSection id="trust-mail-title" title={`Харилцагчид илгээсэн имэйл (${history.length})`}>
    {history.length === 0 ? <p className="text-sm text-[#AEB9CC]">Одоогоор имэйл илгээгээгүй.</p>
      : <ol className="max-h-72 space-y-2 overflow-y-auto" aria-label="Илгээсэн имэйлийн түүх">{[...history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className="rounded-xl bg-[#4CC6FF]/10 p-3 text-sm ring-1 ring-inset ring-[#4CC6FF]/25">
        <p className="text-xs text-[#AEB9CC]">{dt(entry.at)}{entry.by?.name || entry.actor?.name ? ` · ${entry.by?.name || entry.actor?.name}` : ''}{entry.result ? ` · ${STATE[entry.result] || entry.result}` : ''}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-white">{entry.message || entry.note}</p>
      </li>)}</ol>}
  </DrawerSection>;
}
