export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1800&q=88',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=86',
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1400&q=86',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=86',
];

export const FALLBACK_PRODUCTS = [
  {
    name: 'Машинаа унаад авах зээл',
    flowTitle: 'Машинаа унаад зээлээ ав',
    rate: 'Сарын 3.0%-аас',
    term: '1-24 сар',
    amount: 'Үнэлгээний 70% хүртэл',
    description: 'Автомашинаа барьцаалж, өдөр тутамдаа үргэлжлүүлэн унах боломжтой.',
    image: FALLBACK_IMAGES[0],
  },
  {
    name: 'Машин байршуулах зээл',
    flowTitle: 'Машинаа тавиад зээлээ ав',
    rate: 'Сарын 2.5%-аас',
    term: '1-12 сар',
    amount: 'Үнэлгээний 80% хүртэл',
    description: 'Орлого нотлохгүйгээр автомашинаа зориулалтын талбайд байршуулж шийдвэрлүүлнэ.',
    image: FALLBACK_IMAGES[1],
  },
  {
    name: 'Үнэт металл барьцаалсан зээл',
    flowTitle: 'Үнэт металлаа барьцаалаад зээлээ ав',
    rate: 'Уян хатан',
    term: '1-6 сар',
    amount: 'Үнэлгээнд суурилна',
    description: 'Алт, мөнгө болон үнэт эдлэлийн үнэлгээнд тулгуурласан шуурхай шийдэл.',
    image: FALLBACK_IMAGES[2],
  },
  {
    name: 'Барьцаагүй шуурхай зээл',
    flowTitle: 'Шуурхай хэрэгцээгээ өнөөдөр шийд',
    rate: 'Эрсдэлийн үнэлгээгээр',
    term: '1-6 сар',
    amount: 'Боломжит лимитээр',
    description: 'Богино хугацааны санхүүгийн хэрэгцээнд зориулсан хялбар хүсэлт.',
    image: FALLBACK_IMAGES[3],
  },
];

export const DEFAULT_SITE_CONTENT = {
  navProducts: 'Зээлийн шийдэл',
  navProcess: 'Хэрхэн авах вэ',
  navContact: 'Холбоо барих',
  loginLabel: 'Нэвтрэх',
  heroEyebrow: 'Zentro Prime Capital · Ломбардны зөвшөөрөлтэй',
  heroTitle: 'Машинаа унаад, зээлээ өнөөдөр ав.',
  heroText: 'Автомашинаа байршуулахгүйгээр барьцаалж, орлого нотлох шат дамжлагыг багасган шуурхай шийдвэрлүүлээрэй.',
  heroCta: 'Зээлийн боломжоо шалгах',
  heroNote: 'Онлайн хүсэлт 2-3 минут',
  trustItems: [
    { value: 'Шуурхай', label: 'Цөөн алхамт шийдвэр' },
    { value: 'Уян хатан', label: 'Машинаа унаад явах сонголт' },
    { value: 'Хялбар', label: 'Орлого нотлохгүй боломж' },
  ],
  productsEyebrow: 'Танд тохирох сонголт',
  productsTitle: 'Зээлийн шийдлээ харьцуул.',
  productsIntro: 'Нөхцөл бүрийг ойлгомжтой харьцуулж, өөрт тохирох бүтээгдэхүүнээ сонгоно.',
  productRateLabel: 'Хүү',
  productTermLabel: 'Хугацаа',
  productAmountLabel: 'Хэмжээ',
  flowEyebrow: 'Таны хэрэгцээ. Таны сонголт.',
  processEyebrow: 'Хэрхэн ажиллах вэ',
  processTitle: 'Нэг хүсэлт. Гурван энгийн алхам.',
  processText: 'Урт маягт, олон шат дамжлагагүй. Хүсэлтээс шийдвэр хүртэл шаардлагатай мэдээллийг л авна.',
  processSteps: [
    { title: 'Хүсэлтээ илгээх', text: 'Утас, хүсэж буй дүн болон барьцааны товч мэдээллээ оруулна.' },
    { title: 'Үнэлгээ, баталгаажуулалт', text: 'Манай ажилтан холбогдож нөхцөл, баримт болон барьцааны үнэлгээг баталгаажуулна.' },
    { title: 'Гэрээ, олголт', text: 'Нөхцөлөө зөвшөөрсний дараа гэрээг байгуулж зээлийг олгоно.' },
  ],
  formEyebrow: 'Онлайн хүсэлт',
  formTitle: 'Боломжоо шалгахад хэдхэн мэдээлэл хангалттай.',
  formText: 'Хүсэлт илгээснээр зээл батлагдсан гэж үзэхгүй. Манай ажилтан мэдээллийг шалгаад тантай холбогдоно.',
  formButton: 'Хүсэлт илгээх',
  formSending: 'Илгээж байна...',
  formSuccess: 'Таны хүсэлтийг хүлээн авлаа. Манай ажилтан удахгүй холбогдоно.',
  formPrivacy: 'Таны мэдээллийг зөвхөн хүсэлтийг шийдвэрлэх зорилгоор ашиглана.',
  footerText: 'Шуурхай хэрэгцээнд ойлгомжтой санхүүгийн шийдэл.',
  footerContactTitle: 'Холбоо барих',
  footerLegal: 'Зээлийн эцсийн нөхцөл нь үнэлгээ болон гэрээгээр баталгаажна.',
};

export const DEFAULT_THEME = {
  ink: '#111310',
  paper: '#f4f6f1',
  surface: '#ffffff',
  accent: '#c9f45b',
  softBlue: '#dceaf7',
  softRose: '#f4d4cf',
  logoWidth: 260,
  logoHeight: 52,
  heroOverlay: 68,
  heroPosition: 'center',
  heroGallerySeconds: 5.6,
  flowGallerySeconds: 3.2,
};

export const DEFAULT_SECTION_ORDER = ['hero', 'trust', 'products', 'flow', 'process', 'apply'];

export const DEFAULT_SECTION_STYLES = {
  hero: { minHeight: 690, background: '' },
  trust: { minHeight: 156, background: '#111310' },
  products: { minHeight: 620, background: '#ffffff' },
  flow: { minHeight: 520, background: '' },
  process: { minHeight: 500, background: '#f4f6f1' },
  apply: { minHeight: 650, background: '#111310' },
};

export const FIELD_LIBRARY = {
  name: { id: 'name', label: 'Овог, нэр', placeholder: 'Овог, нэр', type: 'text', required: true },
  phone: { id: 'phone', label: 'Утасны дугаар', placeholder: 'Утасны дугаар', type: 'tel', required: true },
  register: { id: 'register', label: 'Регистрийн дугаар', placeholder: 'Регистрийн дугаар', type: 'text' },
  email: { id: 'email', label: 'И-мэйл', placeholder: 'И-мэйл', type: 'email' },
  productType: { id: 'productType', label: 'Зээлийн төрөл', placeholder: 'Зээлийн төрөл сонгох', type: 'select' },
  amount: { id: 'amount', label: 'Хүсэж буй дүн', placeholder: 'Жишээ: 10,000,000', type: 'number' },
  termMonths: { id: 'termMonths', label: 'Хугацаа', placeholder: 'Сараар', type: 'number' },
  collateral: { id: 'collateral', label: 'Барьцааны мэдээлэл', placeholder: 'Машины марк, он, улсын дугаар эсвэл бусад барьцаа', type: 'textarea' },
  notes: { id: 'notes', label: 'Нэмэлт тайлбар', placeholder: 'Нэмэлт мэдээлэл байвал бичнэ үү', type: 'textarea' },
  vehicleCertificate: { id: 'vehicleCertificate', label: 'Тээврийн хэрэгслийн гэрчилгээ', placeholder: '', type: 'file', accept: 'image/*,.pdf' },
  idCard: { id: 'idCard', label: 'Иргэний үнэмлэх', placeholder: '', type: 'file', accept: 'image/*,.pdf' },
  collateralPhoto: { id: 'collateralPhoto', label: 'Барьцааны зураг', placeholder: '', type: 'file', accept: 'image/*' },
};

export const DEFAULT_FORM_FLOW = [
  { id: 'contact', title: 'Холбоо барих мэдээлэл', fields: ['name', 'phone', 'register'] },
  { id: 'loan', title: 'Зээлийн мэдээлэл', fields: ['productType', 'amount', 'termMonths', 'collateral'] },
];

export function normalizeImageGallery(images, fallback = '') {
  const source = Array.isArray(images) ? images : [];
  return [...new Set([...source, fallback]
    .map(image => (typeof image === 'string' ? image.trim() : ''))
    .filter(Boolean))]
    .slice(0, 5);
}

export function normalizeGallerySeconds(value, fallback = 5) {
  if (value === null || value === undefined || value === '') return fallback;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return fallback;
  return Math.min(30, Math.max(2, Math.round(seconds * 10) / 10));
}

export function normalizeField(field, index = 0) {
  if (typeof field === 'string') return { ...(FIELD_LIBRARY[field] || { id: field, label: field, placeholder: field, type: 'text' }) };
  const id = field?.id || `field-${index}`;
  return { ...(FIELD_LIBRARY[id] || {}), ...field, id };
}

export function normalizeSiteConfig(raw = {}) {
  const heroImages = normalizeImageGallery(raw.heroImages, raw.heroImage || FALLBACK_IMAGES[0]);
  const heroImage = heroImages[0] || FALLBACK_IMAGES[0];
  const products = raw.products?.length
    ? raw.products.map((product, index) => {
      const fallback = FALLBACK_PRODUCTS[index % FALLBACK_PRODUCTS.length];
      const images = normalizeImageGallery(product.images, product.image || product.imageUrl || fallback.image);
      return {
        ...fallback,
        ...product,
        flowTitle: product.flowTitle || fallback.flowTitle || product.name,
        image: images[0],
        images,
        gallerySeconds: normalizeGallerySeconds(product.gallerySeconds, 4.3 + index * 0.4),
      };
    })
    : FALLBACK_PRODUCTS.map((product, index) => ({
      ...product,
      images: normalizeImageGallery([], product.image),
      gallerySeconds: normalizeGallerySeconds(null, 4.3 + index * 0.4),
    }));
  const customSections = (Array.isArray(raw.customSections) ? raw.customSections : []).map(section => {
    if (section.type !== 'media') return section;
    const images = normalizeImageGallery(section.images, section.image || heroImage);
    return { ...section, image: images[0], images, gallerySeconds: normalizeGallerySeconds(section.gallerySeconds, 5) };
  });
  const validOrder = Array.isArray(raw.sectionOrder) && raw.sectionOrder.length ? raw.sectionOrder : DEFAULT_SECTION_ORDER;
  const sectionOrder = [...validOrder];
  for (const id of DEFAULT_SECTION_ORDER) if (!sectionOrder.includes(id)) sectionOrder.push(id);
  for (const section of customSections) if (!sectionOrder.includes(section.id)) sectionOrder.splice(Math.max(0, sectionOrder.indexOf('apply')), 0, section.id);

  return {
    ...raw,
    brandName: raw.brandName || 'Zentro Prime Capital',
    tagline: raw.tagline || 'Машинаа унаад, зээлээ ав',
    phone: raw.phone || '7599-1919',
    email: raw.email || 'info@zentrocapitalgroup.com',
    address: raw.address || 'Улаанбаатар хот',
    heroImage,
    heroImages,
    heroTitle: raw.heroTitle || DEFAULT_SITE_CONTENT.heroTitle,
    heroText: raw.heroText || DEFAULT_SITE_CONTENT.heroText,
    products,
    siteContent: {
      ...DEFAULT_SITE_CONTENT,
      ...(raw.siteContent || {}),
      trustItems: raw.siteContent?.trustItems?.length ? raw.siteContent.trustItems : DEFAULT_SITE_CONTENT.trustItems,
      processSteps: raw.siteContent?.processSteps?.length ? raw.siteContent.processSteps : DEFAULT_SITE_CONTENT.processSteps,
    },
    theme: {
      ...DEFAULT_THEME,
      ...(raw.theme || {}),
      heroGallerySeconds: normalizeGallerySeconds(raw.theme?.heroGallerySeconds, DEFAULT_THEME.heroGallerySeconds),
      flowGallerySeconds: normalizeGallerySeconds(raw.theme?.flowGallerySeconds, DEFAULT_THEME.flowGallerySeconds),
    },
    sectionOrder,
    sectionStyles: { ...DEFAULT_SECTION_STYLES, ...(raw.sectionStyles || {}) },
    elementStyles: raw.elementStyles || {},
    customSections,
    formFlow: raw.formFlow?.length ? raw.formFlow : DEFAULT_FORM_FLOW,
  };
}

export function getAtPath(source, path) {
  const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean);
  return parts.reduce((value, key) => value?.[key], source);
}

export function setAtPath(source, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean);
  if (!parts.length) return source;
  const root = Array.isArray(source) ? [...source] : { ...source };
  let cursor = root;
  let original = source;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
      return;
    }
    const originalChild = original?.[part];
    const next = Array.isArray(originalChild) ? [...originalChild] : { ...(originalChild || {}) };
    cursor[part] = next;
    cursor = next;
    original = originalChild;
  });
  return root;
}
