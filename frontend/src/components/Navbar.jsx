import React, { useState, useMemo } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import logoWhite from '../assets/logo-white.png';
import { useAppContext } from '../context/AppContext';

export default function Navbar() {
  const { navigateTo, scrollToSection, currentView, scrolled, products } =
    useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { name: 'Нүүр', id: 'home' },
      {
        name: 'Бидний тухай',
        id: 'about-intro',
        submenu: [
          { name: 'Бид хэн бэ?', type: 'scroll', target: 'about-intro' },
          {
            name: 'Санхүүгийн үзүүлэлтүүд',
            type: 'scroll',
            target: 'financials',
          },
          {
            name: 'Компанийн засаглал',
            type: 'scroll',
            target: 'governance',
          },
        ],
      },
      {
        name: 'Бүтээгдэхүүн',
        id: 'products',
        submenu: products.map((prod) => ({
          name: prod.title,
          type: 'product',
          data: prod,
        })),
      },
      {
        name: 'Харилцагч болох',
        id: 'onboarding',
        type: 'view',
        view: 'onboarding',
      },
      { name: 'Блог', id: 'blog' },
      { name: 'Холбоо барих', id: 'contact' },
    ],
    [products]
  );

  const handleMenuItemClick = (item) => {
    if (item.type === 'view') {
      setMobileMenuOpen(false);
      navigateTo(item.view);
      return;
    }
    if (!item.submenu) {
      setMobileMenuOpen(false);
      scrollToSection(item.id);
    }
  };

  if (currentView === 'shogun_studio') return null;

  const isScrolledOrNotHome = scrolled || currentView !== 'home';

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolledOrNotHome
          ? 'bg-[#062842]/88 backdrop-blur-xl sc-nav-shell py-2.5 border-b border-white/10'
          : 'bg-transparent py-4 md:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
        {/* Logo */}
        <div
          className="cursor-pointer z-50 transition-transform hover:scale-105 duration-300"
          onClick={() => navigateTo('home')}
        >
          <img
            src={logoWhite}
            alt="Solongo Capital"
            className={`${
              isScrolledOrNotHome
                ? 'h-10 md:h-12 lg:h-14'
                : 'h-11 md:h-14 lg:h-20'
            } object-contain transition-all duration-300`}
          />
        </div>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-7">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="relative group h-full flex items-center"
            >
              <button
                onClick={() => handleMenuItemClick(item)}
                className={`flex items-center gap-1 rounded-full px-1 py-4 text-xs font-sans font-bold uppercase tracking-[0.14em] hover:text-[#D4AF37] transition-colors duration-300 ${
                  isScrolledOrNotHome ? 'text-gray-100' : 'text-white'
                }`}
              >
                {item.name}
                {item.submenu && (
                  <ChevronDown
                    size={12}
                    className="group-hover:rotate-180 transition-transform duration-300 text-[#D4AF37]/70"
                  />
                )}
              </button>

              {item.submenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 transform group-hover:translate-y-0 translate-y-4 w-72 perspective-1000">
                  <div className="bg-[#051a2a]/88 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-1.5 ring-1 ring-white/5">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/60 border-t border-l border-[#D4AF37]/20 rotate-45"></div>
                    {item.submenu.map((subItem, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (subItem.type === 'scroll') {
                            scrollToSection(subItem.target);
                          } else if (subItem.type === 'product') {
                            navigateTo('product_detail', subItem.data);
                          }
                        }}
                        className="text-left px-5 py-3.5 text-sm text-gray-200 hover:text-white hover:bg-[#D4AF37]/10 rounded-lg transition-all duration-300 font-sans font-medium border-b border-white/5 last:border-0 hover:pl-7 flex items-center group/item"
                      >
                        <span className="w-1 h-1 bg-[#D4AF37] rounded-full mr-3 opacity-0 group-hover/item:opacity-100 transition-opacity"></span>
                        {subItem.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => navigateTo('login')}
            className={`rounded-full px-6 py-2.5 font-sans text-xs font-extrabold uppercase tracking-widest transition-all duration-300 border ${
              isScrolledOrNotHome
                ? 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#062842]'
                : 'border-white/70 text-white hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-[#062842]'
            } ml-3`}
          >
            Нэвтрэх
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="z-50 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Цэс хаах' : 'Цэс нээх'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="absolute top-0 left-0 w-full h-screen bg-[#041621]/96 backdrop-blur-2xl flex flex-col items-center justify-center space-y-7 z-40 px-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                item.type === 'view'
                  ? navigateTo(item.view)
                  : scrollToSection(item.id)
              }
              className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-lg text-white font-display font-bold uppercase tracking-widest transition hover:border-[#D4AF37]/50 hover:bg-white/10"
            >
              {item.name}
            </button>
          ))}
          <button
            onClick={() => {
              navigateTo('login');
              setMobileMenuOpen(false);
            }}
            className="sc-primary-button mt-2 w-full max-w-sm rounded-full px-6 py-4 text-sm font-display font-extrabold uppercase tracking-widest transition"
          >
            Нэвтрэх
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-white/55 font-display font-bold uppercase mt-4 tracking-widest"
          >
            Хаах
          </button>
        </div>
      )}
    </nav>
  );
}
