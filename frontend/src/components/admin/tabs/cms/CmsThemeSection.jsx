import axios from 'axios';
import { Moon, Save, Sun } from 'lucide-react';
import Button from '../../ui/Button';
import { ImageField, Panel, SubCard } from './editorKit';

// Public-site palette (site content, not admin chrome) — shown as swatches only.
const RAINBOW_COLORS = [
  { hex: '#003B5C', name: 'Цэнхэр (үндсэн)' },
  { hex: '#1a1a2e', name: 'Хар тэнгэр' },
  { hex: '#2D1B69', name: 'Нил ягаан' },
  { hex: '#C0392B', name: 'Улаан' },
  { hex: '#E67E22', name: 'Улбар шар' },
  { hex: '#27AE60', name: 'Ногоон' },
  { hex: '#1ABC9C', name: 'Цайвар ногоон' },
];
const SECTION_IMAGE_FIELDS = [
  { key: 'theme_image_home', label: 'Нүүр' },
  { key: 'theme_image_about', label: 'Бид хэн бэ' },
  { key: 'theme_image_financials', label: 'Санхүү' },
  { key: 'theme_image_governance', label: 'Засаглал' },
  { key: 'theme_image_products', label: 'Бүтээгдэхүүн' },
  { key: 'theme_image_blog', label: 'Блог' },
  { key: 'theme_image_contact', label: 'Холбоо барих' },
];
const MODES = [{ val: 'dark', label: 'Dark', desc: 'Харанхуй', icon: Moon }, { val: 'light', label: 'Light', desc: 'Цайвар', icon: Sun }];
const TYPES = [{ val: 'default', label: 'Анхны зураг', desc: 'Одоогийн' }, { val: 'color', label: 'Өнгө', desc: 'Хатуу өнгө' }, { val: 'image', label: 'Зураг', desc: 'Өөрийн зураг' }];

// Segmented option card (aria-pressed) — keyboard reachable, replaces the old clickable divs.
function Choice({ selected, onSelect, label, desc, icon: Icon, center = false }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect}
    className={`min-h-[68px] rounded-xl px-4 py-3 text-left ring-1 ring-inset transition-[background-color,box-shadow] duration-200 ${center ? 'text-center' : ''} ${selected ? 'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--hue)_20%,transparent),color-mix(in_srgb,var(--hue)_8%,transparent))] ring-[color-mix(in_srgb,var(--hue)_55%,transparent)] shadow-[0_10px_28px_-16px_var(--hue)]' : 'bg-white/[0.03] ring-white/[0.08] hover:bg-white/[0.06] hover:ring-white/[0.16]'}`}>
    <span className={`flex items-center gap-2 text-sm font-semibold text-white ${center ? 'justify-center' : ''}`}>{Icon && <Icon size={15} aria-hidden="true" />}{label}</span>
    <span className="mt-0.5 block text-xs text-[var(--adm-ink-3)]">{desc}</span>
  </button>;
}

// Загвар ба өнгө (formerly inline in CmsTab). Save payload and endpoint unchanged.
export default function CmsThemeSection({ API_URL, cmsSaving, configEdits, fetchCMSData, setCmsSaving, setConfigEdits, siteConfig, uploadImage }) {
  const themeMode = configEdits['theme_mode'] ?? siteConfig.theme?.theme_mode?.value ?? 'dark';
  const themeType = configEdits['theme_type'] ?? siteConfig.theme?.theme_type?.value ?? 'default';
  const themeColor = configEdits['theme_color'] ?? siteConfig.theme?.theme_color?.value ?? '#003B5C';
  const themeImage = configEdits['theme_image'] ?? siteConfig.theme?.theme_image?.value ?? '';
  const sectionThemeImages = Object.fromEntries(
    SECTION_IMAGE_FIELDS.map(({ key }) => [
      key,
      configEdits[key] ?? siteConfig.theme?.[key]?.value ?? '',
    ])
  );
  const firstThemeImage = Object.values(sectionThemeImages).find(Boolean) || themeImage;

  // Live preview styles
  const previewBg = themeType === 'color'
    ? { background: `linear-gradient(90deg, ${RAINBOW_COLORS.map(c => c.hex).join(', ')})` }
    : themeType === 'image' && firstThemeImage
      ? { backgroundImage: `url(${firstThemeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: 'linear-gradient(135deg, #003B5C 0%, #001f35 100%)' };
  const previewOverlayOpacity = themeType === 'image' ? 0.5 : 0;
  const previewTextColor = '#ffffff';

  const save = async () => {
    setCmsSaving(true);
    try {
      await axios.post(`${API_URL}/api/config/bulk`, {
        theme_mode: themeMode,
        theme_type: themeType,
        theme_color: themeColor,
        theme_image: themeImage,
        ...sectionThemeImages,
      });
      alert('✅ Хадгалагдлаа! Хуудсыг дахин ачааллах шаардлагатай.');
      fetchCMSData();
    } catch { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  return <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
    <div className="min-w-0 space-y-4 md:space-y-5">
      <Panel title="Вэбийн загвар ба дэвсгэр" description="Нийтийн сайтын горим болон хэсгүүдийн дэвсгэр.">
        <div role="group" aria-labelledby="theme-mode-label">
          <p id="theme-mode-label" className="adm-label mb-2">Горим</p>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(m => <Choice key={m.val} selected={themeMode === m.val} onSelect={() => setConfigEdits(p => ({ ...p, theme_mode: m.val }))} label={m.label} desc={m.desc} icon={m.icon} />)}
          </div>
        </div>
        <div role="group" aria-labelledby="theme-type-label">
          <p id="theme-type-label" className="adm-label mb-2">Дэвсгэрийн төрөл</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {TYPES.map(t => <Choice key={t.val} center selected={themeType === t.val} onSelect={() => setConfigEdits(p => ({ ...p, theme_type: t.val }))} label={t.label} desc={t.desc} />)}
          </div>
        </div>
      </Panel>

      {themeType === 'color' && <Panel title="Солонгын 7 өнгө" description="Section бүр автоматаар өөр өөр хатуу өнгөтэй болно. Тусдаа өнгө сонгох шаардлагагүй.">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {RAINBOW_COLORS.map(c => <li key={c.hex} className="rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-inset ring-white/[0.08]">
            <div className="h-10 w-full rounded-lg ring-1 ring-inset ring-white/10" style={{ backgroundColor: c.hex }} />
            <p className="mt-2 text-center text-[11px] font-medium leading-tight text-[var(--adm-ink-2)]">{c.name}</p>
          </li>)}
        </ul>
      </Panel>}

      {themeType === 'image' && <Panel title="Page бүрийн зураг" description="Хуудас бүрийн дэвсгэр зураг. URL оруулах эсвэл файл сонгоно.">
        <div className="grid gap-3 md:grid-cols-2">
          {SECTION_IMAGE_FIELDS.map(({ key, label }) => <SubCard key={key}>
            <ImageField label={label} value={sectionThemeImages[key]} previewClassName="h-28 w-full" alt={label}
              onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
              onFile={async file => {
                try {
                  const url = await uploadImage(file);
                  setConfigEdits(p => ({ ...p, [key]: url }));
                } catch {
                  alert('Upload алдаа');
                }
              }} />
          </SubCard>)}
        </div>
      </Panel>}
    </div>

    <div className="space-y-4 xl:sticky xl:top-24">
      <Panel title="Урьдчилан харах" eyebrow="Нийтийн сайт">
        <div className="relative overflow-hidden rounded-xl shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/10" style={previewBg}>
          {previewOverlayOpacity > 0 && (
            <div style={{ backgroundColor: `rgba(0,0,0,${previewOverlayOpacity})` }} className="pointer-events-none absolute inset-0 rounded-xl" />
          )}
          <div className="relative space-y-3 p-6" style={{ color: previewTextColor }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: `${previewTextColor}20` }}>
              <div className="text-sm font-bold tracking-wide">Solongo Capital</div>
              <div className="flex gap-3 text-xs opacity-80">
                <span>Бүтээгдэхүүн</span>
                <span>Засаглал</span>
                <span>Холбоо</span>
              </div>
            </div>
            <div className="py-4 text-center">
              <div className="mb-1 text-lg font-bold">Бизнесийн Өсөлтийг Дэмжинэ</div>
              <div className="text-xs opacity-80">Санхүүгийн найдвартай түнш</div>
              <div className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-semibold" style={{ border: `1px solid ${previewTextColor}40`, color: previewTextColor }}>
                Бүтээгдэхүүн үзэх
              </div>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest opacity-80">
                {themeMode === 'light' ? 'Light горим' : 'Dark горим'} · {themeType === 'color' ? `Өнгө: ${themeColor}` : themeType === 'image' ? 'Зураг дэвсгэр' : 'Анхны дэвсгэр'}
              </span>
            </div>
          </div>
        </div>
      </Panel>
      <Button className="w-full" icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} disabled={cmsSaving} onClick={save}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
    </div>
  </div>;
}
