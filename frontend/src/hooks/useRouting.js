import { useState, useEffect } from 'react';
import { VIEW_PATHS } from '../router/paths';
import { pathToState } from '../router/pathToState';

/**
 * URL-based routing hook.
 * @param {{ products: Array, promotions: Array, governanceItems: Array }} deps
 * @returns {{
 *   currentView: string,
 *   selectedItem: any,
 *   selectedGovernance: any,
 *   setCurrentView: Function,
 *   setSelectedItem: Function,
 *   setSelectedGovernance: Function,
 *   navigateTo: Function,
 *   scrollToSection: Function,
 *   getPath: Function,
 * }}
 */
export function useRouting({ products, promotions, governanceItems }) {
  const [currentView, setCurrentView] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGovernance, setSelectedGovernance] = useState(null);

  const getPath = (view, item) => {
    if (view === 'product_detail' && (item?.productKey || item?.id))
      return `/products/${item.productKey || item.id}`;
    if (view === 'promotion_detail' && item?.slug)
      return `/promo/${item.slug}`;
    if (view === 'governance_detail' && item?.slug)
      return `/governance/${item.slug}`;
    return VIEW_PATHS[view] || '/';
  };

  const navigateTo = (view, item = null, govItem = null) => {
    if (view === 'home') {
      setSelectedItem(null);
      setSelectedGovernance(null);
    } else {
      if (item) setSelectedItem(item);
      if (govItem) setSelectedGovernance(govItem);
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
    const pathTarget = view === 'governance_detail' ? govItem : item;
    const path = getPath(view, pathTarget);
    window.history.pushState({ view, path }, '', path);
  };

  const scrollToSection = (id, currentViewRef, setMobileMenuOpen) => {
    const path = id === 'home' ? '/' : `/#${id}`;
    window.history.pushState({ view: 'home', path }, '', path);
    if (setMobileMenuOpen) setMobileMenuOpen(false);
    if (currentViewRef !== 'home') {
      setCurrentView('home');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const { pathname, hash } = window.location;
    const s = pathToState(pathname, hash, products, promotions, governanceItems);
    if (pathname !== '/' || hash) {
      setCurrentView(s.view);
      setSelectedItem(s.item);
      if (s.governance) setSelectedGovernance(s.governance);
      if (s.scrollTo) {
        setTimeout(() => {
          document.getElementById(s.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    }
    const handlePop = () => {
      const { pathname: pn, hash: h } = window.location;
      const s2 = pathToState(pn, h, products, promotions, governanceItems);
      setCurrentView(s2.view);
      setSelectedItem(s2.item ?? null);
      setSelectedGovernance(s2.governance ?? null);
      if (s2.scrollTo) {
        setTimeout(() => {
          document.getElementById(s2.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [products, promotions, governanceItems]);

  return {
    currentView,
    selectedItem,
    selectedGovernance,
    setCurrentView,
    setSelectedItem,
    setSelectedGovernance,
    navigateTo,
    scrollToSection,
    getPath,
  };
}
