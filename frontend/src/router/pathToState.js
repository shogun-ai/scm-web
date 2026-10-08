// ======================================================================
// pathToState — P2.2 refactor
// URL pathname-г app view state болгон хөрвүүлнэ
// ======================================================================

import { VIEW_PATHS } from './paths';

/**
 * @param {string} pathname  — window.location.pathname
 * @param {string} hash      — window.location.hash
 * @param {Array}  prods     — products state массив
 * @param {Array}  promos    — promotions state массив
 * @param {Array}  govItems  — governanceItems массив
 * @returns {{ view: string, item: any, governance: any, scrollTo: string|null }}
 */
export function pathToState(pathname, hash, prods, promos, govItems) {
  if (pathname === '/' || pathname === '') {
    if (hash && hash !== '#home') return { view: 'home', item: null, governance: null, scrollTo: hash.replace('#', '') };
    return { view: 'home', item: null, governance: null, scrollTo: null };
  }
  if (pathname.startsWith('/products/')) {
    const key = pathname.replace('/products/', '');
    const item = prods.find(p => p.productKey === key || String(p.id) === key);
    return { view: item ? 'product_detail' : 'home', item: item || null, governance: null, scrollTo: null };
  }
  if (pathname.startsWith('/chat-info/')) {
    const [, , key, section, audience] = pathname.split('/');
    const item = prods.find(p => p.productKey === key || String(p.id) === key);
    return { view: item ? 'chat_info' : 'home', item: item ? { product: item, section, audience } : null, governance: null, scrollTo: null };
  }
  if (pathname.startsWith('/promo/')) {
    const slug = pathname.replace('/promo/', '');
    const item = promos.find(p => p.slug === slug);
    return { view: item ? 'promotion_detail' : 'home', item: item || null, governance: null, scrollTo: null };
  }
  if (pathname.startsWith('/governance/')) {
    const slug = pathname.replace('/governance/', '');
    const gov = govItems.find(g => g.slug === slug);
    if (gov?.isLink) return { view: gov.linkType, item: null, governance: null, scrollTo: null };
    return { view: gov ? 'governance_detail' : 'home', item: null, governance: gov || null, scrollTo: null };
  }
  const entry = Object.entries(VIEW_PATHS).find(([, p]) => p === pathname);
  if (entry) return { view: entry[0], item: null, governance: null, scrollTo: null };
  return { view: 'not_found', item: null, governance: null, scrollTo: null };
}
