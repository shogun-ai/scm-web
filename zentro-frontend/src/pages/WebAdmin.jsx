import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileQuestion,
  Image as ImageIcon,
  ImagePlus,
  Laptop,
  LayoutTemplate,
  LoaderCircle,
  Menu,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Settings2,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Upload,
} from 'lucide-react';
import { getAdminWebConfig, updateAdminWebConfig, uploadAdminWebImages } from '../api';
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_STYLES,
  DEFAULT_THEME,
  FIELD_LIBRARY,
  getAtPath,
  normalizeField,
  normalizeSiteConfig,
  setAtPath,
} from '../siteDefaults';
import SitePage, { SECTION_LABELS } from './SitePage';

const PANEL_TABS = [
  { id: 'page', label: 'Хуудас', icon: LayoutTemplate },
  { id: 'form', label: 'Хүсэлтийн форм', icon: FileQuestion },
  { id: 'settings', label: 'Брэнд тохиргоо', icon: Settings2 },
  { id: 'seo', label: 'Google ба browser', icon: Search },
];

const CUSTOM_SECTION_PRESETS = {
  editorial: { type: 'editorial', kicker: 'Онцлох мэдээлэл', title: 'Шинэ мэдээллийн хэсэг', body: 'Шинэ хэсгийн тайлбар текст.' },
  statement: { type: 'statement', kicker: 'Zentro Prime Capital', title: 'Том хэмжээний онцлох өгүүлбэр', body: '' },
  media: { type: 'media', kicker: 'Онцлох мэдээлэл', title: 'Зурагт хэсгийн гарчиг', body: '', image: '', images: [], gallerySeconds: 5 },
};

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function Field({ label, children, hint }) {
  return <label className="za-control"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function IconSegment({ value, onChange, options }) {
  return <div className="za-segment">{options.map(({ id, icon: Icon, label }) => <button type="button" key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)} title={label}><Icon size={15} /></button>)}</div>;
}

const LOGO_APPEARANCE = {
  desktop: {
    width: 'logoWidth', height: 'logoHeight', zoom: 'logoZoom', x: 'logoOffsetX', y: 'logoOffsetY',
    defaults: { width: DEFAULT_THEME.logoWidth, height: DEFAULT_THEME.logoHeight, zoom: DEFAULT_THEME.logoZoom, x: 0, y: 0 },
  },
  mobile: {
    width: 'logoMobileWidth', height: 'logoMobileHeight', zoom: 'logoMobileZoom', x: 'logoMobileOffsetX', y: 'logoMobileOffsetY',
    defaults: { width: DEFAULT_THEME.logoMobileWidth, height: DEFAULT_THEME.logoMobileHeight, zoom: DEFAULT_THEME.logoMobileZoom, x: 0, y: 0 },
  },
};

function getLogoAppearance(cfg, mode) {
  const fields = LOGO_APPEARANCE[mode] || LOGO_APPEARANCE.desktop;
  return {
    fields,
    width: Number(cfg.theme?.[fields.width] ?? fields.defaults.width),
    height: Number(cfg.theme?.[fields.height] ?? fields.defaults.height),
    zoom: Number(cfg.theme?.[fields.zoom] ?? fields.defaults.zoom),
    x: Number(cfg.theme?.[fields.x] ?? fields.defaults.x),
    y: Number(cfg.theme?.[fields.y] ?? fields.defaults.y),
  };
}

function LogoHeaderPreview({ cfg, mode, compact = false }) {
  const appearance = getLogoAppearance(cfg, mode);
  const style = {
    '--zp-logo-width': `${appearance.width}px`,
    '--zp-logo-height': `${appearance.height}px`,
    '--zp-logo-zoom': appearance.zoom,
    '--zp-logo-x': `${appearance.x}px`,
    '--zp-logo-y': `${appearance.y}px`,
  };
  const heroImage = cfg.heroImages?.[0] || cfg.heroImage;
  return <div className={`za-logo-page-preview ${mode} ${compact ? 'compact' : ''}`} style={style}>
    <div className="za-logo-demo-nav" style={{ height: `${Math.max(mode === 'mobile' ? 66 : 76, appearance.height + 20)}px` }}>
      {cfg.logoUrl ? <span className="zp-brand-image-wrap"><img className="zp-logo-img" src={cfg.logoUrl} alt={cfg.brandName} /></span> : <b>{cfg.brandName}</b>}
      <button type="button" tabIndex={-1} aria-hidden="true"><Menu size={18} /></button>
    </div>
    {heroImage && <div className="za-logo-demo-hero"><img src={heroImage} alt="" /></div>}
  </div>;
}

function LogoAppearanceControls({ cfg, mode, changePath, onAutoFit, onReset }) {
  const [fitting, setFitting] = useState(false);
  const appearance = getLogoAppearance(cfg, mode);
  const { fields } = appearance;
  const mobile = mode === 'mobile';
  const autoFit = async () => {
    setFitting(true);
    try { await onAutoFit(mode); } finally { setFitting(false); }
  };
  return <div className="za-logo-controls">
    <Field label={`Харагдах өргөн · ${appearance.width}px`}><input type="range" min={mobile ? 80 : 100} max={mobile ? 260 : 520} step="2" value={appearance.width} onChange={event => changePath(`theme.${fields.width}`, Number(event.target.value))} /></Field>
    <Field label={`Харагдах өндөр · ${appearance.height}px`}><input type="range" min="24" max={mobile ? 80 : 140} step="2" value={appearance.height} onChange={event => changePath(`theme.${fields.height}`, Number(event.target.value))} /></Field>
    <Field label={`Дотор томруулалт · ${Math.round(appearance.zoom * 100)}%`}><input type="range" min="0.5" max="4" step="0.1" value={appearance.zoom} onChange={event => changePath(`theme.${fields.zoom}`, Number(event.target.value))} /></Field>
    <Field label={`Хэвтээ байрлал · ${appearance.x}px`}><input type="range" min={-appearance.width} max={appearance.width} step="1" value={appearance.x} onChange={event => changePath(`theme.${fields.x}`, Number(event.target.value))} /></Field>
    <Field label={`Босоо байрлал · ${appearance.y}px`}><input type="range" min={-appearance.height} max={appearance.height} step="1" value={appearance.y} onChange={event => changePath(`theme.${fields.y}`, Number(event.target.value))} /></Field>
    <div className="za-logo-actions"><button type="button" className="za-secondary" onClick={autoFit} disabled={fitting || !cfg.logoUrl}>{fitting ? <LoaderCircle className="animate-spin" size={14} /> : <ScanLine size={14} />} Автоматаар тааруулах</button><button type="button" className="za-icon-button" onClick={() => onReset(mode)} title="Хэмжээ сэргээх"><RotateCcw size={14} /></button></div>
  </div>;
}

function loadLogoImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Лого зургийг уншиж чадсангүй.'));
    image.src = src;
  });
}

async function calculateLogoFit(src, width, height) {
  const image = await loadLogoImage(src);
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const corners = [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]];
  const background = corners.reduce((sum, [x, y]) => {
    const index = (y * canvas.width + x) * 4;
    return sum.map((value, channel) => value + pixels[index + channel] / corners.length);
  }, [0, 0, 0, 0]);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const alpha = pixels[index + 3];
      const difference = Math.abs(pixels[index] - background[0]) + Math.abs(pixels[index + 1] - background[1]) + Math.abs(pixels[index + 2] - background[2]);
      const visible = background[3] < 20 ? alpha > 24 : alpha > 24 && (difference > 60 || Math.abs(alpha - background[3]) > 24);
      if (!visible) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('Логоны харагдах хэсгийг олж чадсангүй.');
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const objectWidth = Math.min(width, height * imageRatio);
  const objectHeight = objectWidth / imageRatio;
  const objectTop = (height - objectHeight) / 2;
  const contentWidth = ((maxX - minX + 1) / canvas.width) * objectWidth;
  const contentHeight = ((maxY - minY + 1) / canvas.height) * objectHeight;
  const contentCenterX = ((minX + maxX + 1) / 2 / canvas.width) * objectWidth;
  const contentCenterY = objectTop + ((minY + maxY + 1) / 2 / canvas.height) * objectHeight;
  const zoom = Math.min(4, Math.max(.5, Math.min(width * .9 / contentWidth, height * .88 / contentHeight)));
  return {
    zoom: Math.round(zoom * 10) / 10,
    x: Math.round(Math.max(-width, Math.min(width, -zoom * (contentCenterX - width / 2)))),
    y: Math.round(Math.max(-height, Math.min(height, -zoom * (contentCenterY - height / 2)))),
  };
}

function galleryPathForImage(path) {
  if (path === 'heroImage') return 'heroImages';
  if (/^products\.\d+\.image$/.test(path || '')) return path.replace(/\.image$/, '.images');
  if (/^customSections\.\d+\.image$/.test(path || '')) return path.replace(/\.image$/, '.images');
  return '';
}

function GalleryManager({ images, seconds, uploading, onUpload, onChange, onSecondsChange }) {
  const [url, setUrl] = useState('');
  const gallery = Array.isArray(images) ? images.slice(0, 5) : [];
  const move = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    const next = [...gallery];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };
  const addUrl = () => {
    const value = url.trim();
    if (!value || gallery.length >= 5) return;
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    } catch {
      window.alert('Зөв http эсвэл https зураг URL оруулна уу.');
      return;
    }
    if (gallery.includes(value)) { setUrl(''); return; }
    onChange([...gallery, value]);
    setUrl('');
  };

  return <div className="za-gallery-manager">
    <div className="za-gallery-heading"><div><b>Зургийн дараалал</b><span>Автоматаар солигдоно</span></div><strong>{gallery.length}/5</strong></div>
    <div className="za-gallery-list">{gallery.map((image, index) => <article key={`${image}-${index}`}>
      <img src={image} alt={`Зураг ${index + 1}`} />
      <span>#{index + 1}</span>
      <div className="za-inline-actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Дээш"><ChevronUp size={14} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === gallery.length - 1} title="Доош"><ChevronDown size={14} /></button><button type="button" className="danger" onClick={() => onChange(gallery.filter((_, itemIndex) => itemIndex !== index))} disabled={gallery.length <= 1} title="Устгах"><Trash2 size={14} /></button></div>
    </article>)}</div>
    <label className="za-upload full" aria-disabled={uploading || gallery.length >= 5}>{uploading ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />}{uploading ? 'Зураг байршуулж байна' : 'Зураг нэмэх'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading || gallery.length >= 5} onChange={async event => { const input = event.currentTarget; await onUpload(input.files); input.value = ''; }} /></label>
    {gallery.length < 5 && <div className="za-gallery-url"><input value={url} onChange={event => setUrl(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }} placeholder="https://... зураг URL" /><button type="button" onClick={addUrl} disabled={!url.trim()} title="URL нэмэх"><Plus size={15} /></button></div>}
    {onSecondsChange && <Field label={`Солигдох хугацаа · ${Number(seconds || 5).toFixed(1)} секунд`}><input type="range" min="2" max="30" step="0.1" value={seconds || 5} onChange={event => onSecondsChange(Number(event.target.value))} /></Field>}
    <small>JPG, PNG, WEBP, GIF · зураг тус бүр 8MB хүртэл</small>
  </div>;
}

function FormManager({ cfg, changePath, applyConfig }) {
  const [addChoice, setAddChoice] = useState({});
  const entries = Object.values(FIELD_LIBRARY);

  const setField = (stepIndex, fieldIndex, key, value) => {
    const current = normalizeField(cfg.formFlow[stepIndex].fields[fieldIndex], fieldIndex);
    changePath(`formFlow.${stepIndex}.fields.${fieldIndex}`, { ...current, [key]: value });
  };
  const moveStep = (index, direction) => applyConfig(current => {
    const flow = [...current.formFlow];
    const next = index + direction;
    if (next < 0 || next >= flow.length) return current;
    [flow[index], flow[next]] = [flow[next], flow[index]];
    return { ...current, formFlow: flow };
  });
  const addField = stepIndex => {
    const id = addChoice[stepIndex] || 'custom';
    const field = id === 'custom'
      ? { id: `question-${Date.now()}`, label: 'Шинэ асуулт', placeholder: 'Хариултаа бичнэ үү', type: 'text', required: false }
      : { ...FIELD_LIBRARY[id] };
    changePath(`formFlow.${stepIndex}.fields`, [...(cfg.formFlow[stepIndex].fields || []), field]);
  };

  return <div className="za-form-manager">
    <div className="za-panel-heading"><div><h2>Хүсэлтийн бүтэц</h2></div><button type="button" className="za-primary" onClick={() => changePath('formFlow', [...cfg.formFlow, { id: `group-${Date.now()}`, title: 'Шинэ мэдээлэл', fields: [] }])}><Plus size={15} /> Бүлэг нэмэх</button></div>
    <div className="za-form-groups">{cfg.formFlow.map((step, stepIndex) => <section className="za-form-group" key={step.id || stepIndex}>
      <header><div><span>Бүлэг {stepIndex + 1}</span><input value={step.title || ''} onChange={event => changePath(`formFlow.${stepIndex}.title`, event.target.value)} /></div><div className="za-inline-actions"><button type="button" onClick={() => moveStep(stepIndex, -1)} disabled={stepIndex === 0} title="Дээш"><ChevronUp size={15} /></button><button type="button" onClick={() => moveStep(stepIndex, 1)} disabled={stepIndex === cfg.formFlow.length - 1} title="Доош"><ChevronDown size={15} /></button><button type="button" className="danger" onClick={() => changePath('formFlow', cfg.formFlow.filter((_, index) => index !== stepIndex))} title="Устгах"><Trash2 size={15} /></button></div></header>
      <div className="za-question-list">{(step.fields || []).map((rawField, fieldIndex) => {
        const field = normalizeField(rawField, fieldIndex);
        return <article key={`${field.id}-${fieldIndex}`}>
          <div className="za-question-main"><input value={field.label || ''} onChange={event => setField(stepIndex, fieldIndex, 'label', event.target.value)} placeholder="Асуултын нэр" /><input value={field.placeholder || ''} onChange={event => setField(stepIndex, fieldIndex, 'placeholder', event.target.value)} placeholder="Талбарын тайлбар" /></div>
          <select value={field.type || 'text'} onChange={event => setField(stepIndex, fieldIndex, 'type', event.target.value)}><option value="text">Богино текст</option><option value="tel">Утас</option><option value="email">И-мэйл</option><option value="number">Тоо</option><option value="textarea">Урт текст</option><option value="select">Сонголт</option><option value="file">Файл / зураг</option></select>
          {field.type === 'select' && field.id !== 'productType' && <input value={Array.isArray(field.options) ? field.options.join(', ') : field.options || ''} onChange={event => setField(stepIndex, fieldIndex, 'options', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} placeholder="Сонголтууд, таслалаар" />}
          <label className="za-check"><input type="checkbox" checked={Boolean(field.required)} onChange={event => setField(stepIndex, fieldIndex, 'required', event.target.checked)} /><span>Заавал</span></label>
          <button type="button" className="za-icon-danger" onClick={() => changePath(`formFlow.${stepIndex}.fields`, step.fields.filter((_, index) => index !== fieldIndex))} title="Асуулт устгах"><Trash2 size={15} /></button>
        </article>;
      })}</div>
      <footer><select value={addChoice[stepIndex] || 'custom'} onChange={event => setAddChoice(current => ({ ...current, [stepIndex]: event.target.value }))}><option value="custom">Шинэ custom асуулт</option>{entries.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select><button type="button" onClick={() => addField(stepIndex)}><Plus size={14} /> Асуулт нэмэх</button></footer>
    </section>)}</div>
  </div>;
}

function SettingsPanel({ cfg, changePath, uploadAsset, assetUploading, applyConfig, onAutoFitLogo, onResetLogo }) {
  const [logoMode, setLogoMode] = useState('mobile');
  return <div className="za-settings-page">
    <div className="za-settings-section"><div><h2>Лого ба байгууллага</h2></div><div className="za-settings-fields">
      <IconSegment value={logoMode} onChange={setLogoMode} options={[{ id: 'desktop', icon: Monitor, label: 'Desktop' }, { id: 'mobile', icon: Smartphone, label: 'Mobile' }]} />
      <LogoHeaderPreview cfg={cfg} mode={logoMode} />
      <div className="za-logo-setting"><label className="za-upload" aria-disabled={assetUploading === 'logoUrl'}>{assetUploading === 'logoUrl' ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />} Лого сонгох<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(assetUploading)} onChange={event => uploadAsset('logoUrl', event.target.files?.[0])} /></label>{cfg.logoUrl && <button type="button" className="za-text-danger" onClick={() => changePath('logoUrl', '')}>Арилгах</button>}</div>
      <LogoAppearanceControls cfg={cfg} mode={logoMode} changePath={changePath} onAutoFit={onAutoFitLogo} onReset={onResetLogo} />
      <Field label="Брэнд нэр"><input value={cfg.brandName} onChange={event => changePath('brandName', event.target.value)} /></Field>
      <Field label="Уриа"><input value={cfg.tagline} onChange={event => changePath('tagline', event.target.value)} /></Field>
    </div></div>
    <div className="za-settings-section"><div><h2>Холбоо барих</h2></div><div className="za-settings-fields two-col"><Field label="Утас"><input value={cfg.phone} onChange={event => changePath('phone', event.target.value)} /></Field><Field label="И-мэйл"><input value={cfg.email} onChange={event => changePath('email', event.target.value)} /></Field><Field label="Хаяг"><textarea rows={3} value={cfg.address} onChange={event => changePath('address', event.target.value)} /></Field></div></div>
    <div className="za-settings-section"><div><h2>Өнгөний систем</h2></div><div className="za-color-grid">{[['ink','Текст / dark'],['paper','Суурь'],['surface','Цагаан гадаргуу'],['accent','Онцлох өнгө'],['softBlue','Зөөлөн цэнхэр'],['softRose','Зөөлөн ягаан']].map(([key, label]) => <Field key={key} label={label}><div className="za-color-input"><input type="color" value={cfg.theme[key]} onChange={event => changePath(`theme.${key}`, event.target.value)} /><input value={cfg.theme[key]} onChange={event => changePath(`theme.${key}`, event.target.value)} /></div></Field>)}</div></div>
    <div className="za-settings-section"><div><h2>Байрлал сэргээх</h2></div><button type="button" className="za-secondary" onClick={() => {
      if (!window.confirm('Layout-ийн байрлал, хэмжээ, текстийн custom style-ийг reset хийх үү?')) return;
      applyConfig(current => ({ ...current, sectionOrder: [...DEFAULT_SECTION_ORDER.slice(0, -1), ...current.customSections.map(section => section.id), 'apply'], sectionStyles: { ...DEFAULT_SECTION_STYLES }, elementStyles: {} }));
    }}><RotateCcw size={15} /> Байрлал сэргээх</button></div>
  </div>;
}

function SeoPanel({ cfg, changePath, uploadAsset, assetUploading }) {
  const favicon = cfg.faviconUrl || '/favicon.svg';
  const seo = cfg.seo;
  return <div className="za-settings-page za-seo-page">
    <div className="za-settings-section"><div><h2>Browser icon</h2><p>Browser tab болон Google хайлтын үр дүнд харагдах квадрат тэмдэг.</p></div><div className="za-settings-fields">
      <div className="za-browser-preview"><img src={favicon} alt="" /><span>{seo.title}</span><i>×</i></div>
      <div className="za-logo-setting"><label className="za-upload" aria-disabled={assetUploading === 'faviconUrl'}>{assetUploading === 'faviconUrl' ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />} Icon оруулах<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(assetUploading)} onChange={event => uploadAsset('faviconUrl', event.target.files?.[0], { square: true })} /></label>{cfg.faviconUrl && <button type="button" className="za-text-danger" onClick={() => changePath('faviconUrl', '')}>Default Z icon ашиглах</button>}</div>
      <small className="za-field-note">PNG эсвэл WEBP, 1:1 харьцаатай, 48×48-аас том зураг сонгоно.</small>
    </div></div>

    <div className="za-settings-section"><div><h2>Google харагдац</h2><p>Хайлтын үр дүнд харагдах нэр болон товч тайлбар.</p></div><div className="za-settings-fields">
      <div className="za-search-preview"><span>{seo.siteName}</span><small>https://zentrocapitalgroup.com</small><b>{seo.title}</b><p>{seo.description}</p></div>
      <Field label={`Site нэр · ${String(seo.siteName || '').length}/40`}><input value={seo.siteName} maxLength={40} onChange={event => changePath('seo.siteName', event.target.value)} /></Field>
      <Field label={`Page title · ${String(seo.title || '').length}/65`} hint="Нэг гарчигт ижил үгийг олон давтахгүй."><input value={seo.title} maxLength={65} onChange={event => changePath('seo.title', event.target.value)} /></Field>
      <Field label={`Meta description · ${String(seo.description || '').length}/170`}><textarea rows={4} value={seo.description} maxLength={170} onChange={event => changePath('seo.description', event.target.value)} /></Field>
      <Field label="Монгол, Англи хайлтын хэллэг" hint="Таслалаар тусгаарлана. Үндсэн үйлчилгээтэй бодитоор холбоотой үг хэрэглэнэ."><textarea rows={4} value={seo.keywords} onChange={event => changePath('seo.keywords', event.target.value)} /></Field>
      <Field label="Canonical URL"><input type="url" value={seo.canonicalUrl} onChange={event => changePath('seo.canonicalUrl', event.target.value)} /></Field>
    </div></div>

    <div className="za-settings-section"><div><h2>Social preview</h2><p>Facebook, Messenger болон бусад сувагт веб линк хуваалцах үеийн мэдээлэл.</p></div><div className="za-settings-fields">
      {seo.socialImageUrl && <div className="za-social-image-preview"><img src={seo.socialImageUrl} alt="Social preview" /></div>}
      <div className="za-logo-setting"><label className="za-upload" aria-disabled={assetUploading === 'seo.socialImageUrl'}>{assetUploading === 'seo.socialImageUrl' ? <LoaderCircle className="animate-spin" size={15} /> : <ImagePlus size={15} />} Preview зураг<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(assetUploading)} onChange={event => uploadAsset('seo.socialImageUrl', event.target.files?.[0])} /></label>{seo.socialImageUrl && <button type="button" className="za-text-danger" onClick={() => changePath('seo.socialImageUrl', '')}>Арилгах</button>}</div>
      <Field label="Social title"><input value={seo.socialTitle} onChange={event => changePath('seo.socialTitle', event.target.value)} /></Field>
      <Field label="Social description"><textarea rows={3} value={seo.socialDescription} onChange={event => changePath('seo.socialDescription', event.target.value)} /></Field>
    </div></div>
  </div>;
}

export default function WebAdmin() {
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState('page');
  const [viewport, setViewport] = useState('desktop');
  const [selection, setSelection] = useState({ kind: 'section', id: 'hero', label: 'Нүүр хэсэг' });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState('');
  const [assetUploading, setAssetUploading] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const cfgRef = useRef(null);
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  useEffect(() => {
    getAdminWebConfig().then(data => {
      const normalized = normalizeSiteConfig(data);
      cfgRef.current = normalized;
      setCfg(normalized);
    });
  }, []);

  const applyConfig = useCallback((recipe, record = true) => {
    setCfg(current => {
      const next = normalizeSiteConfig(typeof recipe === 'function' ? recipe(current) : recipe);
      if (next === current) return current;
      if (record) {
        pastRef.current = [...pastRef.current.slice(-49), snapshot(current)];
        futureRef.current = [];
        setHistoryVersion(value => value + 1);
      }
      cfgRef.current = next;
      setDirty(true);
      setSaved(false);
      return next;
    });
  }, []);

  const changePath = useCallback((path, value) => {
    if (path?.kind === 'elementStyle') {
      applyConfig(current => ({ ...current, elementStyles: { ...current.elementStyles, [path.path]: { ...(current.elementStyles?.[path.path] || {}), ...value } } }));
      return;
    }
    applyConfig(current => setAtPath(current, path, value));
  }, [applyConfig]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous || !cfgRef.current) return;
    futureRef.current = [snapshot(cfgRef.current), ...futureRef.current.slice(0, 49)];
    cfgRef.current = previous;
    setCfg(previous);
    setDirty(true);
    setSaved(false);
    setHistoryVersion(value => value + 1);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.shift();
    if (!next || !cfgRef.current) return;
    pastRef.current = [...pastRef.current.slice(-49), snapshot(cfgRef.current)];
    cfgRef.current = next;
    setCfg(next);
    setDirty(true);
    setSaved(false);
    setHistoryVersion(value => value + 1);
  }, []);

  const save = useCallback(async () => {
    document.activeElement?.blur();
    await new Promise(resolve => window.setTimeout(resolve, 0));
    setSaving(true);
    try {
      const updated = normalizeSiteConfig(await updateAdminWebConfig(cfgRef.current));
      cfgRef.current = updated;
      setCfg(updated);
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    const handleKeys = event => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [redo, save, undo]);

  const moveSection = (sourceId, targetId) => applyConfig(current => {
    const order = current.sectionOrder.filter(id => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    order.splice(targetIndex < 0 ? order.length : targetIndex, 0, sourceId);
    return { ...current, sectionOrder: order };
  });

  const addSection = type => applyConfig(current => {
    const id = `custom-${Date.now()}`;
    const customSections = [...current.customSections, { id, ...CUSTOM_SECTION_PRESETS[type] }];
    const sectionOrder = [...current.sectionOrder];
    const applyIndex = sectionOrder.indexOf('apply');
    sectionOrder.splice(applyIndex < 0 ? sectionOrder.length : applyIndex, 0, id);
    window.setTimeout(() => setSelection({ kind: 'section', id, label: CUSTOM_SECTION_PRESETS[type].title }), 0);
    return { ...current, customSections, sectionOrder, sectionStyles: { ...current.sectionStyles, [id]: { minHeight: type === 'media' ? 520 : 360, background: type === 'statement' ? current.theme.accent : current.theme.surface } } };
  });

  const removeCustomSection = id => applyConfig(current => ({ ...current, customSections: current.customSections.filter(section => section.id !== id), sectionOrder: current.sectionOrder.filter(sectionId => sectionId !== id), sectionStyles: Object.fromEntries(Object.entries(current.sectionStyles).filter(([key]) => key !== id)) }));

  const uploadAsset = async (path, file, { square = false } = {}) => {
    if (!file) return;
    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!supported.includes(file.type)) { window.alert('JPG, PNG, WEBP эсвэл GIF зураг сонгоно уу.'); return; }
    if (file.size > 8 * 1024 * 1024) { window.alert('Зураг 8MB-аас бага байх хэрэгтэй.'); return; }
    if (square) {
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = await loadLogoImage(objectUrl);
        const ratio = image.naturalWidth / image.naturalHeight;
        if (Math.abs(1 - ratio) > .04 || image.naturalWidth < 48 || image.naturalHeight < 48) {
          window.alert('Icon 1:1 квадрат харьцаатай, хамгийн багадаа 48×48 хэмжээтэй байна.');
          return;
        }
      } catch {
        window.alert('Icon файлыг уншиж чадсангүй. Өөр JPG, PNG, WEBP эсвэл GIF зураг сонгоно уу.');
        return;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
    setAssetUploading(path);
    try {
      const result = await uploadAdminWebImages([file]);
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) throw new Error('Upload URL ирсэнгүй.');
      changePath(path, imageUrl);
    } catch (error) {
      window.alert(error.response?.data?.message || error.message || 'Зураг upload хийхэд алдаа гарлаа.');
    } finally {
      setAssetUploading('');
    }
  };

  const updateLogoAppearance = (mode, values) => applyConfig(current => {
    const fields = LOGO_APPEARANCE[mode] || LOGO_APPEARANCE.desktop;
    return {
      ...current,
      theme: {
        ...current.theme,
        [fields.width]: values.width ?? current.theme[fields.width],
        [fields.height]: values.height ?? current.theme[fields.height],
        [fields.zoom]: values.zoom ?? current.theme[fields.zoom],
        [fields.x]: values.x ?? current.theme[fields.x],
        [fields.y]: values.y ?? current.theme[fields.y],
      },
    };
  });

  const resetLogoAppearance = mode => {
    const fields = LOGO_APPEARANCE[mode] || LOGO_APPEARANCE.desktop;
    updateLogoAppearance(mode, fields.defaults);
  };

  const autoFitLogo = async mode => {
    try {
      const current = cfgRef.current;
      if (!current?.logoUrl) return;
      const appearance = getLogoAppearance(current, mode);
      const fit = await calculateLogoFit(current.logoUrl, appearance.width, appearance.height);
      updateLogoAppearance(mode, fit);
    } catch (error) {
      window.alert(error.message || 'Лого автоматаар тааруулахад алдаа гарлаа.');
    }
  };

  const setGalleryImages = (legacyPath, galleryPath, values) => applyConfig(current => {
    const images = [...new Set((Array.isArray(values) ? values : [])
      .map(value => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean))]
      .slice(0, 5);
    if (!images.length) return current;
    return setAtPath(setAtPath(current, galleryPath, images), legacyPath, images[0]);
  });

  const uploadGalleryImages = async (legacyPath, galleryPath, files) => {
    const currentImages = getAtPath(cfgRef.current, galleryPath) || [];
    const remaining = Math.max(0, 5 - currentImages.length);
    if (!remaining) return;
    const selected = Array.from(files || []);
    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (selected.some(file => !supported.includes(file.type))) {
      window.alert('JPG, PNG, WEBP эсвэл GIF зураг сонгоно уу.');
      return;
    }
    if (selected.some(file => file.size > 8 * 1024 * 1024)) {
      window.alert('Зураг тус бүр 8MB-аас бага байх хэрэгтэй.');
      return;
    }
    const accepted = selected.slice(0, remaining);
    if (!accepted.length) return;
    if (selected.length > remaining) window.alert(`Энэ хэсэгт ${remaining} зураг нэмэх боломжтой. Эхний ${remaining} зургийг оруулна.`);
    setUploadingGallery(galleryPath);
    try {
      const result = await uploadAdminWebImages(accepted);
      const uploaded = (result.images || []).map(image => image.url).filter(Boolean);
      applyConfig(current => {
        const existing = getAtPath(current, galleryPath) || [];
        const images = [...new Set([...existing, ...uploaded])].slice(0, 5);
        return setAtPath(setAtPath(current, galleryPath, images), legacyPath, images[0]);
      });
    } catch (error) {
      window.alert(error.response?.data?.message || 'Зураг upload хийхэд алдаа гарлаа.');
    } finally {
      setUploadingGallery('');
    }
  };

  const setElementStyle = (key, value) => applyConfig(current => ({
    ...current,
    elementStyles: {
      ...current.elementStyles,
      [selection.path]: { ...(current.elementStyles?.[selection.path] || {}), [key]: value },
    },
  }));

  if (!cfg) return <div className="za-loading"><LoaderCircle className="animate-spin" size={20} /> Веб засварлагчийг нээж байна...</div>;

  const selectedText = selection?.path ? getAtPath(cfg, selection.path) : '';
  const selectedGalleryPath = selection?.kind === 'image' ? galleryPathForImage(selection.path) : '';
  const selectedGallery = selectedGalleryPath ? getAtPath(cfg, selectedGalleryPath) || [] : [];
  const selectedGallerySeconds = selection?.intervalPath ? getAtPath(cfg, selection.intervalPath) : null;
  const selectedStyle = selection?.path ? cfg.elementStyles?.[selection.path] || {} : {};
  const selectedSection = selection?.kind === 'section' ? cfg.sectionStyles?.[selection.id] || {} : null;
  const selectedProduct = selection?.kind === 'product' ? cfg.products[selection.index] : null;
  const selectedFormField = selection?.kind === 'formField'
    ? normalizeField(cfg.formFlow[selection.stepIndex]?.fields?.[selection.fieldIndex], selection.fieldIndex)
    : null;

  const inspector = () => {
    if (selection?.kind === 'text') return <>
      <div className="za-inspector-title"><Type size={17} /><div><b>Текст</b><span>{selection.label}</span></div></div>
      <Field label="Агуулга"><textarea rows={5} value={selectedText || ''} onChange={event => changePath(selection.path, event.target.value)} /></Field>
      <div className="za-control-row"><Field label="Үсгийн хэмжээ"><input type="number" min="10" max="120" value={selectedStyle.fontSize || ''} placeholder="Auto" onChange={event => setElementStyle('fontSize', Number(event.target.value) || '')} /></Field><Field label="Жин"><select value={selectedStyle.fontWeight || ''} onChange={event => setElementStyle('fontWeight', event.target.value)}><option value="">Auto</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></Field></div>
      <div className="za-control-row"><Field label="Өргөн"><input type="number" min="80" max="1400" value={selectedStyle.maxWidth || ''} placeholder="Auto" onChange={event => setElementStyle('maxWidth', Number(event.target.value) || '')} /></Field><Field label="X / Y"><div className="za-offset-inputs"><input type="number" value={selectedStyle.translateX || 0} onChange={event => setElementStyle('translateX', Number(event.target.value) || 0)} /><input type="number" value={selectedStyle.translateY || 0} onChange={event => setElementStyle('translateY', Number(event.target.value) || 0)} /></div></Field></div>
      <Field label="Зэрэгцүүлэлт"><IconSegment value={selectedStyle.textAlign || 'left'} onChange={value => setElementStyle('textAlign', value)} options={[{ id: 'left', icon: AlignLeft, label: 'Зүүн' }, { id: 'center', icon: AlignCenter, label: 'Төв' }, { id: 'right', icon: AlignRight, label: 'Баруун' }]} /></Field>
      <Field label="Текстийн өнгө"><div className="za-color-input"><input type="color" value={selectedStyle.color || cfg.theme.ink} onChange={event => setElementStyle('color', event.target.value)} /><input value={selectedStyle.color || ''} placeholder="Default" onChange={event => setElementStyle('color', event.target.value)} /></div></Field>
      <button type="button" className="za-secondary full" onClick={() => applyConfig(current => ({ ...current, elementStyles: Object.fromEntries(Object.entries(current.elementStyles).filter(([key]) => key !== selection.path)) }))}><RotateCcw size={14} /> Текстийн загвар сэргээх</button>
    </>;

    if (selection?.kind === 'image' && selectedGalleryPath) return <>
      <div className="za-inspector-title"><ImageIcon size={17} /><div><b>{selection.label || 'Зургууд'}</b><span>5 хүртэл зураг</span></div></div>
      <GalleryManager images={selectedGallery} seconds={selectedGallerySeconds} uploading={uploadingGallery === selectedGalleryPath} onUpload={files => uploadGalleryImages(selection.path, selectedGalleryPath, files)} onChange={images => setGalleryImages(selection.path, selectedGalleryPath, images)} onSecondsChange={selection.intervalPath ? seconds => changePath(selection.intervalPath, seconds) : null} />
      {selection.path === 'heroImage' && <><Field label="Зургийн байрлал"><select value={cfg.theme.heroPosition} onChange={event => changePath('theme.heroPosition', event.target.value)}><option value="center">Төв</option><option value="left center">Зүүн</option><option value="right center">Баруун</option><option value="center top">Дээд</option><option value="center bottom">Доод</option></select></Field><Field label={`Dark overlay · ${cfg.theme.heroOverlay}%`}><input type="range" min="20" max="90" value={cfg.theme.heroOverlay} onChange={event => changePath('theme.heroOverlay', Number(event.target.value))} /></Field></>}
    </>;

    if (selection?.kind === 'image' && selection.path === 'logoUrl') {
      const logoMode = viewport === 'mobile' ? 'mobile' : 'desktop';
      return <>
        <div className="za-inspector-title"><ImageIcon size={17} /><div><b>Лого</b><span>{logoMode === 'mobile' ? 'Mobile харагдац' : 'Desktop харагдац'}</span></div></div>
        <LogoHeaderPreview cfg={cfg} mode={logoMode} compact />
        <label className="za-upload full" aria-disabled={assetUploading === 'logoUrl'}>{assetUploading === 'logoUrl' ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />} {assetUploading === 'logoUrl' ? 'Лого байршуулж байна' : 'Лого солих'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(assetUploading)} onChange={event => uploadAsset('logoUrl', event.target.files?.[0])} /></label>
        <LogoAppearanceControls cfg={cfg} mode={logoMode} changePath={changePath} onAutoFit={autoFitLogo} onReset={resetLogoAppearance} />
        <Field label="Лого URL"><textarea rows={3} value={selectedText || ''} onChange={event => changePath('logoUrl', event.target.value)} /></Field>
      </>;
    }

    if (selection?.kind === 'image') return <>
      <div className="za-inspector-title"><ImageIcon size={17} /><div><b>{selection.label || 'Зураг'}</b><span>Зураг солих</span></div></div>
      <div className="za-image-preview">{selectedText ? <img src={selectedText} alt="Preview" /> : <ImagePlus size={24} />}</div>
      <label className="za-upload full" aria-disabled={assetUploading === selection.path}>{assetUploading === selection.path ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />} {assetUploading === selection.path ? 'Зураг байршуулж байна' : 'Файлаас сонгох'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(assetUploading)} onChange={event => uploadAsset(selection.path, event.target.files?.[0])} /></label>
      <Field label="Зураг URL"><textarea rows={3} value={selectedText || ''} onChange={event => changePath(selection.path, event.target.value)} /></Field>
    </>;

    if (selection?.kind === 'section') {
      const custom = cfg.customSections.find(section => section.id === selection.id);
      return <>
        <div className="za-inspector-title"><LayoutTemplate size={17} /><div><b>{selection.label || SECTION_LABELS[selection.id]}</b><span>Хэсгийн layout</span></div></div>
        <Field label={`Өндөр · ${selectedSection?.minHeight || 'auto'} px`}><input type="range" min="140" max="1000" step="10" value={selectedSection?.minHeight || 360} onChange={event => changePath(`sectionStyles.${selection.id}.minHeight`, Number(event.target.value))} /></Field>
        <Field label="Суурь өнгө"><div className="za-color-input"><input type="color" value={selectedSection?.background || cfg.theme.surface} onChange={event => changePath(`sectionStyles.${selection.id}.background`, event.target.value)} /><input value={selectedSection?.background || ''} placeholder="Үндсэн" onChange={event => changePath(`sectionStyles.${selection.id}.background`, event.target.value)} /></div></Field>
        {custom && <><Field label="Хэсгийн төрөл"><select value={custom.type} onChange={event => changePath(`customSections.${cfg.customSections.indexOf(custom)}.type`, event.target.value)}><option value="editorial">Текст</option><option value="statement">Том өгүүлбэр</option><option value="media">Зураг + гарчиг</option></select></Field><button type="button" className="za-danger full" onClick={() => removeCustomSection(custom.id)}><Trash2 size={14} /> Энэ хэсгийг устгах</button></>}
      </>;
    }

    if (selectedProduct) return <>
      <div className="za-inspector-title"><LayoutTemplate size={17} /><div><b>Бүтээгдэхүүн {selection.index + 1}</b><span>{selectedProduct.name}</span></div></div>
      <Field label="Нэр"><input value={selectedProduct.name || ''} onChange={event => changePath(`products.${selection.index}.name`, event.target.value)} /></Field>
      <Field label="Урсах гарчиг"><textarea rows={3} value={selectedProduct.flowTitle || ''} onChange={event => changePath(`products.${selection.index}.flowTitle`, event.target.value)} /></Field>
      <Field label="Тайлбар"><textarea rows={4} value={selectedProduct.description || ''} onChange={event => changePath(`products.${selection.index}.description`, event.target.value)} /></Field>
      <div className="za-control-row"><Field label="Хүү"><input value={selectedProduct.rate || ''} onChange={event => changePath(`products.${selection.index}.rate`, event.target.value)} /></Field><Field label="Хугацаа"><input value={selectedProduct.term || ''} onChange={event => changePath(`products.${selection.index}.term`, event.target.value)} /></Field></div>
      <Field label="Зээлийн хэмжээ"><input value={selectedProduct.amount || ''} onChange={event => changePath(`products.${selection.index}.amount`, event.target.value)} /></Field>
      <Field label="Тавигдах шаардлага · мөр бүрээр"><textarea rows={5} value={selectedProduct.requirements || ''} onChange={event => changePath(`products.${selection.index}.requirements`, event.target.value)} placeholder="Нэг шаардлагыг нэг мөрөнд бичнэ" /></Field>
      <GalleryManager images={selectedProduct.images} seconds={selectedProduct.gallerySeconds} uploading={uploadingGallery === `products.${selection.index}.images`} onUpload={files => uploadGalleryImages(`products.${selection.index}.image`, `products.${selection.index}.images`, files)} onChange={images => setGalleryImages(`products.${selection.index}.image`, `products.${selection.index}.images`, images)} onSecondsChange={seconds => changePath(`products.${selection.index}.gallerySeconds`, seconds)} />
      <button type="button" className="za-danger full" disabled={cfg.products.length <= 1} onClick={() => applyConfig(current => ({ ...current, products: current.products.filter((_, index) => index !== selection.index) }))}><Trash2 size={14} /> Бүтээгдэхүүн устгах</button>
    </>;

    if (selectedFormField) return <>
      <div className="za-inspector-title"><FileQuestion size={17} /><div><b>Формын талбар</b><span>{selectedFormField.label}</span></div></div>
      <Field label="Асуултын нэр"><input value={selectedFormField.label || ''} onChange={event => changePath(selection.path, { ...selectedFormField, label: event.target.value })} /></Field>
      <Field label="Талбарын тайлбар"><input value={selectedFormField.placeholder || ''} onChange={event => changePath(selection.path, { ...selectedFormField, placeholder: event.target.value })} /></Field>
      <Field label="Төрөл"><select value={selectedFormField.type || 'text'} onChange={event => changePath(selection.path, { ...selectedFormField, type: event.target.value })}><option value="text">Богино текст</option><option value="number">Тоо</option><option value="textarea">Урт текст</option><option value="select">Сонголт</option><option value="file">Файл</option></select></Field>
      <label className="za-switch"><input type="checkbox" checked={Boolean(selectedFormField.required)} onChange={event => changePath(selection.path, { ...selectedFormField, required: event.target.checked })} /><span /> Заавал бөглөх</label>
    </>;

    return <div className="za-inspector-empty"><Eye size={20} /><b>Элемент сонгоно уу</b></div>;
  };

  return <div className="za-editor-page">
    <header className="za-editor-header"><div><span>Website studio</span><h1>Веб засварлагч</h1></div><div className="za-editor-actions"><button type="button" className="za-icon-button" onClick={undo} disabled={!pastRef.current.length} title="Буцаах"><Undo2 size={16} /></button><button type="button" className="za-icon-button" onClick={redo} disabled={!futureRef.current.length} title="Дахин хийх"><Redo2 size={16} /></button><a className="za-secondary" href="/" target="_blank" rel="noreferrer"><Eye size={15} /> Live харах</a><button type="button" className="za-primary" onClick={save} disabled={saving || !dirty}>{saving ? <LoaderCircle className="animate-spin" size={15} /> : saved ? <Check size={15} /> : <Save size={15} />}{saving ? 'Хадгалж байна' : saved ? 'Хадгалсан' : dirty ? 'Live хадгалах' : 'Өөрчлөлтгүй'}</button></div></header>

    <nav className="za-editor-tabs">{PANEL_TABS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</nav>

    {tab === 'page' && <div className="za-studio">
      <aside className="za-block-rail"><div><b>Хэсгүүд</b></div><div className="za-section-list">{cfg.sectionOrder.map(id => {
        const custom = cfg.customSections.find(section => section.id === id);
        return <button type="button" key={id} className={selection?.kind === 'section' && selection.id === id ? 'active' : ''} onClick={() => { setSelection({ kind: 'section', id, label: custom?.title || SECTION_LABELS[id] || 'Нэмэлт хэсэг' }); document.querySelector(`.za-preview-frame [data-edit-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><span>{custom?.title || SECTION_LABELS[id] || 'Нэмэлт хэсэг'}</span></button>;
      })}</div><div className="za-add-block"><b>Хэсэг нэмэх</b><button type="button" onClick={() => addSection('editorial')}><Type size={15} /> Текст хэсэг</button><button type="button" onClick={() => addSection('statement')}><LayoutTemplate size={15} /> Том өгүүлбэр</button><button type="button" onClick={() => addSection('media')}><ImagePlus size={15} /> Зурагт хэсэг</button><button type="button" onClick={() => applyConfig(current => ({ ...current, products: [...current.products, { name: 'Шинэ зээлийн бүтээгдэхүүн', flowTitle: 'Шинэ боломжоо нээ', rate: 'Нөхцөл оруулах', term: 'Хугацаа оруулах', amount: 'Дүн оруулах', description: 'Бүтээгдэхүүний тайлбар', requirements: '18 нас хүрсэн Монгол Улсын иргэн байх\nШаардлагатай баримт бичгийг бүрдүүлэх', image: current.heroImage, images: [current.heroImage], gallerySeconds: 4.8 }] }))}><Plus size={15} /> Бүтээгдэхүүн</button></div></aside>

      <section className="za-preview-area"><div className="za-preview-toolbar"><div><span className={dirty ? 'is-dirty' : ''}>{dirty ? 'Хадгалаагүй өөрчлөлт' : 'Live-тэй ижил'}</span></div><IconSegment value={viewport} onChange={setViewport} options={[{ id: 'desktop', icon: Monitor, label: 'Desktop' }, { id: 'tablet', icon: Laptop, label: 'Tablet' }, { id: 'mobile', icon: Smartphone, label: 'Mobile' }]} /></div><div className={`za-preview-frame ${viewport}`}><SitePage rawConfig={cfg} editor viewport={viewport} selection={selection} onSelect={setSelection} onChange={changePath} onMoveSection={moveSection} /></div></section>

      <aside className="za-inspector"><div className="za-inspector-head"><span>Тохиргоо</span><b>Сонгосон элемент</b></div><div className="za-inspector-body">{inspector()}</div></aside>
    </div>}

    {tab === 'form' && <FormManager cfg={cfg} changePath={changePath} applyConfig={applyConfig} />}
    {tab === 'settings' && <SettingsPanel cfg={cfg} changePath={changePath} uploadAsset={uploadAsset} assetUploading={assetUploading} applyConfig={applyConfig} onAutoFitLogo={autoFitLogo} onResetLogo={resetLogoAppearance} />}
    {tab === 'seo' && <SeoPanel cfg={cfg} changePath={changePath} uploadAsset={uploadAsset} assetUploading={assetUploading} />}
    <span className="sr-only">{historyVersion}</span>
  </div>;
}
