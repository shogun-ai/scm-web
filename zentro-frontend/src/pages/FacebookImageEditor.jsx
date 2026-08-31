import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CarFront,
  Check,
  Circle,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  RefreshCw,
  Shapes,
  Sparkles,
  Square,
  Star,
  Table2,
  Trash2,
  Type,
  X,
} from 'lucide-react';

const DESIGN_VARIANT_COUNT = 24;
const MAX_LAYERS = 40;

const DESIGN_PALETTES = [
  { text: '#ffffff', muted: '#e5e8e1', accent: '#c8f43d', accent2: '#76df3f', buttonText: '#101310', overlay: '#101310', overlay2: '#24301d' },
  { text: '#ffffff', muted: '#fff0dc', accent: '#ffbd3d', accent2: '#f47a66', buttonText: '#291b08', overlay: '#351b15', overlay2: '#16120d' },
  { text: '#f7fffc', muted: '#d2eee5', accent: '#20d6a2', accent2: '#44a9ff', buttonText: '#092e25', overlay: '#0d302a', overlay2: '#102036' },
  { text: '#ffffff', muted: '#f2dfe5', accent: '#f47a66', accent2: '#e8a6ff', buttonText: '#35131a', overlay: '#35141d', overlay2: '#181116' },
];

const DESIGN_LAYOUTS = [
  { logo: [.07, .06, .28], accent: [.07, .19, .18], headline: [.07, .25, .82, 76], subtext: [.07, .56, .72, 29], cta: [.07, .77, .42, 29] },
  { logo: [.63, .06, .30], accent: [.63, .19, .18], headline: [.08, .28, .78, 72], subtext: [.08, .59, .76, 27], cta: [.56, .78, .37, 27] },
  { logo: [.08, .07, .25], accent: [.08, .22, .12], headline: [.08, .30, .58, 68], subtext: [.08, .63, .55, 26], cta: [.08, .80, .36, 26] },
  { logo: [.37, .06, .28], accent: [.42, .20, .16], headline: [.12, .28, .76, 70], subtext: [.17, .60, .66, 27], cta: [.31, .79, .38, 27] },
  { logo: [.07, .06, .28], accent: [.07, .66, .18], headline: [.07, .47, .84, 66], subtext: [.07, .69, .75, 26], cta: [.61, .83, .32, 25] },
  { logo: [.07, .08, .24], accent: [.72, .08, .19], headline: [.31, .18, .62, 64], subtext: [.31, .54, .61, 25], cta: [.31, .75, .40, 26] },
];

const FONT_OPTIONS = [
  { label: 'Inter / System', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

const SHAPE_LIBRARY = [
  { kind: 'rect', label: 'Дөрвөлжин', Icon: Square },
  { kind: 'circle', label: 'Дугуй', Icon: Circle },
  { kind: 'pill', label: 'Капсул', Icon: Minus },
  { kind: 'triangle', label: 'Гурвалжин', Icon: Shapes },
  { kind: 'star', label: 'Од', Icon: Star },
];

const ICON_LIBRARY = [
  { kind: 'message', label: 'Чат', Icon: MessageCircle },
  { kind: 'phone', label: 'Утас', Icon: Phone },
  { kind: 'pin', label: 'Байршил', Icon: MapPin },
  { kind: 'arrow', label: 'Сум', Icon: ArrowRight },
  { kind: 'check', label: 'Зөв', Icon: Check },
  { kind: 'car', label: 'Машин', Icon: CarFront },
];

const TYPE_META = {
  logo: { label: 'Лого', Icon: ImageIcon },
  text: { label: 'Текст', Icon: Type },
  button: { label: 'CTA', Icon: Sparkles },
  shape: { label: 'Дүрс', Icon: Shapes },
  line: { label: 'Зураас', Icon: Minus },
  icon: { label: 'Icon', Icon: Star },
  table: { label: 'Хүснэгт', Icon: Table2 },
};

let layerSequence = 0;

function nextLayerId(prefix) {
  layerSequence += 1;
  return `${prefix}-${Date.now()}-${layerSequence}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function splitLines(context, text, maxWidth) {
  const paragraphs = String(text || '').split('\n');
  const lines = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
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
    if (!words.length || paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  while (lines.length > 1 && lines.at(-1) === '') lines.pop();
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

function starPath(context, cx, cy, outerRadius, innerRadius, points = 5) {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (Math.PI * index) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
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
  if (!image?.naturalWidth || !image?.naturalHeight) return { x, y, width, height };
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = x;
  const drawY = y + (height - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
}

function paintForBox(context, layer, x, y, width, height) {
  if (!layer.gradientEnabled) return layer.color || '#ffffff';
  const angle = ((Number(layer.gradientAngle) || 0) * Math.PI) / 180;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const radius = Math.abs(width * Math.cos(angle)) / 2 + Math.abs(height * Math.sin(angle)) / 2;
  const gradient = context.createLinearGradient(
    cx - Math.cos(angle) * radius,
    cy - Math.sin(angle) * radius,
    cx + Math.cos(angle) * radius,
    cy + Math.sin(angle) * radius,
  );
  gradient.addColorStop(0, layer.color || '#ffffff');
  gradient.addColorStop(1, layer.gradientColor || layer.color || '#ffffff');
  return gradient;
}

function applyDash(context, style, width = 2) {
  if (style === 'dashed') context.setLineDash([width * 4, width * 2.5]);
  else if (style === 'dotted') context.setLineDash([width, width * 2.2]);
  else context.setLineDash([]);
}

function drawLayerBorder(context, layer, bounds, radius = 0) {
  if (!layer.borderEnabled || !bounds) return;
  context.save();
  context.strokeStyle = layer.borderColor || '#ffffff';
  context.lineWidth = Math.max(1, Number(layer.borderWidth) || 2);
  applyDash(context, layer.borderStyle, context.lineWidth);
  roundedPath(context, bounds.x, bounds.y, bounds.width, bounds.height, radius);
  context.stroke();
  context.restore();
}

function createInitialLayers({ headline, subtext, cta }) {
  return [
    {
      id: 'logo', type: 'logo', name: 'Лого', visible: true, x: .07, y: .06, width: .28, height: .09,
      color: '#ffffff', gradientColor: '#c8f43d', gradientEnabled: false, gradientAngle: 0,
      recolor: false, opacity: 1, borderEnabled: false, borderColor: '#ffffff', borderWidth: 2, borderStyle: 'solid',
    },
    {
      id: 'accent', type: 'shape', shape: 'pill', name: 'Онцлох зураас', visible: true, x: .07, y: .19, width: .18, height: .012,
      color: '#c8f43d', gradientColor: '#76df3f', gradientEnabled: true, gradientAngle: 0,
      opacity: 1, borderEnabled: false, borderColor: '#ffffff', borderWidth: 2, borderStyle: 'solid', radius: 99,
    },
    {
      id: 'headline', type: 'text', name: 'Үндсэн гарчиг', visible: true, x: .07, y: .25, width: .82,
      size: 76, color: '#ffffff', gradientColor: '#c8f43d', gradientEnabled: false, gradientAngle: 0,
      text: headline || 'Машинаа унаад санхүүгийн боломжоо нэмэгдүүл', font: FONT_OPTIONS[0].value, weight: 900, align: 'left', lineHeight: 1.04,
      opacity: 1, borderEnabled: false, borderColor: '#101310', borderWidth: 2, borderStyle: 'solid',
    },
    {
      id: 'subtext', type: 'text', name: 'Тайлбар', visible: true, x: .07, y: .56, width: .72,
      size: 29, color: '#e5e8e1', gradientColor: '#c8f43d', gradientEnabled: false, gradientAngle: 0,
      text: subtext || 'Нөхцөлөө судалж, өөрт тохирох шийдлээ сонгоорой.', font: FONT_OPTIONS[0].value, weight: 650, align: 'left', lineHeight: 1.28,
      opacity: 1, borderEnabled: false, borderColor: '#101310', borderWidth: 2, borderStyle: 'solid',
    },
    {
      id: 'cta', type: 'button', name: 'CTA товч', visible: true, x: .07, y: .77, width: .42, height: .072,
      size: 29, color: '#c8f43d', gradientColor: '#76df3f', gradientEnabled: true, gradientAngle: 0,
      textColor: '#101310', text: cta || 'Дэлгэрэнгүй мэдээлэл авах', font: FONT_OPTIONS[0].value, weight: 850, radius: 10,
      opacity: 1, borderEnabled: false, borderColor: '#ffffff', borderWidth: 2, borderStyle: 'solid',
    },
  ];
}

function makeTextLayer(index = 1) {
  return {
    id: nextLayerId('text'), type: 'text', name: `Нэмэлт текст ${index}`, visible: true, x: .52, y: .68, width: .40,
    size: 38, color: '#ffffff', gradientColor: '#c8f43d', gradientEnabled: false, gradientAngle: 0,
    text: 'Шинэ текст', font: FONT_OPTIONS[0].value, weight: 750, align: 'left', lineHeight: 1.16,
    opacity: 1, borderEnabled: false, borderColor: '#101310', borderWidth: 2, borderStyle: 'solid',
  };
}

function makeShapeLayer(shape) {
  return {
    id: nextLayerId(shape), type: 'shape', shape, name: SHAPE_LIBRARY.find(item => item.kind === shape)?.label || 'Дүрс', visible: true,
    x: .76, y: .12, width: shape === 'pill' ? .18 : .14, height: shape === 'pill' ? .025 : .12,
    color: '#c8f43d', gradientColor: '#20d6a2', gradientEnabled: true, gradientAngle: 35, radius: shape === 'pill' ? 99 : 12,
    opacity: .92, borderEnabled: false, borderColor: '#ffffff', borderWidth: 3, borderStyle: 'solid',
  };
}

function makeLineLayer() {
  return {
    id: nextLayerId('line'), type: 'line', name: 'Зураас', visible: true, x: .56, y: .42, width: .36, height: .02,
    color: '#c8f43d', gradientColor: '#20d6a2', gradientEnabled: true, gradientAngle: 0, strokeWidth: 8, lineStyle: 'solid',
    opacity: 1, borderEnabled: false, borderColor: '#ffffff', borderWidth: 3, borderStyle: 'solid',
  };
}

function makeIconLayer(icon) {
  return {
    id: nextLayerId(icon), type: 'icon', icon, name: ICON_LIBRARY.find(item => item.kind === icon)?.label || 'Icon', visible: true,
    x: .82, y: .28, width: .08, height: .08,
    color: '#c8f43d', gradientColor: '#20d6a2', gradientEnabled: true, gradientAngle: 45, strokeWidth: 6,
    opacity: 1, borderEnabled: false, borderColor: '#ffffff', borderWidth: 2, borderStyle: 'solid',
  };
}

function makeTableLayer(index = 1) {
  return {
    id: nextLayerId('table'), type: 'table', name: `Хүснэгт ${index}`, visible: true, x: .08, y: .46, width: .84, height: .26,
    rows: 3, columns: 2, rowHeight: 72, tableStyle: 'grid', radius: 9,
    text: 'Үзүүлэлт|Нөхцөл\nЗээлийн хэмжээ|Үнэлгээнээс хамаарна\nХугацаа|Гэрээгээр тохирно',
    font: FONT_OPTIONS[0].value, size: 25, weight: 700,
    color: '#ffffff', gradientColor: '#e9eee6', gradientEnabled: true, gradientAngle: 90,
    headerColor: '#c8f43d', textColor: '#111310', headerTextColor: '#111310',
    opacity: .96, borderEnabled: true, borderColor: '#c7ccc3', borderWidth: 2, borderStyle: 'solid',
  };
}

function drawTextLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const lineHeight = layer.size * (Number(layer.lineHeight) || 1.15);
  context.font = `${layer.weight || 700} ${layer.size}px ${layer.font || FONT_OPTIONS[0].value}`;
  const lines = splitLines(context, layer.text, width).slice(0, 12);
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const paint = paintForBox(context, layer, x, y, width, height);
  context.textBaseline = 'top';
  context.textAlign = layer.align || 'left';
  const textX = layer.align === 'center' ? x + width / 2 : layer.align === 'right' ? x + width : x;
  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight;
    if (layer.borderEnabled && line) {
      context.strokeStyle = layer.borderColor || '#101310';
      context.lineWidth = Math.max(1, Number(layer.borderWidth) || 2);
      context.lineJoin = 'round';
      applyDash(context, layer.borderStyle, context.lineWidth);
      context.strokeText(line, textX, lineY, width);
    }
    context.fillStyle = paint;
    context.fillText(line, textX, lineY, width);
  });
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  return { x, y, width, height };
}

function drawButtonLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const height = Math.max(layer.height * canvasHeight, layer.size * 2.15);
  context.fillStyle = paintForBox(context, layer, x, y, width, height);
  roundedPath(context, x, y, width, height, clamp(layer.radius, 0, height / 2));
  context.fill();
  drawLayerBorder(context, layer, { x, y, width, height }, clamp(layer.radius, 0, height / 2));
  context.fillStyle = layer.textColor || '#101310';
  context.font = `${layer.weight || 800} ${layer.size}px ${layer.font || FONT_OPTIONS[0].value}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(layer.text || '', x + width / 2, y + height / 2, width - 30);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  return { x, y, width, height };
}

function drawShapeLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const height = Math.max(8, layer.height * canvasHeight);
  context.fillStyle = paintForBox(context, layer, x, y, width, height);
  if (layer.shape === 'circle') {
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (layer.shape === 'triangle') {
    context.beginPath();
    context.moveTo(x + width / 2, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
  } else if (layer.shape === 'star') {
    starPath(context, x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) / 4.3);
  } else {
    roundedPath(context, x, y, width, height, layer.shape === 'pill' ? height / 2 : clamp(layer.radius, 0, Math.min(width, height) / 2));
  }
  context.fill();
  if (layer.borderEnabled) {
    context.strokeStyle = layer.borderColor || '#ffffff';
    context.lineWidth = Math.max(1, Number(layer.borderWidth) || 2);
    applyDash(context, layer.borderStyle, context.lineWidth);
    context.stroke();
  }
  return { x, y, width, height };
}

function drawLineLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const height = Math.max(12, layer.height * canvasHeight);
  const centerY = y + height / 2;
  context.lineCap = 'round';
  if (layer.borderEnabled) {
    context.beginPath();
    context.moveTo(x, centerY);
    context.lineTo(x + width, centerY);
    context.strokeStyle = layer.borderColor || '#ffffff';
    context.lineWidth = (Number(layer.strokeWidth) || 6) + (Number(layer.borderWidth) || 2) * 2;
    applyDash(context, layer.borderStyle, context.lineWidth);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(x, centerY);
  context.lineTo(x + width, centerY);
  context.strokeStyle = paintForBox(context, layer, x, y, width, height);
  context.lineWidth = Number(layer.strokeWidth) || 6;
  applyDash(context, layer.lineStyle, context.lineWidth);
  context.stroke();
  context.setLineDash([]);
  return { x, y, width, height };
}

function traceIcon(context, icon) {
  context.beginPath();
  if (icon === 'message') {
    roundedPath(context, 8, 10, 84, 64, 15);
    context.moveTo(32, 74);
    context.lineTo(20, 91);
    context.lineTo(49, 74);
  } else if (icon === 'phone') {
    context.moveTo(28, 12);
    context.bezierCurveTo(18, 15, 14, 23, 17, 35);
    context.bezierCurveTo(25, 62, 42, 79, 67, 87);
    context.bezierCurveTo(80, 91, 88, 84, 91, 72);
    context.lineTo(70, 61);
    context.lineTo(59, 72);
    context.bezierCurveTo(47, 67, 33, 53, 28, 41);
    context.lineTo(40, 30);
    context.closePath();
  } else if (icon === 'pin') {
    context.moveTo(50, 94);
    context.bezierCurveTo(40, 80, 20, 60, 20, 38);
    context.bezierCurveTo(20, 20, 33, 8, 50, 8);
    context.bezierCurveTo(67, 8, 80, 20, 80, 38);
    context.bezierCurveTo(80, 60, 60, 80, 50, 94);
    context.closePath();
    context.moveTo(50, 28);
    context.arc(50, 38, 10, -Math.PI / 2, Math.PI * 1.5);
  } else if (icon === 'arrow') {
    context.moveTo(10, 50);
    context.lineTo(88, 50);
    context.moveTo(61, 22);
    context.lineTo(89, 50);
    context.lineTo(61, 78);
  } else if (icon === 'check') {
    context.moveTo(12, 52);
    context.lineTo(38, 78);
    context.lineTo(90, 22);
  } else if (icon === 'car') {
    roundedPath(context, 8, 38, 84, 38, 10);
    context.moveTo(24, 38);
    context.lineTo(36, 20);
    context.lineTo(68, 20);
    context.lineTo(80, 38);
    context.moveTo(28, 76);
    context.arc(28, 78, 8, -Math.PI / 2, Math.PI * 1.5);
    context.moveTo(72, 76);
    context.arc(72, 78, 8, -Math.PI / 2, Math.PI * 1.5);
  } else {
    starPath(context, 50, 50, 42, 19);
  }
}

function drawIconLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const size = Math.max(40, layer.width * canvasWidth);
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (layer.borderEnabled) {
    traceIcon(context, layer.icon);
    context.strokeStyle = layer.borderColor || '#ffffff';
    context.lineWidth = (Number(layer.strokeWidth) || 6) + (Number(layer.borderWidth) || 2) * 2;
    applyDash(context, layer.borderStyle, context.lineWidth);
    context.stroke();
  }
  traceIcon(context, layer.icon);
  context.strokeStyle = paintForBox(context, layer, 0, 0, 100, 100);
  context.lineWidth = Number(layer.strokeWidth) || 6;
  context.setLineDash([]);
  context.stroke();
  context.restore();
  return { x, y, width: size, height: size };
}

function tableCells(layer) {
  const rows = String(layer.text || '').split('\n').map(row => row.split('|').map(cell => cell.trim()));
  return Array.from({ length: layer.rows }, (_, rowIndex) => Array.from({ length: layer.columns }, (_, columnIndex) => rows[rowIndex]?.[columnIndex] || ''));
}

function drawTableLayer(context, layer, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const rowHeight = Number(layer.rowHeight) || 70;
  const height = layer.rows * rowHeight;
  const gap = layer.tableStyle === 'cards' ? 7 : 0;
  const cellWidth = width / layer.columns;
  const cells = tableCells(layer);
  const basePaint = paintForBox(context, layer, x, y, width, height);
  context.font = `${layer.weight || 650} ${layer.size || 24}px ${layer.font || FONT_OPTIONS[0].value}`;
  context.textBaseline = 'middle';

  cells.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    const cellX = x + columnIndex * cellWidth + gap / 2;
    const cellY = y + rowIndex * rowHeight + gap / 2;
    const cellW = cellWidth - gap;
    const cellH = rowHeight - gap;
    const isHeader = rowIndex === 0;
    const isStriped = layer.tableStyle === 'striped' && rowIndex % 2 === 1;
    if (layer.tableStyle !== 'minimal') {
      context.fillStyle = isHeader ? layer.headerColor : isStriped ? layer.gradientColor : basePaint;
      roundedPath(context, cellX, cellY, cellW, cellH, layer.tableStyle === 'cards' ? layer.radius : 0);
      context.fill();
    }
    if (layer.borderEnabled) {
      context.strokeStyle = layer.borderColor || '#c7ccc3';
      context.lineWidth = Math.max(1, Number(layer.borderWidth) || 2);
      applyDash(context, layer.borderStyle, context.lineWidth);
      if (layer.tableStyle === 'minimal') {
        context.beginPath();
        context.moveTo(cellX, cellY + cellH);
        context.lineTo(cellX + cellW, cellY + cellH);
      } else {
        roundedPath(context, cellX, cellY, cellW, cellH, layer.tableStyle === 'cards' ? layer.radius : 0);
      }
      context.stroke();
    }
    context.fillStyle = isHeader ? layer.headerTextColor : layer.textColor;
    context.textAlign = 'left';
    context.fillText(cell, cellX + 14, cellY + cellH / 2, cellW - 28);
  }));
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  return { x, y, width, height };
}

function drawLogoLayer(context, layer, logoImage, canvasWidth, canvasHeight) {
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  const width = layer.width * canvasWidth;
  const height = Math.max(48, layer.height * canvasHeight);
  let bounds = { x, y, width, height };
  if (logoImage && layer.recolor) {
    const mask = document.createElement('canvas');
    mask.width = Math.max(1, Math.round(width));
    mask.height = Math.max(1, Math.round(height));
    const maskContext = mask.getContext('2d');
    const localBounds = drawContained(maskContext, logoImage, 0, 0, mask.width, mask.height);
    maskContext.globalCompositeOperation = 'source-in';
    maskContext.fillStyle = paintForBox(maskContext, layer, 0, 0, mask.width, mask.height);
    maskContext.fillRect(0, 0, mask.width, mask.height);
    context.drawImage(mask, x, y);
    bounds = { x: x + localBounds.x, y: y + localBounds.y, width: localBounds.width, height: localBounds.height };
  } else if (logoImage) {
    bounds = drawContained(context, logoImage, x, y, width, height);
  } else {
    context.fillStyle = paintForBox(context, layer, x, y, width, height);
    context.font = `850 ${Math.max(24, height * .42)}px ${FONT_OPTIONS[0].value}`;
    context.fillText('Zentro Prime Capital', x, y + height * .6, width);
  }
  drawLayerBorder(context, layer, bounds, 4);
  return bounds;
}

function drawDesign({ canvas, backgroundImage, logoImage, layers, background, selected, showSelection }) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const bounds = {};
  drawCover(context, backgroundImage, width, height, background);
  context.save();
  context.globalAlpha = background.overlayOpacity;
  context.fillStyle = paintForBox(context, {
    color: background.overlayColor,
    gradientColor: background.overlayColor2,
    gradientEnabled: background.overlayGradientEnabled,
    gradientAngle: background.overlayGradientAngle,
  }, 0, 0, width, height);
  context.fillRect(0, 0, width, height);
  context.restore();

  layers.forEach(layer => {
    if (!layer.visible) return;
    context.save();
    context.globalAlpha = clamp(layer.opacity ?? 1, 0.05, 1);
    let box = null;
    if (layer.type === 'logo') box = drawLogoLayer(context, layer, logoImage, width, height);
    else if (layer.type === 'text') box = drawTextLayer(context, layer, width, height);
    else if (layer.type === 'button') box = drawButtonLayer(context, layer, width, height);
    else if (layer.type === 'shape') box = drawShapeLayer(context, layer, width, height);
    else if (layer.type === 'line') box = drawLineLayer(context, layer, width, height);
    else if (layer.type === 'icon') box = drawIconLayer(context, layer, width, height);
    else if (layer.type === 'table') box = drawTableLayer(context, layer, width, height);
    context.restore();
    if (box) bounds[layer.id] = box;
  });

  if (showSelection && bounds[selected]) {
    const box = bounds[selected];
    context.save();
    context.strokeStyle = '#ffffff';
    context.lineWidth = Math.max(2, width / 360);
    context.setLineDash([12, 8]);
    context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
    context.fillStyle = '#c8f43d';
    [[box.x - 8, box.y - 8], [box.x + box.width + 8, box.y - 8], [box.x - 8, box.y + box.height + 8], [box.x + box.width + 8, box.y + box.height + 8]].forEach(([dotX, dotY]) => {
      context.beginPath();
      context.arc(dotX, dotY, 7, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }
  return bounds;
}

function RangeControl({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return <label className="zf-design-range"><span className="z-label">{label} · {value}{suffix}</span><input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

function GradientControl({ layer, onChange, label = 'Үндсэн өнгө' }) {
  return <section className="zf-paint-control">
    <div className="zf-paint-heading"><span>{label}</span><label><input type="checkbox" checked={Boolean(layer.gradientEnabled)} onChange={event => onChange({ gradientEnabled: event.target.checked })} /> Уусалт</label></div>
    <div className="zf-design-control-grid">
      <label><small>Эхлэх өнгө</small><input type="color" value={layer.color || '#ffffff'} onChange={event => onChange({ color: event.target.value })} /></label>
      {layer.gradientEnabled && <label><small>Төгсөх өнгө</small><input type="color" value={layer.gradientColor || '#c8f43d'} onChange={event => onChange({ gradientColor: event.target.value })} /></label>}
    </div>
    {layer.gradientEnabled && <RangeControl label="Уусалтын өнцөг" value={Number(layer.gradientAngle) || 0} min={0} max={360} onChange={value => onChange({ gradientAngle: value })} suffix="°" />}
  </section>;
}

function BorderControl({ layer, onChange }) {
  return <section className="zf-border-control">
    <div className="zf-paint-heading"><span>Гадна хүрээ</span><label><input type="checkbox" checked={Boolean(layer.borderEnabled)} onChange={event => onChange({ borderEnabled: event.target.checked })} /> {layer.borderEnabled ? 'Хүрээтэй' : 'Хүрээгүй'}</label></div>
    {layer.borderEnabled && <>
      <div className="zf-design-control-grid">
        <label><small>Хүрээний өнгө</small><input type="color" value={layer.borderColor || '#ffffff'} onChange={event => onChange({ borderColor: event.target.value })} /></label>
        <label><small>Хэлбэр</small><select className="z-select" value={layer.borderStyle || 'solid'} onChange={event => onChange({ borderStyle: event.target.value })}><option value="solid">Үргэлжилсэн</option><option value="dashed">Тасархай</option><option value="dotted">Цэгэн</option></select></label>
      </div>
      <RangeControl label="Хүрээний өргөн" value={Number(layer.borderWidth) || 1} min={1} max={18} onChange={value => onChange({ borderWidth: value })} />
    </>}
  </section>;
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
  const [background, setBackground] = useState({
    zoom: 1, x: .5, y: .5, overlayOpacity: .4,
    overlayColor: '#101310', overlayColor2: '#24301d', overlayGradientEnabled: true, overlayGradientAngle: 90,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dimensions = useMemo(() => format === 'portrait' ? { width: 1080, height: 1350 } : { width: 1080, height: 1080 }, [format]);
  const activeLayer = layers.find(layer => layer.id === selected) || layers[0];

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

  const updateLayer = patch => setLayers(current => current.map(layer => layer.id === selected ? { ...layer, ...patch } : layer));

  const addLayer = layer => {
    if (layers.length >= MAX_LAYERS) {
      setError(`Нэг зурагт ${MAX_LAYERS} хүртэл layer ашиглана.`);
      return;
    }
    setLayers(current => [...current, layer]);
    setSelected(layer.id);
    setError('');
  };

  const duplicateLayer = () => {
    if (!activeLayer || layers.length >= MAX_LAYERS) return;
    const clone = { ...activeLayer, id: nextLayerId(activeLayer.type), name: `${activeLayer.name} хуулбар`, x: clamp(activeLayer.x + .025, 0, .9), y: clamp(activeLayer.y + .025, 0, .9) };
    addLayer(clone);
  };

  const removeLayer = () => {
    if (!activeLayer) return;
    const index = layers.findIndex(layer => layer.id === activeLayer.id);
    const remaining = layers.filter(layer => layer.id !== activeLayer.id);
    setLayers(remaining);
    setSelected(remaining[Math.max(0, index - 1)]?.id || remaining[0]?.id || '');
  };

  const moveLayer = direction => {
    const index = layers.findIndex(layer => layer.id === selected);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layers.length) return;
    setLayers(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const applyVariant = nextValue => {
    const next = ((nextValue % DESIGN_VARIANT_COUNT) + DESIGN_VARIANT_COUNT) % DESIGN_VARIANT_COUNT;
    const layout = DESIGN_LAYOUTS[next % DESIGN_LAYOUTS.length];
    const palette = DESIGN_PALETTES[Math.floor(next / DESIGN_LAYOUTS.length)];
    const layoutById = { logo: layout.logo, accent: layout.accent, headline: layout.headline, subtext: layout.subtext, cta: layout.cta };
    setVariant(next);
    setLayers(current => current.map(layer => {
      const placement = layoutById[layer.id];
      const base = placement ? { x: placement[0], y: placement[1], width: placement[2], ...(placement[3] ? { size: placement[3] } : {}) } : {};
      if (layer.id === 'headline') return { ...layer, ...base, color: palette.text, gradientColor: palette.accent };
      if (layer.id === 'subtext') return { ...layer, ...base, color: palette.muted, gradientColor: palette.accent };
      if (layer.id === 'cta') return { ...layer, ...base, color: palette.accent, gradientColor: palette.accent2, textColor: palette.buttonText };
      if (layer.id === 'accent') return { ...layer, ...base, color: palette.accent, gradientColor: palette.accent2 };
      if (layer.id === 'logo') return { ...layer, ...base, color: palette.text, gradientColor: palette.accent };
      return layer;
    }));
    setBackground(current => ({ ...current, overlayColor: palette.overlay, overlayColor2: palette.overlay2, overlayGradientEnabled: true, overlayOpacity: .42 }));
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
    const selectedBox = boundsRef.current[selected];
    if (selectedBox) {
      const handles = [
        { corner: 'nw', x: selectedBox.x - 8, y: selectedBox.y - 8 },
        { corner: 'ne', x: selectedBox.x + selectedBox.width + 8, y: selectedBox.y - 8 },
        { corner: 'sw', x: selectedBox.x - 8, y: selectedBox.y + selectedBox.height + 8 },
        { corner: 'se', x: selectedBox.x + selectedBox.width + 8, y: selectedBox.y + selectedBox.height + 8 },
      ];
      const handle = handles.find(item => Math.hypot(point.x - item.x, point.y - item.y) <= 24);
      if (handle && activeLayer) {
        dragRef.current = { mode: 'resize', id: selected, corner: handle.corner, box: { ...selectedBox }, layer: { ...activeLayer } };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
    }
    const hit = Object.entries(boundsRef.current).reverse().find(([, box]) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height);
    if (!hit) return;
    const [id, box] = hit;
    setSelected(id);
    dragRef.current = { mode: 'move', id, dx: point.x - box.x, dy: point.y - box.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = event => {
    if (!dragRef.current) return;
    const point = canvasPoint(event);
    const { id } = dragRef.current;
    if (dragRef.current.mode === 'resize') {
      const { corner, box, layer } = dragRef.current;
      const right = box.x + box.width;
      const bottom = box.y + box.height;
      const fromLeft = corner.endsWith('w');
      const fromTop = corner.startsWith('n');
      const nextX = fromLeft ? clamp(point.x, 0, right - 42) : box.x;
      const nextY = fromTop ? clamp(point.y, 0, bottom - 28) : box.y;
      const nextWidth = fromLeft ? right - nextX : clamp(point.x - box.x, 42, dimensions.width - box.x);
      const nextHeight = fromTop ? bottom - nextY : clamp(point.y - box.y, 28, dimensions.height - box.y);
      const widthRatio = nextWidth / Math.max(1, box.width);
      const heightRatio = nextHeight / Math.max(1, box.height);
      setLayers(current => current.map(item => {
        if (item.id !== id) return item;
        const patch = {
          x: nextX / dimensions.width,
          y: nextY / dimensions.height,
          width: clamp(nextWidth / dimensions.width, .04, .96),
        };
        if (['logo', 'shape', 'button'].includes(item.type)) patch.height = clamp(nextHeight / dimensions.height, .01, .7);
        if (item.type === 'text') patch.size = clamp(Math.round(layer.size * Math.min(widthRatio, heightRatio)), 14, 140);
        if (item.type === 'icon') patch.width = clamp(Math.min(nextWidth, nextHeight) / dimensions.width, .04, .6);
        if (item.type === 'table') patch.rowHeight = clamp(Math.round(layer.rowHeight * heightRatio), 40, 180);
        if (item.type === 'line') patch.strokeWidth = clamp(Math.round(layer.strokeWidth * Math.max(.5, heightRatio)), 2, 32);
        return { ...item, ...patch };
      }));
      return;
    }
    const { dx, dy } = dragRef.current;
    const box = boundsRef.current[id];
    setLayers(current => current.map(layer => layer.id === id ? {
      ...layer,
      x: clamp((point.x - dx) / dimensions.width, 0, Math.max(0, 1 - (box?.width || 0) / dimensions.width)),
      y: clamp((point.y - dy) / dimensions.height, 0, Math.max(0, 1 - (box?.height || 0) / dimensions.height)),
    } : layer));
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

  const textLayerCount = layers.filter(layer => layer.type === 'text').length;
  const tableLayerCount = layers.filter(layer => layer.type === 'table').length;
  const selectedIndex = layers.findIndex(layer => layer.id === selected);

  return <div className="zf-design-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="zf-design-dialog" role="dialog" aria-modal="true" aria-label="Facebook зургийн дизайн editor">
      <header><div><span>Visual editor</span><h2>Зар сурталчилгааны зураг</h2></div><button type="button" onClick={onClose} title="Хаах"><X size={18} /></button></header>
      <div className="zf-design-workspace">
        <div className="zf-design-stage">
          <div className="zf-design-stagebar"><div className="zf-design-segment"><button type="button" className={format === 'square' ? 'active' : ''} onClick={() => setFormat('square')}>1:1</button><button type="button" className={format === 'portrait' ? 'active' : ''} onClick={() => setFormat('portrait')}>4:5</button></div><span><LayoutGrid size={13} /> {layers.length} layer</span></div>
          <canvas ref={canvasRef} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
        </div>

        <aside className="zf-design-controls">
          <div className="zf-design-variant"><span>Дизайны хувилбар</span><button type="button" onClick={() => applyVariant(variant + 1)}><RefreshCw size={14} /> {String(variant + 1).padStart(2, '0')}/{DESIGN_VARIANT_COUNT}</button></div>

          <section className="zf-design-add-panel">
            <span className="zf-design-section-title">Нэмэх</span>
            <div className="zf-design-add-primary">
              <button type="button" onClick={() => addLayer(makeTextLayer(textLayerCount))}><Type size={15} /> Текст</button>
              <button type="button" onClick={() => addLayer(makeTableLayer(tableLayerCount + 1))}><Table2 size={15} /> Хүснэгт</button>
              <button type="button" onClick={() => addLayer(makeLineLayer())}><Minus size={15} /> Зураас</button>
            </div>
            <details open><summary><Shapes size={14} /> Дүрс</summary><div className="zf-design-library">{SHAPE_LIBRARY.map(item => <button type="button" onClick={() => addLayer(makeShapeLayer(item.kind))} title={item.label} key={item.kind}><item.Icon size={15} /><span>{item.label}</span></button>)}</div></details>
            <details><summary><Star size={14} /> Icon</summary><div className="zf-design-library">{ICON_LIBRARY.map(item => <button type="button" onClick={() => addLayer(makeIconLayer(item.kind))} title={item.label} key={item.kind}><item.Icon size={15} /><span>{item.label}</span></button>)}</div></details>
          </section>

          <section className="zf-layer-panel">
            <div className="zf-layer-panel-head"><span className="zf-design-section-title">Layer</span><div><button type="button" title="Хуулах" onClick={duplicateLayer} disabled={!activeLayer}><Copy size={13} /></button><button type="button" title="Устгах" onClick={removeLayer} disabled={!activeLayer}><Trash2 size={13} /></button></div></div>
            <div className="zf-layer-list">{[...layers].reverse().map(layer => { const MetaIcon = TYPE_META[layer.type]?.Icon || Square; return <div className={selected === layer.id ? 'active' : ''} key={layer.id}><button type="button" onClick={() => setSelected(layer.id)}><MetaIcon size={13} /><span>{layer.name}</span></button><button type="button" title={layer.visible ? 'Нуух' : 'Харуулах'} onClick={() => setLayers(current => current.map(item => item.id === layer.id ? { ...item, visible: !item.visible } : item))}>{layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button></div>; })}</div>
          </section>

          {activeLayer && <section className="zf-active-layer">
            <div className="zf-design-visible"><span>{activeLayer.name}</span><div><button type="button" title="Доошлуулах" disabled={selectedIndex <= 0} onClick={() => moveLayer(-1)}><ArrowDown size={14} /></button><button type="button" title="Дээшлүүлэх" disabled={selectedIndex >= layers.length - 1} onClick={() => moveLayer(1)}><ArrowUp size={14} /></button><button type="button" onClick={() => updateLayer({ visible: !activeLayer.visible })}>{activeLayer.visible ? <Eye size={14} /> : <EyeOff size={14} />}{activeLayer.visible ? 'Харагдана' : 'Нуусан'}</button></div></div>

            {activeLayer.type === 'logo' && <div className="zf-design-mode-row"><span>Логоны өнгө</span><div><button type="button" className={!activeLayer.recolor ? 'active' : ''} onClick={() => updateLayer({ recolor: false })}>Эх өнгө</button><button type="button" className={activeLayer.recolor ? 'active' : ''} onClick={() => updateLayer({ recolor: true })}>Өнгө солих</button></div></div>}

            {['text', 'button'].includes(activeLayer.type) && <>
              <label><span className="z-label">Текст</span><textarea className="z-input" rows={activeLayer.type === 'text' ? 4 : 3} value={activeLayer.text} onChange={event => updateLayer({ text: event.target.value })} /></label>
              <div className="zf-design-control-grid">
                <label><span className="z-label">Фонт</span><select className="z-select" value={activeLayer.font} onChange={event => updateLayer({ font: event.target.value })}>{FONT_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
                <label><span className="z-label">Жин</span><select className="z-select" value={activeLayer.weight} onChange={event => updateLayer({ weight: Number(event.target.value) })}><option value="400">Regular</option><option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option></select></label>
              </div>
              {activeLayer.type === 'text' && <div className="zf-design-mode-row"><span>Зэрэгцүүлэлт</span><div><button type="button" className={activeLayer.align === 'left' ? 'active' : ''} onClick={() => updateLayer({ align: 'left' })}>Зүүн</button><button type="button" className={activeLayer.align === 'center' ? 'active' : ''} onClick={() => updateLayer({ align: 'center' })}>Төв</button><button type="button" className={activeLayer.align === 'right' ? 'active' : ''} onClick={() => updateLayer({ align: 'right' })}>Баруун</button></div></div>}
              <RangeControl label="Үсгийн хэмжээ" value={activeLayer.size} min={14} max={140} onChange={value => updateLayer({ size: value })} />
              {activeLayer.type === 'text' && <RangeControl label="Мөр хооронд" value={activeLayer.lineHeight} min={.8} max={2} step={.05} onChange={value => updateLayer({ lineHeight: value })} />}
            </>}

            {activeLayer.type === 'shape' && <div className="zf-design-control-grid"><label><span className="z-label">Дүрс</span><select className="z-select" value={activeLayer.shape} onChange={event => updateLayer({ shape: event.target.value })}>{SHAPE_LIBRARY.map(item => <option value={item.kind} key={item.kind}>{item.label}</option>)}</select></label><label><span className="z-label">Булан</span><input className="z-input" type="number" min="0" max="100" value={activeLayer.radius || 0} onChange={event => updateLayer({ radius: Number(event.target.value) })} /></label></div>}

            {activeLayer.type === 'line' && <><div className="zf-design-control-grid"><label><span className="z-label">Зураасны төрөл</span><select className="z-select" value={activeLayer.lineStyle} onChange={event => updateLayer({ lineStyle: event.target.value })}><option value="solid">Үргэлжилсэн</option><option value="dashed">Тасархай</option><option value="dotted">Цэгэн</option></select></label></div><RangeControl label="Зураасны өргөн" value={activeLayer.strokeWidth} min={2} max={32} onChange={value => updateLayer({ strokeWidth: value })} /></>}

            {activeLayer.type === 'icon' && <><label><span className="z-label">Icon</span><select className="z-select" value={activeLayer.icon} onChange={event => updateLayer({ icon: event.target.value, name: ICON_LIBRARY.find(item => item.kind === event.target.value)?.label || activeLayer.name })}>{ICON_LIBRARY.map(item => <option value={item.kind} key={item.kind}>{item.label}</option>)}</select></label><RangeControl label="Icon зураас" value={activeLayer.strokeWidth} min={2} max={18} onChange={value => updateLayer({ strokeWidth: value })} /></>}

            {activeLayer.type === 'table' && <>
              <label><span className="z-label">Нүдний текст · мөр бүр шинэ мөр, багана | тэмдэг</span><textarea className="z-input" rows="5" value={activeLayer.text} onChange={event => updateLayer({ text: event.target.value })} /></label>
              <div className="zf-design-control-grid"><label><span className="z-label">Загвар</span><select className="z-select" value={activeLayer.tableStyle} onChange={event => updateLayer({ tableStyle: event.target.value })}><option value="grid">Сонгодог хүснэгт</option><option value="striped">Үелсэн мөр</option><option value="minimal">Минимал зураас</option><option value="cards">Тусдаа нүд</option></select></label><label><span className="z-label">Фонт</span><select className="z-select" value={activeLayer.font} onChange={event => updateLayer({ font: event.target.value })}>{FONT_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div>
              <div className="zf-design-control-grid"><label><span className="z-label">Толгойн өнгө</span><input type="color" value={activeLayer.headerColor} onChange={event => updateLayer({ headerColor: event.target.value })} /></label><label><span className="z-label">Текстийн өнгө</span><input type="color" value={activeLayer.textColor} onChange={event => updateLayer({ textColor: event.target.value, headerTextColor: event.target.value })} /></label></div>
              <RangeControl label="Мөр" value={activeLayer.rows} min={2} max={8} onChange={value => updateLayer({ rows: value })} />
              <RangeControl label="Багана" value={activeLayer.columns} min={2} max={5} onChange={value => updateLayer({ columns: value })} />
              <RangeControl label="Мөрийн өндөр" value={activeLayer.rowHeight} min={48} max={140} onChange={value => updateLayer({ rowHeight: value })} />
              <RangeControl label="Үсгийн хэмжээ" value={activeLayer.size} min={14} max={48} onChange={value => updateLayer({ size: value })} />
            </>}

            {activeLayer.type === 'button' && <><label><span className="z-label">Текстийн өнгө</span><input type="color" value={activeLayer.textColor} onChange={event => updateLayer({ textColor: event.target.value })} /></label><RangeControl label="Булан" value={activeLayer.radius} min={0} max={60} onChange={value => updateLayer({ radius: value })} /></>}

            <GradientControl layer={activeLayer} onChange={updateLayer} label={activeLayer.type === 'logo' ? 'Логоны шинэ өнгө' : activeLayer.type === 'table' ? 'Хүснэгтийн дэвсгэр' : 'Үндсэн өнгө'} />
            <BorderControl layer={activeLayer} onChange={updateLayer} />

            <RangeControl label="Өргөн" value={Math.round(activeLayer.width * 100)} min={4} max={96} onChange={value => updateLayer({ width: value / 100 })} suffix="%" />
            {['logo', 'shape', 'button'].includes(activeLayer.type) && <RangeControl label="Өндөр" value={Math.round((activeLayer.height || .08) * 100)} min={1} max={60} onChange={value => updateLayer({ height: value / 100 })} suffix="%" />}
            <RangeControl label="Тунгалаг байдал" value={Math.round((activeLayer.opacity ?? 1) * 100)} min={5} max={100} onChange={value => updateLayer({ opacity: value / 100 })} suffix="%" />
          </section>}

          <section className="zf-design-background">
            <span>Арын зураг</span>
            <RangeControl label="Томруулалт" value={Math.round(background.zoom * 100)} min={100} max={220} onChange={value => setBackground(current => ({ ...current, zoom: value / 100 }))} suffix="%" />
            <RangeControl label="Хэвтээ байрлал" value={Math.round(background.x * 100)} min={0} max={100} onChange={value => setBackground(current => ({ ...current, x: value / 100 }))} suffix="%" />
            <RangeControl label="Босоо байрлал" value={Math.round(background.y * 100)} min={0} max={100} onChange={value => setBackground(current => ({ ...current, y: value / 100 }))} suffix="%" />
            <RangeControl label="Overlay" value={Math.round(background.overlayOpacity * 100)} min={0} max={90} onChange={value => setBackground(current => ({ ...current, overlayOpacity: value / 100 }))} suffix="%" />
            <div className="zf-paint-heading"><span>Overlay өнгө</span><label><input type="checkbox" checked={background.overlayGradientEnabled} onChange={event => setBackground(current => ({ ...current, overlayGradientEnabled: event.target.checked }))} /> Уусалт</label></div>
            <div className="zf-design-control-grid"><label><small>Эхлэх</small><input type="color" value={background.overlayColor} onChange={event => setBackground(current => ({ ...current, overlayColor: event.target.value }))} /></label>{background.overlayGradientEnabled && <label><small>Төгсөх</small><input type="color" value={background.overlayColor2} onChange={event => setBackground(current => ({ ...current, overlayColor2: event.target.value }))} /></label>}</div>
            {background.overlayGradientEnabled && <RangeControl label="Уусалтын өнцөг" value={background.overlayGradientAngle} min={0} max={360} onChange={value => setBackground(current => ({ ...current, overlayGradientAngle: value }))} suffix="°" />}
          </section>

          {error && <small className="zf-design-error">{error}</small>}
          <button className="z-btn z-btn-primary zf-design-export" type="button" onClick={exportDesign} disabled={busy || !backgroundImage}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />} {busy ? 'Оруулж байна...' : 'PNG болгож постод ашиглах'}</button>
        </aside>
      </div>
    </section>
  </div>;
}
