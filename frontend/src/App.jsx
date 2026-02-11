import React, { useState, useEffect } from 'react';
// 1. ICON-уудыг import хийх
import { 
  Users, TrendingUp, ShieldCheck, PieChart, Briefcase, CreditCard, 
  Building2, Car, Smartphone, Handshake, Home, LineChart, 
  FileText, Scale, MapPin, Phone, Mail, ChevronLeft, Quote, Network,
  ArrowRight, ChevronDown
} from 'lucide-react';

// ======================================================================
// 2. ЗУРГУУД (Бүх import-ууд ЭНД байх ёстой)
// ======================================================================
import logoWhite from './assets/logo-white.png';
import logoWhiteVertical from './assets/logo-white-vertical.png';
import logoGoldVertical from './assets/logo-gold-vertical.png'; 
import logoColored from './assets/logo-colored.png';
import logoBlack from './assets/logo-black.png';
import logoMetal from './assets/logo-metal.png';

// ТАНЫ ФАЙЛААС УНШУУЛЖ БАЙГАА ЗУРГУУД (Import хэсэг)
import prod2Bg from './assets/prod-2-bg.jpg';
import prod2Header from './assets/prod-2-header.jpg';
import prod5Bg from './assets/prod-5-bg.jpg';
import prod5Header from './assets/prod-5-header.jpg';
import prod7Bg from './assets/prod-7-bg.jpg';
import prod7Header from './assets/prod-7-header.jpg';

// ✅ ШИНЭЭР НЭМСЭН КОМПОНЕНТУУД
import BoardMembers from './components/BoardMembers';
import ManagementTeam from './components/ManagementTeam';
import ShareholderInfo from './components/ShareholderInfo';
import CEOContent from './components/CEOContent';
import ShogunStudio from './components/ShogunStudio';
import BlogList from './components/BlogList';
import LoanCalculator from './components/LoanCalculator';
import TrustCalculator from './components/TrustCalculator';
import LoanRequest from './components/LoanRequest';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import TrustRequest from './components/TrustRequest';
import ChatBot from './components/ChatBot'; // ✅ Чатбот нэмэгдсэн

// ======================================================================
// 3. ЗУРАГ ХОЛБОХ ЛОГИК
// ======================================================================

// Бусад зураггүй бүтээгдэхүүнд зориулсан хоосон хувьсагчууд
const p1b=null, p1h=null, p3b=null, p3h=null, p4b=null, p4h=null, p6b=null, p6h=null;

// Import хийсэн зургуудаа хувьсагчид оноох
const localProd1Bg=p1b, localProd1Header=p1h;
const localProd2Bg=prod2Bg, localProd2Header=prod2Header; 
const localProd3Bg=p3b, localProd3Header=p3h;
const localProd4Bg=p4b, localProd4Header=p4h;
const localProd5Bg=prod5Bg, localProd5Header=prod5Header; 
const localProd6Bg=p6b, localProd6Header=p6h;
const localProd7Bg=prod7Bg, localProd7Header=prod7Header; 


// ======================================================================
// 4. ХЭРЭГЛЭГЧИЙН ТОХИРГОО (SETTINGS)
// ======================================================================

const IS_VERTICAL_HERO_LOGO = true;      
const USE_GOLD_LOGO = true;              
const USE_LOCAL_IMAGES = true; 
const FINANCIAL_DATE = "2025 оны 11 сарын 30-ны байдлаар";

// ======================================================================
// 5. ЗУРАГ СОНГОХ ФУНКЦ
// ======================================================================
const getImage = (onlineUrl, localVariable) => {
    if (USE_LOCAL_IMAGES && localVariable) {
        return localVariable;
    }
    return onlineUrl;
};

// ======================================================================
// 6. PDF ЛИНКҮҮД
// ======================================================================
const financialReports = [
    { name: "2024 оны жилийн эцсийн тайлан", size: "4.5 MB", link: "/report-2024.pdf" },
    { name: "2023 оны жилийн эцсийн тайлан", size: "3.8 MB", link: "/report-2023.pdf" },
];

const policyFiles = [
    { name: "Байгууллагын дүрэм", size: "PDF", link: "/policies/company-charter.pdf" },
    { name: "Компанийн засаглалын кодекс", size: "PDF", link: "/policies/governance-code.pdf" },
    { name: "Ёс зүйн дүрэм", size: "PDF", link: "/policies/ethics-code.pdf" },
    { name: "ТУЗ-ийн үйл ажиллагааны журам", size: "PDF", link: "/policies/board-procedure.pdf" },
    { name: "ТУЗ гишүүдийн мэдээлэл", size: "PDF", link: "/policies/board-members-info.pdf" },
    { name: "Эрсдэлийн удирдлагын бодлого", size: "PDF", link: "/policies/risk-policy.pdf" },
    { name: "Аудит хорооны журам", size: "PDF", link: "/policies/audit-committee.pdf" },
    { name: "Нэр дэвшүүлэх, цалин урамшууллын хорооны журам", size: "PDF", link: "/policies/nomination-committee.pdf" },
    { name: "Сонирхлын зөрчилтэй хэлцэл хийх журам", size: "PDF", link: "/policies/conflict-interest.pdf" },
    { name: "Залгамж халааны бодлого", size: "PDF", link: "/policies/succession-policy.pdf" },
    { name: "Ногдол ашгийн бодлого", size: "PDF", link: "/policies/dividend-policy.pdf" },
    { name: "Дотоод аудитын журам", size: "PDF", link: "/policies/internal-audit.pdf" },
    { name: "Дотоод хяналтын журам", size: "PDF", link: "/policies/internal-control.pdf" },
    { name: "Комплайнсийн бодлого", size: "PDF", link: "/policies/compliance-policy.pdf" },
    { name: "Комплайнсын хяналтын заавар", size: "PDF", link: "/policies/compliance-control-instruction.pdf" },
    { name: "Шүгэл үлээх бодлого", size: "PDF", link: "/policies/whistleblowing-policy.pdf" },
    { name: "Хөрөнгө оруулагчтай харилцах хөтөлбөр", size: "PDF", link: "/policies/investor-relations-program.pdf" },
    { name: "Хөдөлмөрийн дотоод журам", size: "PDF", link: "/policies/labor-rules.pdf" },
    { name: "Мэдээллийн ил тод байдлын журам", size: "PDF", link: "/policies/transparency-rule.pdf" },
    { name: "Цалин хөлс урамшууллын журам", size: "PDF", link: "/policies/salary-bonus-rule.pdf" },
    { name: "Үйл ажиллагааны тайлан 2024", size: "PDF", link: "/policies/report-2024.pdf" },
];

// ======================================================================
// 7. ДЭВСГЭР ЗУРГУУД
// ======================================================================
const BACKGROUNDS = {
  hero: getImage("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  about: getImage("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  financials: getImage("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  governance: getImage("https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"), 
  products: getImage("https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  blog: getImage("https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  contact: getImage("https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"),
  detail_page: getImage("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")
};

const blogPosts = [
  { 
    id: 1, 
    date: "2025.10.27", 
    title: "Санхүүгийн зохицуулах хорооны ээлжит хуралдаан боллоо", 
    excerpt: "Санхүүгийн зохицуулах хорооны ээлжит хуралдаан болж, нийт 28 асуудал хэлэлцэн шийдвэрлэлээ. Хуралдаанаар...", 
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    externalLink: "https://www.frc.mn/#/view/10266" 
  },
  { 
    id: 2, 
    date: "2025.10.24", 
    title: "Биржийн бус зах зээлийн мэргэжлийн хөрөнгө оруулагчийн тавигдах шаардлага", 
    excerpt: "Биржийн бус зах зээлд үйл ажиллагаа явуулж буй мэргэжлийн хөрөнгө оруулагчдад тавигдах шаардлага, зохицуулалтын шинэчлэлийн талаар...", 
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    externalLink: "https://www.frc.mn/#/view/10254" 
  },
  { 
    id: 3, 
    date: "2025.10.20", 
    title: "Мөнгө угаах болон терроризмыг санхүүжүүлэхтэй тэмцэх сургалт", 
    excerpt: "СЗХ-ноос зохицуулалттай этгээдүүдэд зориулсан Мөнгө угаах болон терроризмыг санхүүжүүлэхтэй тэмцэх чиглэлийн ээлжит сургалт...", 
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    externalLink: "https://www.frc.mn/#/view/10250" 
  },
  { 
    id: 4, 
    date: "2025.10.18", 
    title: "Финтекийн зохицуулалтын орчин ба олон улсын туршлага", 
    excerpt: "Финтекийн салбарын хөгжил, түүний зохицуулалтын орчин, олон улсын чиг хандлагын талаарх хэлэлцүүлэг өрнөлөө.", 
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    externalLink: "https://www.frc.mn/#/view/10249" 
  }
];

const productsData = [
  { 
    id: 1, 
    title: "Бизнесийн зээл", 
    icon: Building2, 
    bgImage: getImage("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd1Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd1Header), 
    shortDesc: "Бизнесийн өсөлтийг хурдасгах стратегийн санхүүжилт.",
    description: "Бизнесийн үйл ажиллагаагаа өргөжүүлэх, эргэлтийн хөрөнгөө нэмэгдүүлэх, шинэ тоног төхөөрөмж болон үйлдвэрлэлийн хүчин чадлаа сайжруулахад зориулагдсан зээл. Танай бизнесийн онцлог, мөнгөн урсгалд нийцсэн бүтэцтэйгээр санхүүжилтийг шийднэ..",
    individual: { conditions: ["Зээлийн хэмжээ: 500 сая хүртэл", "Хугацаа: 1-60 сар хүртэл", "Хүү: 2.5% - 3.5%"], requirements: ["18 нас хүрсэн, Монгол Улсын иргэн байх", "Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] },
    organization: { conditions: ["Зээлийн хэмжээ: 1.5 тэрбум хүртэл", "Хугацаа: 1-60 сар хүртэл", "Хүү: 2.5% - 3.5%"], requirements: ["Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх", "Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх", "Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] }
  },
  { 
    id: 2, 
    title: "Автомашины зээл", 
    icon: Car, 
    bgImage: getImage("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd2Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd2Header),
    shortDesc: "Шуурхай шийдвэрлэлт.", 
    description: "Автомашин худалдан авах болон автомашин барьцаалсан зээлийн үйлчилгээ.",
    isCarLoan: true,
    purchase: { label: "Автомашины зээл", individual: { conditions: ["Хугацаа 1-ээс 60 сар хүртэл", "Зээлийн хүү 2.5%-аас 3.5% хүртэл", "Урьдчилгаа төлбөр 45%-аас багагүй", "Зээлийн хэмжээ барьцаа хөрөнгийн зах зээлийн үнэлгээний 60% хүртэл", "Өр орлогын харьцаа 55% ихгүй"], requirements: ["18 нас хүрсэн, Монгол Улсын иргэн байх", "Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] }, organization: { conditions: ["Зээл: Үнэлгээний 80%", "Хугацаа: 1-96 сар хүртэл", "Зээлийн хүү: 2.5%-3.5%"], requirements: ["Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх", "Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх", "Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] } },
    collateral: { label: "Автомашин барьцаалсан зээл", individual: { conditions: ["Зээл: Үнэлгээний 50%", "Зээлийн хүү: 2.8% - 3.5%", "Хугацаа: 1-24 сар хүртэл", "Өр орлогын харьцаа 55% ихгүй"], requirements: ["18 нас хүрсэн, Монгол Улсын иргэн байх", "Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх", "Автомашин нь өөрийнх нь нэр дээр"] }, organization: { conditions: ["Зээл: Үнэлгээний 50%", "Зээлийн хүү: 2.8% - 3.5%", "Хугацаа: 1-24 сар"], requirements: ["Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх", "Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх", "Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх", "Автомашин нь тухайн байгууллагын нэр дээр байх"] } }
  },
  { 
    id: 3, 
    title: "Хэрэглээний зээл", 
    icon: Smartphone, 
    bgImage: getImage("https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd3Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd3Header),
    shortDesc: "Иргэдийн хувийн хэрэгцээнд зориулсан зээл.",
    description: "Иргэдийн хувийн хэрэгцээнд зориулсан, шуурхай шийдвэртэй, уян хатан нөхцөлтэй зээл", 
    individual: { conditions: ["300 сая хүртэл", "Зээлийн хүү: 2.5% - 3.5%", "Хугацаа: 1-36 сар хүртэлх", "Өр орлогын харьцаа 55% ихгүй байх"], requirements: ["18 нас хүрсэн, Монгол Улсын иргэн байх", "Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] }
  },
  { 
    id: 4, 
    title: "Итгэлцэл", 
    icon: Handshake, 
    bgImage: getImage("https://images.unsplash.com/photo-1565514020176-db8217350024?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd4Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd4Header),
    shortDesc: "Өндөр өгөөж.", 
    description: "Таны мөнгөн хөрөнгийг найдвартай өсгөх, өндөр өгөөжтэй хөрөнго оруулалтын үйлчилгээ.", 
  },
  { 
    id: 5, 
    title: "Кредит карт", 
    icon: CreditCard, 
    bgImage: getImage("https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd5Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1616422285623-13ff0162193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd5Header),
    shortDesc: "Санхүүгийн эрх чөлөө.",
    description: "ApplePay болон GooglePay-д холбогдсон Олон улсын эрхтэй зээлийн Платинум МастерКарт - ТУН УДАХГҮЙ...",
    individual: { conditions: ["Зээлийн эрх: 300 сая хүртэл"], requirements: ["Тогтмол орлоготой байх ба ББСБ-наас шаардсан бусад шаарлагын хангасан байх."] },
    organization: { conditions: ["Зээлийн эрх: 500 сая хүртэл"], requirements: ["Бизнесийн тогтмол орлоготой байх ба байгууллагын батлан даалттайгаар хэдэн ч ажилтан, эрх бүхий этгээд ашиглах боломжтой"] }
  },
  { 
    id: 6, 
    title: "Үл хөдлөх барьцаалсан зээл", 
    icon: Home, 
    bgImage: getImage("https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd6Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1486325212027-8081e485255e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd6Header),
    shortDesc: "Томоохон хэмжээний санхүүжилт.",
    description: "Таны гэнэтийн санхүүгийн хэрэгцээг түргэн шуурхай шийдэх зорилгоор таны өөрийн өмчлөлийн үл хөдлөх хөрөнгийг барьцаалан олгох зээл.",
    individual: { conditions: ["Зээлийн хэмжээ: 1 тэрбум төгрөг хүртэлх", "Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй", "Зээлийн хүү: 2.5% - 3.5%", "Зээлийн хугацаа: 1-24 сар хүртэлх"], requirements: ["Үл хөдлөх хөрөнгийн гэрчилгээ", "Бизнесийн болон цалингийн тогтмол орлоготой байх", "Кредит скорингийн оноо хангалттай байх"] },
    organization: { conditions: ["Зээлийн хэмжээ: 1.5 тэрбум төгрөг хүртэлх", "Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй", "Зээлийн хүү: 2.5% - 3.5%", "Зээлийн хугацаа: 1-24 сар хүртэлх"], requirements: ["Байгууллагын өмчлөлийн үл хөрөнгө байх", "Бизнесийн тогтмол орлоготой байх", "Кредит скорингийн хангалттай оноотой байх"] }
  },
  { 
    id: 7, 
    title: "Шугмын зээл", 
    icon: LineChart, 
    bgImage: getImage("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", localProd7Bg),
    headerImage: getImage("https://images.unsplash.com/photo-1664575602554-2087b04935a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80", localProd7Header),
    shortDesc: "Бизнесийн эргэлтийг дэмжих тасралтгүй санхүүжилт.",
    description: "Бизнесийн байнгын үйл ажиллагааг тасралтгүй дэмжих, мөнгөн урсгалын зохистой байдлыг хангах зориулалттай зээлийн шугам. Хэрэгцээндээ нийцүүлэн ашиглах боломжтой уян хатан бүтэцтэй.",
    organization: { conditions: ["Зээлийн эрх: Орлогын 40%", "Зээлийн хэмжээ: 1.5 тэрбум төгрөг хүртэлх", "Хугацаа: 6-36 сар хүртэлх"], requirements: ["Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх", "Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх", "Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх", "Чанаргүй зээлийн түүхгүй байх", "Зээлээ эргэн төлөх санхүүгийн чадамжтай байх", "Барьцаа хөрөнгө нь шаардлага хангасан байх"] }
  }
];

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

const financialStats = [
    { val: "7 Тэрбум", label: "Өөрийн хөрөнгө" },
    { val: "10.8 Тэрбум", label: "Нийт хөрөнгө" },
    { val: "9.2 Тэрбум", label: "Нийт зээлийн дүн" },
    { val: "3.6%", label: "Чанаргүй зээлийн хувь" },
    { val: "13.7%", label: "Өөрийн хөрөнгийн өгөөж (ROE)" },
    { val: "2.6%", label: "Дундаж хүү" },
];

const governanceItems = [
    { 
        title: "Гүйцэтгэх захирлын мэндчилгээ", 
        icon: Quote, 
        component: <CEOContent />, 
        content: "Эрхэм харилцагч танд энэ өдрийн мэндийг хүргэе...", 
        bgImage: getImage("https://images.unsplash.com/photo-1557804506-669a67965ba0?lib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    },
    { 
        title: "Компанийн бүтэц", 
        icon: Network, 
        component: <OrgChart />, 
        content: "Компанийн бүтэц зохион байгуулалтын схем.", 
        bgImage: getImage("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    },
    { 
        title: "Төлөөлөн удирдах зөвлөл", 
        icon: Scale, 
        component: <BoardMembers />, 
        content: "ТУЗ-ийн гишүүдийн танилцуулга.", 
        bgImage: getImage("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    },
    { 
        title: "Удирдлагын баг", 
        icon: Users, 
        component: <ManagementTeam />, 
        content: "Гүйцэтгэх удирдлагын багийн танилцуулга.", 
        bgImage: getImage("https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    },
    { 
        title: "Хувьцаа эзэмшигчдийн мэдээлэл", 
        icon: PieChart, 
        component: <ShareholderInfo />, 
        content: "100% дотоодын хөрөнгө оруулалттай.", 
        bgImage: getImage("https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    },
    { 
        title: "Байгууллагын бодлого журам", 
        icon: FileText, 
        isLink: true, 
        linkType: 'policies', 
        content: null, 
        bgImage: getImage("https://images.unsplash.com/photo-1450101499163-c8848c66ca85?lib=rb-1.2.1&auto=format&fit=crop&w=800&q=80") 
    }
];
const menuItems = [
  { name: 'Нүүр', id: 'home' },
  { 
    name: 'Бидний тухай', 
    id: 'about-intro',
    submenu: [
      { name: 'Бид хэн бэ?', type: 'scroll', target: 'about-intro' },
      { name: 'Санхүүгийн үзүүлэлтүүд', type: 'scroll', target: 'financials' },
      { name: 'Компанийн засаглал', type: 'scroll', target: 'governance' }
    ]
  },
  { 
    name: 'Бүтээгдэхүүн', 
    id: 'products',
    submenu: productsData.map(prod => ({
      name: prod.title,
      type: 'product',
      data: prod
    }))
  },
  { name: 'Блог', id: 'blog' },
  { name: 'Холбоо барих', id: 'contact' },
];

// ======================================================================
// 10. КОМПОНЕНТУУД (UI)
// ======================================================================

const BackButton = ({ onClick, currentView }) => {
    if (currentView === 'home') return null;

    return (
        <button onClick={onClick} className="fixed top-32 left-4 md:top-36 md:left-10 z-40 flex items-center gap-2 px-5 py-3 bg-[#003B5C]/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-full text-white font-bold uppercase tracking-wider text-[10px] md:text-xs hover:bg-[#003B5C] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 shadow-xl group">
            <div className="p-1 rounded-full bg-white/10 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                <ChevronLeft size={16} strokeWidth={3} />
            </div>
            Нүүр хуудас
        </button>
    );
};

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
// 11. ХУУДАСНУУД (Pages)
// ======================================================================

const UnderConstructionPage = ({ onBack, title = "Хөгжүүлэлт хийгдэж байна" }) => {
    useEffect(() => window.scrollTo(0, 0), []);
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 md:px-6"
             style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
        >
            <div className="absolute inset-0 bg-[#003B5C]/90"></div>
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

const GovernanceDetail = ({ item, onBack }) => {
    useEffect(() => window.scrollTo(0, 0), []);
    const IconComponent = item.icon;

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center px-4 md:px-6 text-center"
             style={{ 
                 backgroundImage: `url(${item.bgImage})`, 
                 backgroundSize: 'cover', 
                 backgroundPosition: 'center', 
                 backgroundAttachment: 'fixed' 
             }}
        >
            <div className="absolute inset-0 bg-[#003B5C]/80"></div> 
            <BackButton onClick={onBack} />
            
            <div className="relative z-10 w-full max-w-7xl animate-fade-in-up pt-24 pb-10">
                <div className="space-y-8 flex flex-col items-center w-full">
                    <div className="text-6xl md:text-8xl mb-2 text-[#D4AF37] opacity-90 drop-shadow-2xl">
                        <IconComponent size={80} strokeWidth={1} />
                    </div>
                    <h1 className="font-display font-bold text-3xl md:text-5xl text-white leading-tight drop-shadow-md">
                        {item.title}
                    </h1>
                    <div className="w-24 h-1 bg-[#D4AF37] mx-auto rounded-full"></div>
                    
                    {item.component ? (
                        <div className="w-full overflow-x-auto mt-4 pb-10">
                            {item.component}
                        </div>
                    ) : (
                        <p className="font-sans text-lg md:text-2xl text-blue-50 leading-relaxed font-light max-w-3xl mx-auto">
                            {item.content}
                        </p>
                    )}

                    {!item.component && <p className="text-white/40 text-sm italic mt-8">Дэлгэрэнгүй мэдээлэл удахгүй шинэчлэгдэнэ...</p>}
                </div>
            </div>
        </div>
    );
};

const ProductDetail = ({ product, onBack, onNavigate }) => {
    const [activeTab, setActiveTab] = useState(product.isCarLoan ? 'purchase' : 'individual'); 
    const [subTab, setSubTab] = useState('individual');

    useEffect(() => window.scrollTo(0, 0), []);

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
    const ProductIcon = product.icon;

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 md:px-6 relative text-white"
             style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
        >
            <div className="absolute inset-0 bg-[#003B5C]/90 pointer-events-none"></div>
            <BackButton onClick={onBack} />

            <div className="max-w-5xl mx-auto relative z-10 pt-10">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-fade-in-up">
                    
                    <div 
                        className="relative h-64 md:h-80 overflow-hidden flex items-end p-8 md:p-12"
                        style={{ backgroundImage: `url(${headerBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#003B5C] via-[#003B5C]/60 to-transparent"></div>
                        <div className="relative z-10 text-white w-full">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-[#D4AF37]"><ProductIcon size={48} strokeWidth={1.5} /></span>
                                <h1 className="font-display font-bold text-3xl md:text-5xl leading-tight text-[#D4AF37]">{product.title}</h1>
                            </div>
                            <p className="font-sans text-blue-100 text-sm md:text-lg max-w-2xl opacity-90">{product.description}</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-14">
                         {isTrust ? (
                             <div className="animate-fade-in text-center py-10">
                                 <h3 className="font-display font-bold text-xl md:text-2xl text-white mb-6">
                                     Та манай итгэлцлийн үйлчилгээг сонирхож байвал доорх товчийг дарж хүсэлт илгээнэ үү.
                                 </h3>
                                 <p className="text-gray-300 mb-10 max-w-2xl mx-auto">
                                     Бид таны мөнгөн хөрөнгийг найдвартай өсгөж, зах зээлийн өндөр өгөөжийг санал болгож байна.
                                 </p>
                                 
                                 <div className="flex flex-col md:flex-row justify-center gap-6">
                                     <button 
                                         onClick={() => onNavigate('trust_request')} 
                                         className="bg-[#00A651] text-white px-10 py-4 rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg shadow-green-900/20 uppercase tracking-wider"
                                     >
                                         Итгэлцлийн хүсэлт илгээх
                                     </button>

                                     <button 
                                         onClick={() => onNavigate('trust_calculator')} 
                                         className="border-2 border-white/30 text-white px-10 py-4 rounded-xl font-display font-bold hover:bg-white/10 transition uppercase tracking-wider"
                                     >
                                         Тооцоолуур
                                     </button>
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
                                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#00A651] font-bold mt-0.5">•</span> {c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h3 className="font-display font-bold text-xl text-[#D4AF37] mb-5 border-b border-white/10 pb-2">Тавигдах шаардлага</h3>
                                                <ul className="space-y-3">
                                                    {currentData.requirements.map((r, i) => (
                                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#00A651] font-bold mt-0.5">✓</span> {r}</li>
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
             <BackButton onClick={onBack} />
             <div className="max-w-4xl mx-auto relative z-10 pt-10">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl p-8 md:p-10 animate-fade-in-up">
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-[#D4AF37] mb-2">Санхүүгийн тайлангууд</h2>
                    <div className="space-y-4 mt-8">
                        {financialReports.map((file, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-white/10 rounded-xl hover:bg-white/5 transition gap-4">
                                <div className="flex items-center gap-4"><FileText className="text-[#D4AF37]" size={32} /><div><h4 className="font-bold text-white text-sm">{file.name}</h4><span className="text-xs text-gray-400">{file.size}</span></div></div>
                                <a 
                                    href={file.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[#00A651] font-bold text-xs uppercase hover:underline ml-auto md:ml-0 flex items-center gap-1"
                                >
                                    Харах <ArrowRight size={14} />
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
             <BackButton onClick={onBack} />
             <div className="max-w-4xl mx-auto relative z-10 pt-10">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl p-8 md:p-10 animate-fade-in-up">
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-[#D4AF37] mb-2">Байгууллагын бодлого журам</h2>
                    <div className="space-y-4 mt-8">
                        {policyFiles.map((file, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-white/10 rounded-xl hover:bg-white/5 transition gap-4">
                                <div className="flex items-center gap-4"><Scale className="text-[#D4AF37]" size={32} /><div><h4 className="font-bold text-white text-sm">{file.name}</h4><span className="text-xs text-gray-400">{file.size}</span></div></div>
                                <a 
                                    href={file.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[#00A651] font-bold text-xs uppercase hover:underline ml-auto md:ml-0 flex items-center gap-1"
                                >
                                    Харах <ArrowRight size={14} />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>
    );
};

function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [currentView, setCurrentView] = useState('home'); 
  const [currentUser, setCurrentUser] = useState(null); 
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
      window.scrollTo(0,0);
      setMobileMenuOpen(false);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Playfair+Display:wght@400;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* ✅ ЧАТБОТ ҮҮРД ХАРАГДАНА (z-index: 10000) */}
      <ChatBot />

      {currentView === 'admin' && currentUser ? (
        <AdminPanel user={currentUser} onLogout={handleLogout} />
      ) : (
        <>
            <BackButton onClick={() => navigateTo('home')} currentView={currentView} />
           
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${currentView === 'shogun_studio' ? 'hidden' : ''} ${scrolled || currentView !== 'home' ? 'bg-[#0b1215]/80 backdrop-blur-md shadow-2xl py-3 border-b border-white/5' : 'bg-transparent py-4 md:py-6'}`}>
              <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
                
                <div className="cursor-pointer z-50 transition-transform hover:scale-105 duration-300" onClick={() => navigateTo('home')}>
                    <img 
                      src={(scrolled || currentView !== 'home') ? logoColored : logoWhite} 
                      alt="Solongo Capital" 
                      className="h-10 md:h-14 lg:h-20 object-contain"
                    /> 
                </div>

                <div className="hidden md:flex items-center space-x-8">
                  {menuItems.map((item) => (
                    <div key={item.id} className="relative group h-full flex items-center">
                      <button 
                        onClick={() => item.submenu ? null : scrollToSection(item.id)} 
                        className={`flex items-center gap-1 text-[11px] lg:text-xs font-display font-bold uppercase tracking-[0.2em] hover:text-[#D4AF37] transition-all duration-300 py-4 ${scrolled || currentView !== 'home' ? 'text-gray-200' : 'text-white'}`}
                      >
                        {item.name}
                        {item.submenu && <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300 text-[#D4AF37]/70"/>}
                      </button>

                      {item.submenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 transform group-hover:translate-y-0 translate-y-4 w-72 perspective-1000">
                          <div className="bg-black/60 backdrop-blur-3xl border border-[#D4AF37]/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-1.5 ring-1 ring-white/5">
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
                      className={`px-8 py-2.5 rounded-full font-display font-bold text-[10px] uppercase tracking-widest transition-all border ${scrolled || currentView !== 'home' ? 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white' : 'border-white text-white hover:bg-white hover:text-[#003B5C]'} ml-6 shadow-lg`}
                  >
                      Нэвтрэх
                  </button>
                </div>

                <button className={`md:hidden text-2xl z-50 ${scrolled || currentView !== 'home' ? 'text-[#003B5C]' : 'text-white'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
              </div>
              
              {mobileMenuOpen && (
                <div className="absolute top-0 left-0 w-full h-screen bg-[#0b1215]/95 backdrop-blur-xl flex flex-col items-center justify-center space-y-8 z-40">
                    {menuItems.map((item) => (
                      <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-xl text-white font-display font-bold uppercase tracking-widest">{item.name}</button>
                    ))}
                    <button onClick={() => {navigateTo('login'); setMobileMenuOpen(false)}} className="text-xl text-[#D4AF37] font-display font-bold uppercase mt-4 tracking-widest">Нэвтрэх</button>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/50 font-display font-bold uppercase mt-10">Хаах</button>
                </div>
              )}
            </nav>

            {currentView === 'product_detail' && selectedItem ? (
                <ProductDetail 
                  product={selectedItem} 
                  onBack={() => navigateTo('home')} 
                  onNavigate={(view, data) => navigateTo(view, data || selectedItem)} 
                />
            ) : currentView === 'financials' ? (
                <FinancialReportsPage onBack={() => navigateTo('home')} />
            ) : currentView === 'policies' ? (
                <PoliciesPage onBack={() => navigateTo('home')} />
            ) : currentView === 'governance_detail' && selectedGovernance ? (
                <GovernanceDetail item={selectedGovernance} onBack={() => navigateTo('home')} />
            ) : currentView === 'login' ? (
                <Login 
                    onBack={() => navigateTo('home')} 
                    onLogin={handleLoginSuccess} 
                />
            ) : currentView === 'loan_request' ? (
                <LoanRequest onBack={() => navigateTo('home')} initialProduct={selectedItem} /> 
            ) : currentView === 'calculator' ? (
                <LoanCalculator onBack={() => navigateTo('home')} />
            ) : currentView === 'trust_calculator' ? (
                <TrustCalculator onBack={() => navigateTo('home')} />
            ) : currentView === 'trust_request' ? (
                <TrustRequest onBack={() => navigateTo('home')} />
              ) : currentView === 'blog_list' ? (
                <BlogList posts={blogPosts} onBack={() => navigateTo('home')} onNavigate={navigateTo} />
            ) : currentView === 'shogun_studio' ? (
                <ShogunStudio onBack={() => navigateTo('home')} />
            ) : (
                  <>
                    <section id="home" className="relative h-screen flex items-center justify-center text-center px-4" style={{ backgroundImage: `url(${BACKGROUNDS.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div className="absolute inset-0 bg-[#003B5C]/80 mix-blend-multiply"></div>
                      <div className="relative z-10 max-w-5xl space-y-8 text-white animate-fade-in-up px-4 flex flex-col items-center">
                        <img 
                          src={
                            IS_VERTICAL_HERO_LOGO 
                            ? (USE_GOLD_LOGO ? logoGoldVertical : logoWhiteVertical) 
                            : logoWhite
                          } 
                          alt="Solongo Capital Logo" 
                          className={`${IS_VERTICAL_HERO_LOGO ? 'h-32 md:h-40 lg:h-52' : 'h-24 md:h-32'} object-contain mb-4 opacity-90`} 
                        />
                        <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-7xl leading-[1.1] tracking-tight">
                            Бизнесийн <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A651] to-emerald-400">Өсөлтийг</span> Дэмжинэ
                        </h1>
                        <p className="font-sans font-normal text-base md:text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed opacity-90">
                            Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.
                        </p>
                        <div className="pt-8">
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

                      <section id="financials" className="py-24 relative min-h-[90vh] flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.financials})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                        <div className="absolute inset-0 bg-[#003B5C]/80"></div>
                        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                            <div className="text-center mb-16">
                                <span className="text-[#00A651] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Бидний амжилт</span>
                                <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Санхүүгийн үзүүлэлтүүд</h2>
                                <p className="text-[#C0C0C0] text-lg md:text-xl max-w-4xl mx-auto mt-6 font-light leading-relaxed">
                                    Бид богино хугацааны өндөр ашигт бус, урт хугацаанд тогтвортой, хүртээмжтэй санхүүгийн экосистемийг бүтээхийг зорьдог.
                                </p>
                                <p className="text-blue-200/60 font-sans text-sm mt-4">{FINANCIAL_DATE}</p> 
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
                                <button onClick={() => navigateTo('financials')} className="text-white font-display font-bold uppercase tracking-wider text-small hover:text-[#00A651] transition border-b border-white/30 pb-1 hover:border-[#00A651]">
                                    Санхүүгийн тайлан дэлгэрэнгүй →
                                </button>
                            </div>
                        </div>
                        <ScrollDownArrow targetId="governance" />
                      </section>

                      <section id="governance" className="py-24 relative min-h-[90vh] flex flex-col justify-center" style={{ backgroundImage: `url(${BACKGROUNDS.governance})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                        <div className="absolute inset-0 bg-slate-900/80"></div>
                        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                            <div className="text-center mb-16">
                              <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Компанийн засаглал</h2>
                              <p className="text-gray-400 max-w-2xl mx-auto mt-4 font-sans text-body">Бид ил тод, нээлттэй байдал болон бизнесийн ёс зүйг дээдэлнэ.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {governanceItems.map((item, idx) => {
                                  const Icon = item.icon;
                                  return (
                                      <div 
                                          key={idx} 
                                          onClick={() => handleGovernanceClick(item)} 
                                          className="group cursor-pointer flex flex-col items-center text-center p-6 hover:bg-white/5 rounded-2xl transition duration-300"
                                      >
                                      <div className="mb-6 text-[#D4AF37] transition transform group-hover:scale-110 duration-300">
                                          <Icon size={48} strokeWidth={1} />
                                      </div>
                                      <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-[#D4AF37] transition">{item.title}</h3>
                                      <div className="w-10 h-0.5 bg-white/20 group-hover:bg-[#D4AF37] transition mb-4"></div>
                                      {item.isLink ? <span className="text-white/50 text-xs uppercase tracking-wider">Дэлгэрэнгүй →</span> : <span className="text-white/50 text-xl font-bold">+</span>}
                                      </div>
                                  )
                              })}
                            </div>
                        </div>
                        <ScrollDownArrow targetId="products" color="text-[#003B5C]/50" />
                      </section>
                    </div>

                    <section id="products" className="py-32 relative min-h-screen flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.products})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                      <div className="absolute inset-0 bg-[#003B5C]/90"></div>
                      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                          <div className="text-center mb-24 max-w-3xl mx-auto">
                            <span className="text-[#00A651] font-display font-bold uppercase tracking-widest text-xs mb-4 block">Бидний шийдэл</span>
                            <h2 className="font-display font-bold text-3xl md:text-5xl text-white leading-tight">Бүтээгдэхүүн үйлчилгээ</h2>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {productsData.map((item) => {
                              const Icon = item.icon;
                              return (
                                  <div 
                                    key={item.id} 
                                    className="group flex flex-col items-start h-full p-6 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-2xl transition-all duration-300"
                                  >
                                    <div className="mb-6 p-4 bg-white/10 rounded-2xl shadow-sm group-hover:bg-[#D4AF37] transition-colors duration-300 w-fit text-white group-hover:text-white">
                                        <Icon size={32} />
                                    </div>
                                    <h3 className="font-display font-semibold text-h3 text-white mb-3">{item.title}</h3>
                                    <p className="font-sans text-body text-gray-400 mb-6 leading-relaxed flex-grow group-hover:text-gray-300 transition">{item.shortDesc}</p>
                                    <button onClick={() => navigateTo('product_detail', item)} className="text-[#D4AF37] font-display font-bold uppercase text-xs tracking-wider group-hover:underline cursor-pointer flex items-center gap-2 mt-auto">
                                    Дэлгэрэнгүй <span>→</span>
                                    </button>
                                  </div>
                              )
                            })}
                          </div>
                      </div>
                      <ScrollDownArrow targetId="blog" color="text-white/50" />
                    </section>

                    <section id="blog" className="py-24 bg-slate-50 relative min-h-[90vh] flex items-center" style={{ backgroundImage: `url(${BACKGROUNDS.blog})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
                      <div className="absolute inset-0 bg-slate-900/90"></div>
                      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
                          
                          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                              <div className="text-center md:text-left">
                                <span className="text-[#00A651] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Мэдээ мэдээлэл</span>
                                <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Блог & Мэдээ</h2>
                              </div>
                              <button 
                                  onClick={() => navigateTo('blog_list')}
                                  className="px-8 py-3 border border-white/30 text-white rounded-full font-bold text-xs uppercase hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all"
                              >
                                  Бүх мэдээг харах
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {blogPosts.slice(0, 4).map((post) => {
                                const hasLink = post.externalLink && post.externalLink.length > 0;
                                return (
                                    <div key={post.id} className="bg-transparent border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 hover:bg-white/5 transition duration-300 group flex flex-col">
                                      <div className="h-48 overflow-hidden opacity-80 group-hover:opacity-100 transition duration-300 relative">
                                          <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                          {hasLink && (
                                              <a 
                                                  href={post.externalLink} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="absolute inset-0 z-10 block"
                                              ></a>
                                          )}
                                      </div>
                                      <div className="p-6 flex flex-col flex-grow">
                                          <span className="text-[#00A651] text-xs font-bold uppercase tracking-wider block mb-2">{post.date}</span>
                                          <h3 className="font-display font-bold text-lg text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#D4AF37] transition">
                                              {hasLink ? (
                                                  <a href={post.externalLink} target="_blank" rel="noopener noreferrer">{post.title}</a>
                                              ) : (
                                                  post.title
                                              )}
                                          </h3>
                                          <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-grow">{post.excerpt}</p>
                                          {hasLink ? (
                                              <a 
                                                  href={post.externalLink} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-white/70 font-bold text-xs uppercase hover:text-[#D4AF37] transition mt-auto text-left flex items-center gap-2"
                                              >
                                                  Унших <span className="text-lg">↗</span>
                                              </a>
                                          ) : (
                                              <button 
                                                  onClick={() => navigateTo('blog_detail', post)} 
                                                  className="text-white/70 font-bold text-xs uppercase hover:text-[#D4AF37] transition mt-auto text-left"
                                              >
                                                  Дэлгэрэнгүй →
                                              </button>
                                          )}
                                      </div>
                                    </div>
                                );
                            })}
                          </div>
                      </div>
                      <ScrollDownArrow targetId="contact" />
                    </section>

                    <section id="contact" className="relative min-h-screen flex items-center bg-gray-900 text-white" style={{ backgroundImage: `url(${BACKGROUNDS.contact})`, backgroundSize: 'cover' }}>
                      <div className="absolute inset-0 bg-[#002a42]/90"></div>
                      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center py-20">
                          <div>
                            <img src={logoMetal} alt="Solongo Capital Metal" className="h-16 mb-10 object-contain brightness-0 invert opacity-80" />
                            <span className="text-[#00A651] font-display font-bold uppercase tracking-widest text-xs mb-2 block">Бидэнтэй нэгдээрэй</span>
                            <h2 className="font-display font-bold text-3xl md:text-5xl mb-12">Холбоо барих</h2>
                            <div className="space-y-8">
                                <a href="https://goo.gl/maps/YOUR_LINK" target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group hover:opacity-80 transition cursor-pointer">
                                  <span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#00A651] group-hover:bg-[#00A651] group-hover:text-white transition"><MapPin size={20} /></span>
                                  <div>
                                      <p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Хаяг</p>
                                      <p className="font-display font-semibold text-lg leading-snug">Улаанбаатар хот, Хан-Уул дүүрэг, 20 хороо,<br/>Чингисийн өргөн чөлөө, Мишээл оффис төв,<br/>М3 цамхаг 12 давхар, 1207 тоот</p>
                                  </div>
                                </a>
                                <div className="flex items-start gap-6 group"><span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#00A651]"><Phone size={20} /></span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Утас</p><p className="font-display font-semibold text-xl tabular-nums">7599 1919, 7599 9191</p></div></div>
                                <div className="flex items-start gap-6 group"><span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#00A651]"><Mail size={20} /></span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">И-мэйл</p><p className="font-display font-semibold text-xl">info@scm.mn</p></div></div>
                            </div>
                          </div>
                          
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

                      {/* ✅ FOOTER ЗАСВАР (Гар утасны даралт + z-index) */}
                      <div className="absolute bottom-6 w-full text-center border-t border-white/10 pt-6 pb-6">
                          <p className="text-[#C9A24D]/40 text-xs font-sans mb-2">
                              &copy; Copyright @2025 Solongo Capital (SCM). All rights reserved.
                          </p>
                          <button 
                              onClick={() => navigateTo('shogun_studio')}
                              className="relative z-[60] pointer-events-auto text-xs font-sans font-bold tracking-wider hover:opacity-80 transition-opacity cursor-pointer block mx-auto py-2 px-4"
                          >
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F4E285] to-[#D4AF37]">
                                  Website by ShogunAi Studio
                              </span>
                          </button>
                      </div>
                    </section>
                  </>
            )}
        </>
      )}
    </div>
  );
}

export default App;