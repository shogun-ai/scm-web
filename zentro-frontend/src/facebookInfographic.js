export const INFOGRAPHIC_VARIANT_COUNT = 24;

const PALETTES = [
  { background: '#f2f4ef', ink: '#101310', muted: '#62685f', accent: '#c8f43d', accent2: '#315ed4', panel: '#ffffff', inverse: '#ffffff' },
  { background: '#111310', ink: '#f8faf5', muted: '#b8beb4', accent: '#ffcb3d', accent2: '#e85d4a', panel: '#252a25', inverse: '#101310' },
  { background: '#eaf6f1', ink: '#12342d', muted: '#567269', accent: '#19b890', accent2: '#e4a52c', panel: '#ffffff', inverse: '#ffffff' },
  { background: '#fff2f0', ink: '#421b25', muted: '#80636a', accent: '#ed6c56', accent2: '#2b6670', panel: '#ffffff', inverse: '#ffffff' },
];

function splitLines(context, text, maxWidth) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function fitLines(context, text, maxWidth, maxLines, startSize, minSize, weight = 800) {
  let size = startSize;
  let lines = [];
  do {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    lines = splitLines(context, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 4;
  } while (size >= minSize);
  return { size: Math.max(size, minSize), lines: lines.slice(0, maxLines) };
}

function drawLines(context, lines, x, y, lineHeight) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
  } else {
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
  context.fill();
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

function drawContainedImage(context, image, x, y, width, height) {
  if (!image?.naturalWidth || !image?.naturalHeight) return false;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  return true;
}

function drawBrand(context, model, palette, logo, x, y, width = 380, align = 'left', color = palette.ink) {
  if (logo) {
    const logoX = align === 'center' ? x - width / 2 : x;
    drawContainedImage(context, logo, logoX, y - 38, width, 62);
    return;
  }
  context.textAlign = align;
  context.fillStyle = color;
  context.font = '850 29px Arial, sans-serif';
  context.fillText(model.brand, x, y);
  context.textAlign = 'left';
}

function drawHeadline(context, text, x, y, width, options = {}) {
  const fitted = fitLines(context, text, width, options.maxLines || 4, options.startSize || 76, options.minSize || 46, 900);
  context.fillStyle = options.color;
  context.font = `900 ${fitted.size}px Arial, sans-serif`;
  context.textAlign = options.align || 'left';
  const bottom = drawLines(context, fitted.lines, x, y, fitted.size * (options.lineHeight || 1.06));
  context.textAlign = 'left';
  return bottom;
}

function drawSubtitle(context, text, x, y, width, options = {}) {
  const fitted = fitLines(context, text, width, options.maxLines || 3, options.startSize || 28, options.minSize || 21, 600);
  context.fillStyle = options.color;
  context.font = `600 ${fitted.size}px Arial, sans-serif`;
  context.textAlign = options.align || 'left';
  const bottom = drawLines(context, fitted.lines, x, y, fitted.size * 1.35);
  context.textAlign = 'left';
  return bottom;
}

function drawMetricCard(context, metric, palette, x, y, width, height, style = 'panel') {
  context.fillStyle = style === 'accent' ? palette.accent : palette.panel;
  roundedRect(context, x, y, width, height, 12);
  const ink = style === 'accent' ? palette.inverse : palette.ink;
  const muted = style === 'accent' ? palette.inverse : palette.muted;
  context.fillStyle = muted;
  context.font = '800 17px Arial, sans-serif';
  context.fillText(metric.label, x + 22, y + 37);
  const value = fitLines(context, metric.value, width - 44, 2, 29, 20, 850);
  context.fillStyle = ink;
  context.font = `850 ${value.size}px Arial, sans-serif`;
  drawLines(context, value.lines, x + 22, y + 84, value.size * 1.12);
}

function drawFooter(context, model, palette, options = {}) {
  const y = options.y || 1008;
  const x = options.x || 74;
  context.fillStyle = options.color || palette.ink;
  context.font = '750 20px Arial, sans-serif';
  context.textAlign = 'left';
  context.fillText(model.phone, x, y);
  context.textAlign = 'right';
  context.fillText('zentrocapitalgroup.com', options.right || 1006, y);
  context.textAlign = 'left';
  context.fillStyle = options.muted || palette.muted;
  context.font = '500 13px Arial, sans-serif';
  context.fillText(model.legal, x, y + 38);
}

function layoutClassic(context, model, palette, logo) {
  drawBrand(context, model, palette, logo, 78, 92);
  context.fillStyle = palette.accent;
  roundedRect(context, 78, 146, 176, 12, 6);
  const bottom = drawHeadline(context, model.headline, 78, 252, 910, { color: palette.ink, startSize: 78 });
  drawSubtitle(context, model.subheadline, 78, Math.min(bottom + 34, 590), 900, { color: palette.muted });
  const gap = 14;
  const width = (924 - gap * 2) / 3;
  model.metrics.forEach((metric, index) => drawMetricCard(context, metric, palette, 78 + index * (width + gap), 680, width, 146, index === 1 ? 'accent' : 'panel'));
  context.fillStyle = palette.accent2;
  roundedRect(context, 78, 858, 924, 88, 10);
  context.fillStyle = palette.inverse;
  context.font = '850 27px Arial, sans-serif';
  context.fillText('Мэдээллээ нягталж, шийдвэрээ тооцоотой гаргаарай', 106, 913);
  drawFooter(context, model, palette);
}

function layoutSplit(context, model, palette, logo) {
  context.fillStyle = palette.accent2;
  context.fillRect(0, 0, 704, 1080);
  context.fillStyle = palette.accent;
  context.fillRect(704, 0, 22, 1080);
  drawBrand(context, model, palette, logo, 68, 92, 360, 'left', palette.inverse);
  const bottom = drawHeadline(context, model.headline, 68, 230, 566, { color: palette.inverse, startSize: 70, minSize: 42 });
  drawSubtitle(context, model.subheadline, 68, Math.min(bottom + 34, 640), 566, { color: palette.inverse, startSize: 25 });
  context.fillStyle = palette.accent;
  context.font = '900 96px Arial, sans-serif';
  context.fillText(String(model.slot).padStart(2, '0'), 770, 145);
  model.metrics.forEach((metric, index) => drawMetricCard(context, metric, palette, 758, 220 + index * 188, 270, 160, index === 2 ? 'accent' : 'panel'));
  context.fillStyle = palette.inverse;
  context.font = '700 18px Arial, sans-serif';
  context.fillText(model.phone, 68, 1002);
  context.font = '500 13px Arial, sans-serif';
  context.fillText(model.legal, 68, 1042);
}

function layoutCentered(context, model, palette, logo) {
  context.fillStyle = palette.accent;
  context.fillRect(0, 0, 1080, 176);
  drawBrand(context, model, palette, logo, 540, 99, 360, 'center', palette.inverse);
  const bottom = drawHeadline(context, model.headline, 540, 292, 890, { color: palette.ink, align: 'center', startSize: 74 });
  drawSubtitle(context, model.subheadline, 540, Math.min(bottom + 34, 610), 790, { color: palette.muted, align: 'center' });
  const width = 254;
  model.metrics.forEach((metric, index) => drawMetricCard(context, metric, palette, 131 + index * 282, 690, width, 144, index === 0 ? 'accent' : 'panel'));
  context.fillStyle = palette.accent2;
  roundedRect(context, 286, 870, 508, 74, 37);
  context.fillStyle = palette.inverse;
  context.textAlign = 'center';
  context.font = '850 23px Arial, sans-serif';
  context.fillText('Санхүүгийн мэдлэг · зөв шийдвэр', 540, 916);
  context.textAlign = 'left';
  drawFooter(context, model, palette);
}

function layoutEditorial(context, model, palette, logo) {
  context.save();
  context.globalAlpha = 0.14;
  context.fillStyle = palette.accent2;
  context.font = '900 310px Arial, sans-serif';
  context.fillText(String(model.slot).padStart(2, '0'), 38, 315);
  context.restore();
  context.fillStyle = palette.accent;
  context.fillRect(246, 70, 14, 820);
  drawBrand(context, model, palette, logo, 302, 104);
  const bottom = drawHeadline(context, model.headline, 302, 248, 698, { color: palette.ink, startSize: 72, minSize: 42 });
  drawSubtitle(context, model.subheadline, 302, Math.min(bottom + 38, 632), 676, { color: palette.muted });
  const width = 220;
  model.metrics.forEach((metric, index) => drawMetricCard(context, metric, palette, 302 + index * 234, 700, width, 142, index === 2 ? 'accent' : 'panel'));
  context.fillStyle = palette.accent2;
  context.fillRect(0, 910, 1080, 170);
  drawFooter(context, model, palette, { color: palette.inverse, muted: palette.inverse, x: 74, right: 1006, y: 970 });
}

function layoutBands(context, model, palette, logo) {
  context.fillStyle = palette.accent2;
  context.fillRect(0, 0, 1080, 404);
  context.fillStyle = palette.accent;
  context.fillRect(0, 404, 1080, 18);
  drawBrand(context, model, palette, logo, 70, 84, 360, 'left', palette.inverse);
  drawHeadline(context, model.headline, 70, 205, 940, { color: palette.inverse, startSize: 66, minSize: 39, maxLines: 3 });
  drawSubtitle(context, model.subheadline, 70, 492, 930, { color: palette.ink, maxLines: 2 });
  model.metrics.forEach((metric, index) => {
    const y = 640 + index * 92;
    context.fillStyle = index === 1 ? palette.accent : palette.panel;
    roundedRect(context, 70, y, 940, 74, 8);
    context.fillStyle = index === 1 ? palette.inverse : palette.muted;
    context.font = '800 17px Arial, sans-serif';
    context.fillText(metric.label, 94, y + 44);
    context.fillStyle = index === 1 ? palette.inverse : palette.ink;
    context.textAlign = 'right';
    context.font = '850 25px Arial, sans-serif';
    context.fillText(metric.value, 984, y + 46);
    context.textAlign = 'left';
  });
  drawFooter(context, model, palette);
}

function layoutSidebar(context, model, palette, logo) {
  context.fillStyle = palette.accent;
  context.fillRect(0, 0, 246, 1080);
  context.fillStyle = palette.accent2;
  context.fillRect(246, 0, 18, 1080);
  context.fillStyle = palette.inverse;
  context.font = '900 78px Arial, sans-serif';
  context.fillText(String(model.slot).padStart(2, '0'), 56, 126);
  context.save();
  context.translate(72, 870);
  context.rotate(-Math.PI / 2);
  context.fillStyle = palette.inverse;
  context.font = '850 25px Arial, sans-serif';
  context.fillText(model.brand, 0, 0);
  context.restore();
  drawBrand(context, model, palette, logo, 318, 96);
  const bottom = drawHeadline(context, model.headline, 318, 238, 684, { color: palette.ink, startSize: 68, minSize: 40 });
  drawSubtitle(context, model.subheadline, 318, Math.min(bottom + 34, 620), 664, { color: palette.muted });
  const width = 208;
  model.metrics.forEach((metric, index) => drawMetricCard(context, metric, palette, 318 + index * 224, 706, width, 142, index === 0 ? 'accent' : 'panel'));
  drawFooter(context, model, palette, { x: 318, right: 1004 });
}

const LAYOUTS = [layoutClassic, layoutSplit, layoutCentered, layoutEditorial, layoutBands, layoutSidebar];

export async function createZentroInfographicFile(plan, config, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Инфографик canvas үүсгэж чадсангүй.');

  const rawVariant = Number(options.variantIndex ?? plan.visualVariant ?? 0) || 0;
  const variantIndex = ((rawVariant % INFOGRAPHIC_VARIANT_COUNT) + INFOGRAPHIC_VARIANT_COUNT) % INFOGRAPHIC_VARIANT_COUNT;
  const palette = PALETTES[Math.floor(variantIndex / LAYOUTS.length)];
  const layout = LAYOUTS[variantIndex % LAYOUTS.length];
  const product = config?.products?.[plan.productIndex] || config?.products?.[0] || {};
  const model = {
    brand: config?.brandName || 'Zentro Prime Capital',
    headline: plan.visualHeadline || plan.subject || plan.title || 'Санхүүгийн мэдлэг',
    subheadline: plan.visualSubheadline || product.description || 'Мэдээллээ нягталж, сонголтоо тооцоотой хийгээрэй.',
    metrics: [
      { label: 'ХҮҮ', value: product.rate || 'Нөхцөлөөр' },
      { label: 'ХУГАЦАА', value: product.term || 'Уян хатан' },
      { label: 'ХЭМЖЭЭ', value: product.amount || 'Үнэлгээгээр' },
    ],
    phone: config?.phone || '7599-1919',
    legal: config?.siteContent?.footerLegal || 'Зээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.',
    slot: plan.slot || 1,
  };
  const logo = await loadImage(config?.logoUrl);

  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  layout(context, model, palette, logo);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Инфографик файл үүсгэж чадсангүй.')), 'image/png', 0.96);
  });
  return new File([blob], `zentro-infographic-${plan.slot || 1}-v${String(variantIndex + 1).padStart(2, '0')}-${Date.now()}.png`, { type: 'image/png' });
}
