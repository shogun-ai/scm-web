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
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Upload,
} from 'lucide-react';
import { getAdminWebConfig, updateAdminWebConfig } from '../api';
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_STYLES,
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
];

const CUSTOM_SECTION_PRESETS = {
  editorial: { type: 'editorial', kicker: 'Онцлох мэдээлэл', title: 'Шинэ мэдээллийн хэсэг', body: 'Шинэ хэсгийн тайлбар текст.' },
  statement: { type: 'statement', kicker: 'Zentro Prime Capital', title: 'Том хэмжээний онцлох өгүүлбэр', body: '' },
  media: { type: 'media', kicker: 'Онцлох мэдээлэл', title: 'Зурагт хэсгийн гарчиг', body: '', image: '' },
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

function SettingsPanel({ cfg, changePath, uploadImage, applyConfig }) {
  return <div className="za-settings-page">
    <div className="za-settings-section"><div><h2>Лого ба байгууллага</h2></div><div className="za-settings-fields">
      <div className="za-logo-setting"><div className="za-logo-preview">{cfg.logoUrl ? <img src={cfg.logoUrl} alt="Logo" /> : <b>Zentro</b>}</div><label className="za-upload"><Upload size={15} /> Лого сонгох<input type="file" accept="image/*,.svg" onChange={event => uploadImage('logoUrl', event.target.files?.[0])} /></label>{cfg.logoUrl && <button type="button" className="za-text-danger" onClick={() => changePath('logoUrl', '')}>Арилгах</button>}</div>
      <Field label={`Логоны өндөр · ${cfg.theme.logoHeight || 52}px`}><input type="range" min="24" max="60" value={cfg.theme.logoHeight || 52} onChange={event => changePath('theme.logoHeight', Number(event.target.value))} /></Field>
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

export default function WebAdmin() {
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState('page');
  const [viewport, setViewport] = useState('desktop');
  const [selection, setSelection] = useState({ kind: 'section', id: 'hero', label: 'Нүүр хэсэг' });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const uploadImage = (path, file) => {
    if (!file) return;
    if (file.size > 1800000) { alert('Зураг 1.8MB-аас бага байх хэрэгтэй.'); return; }
    const reader = new FileReader();
    reader.onload = () => changePath(path, reader.result);
    reader.readAsDataURL(file);
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

    if (selection?.kind === 'image') return <>
      <div className="za-inspector-title"><ImageIcon size={17} /><div><b>{selection.label || 'Зураг'}</b><span>Зураг солих</span></div></div>
      <div className="za-image-preview">{selectedText ? <img src={selectedText} alt="Preview" /> : <ImagePlus size={24} />}</div>
      <label className="za-upload full"><Upload size={15} /> Файлаас сонгох<input type="file" accept="image/*,.svg" onChange={event => uploadImage(selection.path, event.target.files?.[0])} /></label>
      <Field label="Зураг URL"><textarea rows={3} value={selectedText || ''} onChange={event => changePath(selection.path, event.target.value)} /></Field>
      {selection.path === 'heroImage' && <><Field label="Зургийн байрлал"><select value={cfg.theme.heroPosition} onChange={event => changePath('theme.heroPosition', event.target.value)}><option value="center">Төв</option><option value="left center">Зүүн</option><option value="right center">Баруун</option><option value="center top">Дээд</option><option value="center bottom">Доод</option></select></Field><Field label={`Dark overlay · ${cfg.theme.heroOverlay}%`}><input type="range" min="20" max="90" value={cfg.theme.heroOverlay} onChange={event => changePath('theme.heroOverlay', Number(event.target.value))} /></Field></>}
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
      <label className="za-upload full"><Upload size={15} /> Бүтээгдэхүүний зураг<input type="file" accept="image/*" onChange={event => uploadImage(`products.${selection.index}.image`, event.target.files?.[0])} /></label>
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
      })}</div><div className="za-add-block"><b>Хэсэг нэмэх</b><button type="button" onClick={() => addSection('editorial')}><Type size={15} /> Текст хэсэг</button><button type="button" onClick={() => addSection('statement')}><LayoutTemplate size={15} /> Том өгүүлбэр</button><button type="button" onClick={() => addSection('media')}><ImagePlus size={15} /> Зурагт хэсэг</button><button type="button" onClick={() => applyConfig(current => ({ ...current, products: [...current.products, { name: 'Шинэ зээлийн бүтээгдэхүүн', flowTitle: 'Шинэ боломжоо нээ', rate: 'Нөхцөл оруулах', term: 'Хугацаа оруулах', amount: 'Дүн оруулах', description: 'Бүтээгдэхүүний тайлбар', image: current.heroImage }] }))}><Plus size={15} /> Бүтээгдэхүүн</button></div></aside>

      <section className="za-preview-area"><div className="za-preview-toolbar"><div><span className={dirty ? 'is-dirty' : ''}>{dirty ? 'Хадгалаагүй өөрчлөлт' : 'Live-тэй ижил'}</span></div><IconSegment value={viewport} onChange={setViewport} options={[{ id: 'desktop', icon: Monitor, label: 'Desktop' }, { id: 'tablet', icon: Laptop, label: 'Tablet' }, { id: 'mobile', icon: Smartphone, label: 'Mobile' }]} /></div><div className={`za-preview-frame ${viewport}`}><SitePage rawConfig={cfg} editor viewport={viewport} selection={selection} onSelect={setSelection} onChange={changePath} onMoveSection={moveSection} /></div></section>

      <aside className="za-inspector"><div className="za-inspector-head"><span>Тохиргоо</span><b>Сонгосон элемент</b></div><div className="za-inspector-body">{inspector()}</div></aside>
    </div>}

    {tab === 'form' && <FormManager cfg={cfg} changePath={changePath} applyConfig={applyConfig} />}
    {tab === 'settings' && <SettingsPanel cfg={cfg} changePath={changePath} uploadImage={uploadImage} applyConfig={applyConfig} />}
    <span className="sr-only">{historyVersion}</span>
  </div>;
}
