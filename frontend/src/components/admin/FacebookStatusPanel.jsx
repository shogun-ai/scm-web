import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Facebook, KeyRound, RefreshCw, Settings2, XCircle } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import { Notice, Pill } from './ui/Feedback';
import { MODULE_HUES } from './theme/spectrum';

const HUE = MODULE_HUES.facebook;
const CHECKS = [
  { key: 'tokenConfigured', label: 'Token тохируулсан' },
  { key: 'matchesExpected', label: 'Solongo.Capital мөн эсэх' },
  { key: 'webhookSubscribed', label: 'Webhook subscribed' },
  { key: 'appSecretConfigured', label: 'App secret тохируулсан' },
  { key: 'messengerProfileOk', label: 'Messenger цэс' },
];
const code = 'rounded-md bg-white/[0.07] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--adm-ink)] ring-1 ring-inset ring-white/10';

const Row = ({ label, ok }) => <li className="flex min-h-12 items-center justify-between gap-3 py-2.5">
  <span className="flex items-center gap-3 text-sm text-[var(--adm-ink)]">
    {ok ? <CheckCircle2 size={18} className="shrink-0 text-[#8FF0C8]" aria-hidden="true" /> : <XCircle size={18} className="shrink-0 text-[#FFB8C5]" aria-hidden="true" />}
    {label}
  </span>
  {ok ? <Pill hue="green">Зөв</Pill> : <Pill hue="rose">Алдаатай</Pill>}
</li>;

// Facebook холболт: GET /api/admin/facebook/status, POST /api/admin/facebook/messenger-profile. Тэнгэр дээр шууд.
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
  const failed = status ? CHECKS.filter(check => !status[check.key]).length : 0;

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={Facebook} eyebrow="Холболт" title="Facebook холболт" description="Solongo.Capital page, webhook болон Messenger цэсийн төлөв"
      actions={<>
        <Button variant="secondary" onClick={load} disabled={loading || busy} icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />}>Шинэчлэх</Button>
        <Button hue={HUE} onClick={reconfigure} busy={busy} disabled={busy || loading} icon={<Settings2 size={16} aria-hidden="true" />}>Messenger цэсийг дахин тохируулах</Button>
      </>} />
    {message && <Notice kind="ok">{message}</Notice>}
    {error && <Notice kind="err">{error}</Notice>}

    <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-5">
      <section className="glass relative p-5 md:p-6 lg:col-span-3" aria-labelledby="fb-status-title" aria-busy={loading}>
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="fb-status-title" className="adm-label">Page</h3>
            <p className="mt-1.5 text-lg font-semibold text-white">{loading && !status ? '—' : page ? (page.name || '—') : 'Холбогдоогүй'}</p>
            {page?.id && <p className="adm-tnum mt-0.5 font-mono text-xs text-[var(--adm-ink-3)]">ID {page.id}</p>}
          </div>
          {status && !loading && (failed === 0 ? <Pill hue="green">Бүх шалгалт хэвийн</Pill> : <Pill hue="rose">{failed} асуудал</Pill>)}
        </div>
        <div className="relative mt-4 border-t border-white/[0.07] pt-2">
          {loading && <div role="status" aria-label="Ачаалж байна" className="space-y-3 py-2">{CHECKS.map(check => <div key={check.key} className="adm-skeleton h-8" />)}</div>}
          {status && !loading && <ul className="divide-y divide-white/[0.06]">{CHECKS.map(check => <Row key={check.key} label={check.label} ok={Boolean(status[check.key])} />)}</ul>}
          {!status && !loading && <p className="py-4 text-sm text-[var(--adm-ink-2)]">Төлөв ачаалагдаагүй. "Шинэчлэх" дарж дахин оролдоно уу.</p>}
        </div>
      </section>

      <section className="glass relative p-5 md:p-6 lg:col-span-2" aria-labelledby="fb-guide-title">
        <span className="adm-card__rim" aria-hidden="true" />
        <h3 id="fb-guide-title" className="relative flex items-center gap-2 text-[15px] font-semibold text-white"><KeyRound size={16} className="text-[color-mix(in_srgb,var(--hue)_70%,white)]" aria-hidden="true" />Token солих заавар</h3>
        <ol className="relative mt-4 space-y-3.5 text-sm leading-relaxed text-[var(--adm-ink-2)]">
          {[
            <>Meta Business дээр Solongo.Capital page-д хандах page access token үүсгэнэ.</>,
            <>Эрх: <code className={code}>pages_messaging</code>, <code className={code}>pages_read_engagement</code>, <code className={code}>pages_manage_metadata</code>.</>,
            <>Render дээр <code className={code}>FB_PAGE_ACCESS_TOKEN</code> environment хувьсагчийг шинэчилж, сервисийг дахин ачаална.</>,
            <>Энэ хуудсанд &quot;Шинэчлэх&quot; дарж бүх шалгалт &quot;Зөв&quot; болсныг шалгана.</>,
          ].map((step, index) => <li key={index} className="flex gap-3">
            <span className="adm-tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-white ring-1 ring-inset ring-white/15" aria-hidden="true">{index + 1}</span>
            <span className="min-w-0 break-words pt-0.5">{step}</span>
          </li>)}
        </ol>
        <p className="relative mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-[var(--adm-ink-3)]">Дэлгэрэнгүй: <code className={code}>docs/setup/facebook-messenger.md</code>. Token хэзээ ч энд харагдахгүй.</p>
      </section>
    </div>
  </div>;
}
