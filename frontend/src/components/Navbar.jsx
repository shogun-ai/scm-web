import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import logoWhite from '../assets/logo-white.png';
import { useAppContext } from '../context/AppContext';

export default function Navbar() {
  const { navigateTo, scrollToSection, currentView, products } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const triggerRefs = useRef({});
  const items = useMemo(() => [
    { name: 'Нүүр', id: 'home' },
    { name: 'Бидний тухай', id: 'about-intro', children: [
      { name: 'Бид хэн бэ?', id: 'about-intro' },
      { name: 'Санхүүгийн үзүүлэлтүүд', id: 'financials' },
      { name: 'Компанийн засаглал', id: 'governance' },
    ] },
    { name: 'Бүтээгдэхүүн', id: 'products', children: (Array.isArray(products) ? products : []).map(product => ({ name: product.title, product })) },
    { name: 'Блог', id: 'blog' },
    { name: 'Холбоо барих', id: 'contact' },
  ], [products]);

  useEffect(() => {
    const outside = event => {
      if (!navRef.current?.contains(event.target)) {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    const escape = event => {
      if (event.key !== 'Escape') return;
      if (openDropdown) triggerRefs.current[openDropdown]?.focus();
      else if (mobileMenuOpen) toggleRef.current?.focus();
      setOpenDropdown(null);
      setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [openDropdown, mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1280px)');
    const containFocus = event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(navRef.current?.querySelectorAll('button, a[href]') || []).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const close = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener('change', close);
    document.addEventListener('keydown', containFocus);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener('change', close);
      document.removeEventListener('keydown', containFocus);
    };
  }, [mobileMenuOpen]);

  const go = item => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    if (item.product) navigateTo('product_detail', item.product);
    else if (item.view) navigateTo(item.view);
    else scrollToSection(item.id);
  };
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6C879]';
  if (currentView === 'shogun_studio') return null;

  return (
    <nav ref={navRef} aria-label="Үндсэн цэс" className="sc-public-nav fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#062842]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 md:px-8">
        <button type="button" onClick={() => go({ view: 'home' })} aria-label="Нүүр хуудас" className={`shrink-0 rounded-md ${focus}`}>
          <img src={logoWhite} alt="Solongo Capital" className="h-10 w-auto max-w-[180px] object-contain md:h-11" />
        </button>
        <div className="hidden items-center gap-1 xl:flex">
          {items.map(item => <div key={item.id} className="relative" onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpenDropdown(previous => previous === item.id ? null : previous);
          }}>
            <button type="button" ref={element => { triggerRefs.current[item.id] = element; }}
              onClick={() => item.children ? setOpenDropdown(openDropdown === item.id ? null : item.id) : go(item)}
              onKeyDown={event => {
                if (item.children && event.key === 'ArrowDown') {
                  event.preventDefault();
                  setOpenDropdown(item.id);
                  requestAnimationFrame(() => document.getElementById(`nav-${item.id}`)?.querySelector('button')?.focus());
                }
              }}
              aria-expanded={item.children ? openDropdown === item.id : undefined}
              aria-controls={item.children ? `nav-${item.id}` : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white ${focus}`}>
              {item.name}{item.children && <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />}
            </button>
            {item.children && openDropdown === item.id && <div id={`nav-${item.id}`} className="absolute left-0 top-full mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-[#062842] shadow-xl">
              {item.children.map((child, index) => <button type="button" key={index} onClick={() => go(child)} className={`block w-full rounded-xl px-4 py-3 text-left text-sm leading-relaxed transition hover:bg-slate-100 ${focus}`}>{child.name}</button>)}
            </div>}
          </div>)}
        </div>
        <div className="hidden shrink-0 items-center gap-4 xl:flex">
          <button type="button" onClick={() => go({ view: 'login' })} className={`rounded-lg px-2 py-3 text-sm text-white/80 hover:text-white ${focus}`}>Нэвтрэх</button>
          <button type="button" onClick={() => go({ view: 'loan_request' })} className={`flex items-center gap-2 rounded-full bg-[#E6C879] px-5 py-3 text-sm font-semibold text-[#062842] transition hover:bg-[#F0D997] ${focus}`}>Хүсэлт гаргах <ArrowUpRight size={16} aria-hidden="true" /></button>
        </div>
        <button type="button" ref={toggleRef} onClick={() => { setOpenDropdown(null); setMobileMenuOpen(!mobileMenuOpen); }} aria-label={mobileMenuOpen ? 'Цэс хаах' : 'Цэс нээх'} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 hover:bg-white/10 xl:hidden ${focus}`}>
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileMenuOpen && <div id="mobile-menu" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-white/10 bg-[#062842] px-5 pb-8 pt-3 xl:hidden">
        <div className="mx-auto max-w-xl">
          {items.map(item => <div key={item.id} className="border-b border-white/10 py-2">
            <button type="button" onClick={() => go(item)} className={`w-full rounded-lg px-3 py-3 text-left text-base font-medium hover:bg-white/5 ${focus}`}>{item.name}</button>
            {item.children && <div className="mb-2 ml-3 border-l border-white/15 pl-3">
              {item.children.map((child, index) => <button type="button" key={index} onClick={() => go(child)} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm leading-relaxed text-white/65 hover:bg-white/5 hover:text-white ${focus}`}>{child.name}</button>)}
            </div>}
          </div>)}
          <button type="button" onClick={() => go({ view: 'loan_request' })} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#E6C879] px-5 py-3.5 font-semibold text-[#062842] ${focus}`}>Хүсэлт гаргах <ArrowUpRight size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => go({ view: 'login' })} className={`mt-3 w-full rounded-full px-5 py-3 text-sm text-white/80 hover:bg-white/5 ${focus}`}>Нэвтрэх</button>
        </div>
      </div>}
    </nav>
  );
}
