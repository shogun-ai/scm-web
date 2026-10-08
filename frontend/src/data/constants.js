// ======================================================================
// App-wide constants extracted from App.jsx (P2.1 refactor)
// ======================================================================

export const IS_VERTICAL_HERO_LOGO = true;
export const USE_GOLD_LOGO = true;
export const USE_LOCAL_IMAGES = true;
export const FINANCIAL_DATE = "2026 оны 3 сарын 31-ний байдлаар";

export const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://scm-okjs.onrender.com';

// Helper used by BACKGROUNDS — kept here so products.js can import it too
export const getImage = (onlineUrl, localVariable) => {
  if (USE_LOCAL_IMAGES && localVariable) {
    return localVariable;
  }
  return onlineUrl;
};

export const BACKGROUNDS = {
  hero: getImage(
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  about: getImage(
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  financials: getImage(
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  governance: getImage(
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  products: getImage(
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  blog: getImage(
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  contact: getImage(
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
  detail_page: getImage(
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
  ),
};

export const SECTION_RAINBOW_COLORS = {
  home: '#7f1d1d',
  about: '#9a3412',
  financials: '#854d0e',
  governance: '#166534',
  products: '#0f766e',
  blog: '#1d4ed8',
  contact: '#5b21b6',
};

export const PRODUCT_KEY_MAP = {
  1: 'biz_loan',
  2: 'car_loan',
  3: 'cons_loan',
  4: 'trust',
  5: 'credit_card',
  6: 're_loan',
  7: 'line_loan',
};

export const VIEW_PATHS = {
  home: '/',
  financials: '/financials',
  policies: '/policies',
  blog_list: '/blog',
  login: '/login',
  loan_request: '/loan-request',
  calculator: '/calculator',
  trust_calculator: '/trust-calculator',
  trust_request: '/trust-request',
  onboarding: '/onboarding',
  admin: '/admin',
  shogun_studio: '/shogun-studio',
  privacy_policy: '/privacy-policy',
  terms: '/terms',
  not_found: '/404',
};
