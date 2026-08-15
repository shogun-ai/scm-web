import { DEFAULT_SEO } from './siteDefaults';

const DEFAULT_FAVICON = '/favicon.svg';

function publicHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function browserAssetUrl(value) {
  const asset = String(value || '').trim();
  if (/^data:image\//i.test(asset) || asset.startsWith('/')) return asset;
  return publicHttpUrl(asset);
}

function upsertMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    element?.remove();
    return null;
  }
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
  return element;
}

export function applyFavicon(value) {
  const href = browserAssetUrl(value) || DEFAULT_FAVICON;
  const icon = upsertLink('icon', href);
  if (icon) {
    if (href.endsWith('.svg') || href.startsWith('data:image/svg+xml')) icon.setAttribute('type', 'image/svg+xml');
    else icon.removeAttribute('type');
  }
  upsertLink('apple-touch-icon', href);
}

function structuredData(config, seo, canonicalUrl, socialImage) {
  const facebookUrl = publicHttpUrl(config.social?.facebookPageUrl);
  const logoUrl = publicHttpUrl(config.logoUrl);
  const products = (Array.isArray(config.products) ? config.products : []).slice(0, 8);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${canonicalUrl}#website`,
      url: canonicalUrl,
      name: seo.siteName || config.brandName,
      alternateName: 'Zentro',
      inLanguage: 'mn',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialService',
      '@id': `${canonicalUrl}#business`,
      name: config.brandName,
      url: canonicalUrl,
      description: seo.description,
      ...(logoUrl ? { logo: logoUrl } : {}),
      ...(socialImage ? { image: socialImage } : {}),
      ...(config.phone ? { telephone: config.phone } : {}),
      ...(config.email ? { email: config.email } : {}),
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.address || 'Улаанбаатар хот',
        addressLocality: 'Улаанбаатар',
        addressCountry: 'MN',
      },
      areaServed: { '@type': 'Country', name: 'Mongolia' },
      ...(facebookUrl ? { sameAs: [facebookUrl] } : {}),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Зээлийн бүтээгдэхүүн',
        itemListElement: products.map(product => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'LoanOrCredit',
            name: product.name,
            description: product.description,
            loanType: product.name,
            currency: 'MNT',
          },
        })),
      },
      potentialAction: {
        '@type': 'ApplyAction',
        target: `${canonicalUrl}#apply`,
        name: 'Зээлийн хүсэлт илгээх',
      },
    },
  ];
}

export function applyPublicMetadata(config) {
  if (!config || typeof document === 'undefined') return;
  const seo = { ...DEFAULT_SEO, ...(config.seo || {}) };
  const canonicalUrl = publicHttpUrl(seo.canonicalUrl) || DEFAULT_SEO.canonicalUrl;
  const heroImage = (Array.isArray(config.heroImages) ? config.heroImages : []).map(publicHttpUrl).find(Boolean) || '';
  const socialImage = publicHttpUrl(seo.socialImageUrl) || heroImage;
  const title = String(seo.title || DEFAULT_SEO.title).trim();
  const description = String(seo.description || DEFAULT_SEO.description).trim();
  const socialTitle = String(seo.socialTitle || title).trim();
  const socialDescription = String(seo.socialDescription || description).trim();

  document.documentElement.lang = 'mn';
  document.title = title;
  upsertMeta('meta[name="description"]', { name: 'description' }, description);
  upsertMeta('meta[name="keywords"]', { name: 'keywords' }, String(seo.keywords || '').trim());
  upsertMeta('meta[name="robots"]', { name: 'robots' }, 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'mn_MN');
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, seo.siteName || config.brandName);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, socialTitle);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, socialDescription);
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
  upsertMeta('meta[property="og:image"]', { property: 'og:image' }, socialImage);
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, socialImage ? 'summary_large_image' : 'summary');
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, socialTitle);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, socialDescription);
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, socialImage);
  upsertLink('canonical', canonicalUrl);
  applyFavicon(config.faviconUrl);

  let script = document.getElementById('zentro-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.id = 'zentro-structured-data';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(structuredData(config, seo, canonicalUrl, socialImage));
}

export function applyPrivateMetadata(title) {
  if (typeof document === 'undefined') return;
  document.title = `${title} | Zentro Prime Capital`;
  upsertMeta('meta[name="robots"]', { name: 'robots' }, 'noindex, nofollow, noarchive');
  document.getElementById('zentro-structured-data')?.remove();
}
