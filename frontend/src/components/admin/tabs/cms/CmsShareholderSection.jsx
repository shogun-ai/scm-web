import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import { ConfigField, Panel } from './editorKit';

// Хувьцаа эзэмшигч
export default function CmsShareholderSection({ cmsSaving, configEdits, saveBulkConfig, setConfigEdits, siteConfig }) {
  return <Panel className="max-w-3xl" title="Хувьцаа эзэмшигчийн мэдээлэл">
    {Object.entries(siteConfig.shareholder || {}).map(([key, obj]) => (
      <ConfigField key={key} label={obj.label} multiline={key === 'shareholder_description'} rows={3} value={configEdits[key] ?? obj.value ?? ''}
        onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))} />
    ))}
    <div className="flex justify-end border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={() => saveBulkConfig('shareholder')}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
    </div>
  </Panel>;
}
