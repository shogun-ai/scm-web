import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, BarChart3, Loader2, Save, Settings2, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../loanTask/api';
import AutomationSettings, { SettingSwitch, SettingsCard } from './AutomationSettings';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import { Notice, Pill } from './ui/Feedback';
import { MODULE_HUES } from './theme/spectrum';

const HUE = MODULE_HUES.deleteSettings;

// Устгах тохиргоо: loanRequestDeleteEnabled (GET/PUT /api/admin/settings). Тэнгэр дээр шууд (pearl sheet-гүй).
export default function AdminSettingsPanel({ apiUrl }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [pixelSaving, setPixelSaving] = useState(false);
  const [pixelError, setPixelError] = useState('');
  const [pixelMessage, setPixelMessage] = useState('');

  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/admin/settings`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) { setEnabled(Boolean(res.data?.loanRequestDeleteEnabled)); setPixelId(res.data?.metaPixelId ? String(res.data.metaPixelId) : ''); setLoaded(true); } })
      .catch(err => { if (alive) setError(err.response?.data?.message || 'Тохиргоо ачаалж чадсангүй.'); });
    return () => { alive = false; };
  }, [apiUrl]);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await axios.put(`${apiUrl}/api/admin/settings`, { loanRequestDeleteEnabled: next }, { headers: getAuthHeaders(), timeout: 15000 });
      setEnabled(typeof res.data?.loanRequestDeleteEnabled === 'boolean' ? res.data.loanRequestDeleteEnabled : next);
      setMessage(next ? 'Хүсэлт устгах боломж асалаа.' : 'Хүсэлт устгах боломж унтраалаа.');
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };

  const savePixel = async event => {
    event.preventDefault();
    const value = pixelId.trim();
    setPixelError(''); setPixelMessage('');
    if (value && !/^\d{10,20}$/.test(value)) { setPixelError('Pixel ID нь зөвхөн 10–20 оронтой тоо байна.'); return; }
    setPixelSaving(true);
    try {
      await axios.put(`${apiUrl}/api/admin/settings`, { metaPixelId: value }, { headers: getAuthHeaders(), timeout: 15000 });
      setPixelMessage(value ? 'Meta Pixel ID хадгалагдлаа.' : 'Meta Pixel ID устгагдлаа.');
    } catch (err) { setPixelError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setPixelSaving(false); }
  };

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={Settings2} eyebrow="Тохиргоо" title="Устгах тохиргоо" description="Хүсэлт устгах эрх, Meta Pixel, автомат имэйл ба хуваарилалт" />
    <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-2">
      <div className="space-y-4 md:space-y-5">
        <SettingsCard id="del-card-title" icon={Trash2} title="Хүсэлт устгах" description="Зөвхөн админ, зөвхөн энэ унтраалга асаалттай үед."
          aside={loaded ? (enabled ? <Pill hue="rose">Асаалттай</Pill> : <Pill hue="neutral" dot={false}>Унтраалттай</Pill>) : null}>
          <SettingSwitch id="del-switch" label="Зээлийн хүсэлт устгахыг зөвшөөрөх" help="Асаалттай үед зөвхөн админ хүсэлтийг жагсаалт болон дэлгэрэнгүйгээс устгах боломжтой. Анхдагчаар унтраалттай." checked={enabled} disabled={!loaded || saving} onChange={toggle} />
          {!loaded && !error && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}
          {message && <Notice kind="ok" className="mt-3">{message}</Notice>}
          {error && <Notice kind="err" className="mt-3">{error}</Notice>}
          <p role="note" className="adm-note adm-note--err mt-4 flex items-start gap-2.5 !text-[13px] leading-relaxed"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Устгасан хүсэлт болон түүний файлууд бүрмөсөн устгагдана, сэргээх боломжгүй. Ашиглаж дууссаны дараа унтрааж орхино уу.</p>
        </SettingsCard>
        <SettingsCard id="meta-pixel-title" icon={BarChart3} title="Meta Pixel" description="Сайтын PageView болон Lead (хүсэлт илгээсэн) үйл явдлыг хэмжинэ.">
          <form onSubmit={savePixel} noValidate>
            <label htmlFor="meta-pixel-id" className="adm-label">Pixel ID</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input id="meta-pixel-id" inputMode="numeric" autoComplete="off" value={pixelId} onChange={event => setPixelId(event.target.value)} disabled={!loaded || pixelSaving} aria-describedby="meta-pixel-help" aria-invalid={Boolean(pixelError)} placeholder="1234567890123456" className="adm-field adm-tnum min-w-0 flex-1 sm:max-w-xs" />
              <Button type="submit" hue={HUE} busy={pixelSaving} disabled={!loaded || pixelSaving} icon={<Save size={16} aria-hidden="true" />}>Хадгалах</Button>
            </div>
            <p id="meta-pixel-help" className="mt-2 text-xs text-[var(--adm-ink-3)]">10–20 оронтой тоо. Хоосон бол Pixel ачаалагдахгүй.</p>
            {pixelMessage && <Notice kind="ok" className="mt-3">{pixelMessage}</Notice>}
            {pixelError && <Notice kind="err" className="mt-3">{pixelError}</Notice>}
          </form>
        </SettingsCard>
      </div>
      <div className="space-y-4 md:space-y-5">
        <AutomationSettings apiUrl={apiUrl} />
      </div>
    </div>
  </div>;
}
