import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import { ConfigField, ImageField, Panel } from './editorKit';

// Гүйцэтгэх захирлын мэндчилгээ. (Unreachable `false && …` theme blocks that referenced undefined names were removed.)
export default function CmsCeoSection({ cmsSaving, configEdits, saveBulkConfig, setConfigEdits, siteConfig, uploadImage }) {
  return <Panel className="max-w-3xl" title="Захирлын мэндчилгээ">
    {Object.entries(siteConfig.ceo || {}).map(([key, obj]) => {
      const onChange = e => setConfigEdits(p => ({ ...p, [key]: e.target.value }));
      if (key === 'ceo_image' || key === 'ceo_signature') {
        return <div key={key}>
          <ImageField label={obj.label} value={configEdits[key] ?? obj.value ?? ''} previewClassName="hidden" onChange={onChange}
            onFile={async file => { try { const url = await uploadImage(file); setConfigEdits(p => ({ ...p, [key]: url })); } catch { alert('Upload алдаа'); } }} />
          {/* Preview follows the original rule: only an edited value is previewed. */}
          {configEdits[key] && <img src={configEdits[key]} alt={obj.label} className="mt-2.5 h-24 rounded-xl object-cover ring-1 ring-white/10" />}
        </div>;
      }
      return <ConfigField key={key} label={obj.label} multiline={key === 'ceo_message'} rows={8} value={configEdits[key] ?? obj.value ?? ''} onChange={onChange} />;
    })}
    <div className="flex justify-end border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={() => saveBulkConfig('ceo')}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
    </div>
  </Panel>;
}
