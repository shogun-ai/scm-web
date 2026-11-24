import { Save } from 'lucide-react';
import { LOAN_APR_CONFIG_KEY } from '../../../../../../shared/loanAprConfig.js';
import LoanAprSettingsEditor from '../../../LoanAprSettingsEditor';
import Button from '../../ui/Button';
import { InlineNote, LightIsland, Panel } from './editorKit';

// Тооцоолуур. LoanAprSettingsEditor is a shared light component → rendered in a light island inside the same fieldset.
export default function CmsCalculatorSection({ cmsConfigStatus, cmsSaving, configEdits, fetchCMSData, saveBulkConfig, setConfigEdits, siteConfig }) {
  return <Panel className="max-w-3xl" title="Тооцоолуурын тохиргоо" description="Зээл болон итгэлцлийн тооцоолуурын параметрүүд. Хадгалсны дараа вэбсайт дээр автоматаар шинэчлэгдэнэ." bodyClassName="space-y-5">
    {cmsConfigStatus !== 'ready' && <InlineNote kind={cmsConfigStatus === 'error' ? 'err' : 'warn'} role="status" className="flex flex-wrap items-center gap-2">
      {cmsConfigStatus === 'error' ? 'Тохиргоог ачаалж чадсангүй. Хадгалалт хаалттай.' : 'Тохиргоог ачаалж байна…'}
      {cmsConfigStatus === 'error' && <button type="button" onClick={fetchCMSData} className="min-h-11 font-bold underline underline-offset-2">Дахин ачаалах</button>}
    </InlineNote>}
    <fieldset disabled={cmsConfigStatus !== 'ready' || cmsSaving} className="space-y-5 disabled:opacity-60">
      <div className="divide-y divide-white/[0.06]">
        {Object.entries(siteConfig.rates || {}).filter(([key]) => key !== LOAN_APR_CONFIG_KEY).map(([key, obj]) => (
          <div key={key} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4">
            <label htmlFor={`rate-${key}`} className="text-sm font-medium text-[var(--adm-ink-2)] sm:w-64 sm:shrink-0">{obj.label}</label>
            <input id={`rate-${key}`} type="number" step="0.1" value={configEdits[key] ?? obj.value ?? ''}
              onChange={e => setConfigEdits(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
              className="adm-field adm-tnum w-full min-w-0 flex-1 font-semibold" />
          </div>
        ))}
      </div>
      <LightIsland>
        <LoanAprSettingsEditor value={configEdits[LOAN_APR_CONFIG_KEY]}
          onChange={value => setConfigEdits(previous => ({ ...previous, [LOAN_APR_CONFIG_KEY]: value }))} />
      </LightIsland>
    </fieldset>
    <div className="flex justify-end border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} onClick={() => saveBulkConfig('rates')} disabled={cmsSaving || cmsConfigStatus !== 'ready'}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
    </div>
  </Panel>;
}
