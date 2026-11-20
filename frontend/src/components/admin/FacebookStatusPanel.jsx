import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Facebook, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';

const Row = ({ label, ok }) => <li className="flex items-center justify-between gap-3 py-2">
  <span className="text-sm text-slate-700">{label}</span>
  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>
    {ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
    <span aria-hidden="true">{ok ? '✓' : '✗'}</span><span className="sr-only">{ok ? 'Зөв' : 'Алдаатай'}</span>
  </span>
</li>;

// Facebook холболт: GET /api/admin/facebook/status, POST /api/admin/facebook/messenger-profile.
export default function FacebookStatusPanel({ apiUrl }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${apiUrl}/api/admin/facebook/status`, { headers: getAuthHeaders(), timeout: 20000 });
      setStatus(res.data && typeof res.data === 'object' ? res.data : {});
    } catch (err) { setStatus(null); setError(err.response?.data?.message || 'Facebook төлөв ачаалж чадсангүй.'); }
    finally { setLoading(false); }
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const reconfigure = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await axios.post(`${apiUrl}/api/admin/facebook/messenger-profile`, {}, { headers: getAuthHeaders(), timeout: 30000 });
      setMessage('Messenger цэс дахин тохируулагдлаа.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Messenger цэсийг тохируулж чадсангүй.'); }
    finally { setBusy(false); }
  };

  const page = status?.page && typeof status.page === 'object' ? status.page : null;

  return <div className="max-w-2xl space-y-6 animate-fade-in">
    <h2 className="flex items-center gap-2 text-2xl font-bold text-[#003B5C]"><Facebook size={24} aria-hidden="true" />Facebook холболт</h2>
    <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-busy={loading}>
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
      {status && !loading && <>
        <p className="mb-2 text-sm text-slate-700">Page: <strong>{page ? `${page.name || '—'} (${page.id || '—'})` : 'Холбогдоогүй'}</strong></p>
        <ul className="divide-y divide-slate-100">
          <Row label="Token тохируулсан" ok={Boolean(status.tokenConfigured)} />
          <Row label="Solongo.Capital мөн эсэх" ok={Boolean(status.matchesExpected)} />
          <Row label="Webhook subscribed" ok={Boolean(status.webhookSubscribed)} />
          <Row label="App secret тохируулсан" ok={Boolean(status.appSecretConfigured)} />
          <Row label="Messenger цэс" ok={Boolean(status.messengerProfileOk)} />
        </ul>
      </>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={reconfigure} disabled={busy || loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}Messenger цэсийг дахин тохируулах</button>
        <button type="button" onClick={load} disabled={loading || busy} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Шинэчлэх</button>
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-6 text-sm text-slate-700 shadow-sm">
      <h3 className="mb-2 font-bold text-slate-800">Token солих заавар</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Meta Business дээр Solongo.Capital page-д хандах page access token үүсгэнэ.</li>
        <li>Эрх: <code>pages_messaging</code>, <code>pages_read_engagement</code>, <code>pages_manage_metadata</code>.</li>
        <li>Render дээр <code>FB_PAGE_ACCESS_TOKEN</code> environment хувьсагчийг шинэчилж, сервисийг дахин ачаална.</li>
        <li>Энэ хуудсанд &quot;Шинэчлэх&quot; дарж бүх зүйл ✓ болсныг шалгана.</li>
      </ol>
      <p className="mt-2 text-slate-500">Дэлгэрэнгүй: <code>docs/setup/facebook-messenger.md</code>. Token хэзээ ч энд харагдахгүй.</p>
    </section>
  </div>;
}
