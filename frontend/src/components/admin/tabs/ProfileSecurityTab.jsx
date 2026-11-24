import { ExternalLink, Globe, KeyRound, Lock, QrCode, Save, ShieldCheck } from 'lucide-react';
import { SettingsCard } from '../AutomationSettings';
import Button from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { Field, Input } from '../ui/Form';
import { MODULE_HUES } from '../theme/spectrum';

const HUE = MODULE_HUES.profile;

// Миний профайл — нууц үг, газрын зураг, 2FA. Тэнгэр дээр шууд; state ба handler-ууд AdminPanel-аас (өөрчлөлтгүй).
export default function ProfileSecurityTab({ cmsSaving, configEdits, confirmPassword, handleChangePassword, newPassword, oldPassword, pwLoading, pwMsg, qrCode, saveBulkConfig, setConfigEdits, setConfirmPassword, setNewPassword, setOldPassword, setTwoFACode, setup2FA, siteConfig, twoFACode, verify2FA }) {
  const mapsUrl = configEdits['maps_url'] ?? siteConfig.contact?.maps_url?.value ?? '';
  return <div className="adm-board mt-4 space-y-4 md:mt-5 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <h3 className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--adm-ink-2)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--hue)] shadow-[0_0_8px_var(--hue)]" aria-hidden="true" />Нууц үг ба 2FA тохиргоо</h3>
    <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-2">
      <SettingsCard id="pw-title" icon={Lock} title="Нууц үг солих" description="Хамгийн багадаа 8 тэмдэгт.">
        <div className="space-y-3.5">
          <Field label="Одоогийн нууц үг">{({ id }) => <Input id={id} type="password" autoComplete="current-password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" />}</Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Шинэ нууц үг">{({ id }) => <Input id={id} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="8+ тэмдэгт" />}</Field>
            <Field label="Шинэ нууц үг давтах">{({ id }) => <Input id={id} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />}</Field>
          </div>
          {pwMsg.text && <Notice kind={pwMsg.ok ? 'ok' : 'err'}>{pwMsg.text}</Notice>}
          <Button hue={HUE} className="w-full sm:w-auto" onClick={handleChangePassword} busy={pwLoading} disabled={pwLoading} icon={<KeyRound size={16} aria-hidden="true" />}>{pwLoading ? 'Хадгалж байна...' : 'Нууц үг солих'}</Button>
        </div>
      </SettingsCard>

      <SettingsCard id="twofa-title" icon={QrCode} title="Хоёр шатлалт баталгаажуулалт (2FA)" description="Нэвтрэх бүрт authenticator аппын 6 оронтой код шаардана.">
        {!qrCode
          ? <Button hue="green" onClick={setup2FA} icon={<ShieldCheck size={16} aria-hidden="true" />}>2FA идэвхжүүлэх</Button>
          : <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0 self-start rounded-2xl bg-white p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"><img src={qrCode} alt="2FA QR код — authenticator аппаар уншуулна" className="h-40 w-40" /></div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm leading-relaxed text-[var(--adm-ink-2)]">Authenticator аппаар QR кодыг уншуулаад гарсан 6 оронтой кодыг оруулна уу.</p>
              <Field label="Баталгаажуулах код">{({ id }) => <Input id={id} value={twoFACode} onChange={e => setTwoFACode(e.target.value)} placeholder="000000" maxLength={6} inputMode="numeric" autoComplete="one-time-code" className="adm-tnum !min-h-[52px] text-center font-mono !text-2xl tracking-[0.5em]" />}</Field>
              <Button hue="green" className="w-full" onClick={verify2FA} icon={<ShieldCheck size={16} aria-hidden="true" />}>Баталгаажуулах</Button>
            </div>
          </div>}
      </SettingsCard>

      <SettingsCard id="maps-title" icon={Globe} title="Газрын зургийн тохиргоо" description="Google Maps URL — вэбсайтын “Холбоо барих” хэсэгт харагдана." className="xl:col-span-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Field label="Google Maps URL" className="flex-1">{({ id }) => <Input id={id} type="url" value={mapsUrl} onChange={e => setConfigEdits(p => ({ ...p, maps_url: e.target.value }))} placeholder="https://goo.gl/maps/..." />}</Field>
          <Button hue={HUE} onClick={() => saveBulkConfig('contact')} busy={cmsSaving} disabled={cmsSaving} icon={<Save size={16} aria-hidden="true" />}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
        </div>
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#A6E6FF] underline-offset-4 hover:underline">Газрын зураг харах<ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(шинэ цонхонд нээгдэнэ)</span></a>}
      </SettingsCard>
    </div>
  </div>;
}
