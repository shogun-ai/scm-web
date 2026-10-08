import React, { useEffect, useState } from 'react';
import logoWhiteVertical from './assets/logo-white-vertical.png';
// ======================================================================
// 1. ЛОГОНУУД (ХАМГИЙН НАЙДВАРТАЙ ХЭСЭГ)
// ======================================================================
// Таны assets дотор 'logo-white.png' болон 'logo-white-vertical.png' байгаа гэдэгт итгэлтэй байна.
import logoWhite from './assets/logo-white.png';

// --- АЮУЛГҮЙ ГОРИМ: БУСАД ЛОГОГ ТҮР ЦАГААН ЛОГОГООР ОРЛУУЛАХ ---
// Таны вэб сайт гацахгүй асах ёстой. Ассаны дараа та доорх import-уудын
// урд талын // тэмдгийг авахад л жинхэнэ логонууд чинь орно.
// АЛТЛАГ БОСОО ЛОГО: (Файл чинь src/assets/logo-gold-vertical.png гэж байгаа бол // ав)
const logoGoldVertical = logoWhiteVertical;
// import logoGoldVertical from './assets/logo-gold-vertical.png';
// ӨНГӨТ ЛОГО: (Файл чинь src/assets/logo-colored.png гэж байгаа бол // ав)
const logoColored = logoWhite;
// import logoColored from './assets/logo-colored.png'; 
const logoBlack = logoWhite;
const logoMetal = logoWhite;
// ======================================================================
// 2. ХЭРЭГЛЭГЧИЙН ТОХИРГОО (SETTINGS)
// ======================================================================
// ЛОГОНЫ ТОХИРГОО
const IS_VERTICAL_HERO_LOGO = true; // Голын лого босоо байх

const USE_GOLD_LOGO = true; // Голын лого Алтлаг байх (Дээр тохируулсанаар одоохондоо цагаан харагдана)

// ЗУРГИЙН ТОХИРГОО
// false = Интернетээс (Unsplash) уншина.
// true  = Компьютероос (src/assets) уншина.
const USE_LOCAL_IMAGES = false;
const FINANCIAL_DATE = "2025 оны 11 сарын 30-ны байдлаар";
// ======================================================================
// 3. ЗУРАГ СОНГОХ ФУНКЦ
// ======================================================================
const getImage = (onlineUrl, localVariable) => {
  if (USE_LOCAL_IMAGES && localVariable) {
    return localVariable;
  }
  return onlineUrl;
};
// ======================================================================
// 4. PDF ЛИНКҮҮД (public хавтас руу заана)
// ======================================================================
const financialReports = [
  { name: "2024 оны жилийн эцсийн тайлан", size: "4.5 MB", link: "/report-2024.pdf" },
  { name: "2023 оны жилийн эцсийн тайлан", size: "3.8 MB", link: "/report-2023.pdf" },
];
const policyFiles = [
  { name: "Компанийн засаглалын код", size: "2.1 MB", link: "/governance-code.pdf" },
  { name: "Ёс зүйн дүрэм", size: "1.5 MB", link: "/ethics-rule.pdf" },
];
// ======================================================================
// 5. ДЭВСГЭР ЗУРГУУД
// ======================================================================
const BACKGROUNDS = {
  hero: getImage("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  about: getImage("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  financials: getImage("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  governance: getImage("https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"), // Цэнхэр туяатай
  products: getImage("https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  blog: getImage("https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  contact: getImage("https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  detail_page: getImage("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")
};
const blogPosts = [
  { id: 1, date: "2025.01.15", title: "Санхүүгийн зохицуулах хорооны ээлжит хуралдаан боллоо", excerpt: "Хуралдаанаар банк бус санхүүгийн байгууллагуудын дүрмийн санд өөрчлөлт оруулах тухай хэлэлцлээ.", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id: 2, date: "2025.01.10", title: "Финтек зээлийн зах зээлийн тойм мэдээлэл", excerpt: "2024 оны 4-р улирлын байдлаар финтек зээлийн хэрэглээ өмнөх онтой харьцуулахад 30%-иар өссөн үзүүлэлттэй байна.", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id: 3, date: "2025.01.05", title: "Мөнгө угаах болон терроризмыг санхүүжүүлэхтэй тэмцэх сургалт", excerpt: "Санхүүгийн зохицуулах хорооноос ББСБ-уудын комплаенсын ажилтнуудад зориулсан сургалтыг амжилттай зохион байгууллаа.", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id: 4, date: "2024.12.28", title: "Хөрөнгийн зах зээлийн нээлттэй өдөрлөг", excerpt: "Иргэдэд санхүүгийн боловсрол олгох, хөрөнгийн зах зээлийн бүтээгдэхүүнийг таниулах өдөрлөг болж өнгөрлөө.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" }
];
const productsData = [
  {
    id: 1,
    title: "Бизнесийн зээл",
    icon: "🏢",
    bgImage: getImage("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Эргэлтийн хөрөнгө нэмэгдүүлэх, тоног төхөөрөмж худалдан авах.",
    description: "Бизнесийн үйл ажиллагаагаа өргөжүүлэх, эргэлтийн хөрөнгөө нэмэгдүүлэх, эсвэл шинэ тоног төхөөрөмж худалдан авахад тань зориулагдсан уян хатан нөхцөлтэй зээл.",
    individual: { conditions: ["Зээлийн хэмжээ: 500 сая хүртэл", "Хүү: 2.5% - 3.5%"], requirements: ["18 нас хүрсэн, Монгол улсын иргэн байх"] },
    organization: { conditions: ["Зээлийн хэмжээ: 1.5 тэрбум хүртэл"], requirements: ["Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн байх"] }
  },
  {
    id: 2,
    title: "Автомашины зээл",
    icon: "🚗",
    bgImage: getImage("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Шуурхай шийдвэрлэлт.",
    description: "Автомашин худалдан авах болон автомашин барьцаалсан зээлийн үйлчилгээ.",
    isCarLoan: true,
    purchase: { label: "Автомашины зээл", individual: { conditions: ["Зээл: Үнэлгээний 60%"], requirements: ["18 нас хүрсэн иргэн"] }, organization: { conditions: ["Зээл: Үнэлгээний 80%"], requirements: ["Компанийн нэр дээр бүртгэлтэй"] } },
    collateral: { label: "Автомашин барьцаалсан зээл", individual: { conditions: ["Зээл: Үнэлгээний 50%"], requirements: ["Өөрийн нэр дээрх машин"] }, organization: { conditions: ["Зээл: Үнэлгээний 60%"], requirements: ["Байгууллагын нэр дээрх тээврийн хэрэгсэл"] } }
  },
  {
    id: 3,
    title: "Хэрэглээний зээл",
    icon: "📱",
    bgImage: getImage("https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Барьцаагүй зээл.",
    description: "Иргэдийн хувийн хэрэгцээнд зориулсан, шуурхай шийдвэртэй, уян хатан нөхцөлтэй зээл",
    individual: { conditions: ["100 сая хүртэл"], requirements: ["Тогтмол орлоготой байх"] }
  },
  {
    id: 4,
    title: "Итгэлцэл",
    icon: "🤝",
    bgImage: getImage("https://images.unsplash.com/photo-1565514020176-db8217350024?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Өндөр өгөөж.",
    description: "Таны мөнгөн хөрөнгийг найдвартай өсгөх, өндөр өгөөжтэй хөрөнгө оруулалтын үйлчилгээ.",
  },
  {
    id: 5,
    title: "Кредит карт",
    icon: "💳",
    bgImage: getImage("https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1616422285623-13ff0162193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Санхүүгийн эрх чөлөө.",
    description: "Олон улсын эрхтэй кредит карт.",
    individual: { conditions: ["Зээлийн эрх: 10 сая хүртэл"], requirements: ["Тогтмол орлоготой байх"] },
    organization: { conditions: ["Зээлийн эрх: 50 сая хүртэл"], requirements: ["Байгууллагын дансны хуулга"] }
  },
  {
    id: 6,
    title: "Үл хөдлөх барьцаалсан зээл",
    icon: "🏠",
    bgImage: getImage("https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1486325212027-8081e485255e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Томоохон хэмжээний санхүүжилт.",
    description: "Үл хөдлөх хөрөнгө барьцаалсан зээл.",
    individual: { conditions: ["Зээлийн хэмжээ: Үнэлгээний 60%"], requirements: ["Үл хөдлөх хөрөнгийн гэрчилгээ"] },
    organization: { conditions: ["Зээлийн хэмжээ: Үнэлгээний 70%"], requirements: ["ААН-ийн гэрчилгээ"] }
  },
  {
    id: 7,
    title: "Шугмын зээл",
    icon: "📉",
    bgImage: getImage("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"),
    headerImage: getImage("https://images.unsplash.com/photo-1664575602554-2087b04935a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
    shortDesc: "Бизнесийн байнгын эргэлт.",
    description: "Богино хугацаат зээл.",
    organization: { conditions: ["Зээлийн эрх: Орлогын 40%"], requirements: ["Тогтвортой үйл ажиллагаа"] }
  }
];
const governanceItems = [
  { title: "Гүйцэтгэх захирлын мэндчилгээ", icon: "👋", content: "Эрхэм харилцагч танд энэ өдрийн мэндийг хүргэе...", bgImage: getImage("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
  { title: "Компанийн бүтэц", icon: "📊", content: "Компанийн бүтэц зохион байгуулалтын схем.", bgImage: getImage("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
  { title: "Төлөөлөн удирдах зөвлөл", icon: "⚖️", content: "ТУЗ-ийн гишүүдийн танилцуулга.", bgImage: getImage("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
  { title: "Удирдлагын баг", icon: "👥", content: "Гүйцэтгэх удирдлагын багийн танилцуулга.", bgImage: getImage("https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
  { title: "Хувьцаа эзэмшигчдийн мэдээлэл", icon: "📈", content: "100% дотоодын хөрөнгө оруулалттай.", bgImage: getImage("https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
  { title: "Байгууллагын бодлого журам", icon: "📜", isLink: true, linkType: 'policies', content: null, bgImage: getImage("https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") },
];
const menuItems = [
  { name: 'Нүүр', id: 'home' },
  { name: 'Бидний тухай', id: 'about-intro' },
  { name: 'Бүтээгдэхүүн', id: 'products' },
  { name: 'Блог', id: 'blog' },
  { name: 'Холбоо барих', id: 'contact' },
];
const financialStats = [
  { val: "10.5 Тэрбум", label: "Өөрийн хөрөнгө" },
  { val: "15.2 Тэрбум", label: "Нийт хөрөнгө" },
  { val: "12.8 Тэрбум", label: "Нийт зээлийн дүн" },
  { val: "2.1%", label: "Чанаргүй зээлийн хувь" },
  { val: "18.5%", label: "Өөрийн хөрөнгийн өгөөж (ROE)" },
  { val: "2.4%", label: "Дундаж хүү" },
];
// ======================================================================
// 6. КОМПОНЕНТУУД (UI)
// ======================================================================
const ScrollDownArrow = ({ targetId, color = "text-white/70" }) => {
  const scrollTo = () => {
    const element = document.getElementById(targetId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div className={`absolute bottom-8 left-0 right-0 mx-auto w-fit animate-bounce cursor-pointer flex flex-col items-center gap-2 ${color} z-20`} onClick={scrollTo}>
      <span className="text-[10px] font-display font-semibold uppercase tracking-widest drop-shadow-md">Доош гүйлгэх</span>
      <div className="text-xl drop-shadow-md">↓</div>
    </div>
  );
};
// ======================================================================
// 7. ХУУДАСНУУД (Pages)
// ======================================================================
const UnderConstructionPage = ({ onBack, title = "Хөгжүүлэлт хийгдэж байна" }) => {
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 md:px-6"
      style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 bg-[#003B5C]/90"></div>

      <div className="relative z-10 w-full max-w-5xl">
        <button onClick={onBack} className="absolute -top-32 left-0 flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs hover:underline">
          ← Буцах
        </button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-5xl md:text-6xl animate-pulse">🚧</div>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-[#D4AF37]">{title}</h1>
          <p className="font-sans text-gray-300 text-base md:text-lg leading-relaxed px-4">
            This section is under development.<br />
            We’re finalizing the content to ensure accuracy.
          </p>
          <div className="w-16 h-1 bg-[#D4AF37] mx-auto rounded-full mt-4"></div>
        </div>
      </div>
    </div>
  );
};
const GovernanceDetail = ({ item, onBack }) => {
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-6 text-center"
      style={{
        backgroundImage: `url(${item.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-[#003B5C]/70"></div>

      <div className="relative z-10 w-full max-w-4xl animate-fade-in-up">
        <button onClick={onBack} className="absolute -top-32 left-0 flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs hover:underline">
          ← Буцах
        </button>

        <div className="space-y-8">
          <div className="text-6xl md:text-8xl mb-4 text-[#D4AF37] opacity-90 drop-shadow-2xl">{item.icon}</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl text-white leading-tight drop-shadow-md">
            {item.title}
          </h1>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto rounded-full"></div>
          <p className="font-sans text-lg md:text-2xl text-blue-50 leading-relaxed font-light max-w-3xl mx-auto">
            {item.content}
          </p>
          <p className="text-white/40 text-sm italic mt-8">Дэлгэрэнгүй мэдээлэл удахгүй шинэчлэгдэнэ...</p>
        </div>
      </div>
    </div>
  );
};
const ProductDetail = ({ product, onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState(product.isCarLoan ? 'purchase' : 'individual');
  const [subTab, setSubTab] = useState('individual');
  const [trustForm, setTrustForm] = useState({ lastName: '', firstName: '', phone: '', email: '', amount: '' });

  useEffect(() => window.scrollTo(0, 0), []);

  const handleTrustSubmit = (e) => {
    e.preventDefault();
    const subject = `Итгэлцлийн хүсэлт: ${trustForm.lastName} ${trustForm.firstName}`;
    const body = `Овог: ${trustForm.lastName}%0D%0AНэр: ${trustForm.firstName}%0D%0AУтас: ${trustForm.phone}%0D%0AИмэйл: ${trustForm.email}%0D%0AДүн: ${trustForm.amount}`;
    window.location.href = `mailto:info@scm.mn?subject=${subject}&body=${body}`;
  };

  const isTrust = product.id === 4;

  const getData = () => {
    if (product.isCarLoan) return product[activeTab][subTab];
    return product[activeTab];
  };

  const currentData = getData();

  const getStandardTabs = () => {
    const tabs = [];
    if (product.individual) tabs.push({ key: 'individual', label: 'Иргэн' });
    if (product.organization) tabs.push({ key: 'organization', label: 'Байгууллага' });
    return tabs;
  };

  const headerBg = product.headerImage || BACKGROUNDS.detail_page;

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-6 relative text-white"
      style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 bg-[#003B5C]/90 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs mb-6 hover:underline shadow-sm">
          ← Буцах
        </button>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-fade-in-up">
          <div
            className="relative h-64 md:h-80 overflow-hidden flex items-end p-8 md:p-12"
            style={{
              backgroundImage: `url(${headerBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#003B5C] via-[#003B5C]/60 to-transparent"></div>
            <div className="relative z-10 text-white w-full">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl md:text-5xl text-[#D4AF37]">{product.icon}</span>
                <h1 className="font-display font-bold text-3xl md:text-5xl leading-tight text-[#D4AF37]">{product.title}</h1>
              </div>
              <p className="font-sans text-blue-100 text-sm md:text-lg max-w-2xl opacity-90">{product.description}</p>
            </div>
          </div>

          <div className="p-6 md:p-14">
            {isTrust ? (
              <div className="animate-fade-in">
                <h3 className="font-display font-bold text-lg md:text-xl text-[#D4AF37] mb-6">Та итгэлцлийн талаар мэдээлэл авах бол доорх мэдээллүүдийг оруулна уу</h3>
                <form onSubmit={handleTrustSubmit} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input required type="text" placeholder="Овог" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] text-white placeholder-gray-400" onChange={(e) => setTrustForm({ ...trustForm, lastName: e.target.value })} />
                    <input required type="text" placeholder="Нэр" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] text-white placeholder-gray-400" onChange={(e) => setTrustForm({ ...trustForm, firstName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input required type="tel" placeholder="Утасны дугаар" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] text-white placeholder-gray-400 tabular-nums" onChange={(e) => setTrustForm({ ...trustForm, phone: e.target.value })} />
                    <input required type="email" placeholder="Имэйл хаяг" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] text-white placeholder-gray-400" onChange={(e) => setTrustForm({ ...trustForm, email: e.target.value })} />
                  </div>
                  <input required type="text" placeholder="Итгэлцлийн дүн (Ойролцоогоор)" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] text-white placeholder-gray-400 tabular-nums" onChange={(e) => setTrustForm({ ...trustForm, amount: e.target.value })} />
                  <div>
                    <button type="submit" className="w-full bg-[#00A651] text-white py-4 rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg">Илгээх</button>
                    <p className="text-center text-sm text-[#007A3D] font-bold mt-3">Бид тантай удахгүй холбогдох болно.</p>
                  </div>
                </form>
                <div className="mt-12 pt-8 border-t border-white/10">
                  <button onClick={() => onNavigate('trust_calculator')} className="w-full md:w-auto px-8 py-4 border-2 border-white/30 text-white rounded-xl font-display font-bold hover:bg-white/10 transition">Итгэлцлийн тооцоолуур</button>
                </div>
              </div>
            ) : (
              <>
                {product.isCarLoan ? (
                  <div className="mb-10">
                    <div className="flex space-x-2 bg-white/10 p-1.5 rounded-xl mb-6 w-full overflow-x-auto border border-white/5">
                      <button onClick={() => setActiveTab('purchase')} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'purchase' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Автомашины зээл</button>
                      <button onClick={() => setActiveTab('collateral')} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'collateral' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Автомашин барьцаалсан зээл</button>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg border border-white/10">
                        <button onClick={() => setSubTab('individual')} className={`px-6 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${subTab === 'individual' ? 'bg-[#00A651] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Иргэн</button>
                        <button onClick={() => setSubTab('organization')} className={`px-6 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${subTab === 'organization' ? 'bg-[#00A651] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Байгууллага</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  getStandardTabs().length > 0 && (
                    <div className="flex space-x-1 bg-white/10 p-1 rounded-xl mb-10 w-full md:w-fit overflow-x-auto border border-white/5">
                      {getStandardTabs().map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-[#D4AF37] text-white shadow-sm' : 'text-gray-300 hover:text-white'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )
                )}

                {currentData && (
                  <div className="grid md:grid-cols-2 gap-8 md:gap-10 animate-fade-in">
                    <div>
                      <h3 className="font-display font-bold text-xl text-[#D4AF37] mb-5 border-b border-white/10 pb-2">Нөхцөл</h3>
                      <ul className="space-y-3">
                        {currentData.conditions.map((c, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#007A3D] font-bold mt-0.5">•</span> {c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-[#D4AF37] mb-5 border-b border-white/10 pb-2">Тавигдах шаардлага</h3>
                      <ul className="space-y-3">
                        {currentData.requirements.map((r, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#007A3D] font-bold mt-0.5">✓</span> {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mt-14 pt-10 border-t border-white/10 flex flex-col md:flex-row gap-4">
                  <button onClick={() => onNavigate('loan_request')} className="flex-1 bg-[#00A651] text-white py-4 rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg shadow-green-900/20">Зээлийн хүсэлт илгээх</button>
                  <button onClick={() => onNavigate('calculator')} className="flex-1 border-2 border-white/30 text-white py-4 rounded-xl font-display font-bold hover:bg-white/10 transition">Зээлийн тооцоолуур</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const FinancialReportsPage = ({ onBack }) => {
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="min-h-screen font-sans text-slate-800 pt-20 pb-20 px-4 md:px-6" style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-[#003B5C]/90 pointer-events-none"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs mb-8 hover:underline">← Буцах</button>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl p-8 md:p-10 animate-fade-in-up">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[#D4AF37] mb-2">Санхүүгийн тайлангууд</h2>
          <div className="space-y-4 mt-8">
            {financialReports.map((file, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-white/10 rounded-xl hover:bg-white/5 transition gap-4">
                <div className="flex items-center gap-4"><span className="text-3xl text-white">📄</span><div><h4 className="font-bold text-white text-sm">{file.name}</h4><span className="text-xs text-gray-400">{file.size}</span></div></div>
                <a
                  href={file.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007A3D] font-bold text-xs uppercase hover:underline ml-auto md:ml-0 flex items-center gap-1"
                >
                  Харах <span>→</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const PoliciesPage = ({ onBack }) => {
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="min-h-screen font-sans text-slate-800 pt-20 pb-20 px-4 md:px-6" style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-[#003B5C]/90 pointer-events-none"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs mb-8 hover:underline">← Буцах</button>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl p-8 md:p-10 animate-fade-in-up">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[#D4AF37] mb-2">Байгууллагын бодлого журам</h2>
          <div className="space-y-4 mt-8">
            {policyFiles.map((file, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-white/10 rounded-xl hover:bg-white/5 transition gap-4">
                <div className="flex items-center gap-4"><span className="text-3xl text-white">⚖️</span><div><h4 className="font-bold text-white text-sm">{file.name}</h4><span className="text-xs text-gray-400">{file.size}</span></div></div>
                <a
                  href={file.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007A3D] font-bold text-xs uppercase hover:underline ml-auto md:ml-0 flex items-center gap-1"
                >
                  Харах <span>→</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
// ======================================================================
// 8. ҮНДСЭН APP (Render)
// ======================================================================
function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGovernance, setSelectedGovernance] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = (view, item = null) => {
    setSelectedItem(item);
    setCurrentView(view);
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id) => {
    if (currentView !== 'home') {
      setCurrentView('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleGovernanceClick = (item) => {
    if (item.isLink) {
      navigateTo(item.linkType);
    } else {
      setSelectedGovernance(item);
      navigateTo('governance_detail');
    }
  };

  return (
    <div className="font-sans text-body text-slate-800 antialiased selection:bg-[#00A651] selection:text-white">

      {/* --- NAVIGATION --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled || currentView !== 'home' ? 'bg-black/50 backdrop-blur-md shadow-md py-3' : 'bg-transparent py-4 md:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          <div className="cursor-pointer z-50" onClick={() => navigateTo('home')}>
            <img
              src={(scrolled || currentView !== 'home') ? logoColored : logoWhite}
              alt="Solongo Capital"
              className="h-10 md:h-14 lg:h-20 object-contain transition-all duration-300" />
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => scrollToSection(item.id)} className={`text-small font-display font-semibold uppercase tracking-widest hover:text-[#007A3D] transition-colors text-white`}>
                {item.name}
              </button>
            ))}
            <button
              onClick={() => navigateTo('login')}
              className={`px-6 py-2.5 rounded-full font-display font-semibold text-small transition-all border bg-transparent text-white border-white hover:bg-white hover:text-[#003B5C]`}
            >
              НЭВТРЭХ
            </button>
          </div>
          <button className={`md:hidden text-2xl z-50 text-white`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-0 left-0 w-full h-screen bg-[#003B5C] flex flex-col items-center justify-center space-y-8 z-40">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-2xl text-white font-display font-bold uppercase">{item.name}</button>
            ))}
            <button onClick={() => { navigateTo('login'); setMobileMenuOpen(false); }} className="text-2xl text-[#007A3D] font-display font-bold uppercase mt-4">Нэвтрэх</button>
            <button onClick={() => setMobileMenuOpen(false)} className="text-xl text-white/50 font-display font-bold uppercase mt-10">Хаах</button>
          </div>
        )}
      </nav>

      {/* --- VIEW SWITCHER --- */}
      {currentView === 'product_detail' && selectedItem ? (
        <ProductDetail
          product={selectedItem}
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo} />
      ) : currentView === 'financials' ? (
        <FinancialReportsPage onBack={() => navigateTo('home')} />
      ) : currentView === 'policies' ? (
        <PoliciesPage onBack={() => navigateTo('home')} />
      ) : currentView === 'governance_detail' && selectedGovernance ? (
        <GovernanceDetail item={selectedGovernance} onBack={() => navigateTo('home')} />
      ) : currentView === 'login' ? (
        <UnderConstructionPage onBack={() => navigateTo('home')} title="Нэвтрэх хэсэг" />
      ) : currentView === 'loan_request' ? (
        <UnderConstructionPage onBack={() => navigateTo('home')} title="Зээлийн хүсэлт" />
      ) : currentView === 'calculator' ? (
        <UnderConstructionPage onBack={() => navigateTo('home')} title="Зээлийн тооцоолуур" />
      ) : currentView === 'trust_calculator' ? (
        <UnderConstructionPage onBack={() => navigateTo('home')} title="Итгэлцлийн тооцоолуур" />
      ) : currentView === 'blog_detail' ? (
        <UnderConstructionPage onBack={() => navigateTo('home')} title="Мэдээний дэлгэрэнгүй" />
      ) : (
        // ====================================================================
        // HOME PAGE
        // ====================================================================
        <>
          {/* 1. HERO */}
          <section id="home" className="relative h-screen flex items-center justify-center text-center px-4" style={{ backgroundImage: `url(${BACKGROUNDS.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-[#003B5C]/80 mix-blend-multiply"></div>
            <div className="relative z-10 max-w-5xl space-y-8 text-white animate-fade-in-up px-4 flex flex-col items-center">

              {/* ЗАСВАР 1: Голын лого зөвхөн өөрийн тохиргоогоо авна */}
              <img
                src={IS_VERTICAL_HERO_LOGO
                  ? (USE_GOLD_LOGO ? logoGoldVertical : logoWhiteVertical)
                  : logoWhite}
                alt="Solongo Capital Logo"
                className={`${IS_VERTICAL_HERO_LOGO ? 'h-32 md:h-40 lg:h-52' : 'h-24 md:h-32'} object-contain mb-4 opacity-90`} />

              <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-7xl leading-[1.1] tracking-tight">
                Бизнесийн <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A651] to-emerald-400">Өсөлтийг</span> Дэмжинэ
              </h1>
              <p className="font-sans font-normal text-base md:text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed opacity-90">
                Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.
              </p>
              <div className="pt-8">
                {/* ШИНЭЧЛЭГДСЭН ТОВЧ: НОГООН ДЭВСГЭРГҮЙ, ЦАГААН ХҮРЭЭТЭЙ */}
                <button
                  onClick={() => scrollToSection('products')}
                  className="px-10 py-4 bg-transparent border border-white/30 text-white font-display font-bold rounded-full transition transform hover:bg-white/10 hover:border-white shadow-2xl uppercase tracking-wide text-small"
                >
                  Бүтээгдэхүүн үзэх
                </button>
              </div>
            </div>
            <ScrollDownArrow targetId="about-intro" />
          </section>

          <div id="about-intro" className="relative">
            {/* 2. ABOUT */}
            <section className="min-h-screen relative flex items-center justify-center text-center px-6" style={{ backgroundImage: `url(${BACKGROUNDS.about})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
              <div className="absolute inset-0 bg-[#003B5C]/60"></div>

              <div className="relative z-10 max-w-4xl space-y-12 animate-fade-in-up">

                <div className="space-y-6">
                  <h2 className="font-display font-bold text-4xl md:text-6xl text-white leading-tight">Бид хэн бэ?</h2>
                  <p className="font-sans text-xl md:text-2xl text-white/90 leading-relaxed font-light">
                    <span className="text-[#D4AF37] font-bold">Солонго Капитал ББСБ ХХК</span> нь харилцагч төвтэй үйлчилгээг эрхэмлэн, санхүүгийн салбарт шинэ жишиг тогтоохоор зорин ажиллаж байна.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/20">
                  <div className="p-6">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">Эрхэм зорилго</h4>
                    <p className="font-sans text-white/80 leading-relaxed">Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан шийдлээр хангах.</p>
                  </div>
                  <div className="p-6 border-t md:border-t-0 md:border-l border-white/20">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">Алсын хараа</h4>
                    <p className="font-sans text-white/80 leading-relaxed">Итгэлд суурилсан, дижитал, хэрэглэгч төвтэй байгууллага болох.</p>
                  </div>
                  <div className="p-6 border-t md:border-t-0 md:border-l border-white/20">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">Үнэ цэнэ</h4>
                    <p className="font-sans text-white/80 leading-relaxed">Шударга ёс, Ил тод байдал, Хамтын ажиллагаа, Инноваци.</p>
                  </div>
                </div>

              </div>
              <ScrollDownArrow targetId="financials" color="text-white/50" />
            </section>

            {/* 3. FINANCIALS */}
            <section id="financials" className="py-24 relative min-h-[90vh] flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.financials})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
              <div className="absolute inset-0 bg-[#003B5C]/80"></div>
              <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                <div className="text-center mb-16">
                  <span className="text-[#007A3D] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Бидний амжилт</span>
                  <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Санхүүгийн үзүүлэлтүүд</h2>
                  <p className="text-blue-200/60 font-sans text-sm mt-2">{FINANCIAL_DATE}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 text-center">
                  {financialStats.map((stat, i) => (
                    <div key={i} className="px-2 md:px-4 py-6 border border-white/10 rounded-2xl hover:bg-white/5 transition duration-300">
                      <div className="text-2xl md:text-5xl font-display font-bold text-[#D4AF37] mb-2 tabular-nums tracking-tight">{stat.val}</div>
                      <div className="text-[10px] md:text-xs font-display font-medium tracking-widest uppercase text-white/80">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-16">
                  <button onClick={() => navigateTo('financials')} className="text-white font-display font-bold uppercase tracking-wider text-small hover:text-[#007A3D] transition border-b border-white/30 pb-1 hover:border-[#00A651]">
                    Санхүүгийн тайлан дэлгэрэнгүй →
                  </button>
                </div>
              </div>
              <ScrollDownArrow targetId="governance" />
            </section>

            {/* 4. GOVERNANCE (Шинэ дэвсгэр зурагтай) */}
            <section id="governance" className="py-24 relative min-h-[90vh] flex flex-col justify-center" style={{ backgroundImage: `url(${BACKGROUNDS.governance})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
              <div className="absolute inset-0 bg-slate-900/80"></div>
              <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                <div className="text-center mb-16">
                  <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Компанийн засаглал</h2>
                  <p className="text-gray-400 max-w-2xl mx-auto mt-4 font-sans text-body">Бид ил тод, нээлттэй байдал болон бизнесийн ёс зүйг дээдэлнэ.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {governanceItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleGovernanceClick(item)}
                      className="group cursor-pointer flex flex-col items-center text-center p-6 hover:bg-white/5 rounded-2xl transition duration-300"
                    >
                      <div className="text-5xl mb-6 text-[#D4AF37] transition transform group-hover:scale-110 duration-300">{item.icon}</div>
                      <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-[#D4AF37] transition">{item.title}</h3>
                      <div className="w-10 h-0.5 bg-white/20 group-hover:bg-[#D4AF37] transition mb-4"></div>
                      {item.isLink ? <span className="text-white/50 text-xs uppercase tracking-wider">Дэлгэрэнгүй →</span> : <span className="text-white/50 text-xl font-bold">+</span>}
                    </div>
                  ))}
                </div>
              </div>
              <ScrollDownArrow targetId="products" color="text-[#003B5C]/50" />
            </section>
          </div>

          {/* 5. PRODUCTS */}
          <section id="products" className="py-32 relative min-h-screen flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.products})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-[#003B5C]/90"></div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
              <div className="text-center mb-24 max-w-3xl mx-auto">
                <span className="text-[#007A3D] font-display font-bold uppercase tracking-widest text-xs mb-4 block">Бидний шийдэл</span>
                <h2 className="font-display font-bold text-3xl md:text-5xl text-white leading-tight">Бүтээгдэхүүн үйлчилгээ</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {productsData.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col items-start h-full p-6 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-2xl transition-all duration-300"
                  >
                    <div className="text-4xl mb-6 p-4 bg-white/10 rounded-2xl text-white shadow-sm group-hover:bg-[#D4AF37] transition-colors duration-300">{item.icon}</div>
                    <h3 className="font-display font-semibold text-h3 text-white mb-3">{item.title}</h3>
                    <p className="font-sans text-body text-gray-400 mb-6 leading-relaxed flex-grow group-hover:text-gray-300 transition">{item.shortDesc}</p>
                    <button onClick={() => navigateTo('product_detail', item)} className="text-[#D4AF37] font-display font-bold uppercase text-xs tracking-wider group-hover:underline cursor-pointer flex items-center gap-2 mt-auto">
                      Дэлгэрэнгүй <span>→</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <ScrollDownArrow targetId="blog" color="text-white/50" />
          </section>

          {/* 6. BLOG */}
          <section id="blog" className="py-24 bg-slate-50 relative min-h-[90vh] flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.blog})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-slate-900/90"></div>
            <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
              <div className="text-center mb-16">
                <span className="text-[#007A3D] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Мэдээ мэдээлэл</span>
                <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Блог</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {blogPosts.map((post) => (
                  <div key={post.id} className="bg-transparent border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 hover:bg-white/5 transition duration-300 group">
                    <div className="h-48 overflow-hidden opacity-80 group-hover:opacity-100 transition duration-300">
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    </div>
                    <div className="p-6">
                      <span className="text-[#007A3D] text-xs font-bold uppercase tracking-wider block mb-2">{post.date}</span>
                      <h3 className="font-display font-bold text-lg text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#D4AF37] transition">{post.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                      <button onClick={() => navigateTo('blog_detail')} className="text-white/70 font-bold text-xs uppercase hover:text-[#D4AF37] transition">Дэлгэрэнгүй →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ScrollDownArrow targetId="contact" />
          </section>

          {/* 7. CONTACT */}
          <section id="contact" className="relative min-h-screen flex items-center bg-gray-900 text-white" style={{ backgroundImage: `url(${BACKGROUNDS.contact})`, backgroundSize: 'cover' }}>
            <div className="absolute inset-0 bg-[#002a42]/90"></div>
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center py-20">
              <div>
                <img src={logoMetal} alt="Solongo Capital Metal" className="h-16 mb-10 object-contain brightness-0 invert opacity-80" />
                <span className="text-[#007A3D] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Бидэнтэй нэгдээрэй</span>
                <h2 className="font-display font-bold text-3xl md:text-5xl mb-12">Холбоо барих</h2>
                <div className="space-y-8">
                  <a href="https://goo.gl/maps/YOUR_LINK" target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group hover:opacity-80 transition cursor-pointer">
                    <span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D] group-hover:bg-[#00A651] group-hover:text-white transition">📍</span>
                    <div>
                      <p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Хаяг</p>
                      <p className="font-display font-semibold text-lg leading-snug">Улаанбаатар хот, Хан-Уул дүүрэг, 20 хороо,<br />Чингисийн өргөн чөлөө, Мишээл оффис төв,<br />М3 цамхаг 12 давхар, 1207 тоот</p>
                    </div>
                  </a>
                  <div className="flex items-start gap-6 group"><span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D]">📞</span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Утас</p><p className="font-display font-semibold text-xl tabular-nums">7599 1919, 7599 9191</p></div></div>
                  <div className="flex items-start gap-6 group"><span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D]">📧</span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">И-мэйл</p><p className="font-display font-semibold text-xl">info@scm.mn</p></div></div>
                </div>
              </div>

              {/* FORM */}
              <div className="p-0 lg:p-8">
                <h3 className="font-display font-bold text-h3 text-white mb-8">Зурвас илгээх</h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Таны нэр" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] focus:bg-white/10 transition font-sans text-white placeholder-gray-400" />
                    <input type="text" placeholder="Утасны дугаар" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] focus:bg-white/10 transition font-sans text-white placeholder-gray-400 tabular-nums" />
                  </div>
                  <textarea placeholder="Зурвас" rows="4" className="w-full p-4 bg-white/5 rounded-xl border border-white/20 focus:outline-none focus:border-[#D4AF37] focus:bg-white/10 transition font-sans text-white placeholder-gray-400 resize-none"></textarea>
                  <button className="w-full bg-[#00A651] text-white py-5 rounded-xl font-display font-bold hover:bg-[#008f45] transition text-small uppercase tracking-wider shadow-lg">Илгээх</button>
                </form>
              </div>
            </div>
            <div className="absolute bottom-6 w-full text-center border-t border-white/10 pt-6">
              <p className="text-white/40 text-xs font-sans">&copy; 2025 Solongo Capital NBFI. All rights reserved.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
export default App;
