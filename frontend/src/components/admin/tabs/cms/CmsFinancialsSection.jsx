import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import { ConfigField, Panel, SubCard } from './editorKit';

// Санхүүгийн үзүүлэлт
export default function CmsFinancialsSection({ cmsSaving, configEdits, handleStatUpdate, saveBulkConfig, setConfigEdits, siteConfig, stats }) {
  return <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-2">
    <Panel title="Санхүүгийн хэсгийн текст">
      {Object.entries(siteConfig.financials || {}).map(([key, obj]) => (
        <ConfigField key={key} label={obj.label} multiline rows={(obj.value?.length || 0) > 60 ? 3 : 1} value={configEdits[key] ?? obj.value ?? ''}
          onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))} />
      ))}
      <div className="flex justify-end border-t border-white/[0.08] pt-4">
        <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={() => saveBulkConfig('financials')}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
      </div>
    </Panel>
    <Panel title="Тоон үзүүлэлтүүд" description='Жишээ: "7 Тэрбум", "13.7%". Мөр бүрийг тусад нь хадгална.' bodyClassName="space-y-2">
      {stats.map(s => (
        <SubCard key={s._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor={`stat-${s._id}`} className="text-sm font-semibold text-[var(--adm-ink-2)] sm:w-48 sm:shrink-0">{s.label}</label>
          <div className="flex flex-1 gap-2">
            <input id={`stat-${s._id}`} defaultValue={s.value} className="adm-field adm-tnum w-full min-w-0 font-semibold" />
            <Button variant="secondary" aria-label={`${s.label} — хадгалах`} onClick={() => handleStatUpdate(s._id, document.getElementById(`stat-${s._id}`).value)}>Хадгалах</Button>
          </div>
        </SubCard>
      ))}
      {stats.length === 0 && <p className="py-4 text-center text-sm text-[var(--adm-ink-3)]">Серверийг дахин эхлүүлнэ үү.</p>}
    </Panel>
  </div>;
}
