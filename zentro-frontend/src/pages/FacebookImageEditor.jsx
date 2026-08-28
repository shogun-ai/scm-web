import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Image as ImageIcon, LoaderCircle, Move, Palette, RefreshCw, Type, X } from 'lucide-react';

const DESIGN_VARIANT_COUNT = 24;

const DESIGN_PALETTES = [
  { text: '#ffffff', muted: '#e5e8e1', accent: '#c8f43d', buttonText: '#101310', overlay: '#101310' },
  { text: '#ffffff', muted: '#fff0dc', accent: '#ffbd3d', buttonText: '#291b08', overlay: '#351b15' },
  { text: '#f7fffc', muted: '#d2eee5', accent: '#20d6a2', buttonText: '#092e25', overlay: '#0d302a' },
  { text: '#ffffff', muted: '#f2dfe5', accent: '#f47a66', buttonText: '#35131a', overlay: '#35141d' },
];

const DESIGN_LAYOUTS = [
  { logo: [.07, .06, .28], accent: [.07, .19, .18], headline: [.07, .25, .82, 76], subtext: [.07, .56, .72, 29], cta: [.07, .77, .42, 29] },
  { logo: [.63, .06, .30], accent: [.63, .19, .18], headline: [.08, .28, .78, 72], subtext: [.08, .59, .76, 27], cta: [.56, .78, .37, 27] },
  { logo: [.08, .07, .25], accent: [.08, .22, .12], headline: [.08, .30, .58, 68], subtext: [.08, .63, .55, 26], cta: [.08, .80, .36, 26] },
  { logo: [.37, .06, .28], accent: [.42, .20, .16], headline: [.12, .28, .76, 70], subtext: [.17, .60, .66, 27], cta: [.31, .79, .38, 27] },
  { logo: [.07, .06, .28], accent: [.07, .66, .18], headline: [.07, .47, .84, 66], subtext: [.07, .69, .75, 26], cta: [.61, .83, .32, 25] },
  { logo: [.07, .08, .24], accent: [.72, .08, .19], headline: [.31, .18, .62, 64], subtext: [.31, .54, .61, 25], cta: [.31, .75, .40, 26] },
];

const LAYER_META = {
  logo: { label: 'Лого', icon: ImageIcon, min: 12, max: 70, unit: 'width' },
  accent: { label: 'Элемент', icon: Palette, min: 4, max: 40, unit: 'height' },
  headline: { label: 'Гарчиг', icon: Type, min: 28, max: 120, unit: 'font' },
  subtext: { label: 'Тайлбар', icon: Type, min: 16, max: 58, unit: 'font' },
  cta: { label: 'CTA', icon: Type, min: 16, max: 52, unit: 'font' },
};

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function splitLines(context, text, maxWidth) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function roundedPath(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
    return;
  }
  const edge = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + edge, y);
  context.lineTo(x + width - edge, y);
  context.quadraticCurveTo(x + width, y, x + width, y + edge);
  context.lineTo(x + width, y + height - edge);
  context.quadraticCurveTo(x + width, y + height, x + width - edge, y + height);
  context.lineTo(x + edge, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - edge);
  context.lineTo(x, y + edge);
  context.quadraticCurveTo(x, y, x + edge, y);
  context.closePath();
}

function loadImage(url) {
  if (!url) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawCover(context, image, width, height, background) {
  context.fillStyle = '#20231f';
  context.fillRect(0, 0, width, height);
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * background.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) * background.x;
  const y = (height - drawHeight) * background.y;
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawContained(context, image, x, y, width, height) {
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function createInitialLayers({ headline, subtext, cta }) {
  return {
    logo: { visible: true, x: .07, y: .06, width: .28, size: 30, color: '#ffffff', text: '' },
    accent: { visible: true, x: .07, y: .19, width: .18, size: 12, color: '#c8f43d', text: '' },
    headline: { visible: true, x: .07, y: .25, width: .82, size: 76, color: '#ffffff', text: headline || 'Машинаа унаад санхүүгийн боломжоо нэмэгдүүл' },
    subtext: { visible: true, x: .07, y: .56, width: .72, size: 29, color: '#e5e8e1', text: subtext || 'Нөхцөлөө судалж, өөрт тохирох шийдлээ сонгоорой.' },
    cta: { visible: true, x: .07, y: .77, width: .42, size: 29, color: '#c8f43d', textColor: '#101310', text: cta || 'Дэлгэрэнгүй мэдээлэл авах' },
  };
}

function drawDesign({ canvas, backgroundImage, logoImage, layers, background, selected, showSelection }) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const bounds = {};
  drawCover(context, backgroundImage, width, height, background);
  context.save();
  context.globalAlpha = background.overlayOpacity;
  context.fillStyle = background.overlayColor;
  context.fillRect(0, 0, width, height);
  context.restore();

  const accent = layers.accent;
  if (accent.visible) {
    const x = accent.x * width;
    const y = accent.y * height;
    const w = accent.width * width;
    const h = accent.size;
    context.fillStyle = accent.color;
    roundedPath(context, x, y, w, h, h / 2);
    context.fill();
    bounds.accent = { x, y, width: w, height: Math.max(h, 28) };
  }

  const logo = layers.logo;
  if (logo.visible) {
    const x = logo.x * width;
    const y = logo.y * height;
    const w = logo.width * width;
    const h = Math.max(54, w * .28);
    if (logoImage) drawContained(context, logoImage, x, y, w, h);
    else {
      context.fillStyle = logo.color;
      context.font = `850 ${Math.max(24, logo.size)}px Arial, sans-serif`;
      context.fillText('Zentro Prime Capital', x, y + Math.max(30, logo.size));
    }
    bounds.logo = { x, y, width: w, height: h };
  }

  ['headline', 'subtext'].forEach(id => {
    const layer = layers[id];
    if (!layer.visible) return;
    const x = layer.x * width;
    const y = layer.y * height;
    const w = layer.width * width;
    context.fillStyle = layer.color;
    context.font = `${id === 'headline' ? 900 : 650} ${layer.size}px Arial, sans-serif`;
    context.textBaseline = 'top';
    const lines = splitLines(context, layer.text, w).slice(0, id === 'headline' ? 5 : 4);
    const lineHeight = layer.size * (id === 'headline' ? 1.04 : 1.28);
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    bounds[id] = { x, y, width: w, height: Math.max(lineHeight, lines.length * lineHeight) };
  });

  const cta = layers.cta;
  if (cta.visible) {
    const x = cta.x * width;
    const y = cta.y * height;
    const w = cta.width * width;
    const h = Math.max(62, cta.size * 2.25);
    context.fillStyle = cta.color;
    roundedPath(context, x, y, w, h, 10);
    context.fill();
    context.fillStyle = cta.textColor;
    context.font = `850 ${cta.size}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(cta.text, x + w / 2, y + h / 2, w - 32);
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    bounds.cta = { x, y, width: w, height: h };
  }

  if (showSelection && bounds[selected]) {
    const box = bounds[selected];
    context.save();
    context.strokeStyle = '#ffffff';
    context.lineWidth = Math.max(2, width / 360);
    context.setLineDash([12, 8]);
    context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
    context.fillStyle = '#c8f43d';
    [[box.x - 8, box.y - 8], [box.x + box.width + 8, box.y - 8], [box.x - 8, box.y + box.height + 8], [box.x + box.width + 8, box.y + box.height + 8]].forEach(([x, y]) => {
      context.beginPath();
      context.arc(x, y, 7, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }
  return bounds;
}

export default function FacebookImageEditor({ imageUrl, logoUrl, headline, subtext, cta, onClose, onExport }) {
  const canvasRef = useRef(null);
  const boundsRef = useRef({});
  const dragRef = useRef(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [format, setFormat] = useState('square');
  const [selected, setSelected] = useState('headline');
  const [variant, setVariant] = useState(0);
  const [layers, setLayers] = useState(() => createInitialLayers({ headline, subtext, cta }));
  const [background, setBackground] = useState({ zoom: 1, x: .5, y: .5, overlayOpacity: .4, overlayColor: '#101310' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dimensions = useMemo(() => format === 'portrait' ? { width: 1080, height: 1350 } : { width: 1080, height: 1080 }, [format]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    loadImage(imageUrl).then(image => { if (active) setBackgroundImage(image); });
    return () => { active = false; };
  }, [imageUrl]);

  useEffect(() => {
    let active = true;
    loadImage(logoUrl).then(image => { if (active) setLogoImage(image); });
    return () => { active = false; };
  }, [logoUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    boundsRef.current = drawDesign({ canvas, backgroundImage, logoImage, layers, background, selected, showSelection: true });
  }, [background, backgroundImage, dimensions, layers, logoImage, selected]);

  const updateLayer = patch => setLayers(current => ({ ...current, [selected]: { ...current[selected], ...patch } }));

  const applyVariant = nextValue => {
    const next = ((nextValue % DESIGN_VARIANT_COUNT) + DESIGN_VARIANT_COUNT) % DESIGN_VARIANT_COUNT;
    const layout = DESIGN_LAYOUTS[next % DESIGN_LAYOUTS.length];
    const palette = DESIGN_PALETTES[Math.floor(next / DESIGN_LAYOUTS.length)];
    setVariant(next);
    setLayers(current => ({
      logo: { ...current.logo, x: layout.logo[0], y: layout.logo[1], width: layout.logo[2], color: palette.text },
      accent: { ...current.accent, x: layout.accent[0], y: layout.accent[1], width: layout.accent[2], color: palette.accent },
      headline: { ...current.headline, x: layout.headline[0], y: layout.headline[1], width: layout.headline[2], size: layout.headline[3], color: palette.text },
      subtext: { ...current.subtext, x: layout.subtext[0], y: layout.subtext[1], width: layout.subtext[2], size: layout.subtext[3], color: palette.muted },
      cta: { ...current.cta, x: layout.cta[0], y: layout.cta[1], width: layout.cta[2], size: layout.cta[3], color: palette.accent, textColor: palette.buttonText },
    }));
    setBackground(current => ({ ...current, overlayColor: palette.overlay, overlayOpacity: .4 }));
  };

  const canvasPoint = event => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (dimensions.width / rect.width),
      y: (event.clientY - rect.top) * (dimensions.height / rect.height),
    };
  };

  const pointerDown = event => {
    const point = canvasPoint(event);
    const hit = Object.entries(boundsRef.current).reverse().find(([, box]) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height);
    if (!hit) return;
    const [id, box] = hit;
    setSelected(id);
    dragRef.current = { id, dx: point.x - box.x, dy: point.y - box.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = event => {
    if (!dragRef.current) return;
    const point = canvasPoint(event);
    const { id, dx, dy } = dragRef.current;
    setLayers(current => ({
      ...current,
      [id]: {
        ...current[id],
        x: clamp((point.x - dx) / dimensions.width, 0, .96),
        y: clamp((point.y - dy) / dimensions.height, 0, .96),
      },
    }));
  };

  const pointerUp = event => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const exportDesign = async () => {
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      drawDesign({ canvas, backgroundImage, logoImage, layers, background, selected: '', showSelection: false });
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG файл үүсгэж чадсангүй.')), 'image/png', .96));
      await onExport(new File([blob], `zentro-facebook-design-${Date.now()}.png`, { type: 'image/png' }));
    } catch (exportError) {
      setError(exportError.message || 'Зургийн дизайн хадгалж чадсангүй.');
    } finally {
      setBusy(false);
    }
  };

  const activeLayer = layers[selected];
  const meta = LAYER_META[selected];

  return <div className="zf-design-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="zf-design-dialog" role="dialog" aria-modal="true" aria-label="Facebook зургийн дизайн editor">
      <header><div><span>Visual editor</span><h2>Зар сурталчилгааны зураг</h2></div><button type="button" onClick={onClose} title="Хаах"><X size={18} /></button></header>
      <div className="zf-design-workspace">
        <div className="zf-design-stage">
          <div className="zf-design-stagebar"><div className="zf-design-segment"><button type="button" className={format === 'square' ? 'active' : ''} onClick={() => setFormat('square')}>1:1</button><button type="button" className={format === 'portrait' ? 'active' : ''} onClick={() => setFormat('portrait')}>4:5</button></div><span><Move size={13} /> Элементийг чирж байрлуулна</span></div>
          <canvas ref={canvasRef} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
        </div>
        <aside className="zf-design-controls">
          <div className="zf-design-variant"><span>Дизайны хувилбар</span><button type="button" onClick={() => applyVariant(variant + 1)}><RefreshCw size={14} /> {String(variant + 1).padStart(2, '0')}/{DESIGN_VARIANT_COUNT}</button></div>
          <div className="zf-design-layers">{Object.entries(LAYER_META).map(([id, item]) => { const Icon = item.icon; return <button type="button" className={selected === id ? 'active' : ''} onClick={() => setSelected(id)} key={id}><Icon size={14} />{item.label}</button>; })}</div>
          <label className="zf-design-visible"><span>{meta.label}</span><button type="button" onClick={() => updateLayer({ visible: !activeLayer.visible })}>{activeLayer.visible ? <Eye size={15} /> : <EyeOff size={15} />}{activeLayer.visible ? 'Харагдана' : 'Нуусан'}</button></label>
          {'text' in activeLayer && selected !== 'logo' && selected !== 'accent' && <label><span className="z-label">Текст</span><textarea className="z-input" rows={selected === 'headline' ? 4 : 3} value={activeLayer.text} onChange={event => updateLayer({ text: event.target.value })} /></label>}
          <div className="zf-design-control-grid">
            <label><span className="z-label">Өнгө</span><input type="color" value={activeLayer.color} onChange={event => updateLayer({ color: event.target.value })} /></label>
            {selected === 'cta' && <label><span className="z-label">Текстийн өнгө</span><input type="color" value={activeLayer.textColor} onChange={event => updateLayer({ textColor: event.target.value })} /></label>}
          </div>
          {selected !== 'logo' && <label><span className="z-label">{meta.unit === 'font' ? 'Үсгийн хэмжээ' : 'Элементийн өндөр'} · {activeLayer.size}</span><input type="range" min={meta.min} max={meta.max} value={activeLayer.size} onChange={event => updateLayer({ size: Number(event.target.value) })} /></label>}
          <label><span className="z-label">Өргөн · {Math.round(activeLayer.width * 100)}%</span><input type="range" min="12" max="92" value={Math.round(activeLayer.width * 100)} onChange={event => updateLayer({ width: Number(event.target.value) / 100 })} /></label>
          <div className="zf-design-background"><span>Арын зураг</span><label><small>Томруулалт</small><input type="range" min="100" max="220" value={Math.round(background.zoom * 100)} onChange={event => setBackground(current => ({ ...current, zoom: Number(event.target.value) / 100 }))} /></label><label><small>Хэвтээ байрлал</small><input type="range" min="0" max="100" value={Math.round(background.x * 100)} onChange={event => setBackground(current => ({ ...current, x: Number(event.target.value) / 100 }))} /></label><label><small>Босоо байрлал</small><input type="range" min="0" max="100" value={Math.round(background.y * 100)} onChange={event => setBackground(current => ({ ...current, y: Number(event.target.value) / 100 }))} /></label><label><small>Харлуулах</small><input type="range" min="0" max="80" value={Math.round(background.overlayOpacity * 100)} onChange={event => setBackground(current => ({ ...current, overlayOpacity: Number(event.target.value) / 100 }))} /></label><label><small>Overlay өнгө</small><input type="color" value={background.overlayColor} onChange={event => setBackground(current => ({ ...current, overlayColor: event.target.value }))} /></label></div>
          {error && <small className="zf-design-error">{error}</small>}
          <button className="z-btn z-btn-primary zf-design-export" type="button" onClick={exportDesign} disabled={busy || !backgroundImage}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />} {busy ? 'Оруулж байна...' : 'PNG болгож постод ашиглах'}</button>
        </aside>
      </div>
    </section>
  </div>;
}
