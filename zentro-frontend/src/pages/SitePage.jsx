import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CarFront,
  Check,
  ChevronRight,
  Gem,
  GripVertical,
  Image as ImageIcon,
  KeyRound,
  Menu,
  Move,
  Phone,
  Scaling,
  ShieldCheck,
  X,
} from 'lucide-react';
import { normalizeField, normalizeGallerySeconds, normalizeSiteConfig } from '../siteDefaults';

const SECTION_LABELS = {
  hero: 'Нүүр хэсэг',
  trust: 'Онцлох давуу тал',
  products: 'Зээлийн бүтээгдэхүүн',
  flow: 'Урсах мэдээлэл',
  process: 'Үйлчилгээний алхам',
  apply: 'Хүсэлтийн форм',
};

const PRODUCT_ICONS = [CarFront, CarFront, Gem, ShieldCheck];
const CORE_FIELDS = ['name', 'phone', 'register', 'email', 'productType', 'amount', 'termMonths', 'collateral', 'notes'];
const MONGOLIAN_NAME_PATTERN = '[А-Яа-яЁёӨөҮү]+(?:(?: |-)[А-Яа-яЁёӨөҮү]+)*';
const MONGOLIAN_REGISTER_PATTERN = '[А-ЯЁӨҮ]{2}[0-9]{8}';

function digitsOnly(value, limit) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return typeof limit === 'number' ? digits.slice(0, limit) : digits;
}

function integerDigits(value) {
  return digitsOnly(value).replace(/^0+(?=[0-9])/, '');
}

function formatIntegerInput(value) {
  const digits = integerDigits(value);
  return digits.replace(/\B(?=([0-9]{3})+(?![0-9]))/g, ',');
}

function mongolianNameOnly(value) {
  return String(value ?? '')
    .replace(/[^А-Яа-яЁёӨөҮү\s-]/g, '')
    .replace(/^[\s-]+/, '')
    .replace(/\s{2,}/g, ' ');
}

function formatRegisterInput(value) {
  const source = String(value ?? '').toUpperCase();
  const letters = (source.match(/[А-ЯЁӨҮ]/g) || []).join('').slice(0, 2);
  const numbers = letters.length === 2 ? digitsOnly(source, 8) : '';
  return `${letters}${numbers}`;
}

function styleFor(config, path) {
  const value = config.elementStyles?.[path] || {};
  return {
    ...(value.fontSize ? { fontSize: `${value.fontSize}px` } : {}),
    ...(value.fontWeight ? { fontWeight: value.fontWeight } : {}),
    ...(value.color ? { color: value.color } : {}),
    ...(value.textAlign ? { textAlign: value.textAlign } : {}),
    ...(value.maxWidth ? { maxWidth: `${value.maxWidth}px` } : {}),
    ...((value.translateX || value.translateY) ? { left: `${value.translateX || 0}px`, top: `${value.translateY || 0}px` } : {}),
  };
}

function EditableText({ as: Tag = 'div', path, value, config, editor, selection, onSelect, onChange, className = '' }) {
  const selected = editor && selection?.kind === 'text' && selection.path === path;
  const displayValue = String(value ?? '').replace(/\u00a0/g, ' ');
  const startTransform = (event, mode) => {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget.closest('.zv-editable');
    const current = config.elementStyles?.[path] || {};
    const startX = event.clientX;
    const startY = event.clientY;
    const computed = window.getComputedStyle(element);
    const startFontSize = Number(current.fontSize) || parseFloat(computed.fontSize) || 16;
    const startWidth = Number(current.maxWidth) || element.getBoundingClientRect().width;
    const move = moveEvent => {
      if (mode === 'move') {
        onChange?.({ kind: 'elementStyle', path }, {
          translateX: Math.round((Number(current.translateX) || 0) + moveEvent.clientX - startX),
          translateY: Math.round((Number(current.translateY) || 0) + moveEvent.clientY - startY),
        });
      } else {
        const delta = Math.max(moveEvent.clientX - startX, moveEvent.clientY - startY);
        onChange?.({ kind: 'elementStyle', path }, {
          fontSize: Math.max(10, Math.min(120, Math.round(startFontSize + delta / 8))),
          maxWidth: Math.max(80, Math.round(startWidth + moveEvent.clientX - startX)),
        });
      }
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };
  const props = editor ? {
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: (event) => {
      event.stopPropagation();
      onSelect?.({ kind: 'text', path, label: path });
    },
    onBlur: (event) => {
      const next = event.currentTarget.innerText.trim();
      if (next !== String(value || '')) onChange?.(path, next);
    },
    onKeyDown: (event) => {
      if (event.key === 'Escape') event.currentTarget.blur();
    },
  } : {};

  return <Tag className={`${className} ${editor ? 'zv-editable' : ''} ${selected ? 'is-selected' : ''}`} style={styleFor(config, path)} {...props}>{displayValue}{selected && <span className="zv-text-handles" contentEditable={false}><i onPointerDown={event => startTransform(event, 'move')} title="Зөөх"><Move size={11} /></i><i onPointerDown={event => startTransform(event, 'resize')} title="Хэмжээ өөрчлөх"><Scaling size={11} /></i></span>}</Tag>;
}

function ImageTarget({ path, label, intervalPath, editor, selection, onSelect }) {
  if (!editor) return null;
  const selected = selection?.kind === 'image' && selection.path === path;
  return (
    <button
      type="button"
      className={`zv-image-target ${selected ? 'is-selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.({ kind: 'image', path, label, intervalPath });
      }}
    >
      <ImageIcon size={14} /> {label}
    </button>
  );
}

function galleryMilliseconds(value, fallback) {
  return normalizeGallerySeconds(value, fallback) * 1000;
}

function RotatingGallery({ images, alt, className = '', interval = 5200, position = 'center' }) {
  const gallery = useMemo(() => [...new Set((Array.isArray(images) ? images : [])
    .map(image => (typeof image === 'string' ? image.trim() : ''))
    .filter(Boolean))].slice(0, 5), [images]);
  const galleryKey = gallery.join('\u001f');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(current => (gallery.length ? current % gallery.length : 0));
  }, [gallery.length, galleryKey]);

  useEffect(() => {
    if (gallery.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveIndex(current => (current + 1) % gallery.length), interval);
    return () => window.clearInterval(timer);
  }, [gallery.length, galleryKey, interval]);

  if (!gallery.length) return null;
  return <div className={`zp-visual-gallery ${className}`}>
    {gallery.map((src, index) => <img key={`${src}-${index}`} className={index === activeIndex ? 'is-active' : ''} src={src} alt={index === activeIndex ? alt : ''} aria-hidden={index !== activeIndex} style={{ objectPosition: position }} />)}
    {gallery.length > 1 && <span className="zp-gallery-progress" aria-hidden="true">{gallery.map((_, index) => <i key={index} className={index === activeIndex ? 'is-active' : ''} />)}</span>}
  </div>;
}

function SectionFrame({ id, config, editor, selection, onSelect, onChange, onMoveSection, className = '', style = {}, children }) {
  const sectionSettings = config.sectionStyles?.[id] || {};
  const selected = editor && selection?.kind === 'section' && selection.id === id;
  const custom = config.customSections?.find(section => section.id === id);
  const label = custom?.title || SECTION_LABELS[id] || 'Нэмэлт хэсэг';

  const startResize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const section = event.currentTarget.closest('[data-edit-section]');
    const startY = event.clientY;
    const startHeight = section.getBoundingClientRect().height;
    const move = (moveEvent) => onChange?.(`sectionStyles.${id}.minHeight`, Math.max(140, Math.round(startHeight + moveEvent.clientY - startY)));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <section
      id={id}
      className={`${className} ${editor ? 'zv-edit-section' : ''} ${selected ? 'is-selected' : ''}`}
      data-edit-section={id}
      style={{
        ...style,
        ...(sectionSettings.minHeight ? { minHeight: `${sectionSettings.minHeight}px` } : {}),
        ...(sectionSettings.background ? { backgroundColor: sectionSettings.background } : {}),
      }}
      onClick={(event) => {
        if (!editor || event.target.closest('.zv-editable, .zv-image-target, .zp-product, .zv-form-field')) return;
        onSelect?.({ kind: 'section', id, label });
      }}
      onDragOver={(event) => { if (editor) event.preventDefault(); }}
      onDrop={(event) => {
        if (!editor) return;
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('text/zentro-section');
        if (sourceId && sourceId !== id) onMoveSection?.(sourceId, id);
      }}
    >
      {editor && <button
        type="button"
        className="zv-section-handle"
        title="Чирж байрлалыг солих"
        draggable
        onClick={(event) => { event.stopPropagation(); onSelect?.({ kind: 'section', id, label }); }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/zentro-section', id);
        }}
      ><GripVertical size={14} /><span>{label}</span></button>}
      {children}
      {editor && selected && <button type="button" className="zv-section-resize" onPointerDown={startResize} title="Хэсгийн өндрийг өөрчлөх"><span /></button>}
    </section>
  );
}

function Brand({ config, editor, selection, onSelect, onChange }) {
  if (config.logoUrl) {
    return <span className="zp-brand-image-wrap"><img className="zp-logo-img" src={config.logoUrl} alt={config.brandName} /><ImageTarget path="logoUrl" label="Лого" editor={editor} selection={selection} onSelect={onSelect} /></span>;
  }
  return <><span className="zp-logo-mark">Z</span><EditableText as="span" path="brandName" value={config.brandName} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-brand-name" /></>;
}

function DynamicField({ field, stepIndex, fieldIndex, products, value, onValue, editor, onSelect }) {
  const definition = normalizeField(field, fieldIndex);
  const fieldPath = `formFlow.${stepIndex}.fields.${fieldIndex}`;
  const inputValue = typeof value === 'string' || typeof value === 'number' ? value : '';
  const common = {
    id: `zp-${definition.id}-${stepIndex}-${fieldIndex}`,
    required: !editor && Boolean(definition.required),
    disabled: editor,
    value: inputValue,
    onChange: event => onValue(definition.id, event.target.value),
  };
  const selectField = event => {
    if (!editor) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.({ kind: 'formField', path: fieldPath, stepIndex, fieldIndex, label: definition.label });
  };

  let control;
  if (definition.type === 'select') {
    const options = definition.id === 'productType'
      ? products.map(product => product.name)
      : (Array.isArray(definition.options) ? definition.options : String(definition.options || '').split(',').map(item => item.trim()).filter(Boolean));
    control = <select {...common}><option value="">{definition.placeholder || 'Сонгох'}</option>{options.map(option => <option value={option} key={option}>{option}</option>)}</select>;
  } else if (definition.type === 'textarea') {
    control = <textarea {...common} placeholder={definition.placeholder || ''} rows={3} />;
  } else if (definition.type === 'file') {
    control = <label className="zp-file-field"><input
      id={common.id}
      type="file"
      accept={definition.accept || 'image/*,.pdf'}
      required={common.required}
      disabled={editor}
      onChange={event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2000000) {
          alert('Файл 2MB-аас бага байх хэрэгтэй.');
          event.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => onValue(definition.id, { name: file.name, type: file.type, size: file.size, data: reader.result });
        reader.readAsDataURL(file);
      }}
    /><span>{value?.name || 'Файл сонгох'}</span><ArrowDown size={15} /></label>;
  } else if (definition.id === 'phone') {
    control = <input
      {...common}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      minLength={8}
      maxLength={8}
      pattern="[0-9]{8}"
      title="Утасны дугаар яг 8 оронтой байна"
      placeholder={definition.placeholder || definition.label || ''}
      onChange={event => onValue(definition.id, digitsOnly(event.target.value, 8))}
    />;
  } else if (definition.id === 'name') {
    control = <input
      {...common}
      type="text"
      autoComplete="name"
      maxLength={100}
      pattern={MONGOLIAN_NAME_PATTERN}
      title="Овог, нэрийг зөвхөн Монгол кирилл үсгээр бичнэ үү"
      placeholder={definition.placeholder || definition.label || ''}
      onChange={event => onValue(definition.id, mongolianNameOnly(event.target.value))}
    />;
  } else if (definition.id === 'register') {
    control = <input
      {...common}
      type="text"
      autoCapitalize="characters"
      maxLength={10}
      pattern={MONGOLIAN_REGISTER_PATTERN}
      title="Регистрийн дугаарыг 2 Монгол кирилл үсэг, 8 цифрээр бичнэ үү"
      placeholder={definition.placeholder || definition.label || ''}
      onChange={event => onValue(definition.id, formatRegisterInput(event.target.value))}
    />;
  } else if (definition.type === 'number') {
    control = <input
      {...common}
      type="text"
      inputMode="numeric"
      pattern="[0-9]{1,3}(,[0-9]{3})*"
      value={formatIntegerInput(inputValue)}
      placeholder={definition.placeholder || definition.label || ''}
      onChange={event => onValue(definition.id, integerDigits(event.target.value))}
    />;
  } else {
    control = <input {...common} type={definition.type || 'text'} inputMode={definition.type === 'number' ? 'numeric' : undefined} placeholder={definition.placeholder || definition.label || ''} />;
  }

  return <div className={`zp-field ${definition.type === 'textarea' || definition.type === 'file' ? 'is-wide' : ''} ${editor ? 'zv-form-field' : ''}`} onClick={selectField}>
    <label htmlFor={common.id}>{definition.label}{definition.required ? ' *' : ''}</label>
    {control}
  </div>;
}

function CustomSection({ section, index, commonProps }) {
  const prefix = `customSections.${index}`;
  const { config, editor, selection, onSelect, onChange } = commonProps;
  if (section.type === 'media') {
    return <SectionFrame id={section.id} className="zp-custom zp-custom-media" {...commonProps}>
      <RotatingGallery images={section.images} alt={section.title || 'Zentro'} interval={galleryMilliseconds(section.gallerySeconds, 5)} />
      <ImageTarget path={`${prefix}.image`} intervalPath={`${prefix}.gallerySeconds`} label="Зургууд" editor={editor} selection={selection} onSelect={onSelect} />
      <div className="zp-custom-caption"><EditableText as="p" path={`${prefix}.kicker`} value={section.kicker || 'Онцлох мэдээлэл'} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" /><EditableText as="h2" path={`${prefix}.title`} value={section.title || 'Шинэ зурагт хэсэг'} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div>
    </SectionFrame>;
  }

  return <SectionFrame id={section.id} className={`zp-custom zp-custom-${section.type || 'editorial'}`} {...commonProps}>
    <div className="zp-custom-inner">
      <EditableText as="p" path={`${prefix}.kicker`} value={section.kicker || 'Онцлох мэдээлэл'} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" />
      <EditableText as="h2" path={`${prefix}.title`} value={section.title || 'Шинэ хэсгийн гарчиг'} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} />
      {section.type !== 'statement' && <EditableText as="p" path={`${prefix}.body`} value={section.body || 'Энэ хэсгийн тайлбарыг шууд дарж засна уу.'} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-custom-body" />}
    </div>
  </SectionFrame>;
}

export default function SitePage({
  rawConfig,
  editor = false,
  viewport = 'desktop',
  selection,
  onSelect,
  onChange,
  onMoveSection,
  onLogin,
  onSubmit,
}) {
  const config = useMemo(() => normalizeSiteConfig(rawConfig), [rawConfig]);
  const content = config.siteContent;
  const products = config.products;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(0);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const themeStyle = {
    '--zp-ink': config.theme.ink,
    '--zp-paper': config.theme.paper,
    '--zp-surface': config.theme.surface,
    '--zp-accent': config.theme.accent,
    '--zp-soft-blue': config.theme.softBlue,
    '--zp-soft-rose': config.theme.softRose,
    '--zp-logo-width': `${config.theme.logoWidth || 260}px`,
    '--zp-logo-height': `${config.theme.logoHeight || 52}px`,
  };

  useEffect(() => {
    if (editor || products.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveProduct(current => (current + 1) % products.length), 4600);
    return () => window.clearInterval(timer);
  }, [editor, products.length]);

  const setValue = (id, value) => setForm(current => ({ ...current, [id]: value }));
  const submit = async event => {
    event.preventDefault();
    if (editor || !onSubmit) return;
    setSaving(true);
    setSent(false);
    setSubmitError('');
    try {
      const answers = {};
      Object.entries(form).forEach(([key, value]) => { if (!CORE_FIELDS.includes(key)) answers[key] = value; });
      await onSubmit({ ...form, answers: { ...answers, source: 'zentrocapitalgroup.com' } });
      setForm({});
      setSent(true);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Хүсэлт илгээх үед алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  const activeIndex = activeProduct % products.length;
  const active = products[activeIndex] || products[0];
  const commonProps = { config, editor, selection, onSelect, onChange, onMoveSection };
  const sectionRenderers = {
    hero: () => <SectionFrame
      key="hero"
      id="hero"
      className="zp-hero"
      {...commonProps}
    >
      <RotatingGallery images={config.heroImages} alt={config.heroTitle} position={config.theme.heroPosition || 'center'} interval={galleryMilliseconds(config.theme.heroGallerySeconds, 5.6)} />
      <div className="zp-hero-shade" style={{ background: `linear-gradient(90deg, rgba(11,13,11,${Number(config.theme.heroOverlay || 68) / 100}) 0%, rgba(11,13,11,.28) 70%, rgba(11,13,11,.12) 100%)` }} />
      <ImageTarget path="heroImage" intervalPath="theme.heroGallerySeconds" label="Hero зургууд" editor={editor} selection={selection} onSelect={onSelect} />
      <div className="zp-hero-inner">
        <EditableText as="p" path="siteContent.heroEyebrow" value={content.heroEyebrow} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" />
        <EditableText as="h1" path="heroTitle" value={config.heroTitle} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} />
        <EditableText as="p" path="heroText" value={config.heroText} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-hero-description" />
        <div className="zp-hero-action">
          <a href="#apply" onClick={event => { if (editor) event.preventDefault(); }}><EditableText as="span" path="siteContent.heroCta" value={content.heroCta} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><ArrowRight size={17} /></a>
          <EditableText as="span" path="siteContent.heroNote" value={content.heroNote} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-hero-note" />
        </div>
      </div>
      <a className="zp-scroll-cue" href="#products" aria-label="Доош гүйлгэх" onClick={event => { if (editor) event.preventDefault(); }}><ArrowDown size={18} /></a>
    </SectionFrame>,
    trust: () => <SectionFrame key="trust" id="trust" className="zp-trust" {...commonProps}>
      <div className="zp-trust-inner">{content.trustItems.map((item, index) => <div key={index} className="zp-trust-item"><EditableText as="strong" path={`siteContent.trustItems.${index}.value`} value={item.value} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="span" path={`siteContent.trustItems.${index}.label`} value={item.label} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div>)}</div>
    </SectionFrame>,
    products: () => <SectionFrame key="products" id="products" className="zp-products" {...commonProps}>
      <div className="zp-container">
        <div className="zp-section-head"><div><EditableText as="p" path="siteContent.productsEyebrow" value={content.productsEyebrow} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" /><EditableText as="h2" path="siteContent.productsTitle" value={content.productsTitle} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div><EditableText as="p" path="siteContent.productsIntro" value={content.productsIntro} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-section-intro" /></div>
        <div className="zp-product-grid">{products.map((product, index) => {
          const Icon = PRODUCT_ICONS[index % PRODUCT_ICONS.length];
          const selected = editor && selection?.kind === 'product' && selection.index === index;
          return <article key={`${product.name}-${index}`} className={`zp-product ${selected ? 'is-selected' : ''}`} onClick={event => { if (!editor) return; event.stopPropagation(); onSelect?.({ kind: 'product', index, label: product.name }); }}>
            <div className="zp-product-image"><RotatingGallery images={product.images} alt={product.name} interval={galleryMilliseconds(product.gallerySeconds, 4.3 + index * 0.4)} /><span><Icon size={17} /></span><ImageTarget path={`products.${index}.image`} intervalPath={`products.${index}.gallerySeconds`} label="Зургууд" editor={editor} selection={selection} onSelect={onSelect} /></div>
            <div className="zp-product-body"><span className="zp-product-number">0{index + 1}</span><EditableText as="h3" path={`products.${index}.name`} value={product.name} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="p" path={`products.${index}.description`} value={product.description} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><dl><div><EditableText as="dt" path="siteContent.productRateLabel" value={content.productRateLabel} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="dd" path={`products.${index}.rate`} value={product.rate} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div><div><EditableText as="dt" path="siteContent.productTermLabel" value={content.productTermLabel} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="dd" path={`products.${index}.term`} value={product.term} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div><div><EditableText as="dt" path="siteContent.productAmountLabel" value={content.productAmountLabel} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="dd" path={`products.${index}.amount`} value={product.amount} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div></dl></div>
          </article>;
        })}</div>
      </div>
    </SectionFrame>,
    flow: () => <SectionFrame key="flow" id="flow" className="zp-flow" {...commonProps}>
      <RotatingGallery images={active?.images || config.heroImages} alt={active?.name || config.heroTitle} interval={galleryMilliseconds(config.theme.flowGallerySeconds, 3.2)} />
      <div className="zp-flow-shade" />
      <ImageTarget path={`products.${activeIndex}.image`} intervalPath="theme.flowGallerySeconds" label="Арын зургууд" editor={editor} selection={selection} onSelect={onSelect} />
      <div className="zp-container zp-flow-inner" key={activeIndex}>
        <EditableText as="p" path="siteContent.flowEyebrow" value={content.flowEyebrow} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" />
        <EditableText as="h2" path={`products.${activeIndex}.flowTitle`} value={active?.flowTitle || active?.name} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} />
        <EditableText as="p" path={`products.${activeIndex}.description`} value={active?.description} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-flow-copy" />
      </div>
      <div className="zp-flow-nav">{products.map((product, index) => <button type="button" key={product.name} className={index === activeIndex ? 'active' : ''} onClick={event => { event.stopPropagation(); setActiveProduct(index); }} aria-label={`${index + 1}-р бүтээгдэхүүн`} />)}</div>
    </SectionFrame>,
    process: () => <SectionFrame key="process" id="process" className="zp-process" {...commonProps}>
      <div className="zp-container">
        <div className="zp-process-head"><div><EditableText as="p" path="siteContent.processEyebrow" value={content.processEyebrow} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" /><EditableText as="h2" path="siteContent.processTitle" value={content.processTitle} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div><EditableText as="p" path="siteContent.processText" value={content.processText} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-section-intro" /></div>
        <div className="zp-process-steps">{content.processSteps.map((step, index) => <article key={index}><span>0{index + 1}</span><EditableText as="h3" path={`siteContent.processSteps.${index}.title`} value={step.title} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="p" path={`siteContent.processSteps.${index}.text`} value={step.text} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></article>)}</div>
      </div>
    </SectionFrame>,
    apply: () => <SectionFrame key="apply" id="apply" className="zp-apply" {...commonProps}>
      <div className="zp-container zp-apply-grid">
        <div className="zp-apply-copy"><EditableText as="p" path="siteContent.formEyebrow" value={content.formEyebrow} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-kicker" /><EditableText as="h2" path="siteContent.formTitle" value={content.formTitle} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="p" path="siteContent.formText" value={content.formText} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-apply-description" /><div className="zp-contact-inline"><Phone size={17} /><span>{config.phone}</span></div></div>
        <form className="zp-form" onSubmit={submit}>
          {sent && <p className="zp-success"><Check size={17} />{content.formSuccess}</p>}
          {submitError && <p className="zp-form-error" role="alert">{submitError}</p>}
          {config.formFlow.map((step, stepIndex) => <fieldset key={step.id || stepIndex}><EditableText as="legend" path={`formFlow.${stepIndex}.title`} value={step.title || `Алхам ${stepIndex + 1}`} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><div className="zp-field-grid">{(step.fields || []).map((field, fieldIndex) => {
            const definition = normalizeField(field, fieldIndex);
            return <DynamicField key={`${definition.id}-${fieldIndex}`} field={field} stepIndex={stepIndex} fieldIndex={fieldIndex} products={products} value={form[definition.id]} onValue={setValue} editor={editor} onSelect={onSelect} />;
          })}</div></fieldset>)}
          <button type="submit" disabled={saving || editor}><span>{saving ? content.formSending : content.formButton}</span><ArrowRight size={17} /></button>
          <EditableText as="p" path="siteContent.formPrivacy" value={content.formPrivacy} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} className="zp-privacy" />
        </form>
      </div>
    </SectionFrame>,
  };

  return (
    <div className={`zp-site ${editor ? 'is-editor' : ''} is-${viewport}`} style={themeStyle}>
      <header className="zp-nav">
        <a className="zp-logo" href="#top" onClick={event => { if (editor) event.preventDefault(); }}><Brand config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></a>
        <nav className="zp-links">
          <a href="#products" onClick={event => { if (editor) event.preventDefault(); }}><EditableText as="span" path="siteContent.navProducts" value={content.navProducts} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></a>
          <a href="#process" onClick={event => { if (editor) event.preventDefault(); }}><EditableText as="span" path="siteContent.navProcess" value={content.navProcess} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></a>
          <a href="#contact" onClick={event => { if (editor) event.preventDefault(); }}><EditableText as="span" path="siteContent.navContact" value={content.navContact} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></a>
        </nav>
        <a className="zp-nav-phone" href={`tel:${config.phone}`} onClick={event => { if (editor) event.preventDefault(); }}><Phone size={15} /><span>{config.phone}</span></a>
        <button className="zp-login" type="button" onClick={() => !editor && onLogin?.()} title="Нэвтрэх"><KeyRound size={16} /><EditableText as="span" path="siteContent.loginLabel" value={content.loginLabel} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></button>
        <button className="zp-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Цэс"><Menu size={21} /></button>
      </header>

      {mobileOpen && <div className="zp-drawer"><button type="button" onClick={() => setMobileOpen(false)} aria-label="Хаах"><X /></button><a href="#products" onClick={() => setMobileOpen(false)}>{content.navProducts}</a><a href="#process" onClick={() => setMobileOpen(false)}>{content.navProcess}</a><a href="#contact" onClick={() => setMobileOpen(false)}>{content.navContact}</a><button type="button" onClick={onLogin}><KeyRound size={16} /> {content.loginLabel}</button></div>}

      <main id="top">
        {config.sectionOrder.map(sectionId => {
          if (sectionRenderers[sectionId]) return sectionRenderers[sectionId]();
          const index = config.customSections.findIndex(section => section.id === sectionId);
          return index >= 0 ? <CustomSection key={sectionId} section={config.customSections[index]} index={index} commonProps={commonProps} /> : null;
        })}
      </main>

      <footer className="zp-footer" id="contact">
        <div className="zp-container zp-footer-grid"><div><Brand config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="p" path="siteContent.footerText" value={content.footerText} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div><div><EditableText as="b" path="siteContent.footerContactTitle" value={content.footerContactTitle} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="span" path="address" value={config.address} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="span" path="phone" value={config.phone} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /><EditableText as="span" path="email" value={config.email} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div></div>
        <div className="zp-footer-bottom zp-container"><span>© {new Date().getFullYear()} {config.brandName}</span><EditableText as="span" path="siteContent.footerLegal" value={content.footerLegal} config={config} editor={editor} selection={selection} onSelect={onSelect} onChange={onChange} /></div>
      </footer>
    </div>
  );
}

export { SECTION_LABELS };
