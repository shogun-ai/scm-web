# Code Review: www.scm.mn Frontend - 2026-10-07

**Reviewer:** code-reviewer (agent)
**Scope:** App.jsx, AppContext, Navbar, ErrorBoundary, Breadcrumb, FAQSection, HeroSection, ContactSection, NotFoundPage, PrivacyPolicyPage, TermsPage, ProductDetailPage, useCmsData, useRouting, constants, vite.config, LoanRequest
**Build:** PASS
**Lint (scoped files):** PASS (0 errors in reviewed files)

---

## Verdict: Засвартай батлах (Approve with fixes)

Critical: 1 | High: 5 | Medium: 8 | Low: 5 | Nit: 4

---

## Асуудлын хүснэгт

### Critical

| # | Файл:мөр | Асуудал | Засвар |
|---|----------|---------|--------|
| C1 | `LoanRequest.jsx:521` | **Memory leak: `URL.createObjectURL` хэзээ ч revoke хийгдэхгүй.** Файлын preview-д `URL.createObjectURL(f)` нь `map` дотор render бүрт шинэ blob URL үүсгэдэг бөгөөд хэзээ ч `revokeObjectURL` дуудагдахгүй. Олон файл хавсаргавал browser-ийн санах ой дүүрэх эрсдэлтэй. | Blob URL-уудыг `useMemo` эсвэл `useEffect` дотор үүсгэж, cleanup-д `revokeObjectURL` дуудах. Эсвэл файл бүрт нэг удаа URL үүсгэж state-д хадгалах. |

### High

| # | Файл:мөр | Асуудал | Засвар |
|---|----------|---------|--------|
| H1 | `ProductDetailPage.jsx:12` | **Null reference crash.** `product` нь `selectedItem`-с ирдэг бөгөөд `null` байж болно (URL шууд нээвэл, products ачаалагдаагүй үед). Мөр 12-т `product.productKey` гэж хандахад crash болно. App.jsx:472-т `selectedItem` шалгадаг ч race condition байна - `useRouting` initial effect products-г ачаалахаас өмнө `product_detail` view-рүү шилжиж болно. | `if (!product) return <loading or redirect>;` guard нэмэх. |
| H2 | `ProductDetailPage.jsx:69` | **`product.icon` undefined байх боломжтой.** DB-с ирсэн шинэ бүтээгдэхүүн (useCmsData.js:76 `id: 'db_...'`) `icon: Briefcase` авдаг ч `ProductIcon` хувьсагч `undefined` байх edge case бий (icon property устсан тохиолдолд). `<ProductIcon size={48}/>` crash болно. | `const ProductIcon = product.icon || Briefcase;` fallback нэмэх. |
| H3 | `useRouting.js:36-37` | **`navigateTo('home')` дуудахад `selectedItem`, `selectedGovernance` цэвэрлэгдэхгүй.** `item` ба `govItem` нь `null` default-тэй ч `if (item)` шалгалтаар зөвхөн truthy утга авсан үед set хийдэг. Home руу буцахад хуучин `selectedItem` state-д үлдэнэ - дахин product_detail view-рүү шилжихэд хуучин мэдээлэл харагдах эрсдэлтэй. | `navigateTo` дотор item/govItem-г үргэлж set хийх: `setSelectedItem(item); setSelectedGovernance(govItem);` (null-г ч тавих). |
| H4 | `LoanRequest.jsx:72-81` | **`useLayoutEffect` dependency array байхгүй.** Render бүрт ажиллана. Form дотор олон state update хийгддэг тул performance-д муугаар нөлөөлнө. Мөн `preventScroll: true` flag-тэй `focus()` дуудахад mobile browser-уудад inconsistent ажиллана. | `useLayoutEffect`-д `[formData]` эсвэл шаардлагатай dependency нэмэх (эсвэл `step` өөрчлөгдөхөд л ажиллуулах). |
| H5 | `useCmsData.js:44-89` | **API алдааг чимээгүй дарж байна.** Бүх `fetch` дуудлага `.catch(() => {})` - хэрэглэгч ямар ч error message харахгүй, debug хийх боломжгүй. Production-д API унавал хоосон хуудас харагдана, хэрэглэгч юу болсныг мэдэхгүй. | Хамгийн наад зах нь `console.error` нэмэх. Хэрэглэгчид loading/error state нэмэх нь илүү сайн. |

### Medium

| # | Файл:мөр | Асуудал | Засвар |
|---|----------|---------|--------|
| M1 | `App.jsx:180-230` | **`governanceItems` модулийн scope-д (App-ын гадна) тодорхойлогдсон бөгөөд JSX component-уудыг (`<CEOContent/>`, `<OrgChart/>` г.м.) статикаар агуулдаг.** Энэ нь lazy load-ын ашгийг бууруулж, бүх governance component-ууд main bundle-д ордог. | `governanceItems`-г App дотор `useMemo`-р тодорхойлох, эсвэл component-уудыг lazy import хийх. |
| M2 | `App.jsx:271-287` | **`currentUser` ба `authToken`-г тус тусдаа useState-р localStorage-с parse хийдэг.** Ижил localStorage item-г 2 удаа parse хийж байна. | Нэг `useState`-р `{ user, token }` pair хадгалах, эсвэл нэг `useMemo` ашиглах. |
| M3 | `Navbar.jsx:167-198` | **Mobile menu нээлттэй үед body scroll хориглогдоогүй.** Хэрэглэгч background-аар scroll хийж чадна. | `useEffect`-р `document.body.style.overflow = 'hidden'` тавих, cleanup-д буцаах. |
| M4 | `Navbar.jsx:170-181` | **Mobile menu дээр submenu-тэй item дарахад `scrollToSection(item.id)` дуудагдана.** "Бүтээгдэхүүн" item-н хувьд `id: 'products'` section руу scroll хийнэ, гэхдээ `mobileMenuOpen` `false` болгоогүй тул overlay хаагдахгүй. Desktop-д submenu expand хийдэг item-уудыг mobile-д ч адилхан handle хийх хэрэгтэй. | Mobile menu-д submenu-тэй item дарахад `setMobileMenuOpen(false)` нэмэх. |
| M5 | `ErrorBoundary.jsx` | **`componentDidCatch` дутуу - алдааг logging service рүү илгээхгүй.** Production-д алдааны мэдээлэл алдагдана. | `componentDidCatch(error, info)` method нэмж, `console.error` эсвэл error tracking service рүү илгээх. |
| M6 | `FAQSection.jsx:47-50` | **Button дээр `onKeyDown` handler шаардлагагүй.** `<button>` element нь Enter болон Space товч дээр автоматаар `onClick` дуудагддаг. Энэ нь давхар event trigger хийж болно. | `onKeyDown` handler-г устгах. |
| M7 | `LoanRequest.jsx:153-164` | **Auto-save useEffect нь formData-г dependency-д оруулсан тул render бүрт localStorage бичих.** Form-д keystroke бүрт state update хийгддэг тул ихэвчлэн 100+ удаа/мин бичигдэнэ. | `debounce` (1-2 секунд) нэмэх. |
| M8 | `LoanRequest.jsx:61` | **`API_URL` constants.js-д аль хэдийн тодорхойлогдсон ч LoanRequest дотор дахин тодорхойлогдож байна (мөр 61).** DRY зөрчил. | `import { API_URL } from '../data/constants'` ашиглах. |

### Low

| # | Файл:мөр | Асуудал | Засвар |
|---|----------|---------|--------|
| L1 | `App.jsx:433-448` | **Inline `<style>` tag нь render бүрт шинэчлэгдэнэ.** Dynamic CSS-г `useMemo`-р cache хийх боломжтой. | Style string-г `useMemo`-р хийх (overlayRgb, oMul-с хамаарна). |
| L2 | `HeroSection.jsx:33-64` | **`className="hidden"` бүхий элементүүд DOM-д байсаар.** Хуучин markup `hidden` class-тай үлдсэн - preload зориулалтаар ашиглагдаж байх ч тодорхойгүй. DOM-ын хэмжээ шаардлагагүйгээр нэмэгдэнэ. | Шаардлагагүй hidden элементүүдийг устгах. |
| L3 | `PrivacyPolicyPage.jsx` / `TermsPage.jsx` | **2 файл бараг адилхан бүтэцтэй.** SECTIONS data болон header icon-оос бусад нь ижил. | Shared `LegalPage` component гаргаж, SECTIONS-г prop-оор дамжуулах. |
| L4 | `vite.config.js:27-28` | **`manualChunks` callback-д `react/` гэж шалгахад false positive болж болно** - `react/`-тэй таарах бусад package нэр байж болно (жнь `react-datepicker`). | `id.includes('/react/')` гэж илүү тодорхой шалгах. |
| L5 | `App.jsx:299-306` | **`navigateTo` ба `scrollToSection` wrapper функцууд ямар нэг нэмэлт логикгүй, шууд дамжуулж байна.** Шаардлагагүй abstraction давхарга. | Шууд `routingNavigateTo`, `routingScrollToSection`-г context-д дамжуулах. |

### Nit

| # | Файл:мөр | Асуудал |
|---|----------|---------|
| N1 | `App.jsx:44,58` | Emoji comment (`// ...`) ашигласан. Код дотор emoji сайн practice биш. |
| N2 | `LoanRequest.jsx:525` | `text-white/40 text-slate-400` -- хоёр `text-*` class зөрчилдөж байна. Зөвхөн `text-slate-400` хэрэгтэй. |
| N3 | `constants.js:8` | `FINANCIAL_DATE` hardcoded. CMS-с авч болно. |
| N4 | `Breadcrumb.jsx:17` | Key-д `idx` ашигласан. Items нь dynamic байвал key асуудалтай болж болно, гэхдээ breadcrumb-д хүлээн зөвшөөрөгдөхүйц. |

---

## Сайн хийгдсэн зүйлс

1. **Refactor бүтэц сайн.** `useCmsData`, `useRouting`, `useScrolled` hook-ууд App.jsx-ын хэмжээг бууруулж, хариуцлагын хуваарилалтыг сайжруулсан.
2. **AppContext pattern.** Context-г тусдаа файлд гаргаж, `useAppContext` hook-р хандах нь цэвэрхэн.
3. **Accessibility.** Skip navigation link (App.jsx:427), ARIA attributes (FAQSection accordion, Navbar mobile button, LoanRequest step bar), `focus-visible` ring, keyboard Escape handling - бүгд зөв хэрэгжсэн.
4. **Lazy loading.** AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding нь `React.lazy`-р ачаалагдаж, `ErrorBoundary`-р хүрээлэгдсэн.
5. **URL routing.** `pathToState` + `popstate` listener хослол нь browser back/forward товчийг зөв дэмждэг.
6. **Vite config.** Manual chunks зөв хуваагдсан, compression plugin нэмэгдсэн.
7. **LoanRequest auto-save.** Draft хадгалах/сэргээх механизм хэрэглэгчийн туршлагад сайн нөлөөтэй.
8. **File compression.** `browser-image-compression` ашиглан upload-ын хэмжээг бууруулж, compression info харуулдаг.

---

## Дараагийн алхам

1. **C1, H1** асуудлуудыг merge хийхээс өмнө заавал засна.
2. **H3, H5** нь production-д bug үүсгэх магадлалтай тул мөн засах нь зүйтэй.
3. **M3, M6** нь хэрэглэгчийн туршлагад нөлөөтэй тул дараагийн спринтэд оруулах.
