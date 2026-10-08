import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
// 1. ICON-уудыг import хийх
import {
  Users, TrendingUp, ShieldCheck, PieChart, Briefcase, CreditCard,
  Building2,
  FileText, Scale, Quote, Network,
} from 'lucide-react';

// ======================================================================
// 2. ЗУРГУУД (Бүх import-ууд ЭНД байх ёстой)
// ======================================================================
// ======================================================================
// 2б. DATA ФАЙЛУУДЫН IMPORT (P2.1 refactor)
// ======================================================================
import {
  BACKGROUNDS,
  SECTION_RAINBOW_COLORS,
  getImage,
} from './data/constants';

// ======================================================================
// 2в. ROUTER болон HOOKS (P2.2, P2.3 refactor)
// ======================================================================
import { useScrolled } from './hooks/useScrolled';
import { useCmsData } from './hooks/useCmsData';
import { useRouting } from './hooks/useRouting';
import { AppContext } from './context/AppContext';
import Navbar from './components/Navbar';
import BackButton from './components/BackButton';
import ProductDetailPage from './pages/ProductDetailPage';
import GovernanceDetailPage from './pages/GovernanceDetailPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import PoliciesPage from './pages/PoliciesPage';
import PromotionDetailPage from './pages/PromotionDetailPage';
import ChatInfoDetailPage from './pages/ChatInfoDetailPage';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import ProductsSection from './sections/ProductsSection';
import BlogSection from './sections/BlogSection';
import FAQSection from './sections/FAQSection';
import ContactSection from './sections/ContactSection';

// ✅ ШИНЭЭР НЭМСЭН КОМПОНЕНТУУД
import BoardMembers from './components/BoardMembers';
import ManagementTeam from './components/ManagementTeam';
import ShareholderInfo from './components/ShareholderInfo';
import CEOContent from './components/CEOContent';
import ShogunStudio from './components/ShogunStudio';
import BlogList from './components/BlogList';
import LoanCalculator from './components/LoanCalculator';
import TrustCalculator from './components/TrustCalculator';
const LoanRequest = React.lazy(() => import('./components/LoanRequest'));
import Login from './components/Login';
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const TrustRequest = React.lazy(() => import('./components/TrustRequest'));
const CustomerOnboarding = React.lazy(() => import('./components/CustomerOnboarding'));
import ChatBot from './components/ChatBot'; // ✅ Чатбот нэмэгдсэн
import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';

// ======================================================================
// 3 & 4. Зураг холбох логик болон тохиргооны константууд
//         → src/data/constants.js болон src/data/products.js руу нүүлгэв
// ======================================================================

// hasBrokenEncoding — textOrFallback функцд хэрэглэгдэнэ (App.jsx-д үлдэнэ)
const hasBrokenEncoding = (value = '') => /[ÐÑÒÓ]|â|�/.test(String(value));
// normalizeFinancialStats → src/hooks/useCmsData.js руу нүүлгэв

// ======================================================================
// 5 & 6. getImage функц болон API_URL
//         → src/data/constants.js руу нүүлгэв
// ======================================================================

// ======================================================================
// 7. BACKGROUNDS болон SECTION_RAINBOW_COLORS
//    → src/data/constants.js руу нүүлгэв
// ======================================================================

// blogPosts → src/data/blogPosts.js руу нүүлгэв

// productsData → src/data/products.js руу нүүлгэв

// ======================================================================
// 9. ORG CHART КОМПОНЕНТҮҮД
// ======================================================================

const OrgCard = ({ title, role, variant = "glass", icon: Icon }) => {
  const isPrimary = variant === 'primary';
  const baseClasses = "flex flex-col items-center justify-center p-4 m-2 w-40 md:w-52 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl backdrop-blur-md";
  const styleClasses = isPrimary
    ? "bg-[#003B5C] border-[#D4AF37] shadow-lg shadow-black/50"
    : "bg-white/10 border-white/20 hover:bg-white/20 shadow-lg";

  return (
    <div className={`${baseClasses} ${styleClasses}`}>
      {Icon && (
        <div className={`mb-3 p-2.5 rounded-full border shadow-inner ${isPrimary ? "bg-[#002a42] border-[#D4AF37]/50 text-[#D4AF37]" : "bg-white/10 border-white/10 text-white"}`}>
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-sm font-bold text-white text-center uppercase leading-tight tracking-wide drop-shadow-md">
        {title}
      </h3>
      {role && <p className="text-[10px] text-blue-200/80 text-center mt-2 font-light">{role}</p>}
    </div>
  );
};

const Connector = () => <div className="w-0.5 h-8 bg-[#D4AF37]/60"></div>;

const OrgChart = () => {
  return (
    <div className="flex flex-col items-center p-4 md:p-10 font-sans w-full overflow-x-auto">
      <div className="min-w-[900px] flex flex-col items-center pb-20">
          <OrgCard title="Төлөөлөн удирдах зөвлөл" variant="primary" icon={Users} />
          <Connector />
          <OrgCard title="Гүйцэтгэх захирал" variant="primary" icon={Briefcase} />
          <Connector />
          <OrgCard title="Ерөнхий захирал" variant="primary" icon={Building2} />
          <Connector />
          <div className="relative w-full max-w-3xl flex justify-center items-center mb-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#D4AF37]/40 -z-10 mx-24"></div>
            <div className="flex justify-between w-full px-10 gap-10">
                  <div className="bg-[#003B5C]/80 backdrop-blur-md px-6 py-3 rounded-full border border-[#D4AF37]/50 text-xs md:text-sm font-bold text-white uppercase tracking-wider shadow-lg">
                    Удирдлагын хороо
                  </div>
                  <div className="bg-[#003B5C]/80 backdrop-blur-md px-6 py-3 rounded-full border border-[#D4AF37]/50 text-xs md:text-sm font-bold text-white uppercase tracking-wider shadow-lg">
                    Зээлийн хороо
                  </div>
            </div>
          </div>
          <div className="w-0.5 h-8 bg-[#D4AF37]/60 -mt-8"></div>
          <div className="grid grid-cols-3 gap-8 w-full max-w-6xl mt-4">
            <div className="flex flex-col items-center">
                <div className="w-full h-0.5 bg-[#D4AF37]/40 mb-4"></div>
                <OrgCard title="Зээлийн хэсэг" icon={CreditCard} variant="glass" />
                <Connector />
                <div className="flex flex-col items-center space-y-4 relative w-full">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -z-10"></div>
                    <OrgCard title="Борлуулалт" variant="glass" />
                    <OrgCard title="Салбар" variant="glass" />
                    <OrgCard title="Бүтээгдэхүүн удирдлага" variant="glass" />
                    <OrgCard title="Харилцагчийн үйлчилгээ" variant="glass" />
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-full h-0.5 bg-[#D4AF37]/40 mb-4"></div>
                <OrgCard title="Санхүү" icon={TrendingUp} variant="glass" />
                <Connector />
                <div className="flex flex-col items-center space-y-4 relative w-full">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -z-10"></div>
                    <OrgCard title="Санхүү удирдлага" variant="glass" />
                    <OrgCard title="Тайлан бүртгэл" variant="glass" />
                    <OrgCard title="Судалгаа, шинжилгээ" variant="glass" />
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-full h-0.5 bg-[#D4AF37]/40 mb-4"></div>
                <OrgCard title="Үйл ажиллагаа" icon={Briefcase} variant="glass" />
                <Connector />
                <div className="flex flex-col items-center space-y-4 relative w-full">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -z-10"></div>
                    <OrgCard title="Хүний нөөц" icon={Users} variant="glass" />
                    <OrgCard title="Хууль, комплианс" icon={ShieldCheck} variant="glass" />
                    <OrgCard title="Эрсдэлийн удирдлага" icon={PieChart} variant="glass" />
                    <OrgCard title="Мэдээллийн технологи" variant="glass" />
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};


const governanceItems = [
    {
        slug: 'ceo',
        title: "Гүйцэтгэх захирлын мэндчилгээ",
        icon: Quote,
        component: <CEOContent />,
        content: "Эрхэм харилцагч танд энэ өдрийн мэндийг хүргэе...",
        bgImage: getImage("https://images.unsplash.com/photo-1557804506-669a67965ba0?lib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    },
    {
        slug: 'org-chart',
        title: "Компанийн бүтэц",
        icon: Network,
        component: <OrgChart />,
        content: "Компанийн бүтэц зохион байгуулалтын схем.",
        bgImage: getImage("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    },
    {
        slug: 'board',
        title: "Төлөөлөн удирдах зөвлөл",
        icon: Scale,
        component: <BoardMembers />,
        content: "ТУЗ-ийн гишүүдийн танилцуулга.",
        bgImage: getImage("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    },
    {
        slug: 'management',
        title: "Удирдлагын баг",
        icon: Users,
        component: <ManagementTeam />,
        content: "Гүйцэтгэх удирдлагын багийн танилцуулга.",
        bgImage: getImage("https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    },
    {
        slug: 'shareholders',
        title: "Хувьцаа эзэмшигчдийн мэдээлэл",
        icon: PieChart,
        component: <ShareholderInfo />,
        content: "100% дотоодын хөрөнгө оруулалттай.",
        bgImage: getImage("https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    },
    {
        slug: 'policies',
        title: "Байгууллагын бодлого журам",
        icon: FileText,
        isLink: true,
        linkType: 'policies',
        content: null,
        bgImage: getImage("https://images.unsplash.com/photo-1450101499163-c8848c66ca85?lib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")
    }
];
// menuItems нь доор App компонент дотор useMemo-р тодорхойлогдоно


// ======================================================================
// 10. КОМПОНЕНТУУД (UI)
// ======================================================================

// ======================================================================
// 11. ХУУДАСНУУД (Pages)
// ======================================================================

const UnderConstructionPage = ({ onBack, title = "Хөгжүүлэлт хийгдэж байна" }) => {
    useEffect(() => window.scrollTo(0, 0), []);
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 md:px-6"
             style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
        >
            <div className="absolute inset-0 sc-overlay-90"></div>
            <BackButton onClick={onBack} />

            <div className="relative z-10 w-full max-w-5xl">
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="text-5xl md:text-6xl animate-pulse">🚧</div>
                    <h1 className="font-display font-bold text-3xl md:text-4xl text-[#D4AF37]">{title}</h1>
                    <p className="font-sans text-gray-300 text-base md:text-lg leading-relaxed px-4 font-medium">
                        This section is under development.<br/>
                        We’re finalizing the content to ensure accuracy.
                    </p>
                    <div className="w-16 h-1 bg-[#D4AF37] mx-auto rounded-full mt-4"></div>
                </div>
            </div>
        </div>
    );
};


function App() {
  // ── P2.3: Custom hooks ──────────────────────────────────────────────
  const scrolled = useScrolled(50);
  const { cfg, financialStats, products, promotions } = useCmsData();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('scm_auth');
      return saved ? JSON.parse(saved).user : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState(() => {
    try {
      const saved = localStorage.getItem('scm_auth');
      return saved ? JSON.parse(saved).token : null;
    } catch {
      return null;
    }
  });

  const {
    currentView,
    selectedItem,
    selectedGovernance,
    setCurrentView,
    navigateTo: routingNavigateTo,
    scrollToSection: routingScrollToSection,
  } = useRouting({ products, promotions, governanceItems });

  // navigateTo — wrap хийнэ
  const navigateTo = (view, item = null, govItem = null) => {
    routingNavigateTo(view, item, govItem);
  };

  // scrollToSection — currentView дамжуулна
  const scrollToSection = (id) => {
    routingScrollToSection(id, currentView, () => {});
  };

  // useScrolled, useCmsData, useRouting hook-уудад шилжсэн

  const handleLoginSuccess = (user, token) => {
    localStorage.setItem('scm_auth', JSON.stringify({ user, token }));
    setCurrentUser(user);
    setAuthToken(token);
    setCurrentView('admin');
    window.history.pushState({ view: 'admin', path: '/admin' }, '', '/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('scm_auth');
    setCurrentUser(null);
    setAuthToken(null);
    setCurrentView('home');
    window.history.pushState({ view: 'home', path: '/' }, '', '/');
  };

  // scrollToSection → useRouting hook-д шилжсэн, дээр wrap хийгдсэн

  const handleGovernanceClick = (item) => {
    if (item.isLink) {
      navigateTo(item.linkType);
    } else {
      navigateTo('governance_detail', null, item);
    }
  };

  const themeMode = cfg.theme_mode || 'dark';
  const themeType = cfg.theme_type || 'default';
  const themeColor = cfg.theme_color || '#003B5C';
  const themeImage = cfg.theme_image || '';
  const sectionThemeImages = {
    home: cfg.theme_image_home || themeImage,
    about: cfg.theme_image_about || themeImage,
    financials: cfg.theme_image_financials || themeImage,
    governance: cfg.theme_image_governance || themeImage,
    products: cfg.theme_image_products || themeImage,
    blog: cfg.theme_image_blog || themeImage,
    contact: cfg.theme_image_contact || themeImage,
  };

  // When color mode: keep overlays transparent so each section shows its solid rainbow color cleanly.
  const overlayRgb = themeType === 'color' ? '0, 0, 0' : '0, 59, 92';
  // Light mode uses much lighter overlays
  const isLight = themeMode === 'light';
  const oMul = themeType === 'color' ? 0 : (isLight ? 0.15 : 1);

  const themeStyle = themeType === 'color'
    ? {}
    : themeType === 'image' && themeImage
      ? { backgroundSize: 'cover', backgroundAttachment: 'fixed' }
      : {};

  const getSectionBackgroundStyle = (sectionKey, defaultImage, options = {}) => {
    const {
      fixed = true,
      position = 'center',
      size = 'cover',
    } = options;

    if (themeType === 'color') {
      return {
        backgroundColor: SECTION_RAINBOW_COLORS[sectionKey] || themeColor,
        backgroundPosition: position,
        backgroundSize: size,
        ...(fixed ? { backgroundAttachment: 'fixed' } : {}),
      };
    }

    if (themeType === 'image' && sectionThemeImages[sectionKey]) {
      return {
        backgroundImage: `url(${sectionThemeImages[sectionKey]})`,
        backgroundPosition: position,
        backgroundSize: size,
        ...(fixed ? { backgroundAttachment: 'fixed' } : {}),
      };
    }

    return {
      backgroundImage: `url(${defaultImage})`,
      backgroundPosition: position,
      backgroundSize: size,
      ...(fixed ? { backgroundAttachment: 'fixed' } : {}),
    };
  };

  const textOrFallback = (value, fallback) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text && !hasBrokenEncoding(text) ? value : fallback;
  };

  const heroText = {
    line1: textOrFallback(cfg.hero_line1, 'Бизнесийн'),
    highlight: textOrFallback(cfg.hero_highlight, 'Өсөлтийг'),
    line2: textOrFallback(cfg.hero_line2, 'Дэмжинэ'),
    description: textOrFallback(cfg.hero_description, 'Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.'),
    button: textOrFallback(cfg.hero_button, 'Бүтээгдэхүүн үзэх'),
  };

  const contextValue = {
    cfg,
    financialStats,
    products,
    promotions,
    currentView,
    selectedItem,
    selectedGovernance,
    setCurrentView,
    navigateTo,
    scrollToSection,
    scrolled,
  };

  return (
    <AppContext.Provider value={contextValue}>
    <div className={`font-sans antialiased selection:bg-[#00A651] selection:text-white${isLight ? ' sc-light' : ''}`}
      style={themeStyle}>
      {/* P4.5 — Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-[#D4AF37] focus:text-[#041621] focus:rounded focus:font-bold"
      >
        Үндсэн агуулга руу очих
      </a>
      <style>{`
        .sc-overlay-60 { background-color: rgba(${overlayRgb}, ${(0.60 * oMul).toFixed(2)}) !important; }
        .sc-overlay-70 { background-color: rgba(${overlayRgb}, ${(0.70 * oMul).toFixed(2)}) !important; }
        .sc-overlay-80 { background-color: rgba(${overlayRgb}, ${(0.80 * oMul).toFixed(2)}) !important; }
        .sc-overlay-85 { background-color: rgba(${overlayRgb}, ${(0.85 * oMul).toFixed(2)}) !important; }
        .sc-overlay-90 { background-color: rgba(${overlayRgb}, ${(0.90 * oMul).toFixed(2)}) !important; }
        .sc-overlay-92 { background-color: rgba(${overlayRgb}, ${(0.92 * oMul).toFixed(2)}) !important; }
        .sc-overlay-97 { background-color: rgba(${overlayRgb}, ${(0.97 * oMul).toFixed(2)}) !important; }
        .sc-grad-bottom { background: linear-gradient(to top, rgba(${overlayRgb}, 1) 0%, rgba(${overlayRgb}, 0.6) 50%, transparent 100%) !important; }
        ${isLight ? `
        .sc-light section, .sc-light .min-h-screen { color: #1e293b; }
        .sc-light .text-white { color: #1e293b !important; }
        .sc-light .text-white\\/80, .sc-light .text-white\\/90 { color: #334155 !important; }
        .sc-light .text-gray-400, .sc-light .text-gray-300 { color: #475569 !important; }
        .sc-light .text-blue-100, .sc-light .text-blue-50 { color: #475569 !important; }
        ` : ''}
      `}</style>
      {themeType === 'image' && themeImage && (
        <div className="fixed inset-0 bg-black/40 pointer-events-none z-0"></div>
      )}

      {/* ✅ ЧАТБОТ ҮҮРД ХАРАГДАНА (z-index: 10000) */}
      <ChatBot />

      {currentView === 'admin' && currentUser && authToken ? (
        <ErrorBoundary>
          <React.Suspense fallback={<div className="min-h-screen bg-[#041621] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/></div>}>
            <AdminPanel user={currentUser} token={authToken} onLogout={handleLogout} />
          </React.Suspense>
        </ErrorBoundary>
      ) : (
        <>
            <BackButton onClick={() => navigateTo('home')} currentView={currentView} />
            <Navbar />

            <div id="main-content" tabIndex={-1}>
            {currentView === 'chat_info' && selectedItem?.product ? (
                <ChatInfoDetailPage />
            ) : currentView === 'product_detail' && selectedItem ? (
                <ProductDetailPage />
            ) : currentView === 'financials' ? (
                <FinancialReportsPage />
            ) : currentView === 'policies' ? (
                <PoliciesPage />
            ) : currentView === 'governance_detail' && selectedGovernance ? (
                <GovernanceDetailPage />
            ) : currentView === 'promotion_detail' && selectedItem ? (
                <PromotionDetailPage />
            ) : currentView === 'onboarding' ? (
                <ErrorBoundary>
                  <React.Suspense fallback={<div className="min-h-screen bg-[#041621] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/></div>}>
                    <CustomerOnboarding onBack={() => navigateTo('home')} />
                  </React.Suspense>
                </ErrorBoundary>
            ) : currentView === 'login' ? (
                <Login
                    onBack={() => navigateTo('home')}
                    onLogin={handleLoginSuccess}
                />
            ) : currentView === 'loan_request' ? (
                <ErrorBoundary>
                  <React.Suspense fallback={<div className="min-h-screen bg-[#041621] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/></div>}>
                    <LoanRequest onBack={() => navigateTo('home')} initialProduct={selectedItem} />
                  </React.Suspense>
                </ErrorBoundary>
            ) : currentView === 'calculator' ? (
                <LoanCalculator onBack={() => navigateTo('home')} />
            ) : currentView === 'trust_calculator' ? (
                <TrustCalculator onBack={() => navigateTo('home')} />
            ) : currentView === 'trust_request' ? (
                <ErrorBoundary>
                  <React.Suspense fallback={<div className="min-h-screen bg-[#041621] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/></div>}>
                    <TrustRequest onBack={() => navigateTo('home')} />
                  </React.Suspense>
                </ErrorBoundary>
              ) : currentView === 'blog_list' ? (
                <BlogList onBack={() => navigateTo('home')} />
            ) : currentView === 'shogun_studio' ? (
                <ShogunStudio onBack={() => navigateTo('home')} />
            ) : currentView === 'privacy_policy' ? (
                <PrivacyPolicyPage />
            ) : currentView === 'terms' ? (
                <TermsPage />
            ) : currentView === 'not_found' ? (
                <NotFoundPage />
            ) : (
                  <div>
                    <Helmet>
                      <title>Solongo Capital ББСБ — Найдвартай санхүүгийн түнш</title>
                      <meta name="description" content="Бизнесийн болон хэрэглээний зээл, итгэлцлийн хөрөнгө оруулалт. Хурдан шийдвэр, найдвартай үйлчилгээ." />
                      <meta property="og:title" content="Solongo Capital ББСБ" />
                      <meta property="og:locale" content="mn_MN" />
                    </Helmet>
                    <HeroSection heroText={heroText} />
                    <AboutSection
                      governanceItems={governanceItems}
                      getSectionBackgroundStyle={getSectionBackgroundStyle}
                      handleGovernanceClick={handleGovernanceClick}
                    />
                    <ProductsSection getSectionBackgroundStyle={getSectionBackgroundStyle} />
                    <BlogSection getSectionBackgroundStyle={getSectionBackgroundStyle} />
                    <FAQSection getSectionBackgroundStyle={getSectionBackgroundStyle} />
                    <ContactSection getSectionBackgroundStyle={getSectionBackgroundStyle} />
                  </div>
            )}
            </div>
        </>
      )}
    </div>
    </AppContext.Provider>
  );
}

export default App;
