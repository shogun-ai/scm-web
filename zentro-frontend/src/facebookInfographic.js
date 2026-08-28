const PALETTES = {
  professional: { background: '#f2f3ef', ink: '#101310', muted: '#5f655d', accent: '#c8f43d', panel: '#ffffff' },
  direct: { background: '#101310', ink: '#ffffff', muted: '#b9c0b5', accent: '#c8f43d', panel: '#252a25' },
  educational: { background: '#ffffff', ink: '#171a16', muted: '#62685f', accent: '#d99b25', panel: '#f0f2ed' },
};

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
  return { size, lines: lines.slice(0, maxLines) };
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

export async function createZentroInfographicFile(plan, config) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Инфографик canvas үүсгэж чадсангүй.');

  const palette = PALETTES[plan.contentStyle] || PALETTES.professional;
  const product = config?.products?.[plan.productIndex] || config?.products?.[0] || {};
  const headline = plan.visualHeadline || plan.title || product.name || 'Шуурхай зээлийн шийдэл';
  const subheadline = plan.visualSubheadline || product.description || config?.heroText || '';
  const metrics = [
    { label: 'ХҮҮ', value: product.rate || 'Нөхцөлөөр' },
    { label: 'ХУГАЦАА', value: product.term || 'Уян хатан' },
    { label: 'ХЭМЖЭЭ', value: product.amount || 'Үнэлгээгээр' },
  ];

  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = palette.accent;
  context.fillRect(0, 0, 28, canvas.height);

  context.fillStyle = palette.ink;
  context.font = '800 32px Arial, sans-serif';
  context.fillText(config?.brandName || 'Zentro Prime Capital', 80, 96);
  context.fillStyle = palette.muted;
  context.font = '700 22px Arial, sans-serif';
  context.fillText('САНХҮҮГИЙН ШИЙДЭЛ', 80, 136);

  context.fillStyle = palette.accent;
  roundedRect(context, 80, 186, 164, 12, 6);

  const fitted = fitLines(context, headline, 900, 4, 82, 54, 900);
  context.fillStyle = palette.ink;
  context.font = `900 ${fitted.size}px Arial, sans-serif`;
  const headlineBottom = drawLines(context, fitted.lines, 80, 286, fitted.size * 1.06);

  context.fillStyle = palette.muted;
  const subtitle = fitLines(context, subheadline, 900, 3, 30, 24, 600);
  context.font = `600 ${subtitle.size}px Arial, sans-serif`;
  drawLines(context, subtitle.lines, 80, Math.min(headlineBottom + 40, 600), subtitle.size * 1.35);

  const panelY = 660;
  const gap = 16;
  const panelWidth = (920 - gap * 2) / 3;
  metrics.forEach((metric, index) => {
    const x = 80 + index * (panelWidth + gap);
    context.fillStyle = palette.panel;
    roundedRect(context, x, panelY, panelWidth, 154, 12);
    context.fillStyle = palette.muted;
    context.font = '800 18px Arial, sans-serif';
    context.fillText(metric.label, x + 24, panelY + 40);
    const value = fitLines(context, metric.value, panelWidth - 48, 2, 30, 22, 850);
    context.fillStyle = palette.ink;
    context.font = `850 ${value.size}px Arial, sans-serif`;
    drawLines(context, value.lines, x + 24, panelY + 88, value.size * 1.12);
  });

  context.fillStyle = palette.accent;
  roundedRect(context, 80, 850, 920, 104, 12);
  context.fillStyle = '#101310';
  context.font = '900 31px Arial, sans-serif';
  context.fillText('Messenger-ээр боломжоо шалгах', 112, 914);

  context.fillStyle = palette.ink;
  context.font = '750 22px Arial, sans-serif';
  context.fillText(config?.phone || '7599-1919', 80, 1012);
  context.textAlign = 'right';
  context.fillText('zentrocapitalgroup.com', 1000, 1012);
  context.textAlign = 'left';
  context.fillStyle = palette.muted;
  context.font = '500 14px Arial, sans-serif';
  context.fillText('Зээлийн эцсийн нөхцөл үнэлгээ болон гэрээгээр баталгаажна.', 80, 1052);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Инфографик файл үүсгэж чадсангүй.')), 'image/png', 0.96);
  });
  return new File([blob], `zentro-infographic-${plan.slot || 1}-${Date.now()}.png`, { type: 'image/png' });
}
