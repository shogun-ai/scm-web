import { Save } from 'lucide-react';
import HeroSliderSettings from '../../../HeroSliderSettings';
import { normalizeHeroSliderInterval } from '../../../../../../shared/heroSliderConfig.js';
import Button from '../../ui/Button';
import { ConfigField, ImageField, Panel } from './editorKit';

const GROUPS = { hero: ['Hero хэсэг', 'Нүүрний гарчиг, тайлбар, слайдын хугацаа'], about: ['Бид хэн бэ', 'Нүүр хуудсан дээрх товч танилцуулга'], financials: ['Санхүүгийн үзүүлэлт', 'Нүүр хуудсан дээрх санхүүгийн хэсэг'], contact: ['Холбоо барих', 'Утас, имэйл, хаяг, зураг'] };

// Нүүр хэсэг ба холбоо барих. Each group saves independently (saveBulkConfig(group)) as before.
export default function CmsHeroSection({ cmsSaving, configEdits, saveBulkConfig, setConfigEdits, siteConfig, uploadImage }) {
  return <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-2">
    {['hero', 'about', 'financials', 'contact'].map(group => (
      <Panel key={group} title={GROUPS[group][0]} description={GROUPS[group][1]}>
        {group === 'hero' && (
          // Shared light control (HeroSliderSettings) keeps its own light card.
          <div className="text-slate-800 [color-scheme:light]">
            <HeroSliderSettings
              value={configEdits.hero_slider_interval ?? normalizeHeroSliderInterval(siteConfig.hero?.hero_slider_interval?.value)}
              onChange={value => setConfigEdits(previous => ({ ...previous, hero_slider_interval: value }))}
            />
          </div>
        )}
        {Object.entries(siteConfig[group] || {}).filter(([key]) => key !== 'contact_image' && key !== 'hero_slider_interval').map(([key, obj]) => (
          <ConfigField key={key} label={obj.label} multiline={(obj.value?.length || 0) > 80} rows={3} value={configEdits[key] ?? obj.value ?? ''}
            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))} />
        ))}
        {group === 'contact' && (
          <div className="border-t border-white/[0.08] pt-4">
            <ImageField label="Холбоо барих хэсгийн зураг" alt="Холбоо барих зураг" previewClassName="h-40 w-full"
              value={configEdits['contact_image'] ?? siteConfig.contact?.contact_image?.value ?? ''}
              onChange={e => setConfigEdits(p => ({ ...p, contact_image: e.target.value }))}
              onFile={async file => {
                try {
                  const url = await uploadImage(file);
                  setConfigEdits(p => ({ ...p, contact_image: url }));
                } catch { alert('Upload алдаа'); }
              }} />
          </div>
        )}
        <div className="flex justify-end border-t border-white/[0.08] pt-4">
          <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={() => saveBulkConfig(group)}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
        </div>
      </Panel>
    ))}
  </div>;
}
