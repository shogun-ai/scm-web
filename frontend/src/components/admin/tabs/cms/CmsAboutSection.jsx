import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import { ConfigField, Panel } from './editorKit';

// Бидний тухай
export default function CmsAboutSection({ cmsSaving, configEdits, saveBulkConfig, setConfigEdits, siteConfig }) {
  return <Panel className="max-w-3xl" title="Бид хэн бэ?" description="Нийтийн сайтын “Бид хэн бэ” хэсгийн текст.">
    {Object.entries(siteConfig.about || {}).map(([key, obj]) => (
      <ConfigField key={key} label={obj.label} multiline rows={(obj.value?.length || 0) > 60 ? 3 : 1} value={configEdits[key] ?? obj.value ?? ''}
        onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))} />
    ))}
    <div className="flex justify-end border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={() => saveBulkConfig('about')}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
    </div>
  </Panel>;
}
