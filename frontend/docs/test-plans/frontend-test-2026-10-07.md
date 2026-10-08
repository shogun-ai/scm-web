# Frontend тест план — www.scm.mn
**Огноо:** 2026-10-07
**Хянагч:** QA Agent (tester)
**Хамрах хүрээ:** App.jsx рефактор + 17 шинэ онцлог

---

## 1. Acceptance Criteria — Тест кейсийн бүртгэл

| # | Acceptance Criteria | Тест ID | Хамрагдсан | Үр дүн |
|---|---|---|---|---|
| 1 | Бүх 19 view navigation ажиллана | TC-01–TC-19 | Тийм | Доороос харна уу |
| 2 | /privacy-policy routing зөв | TC-20 | Тийм | ДАВСАН |
| 3 | /terms routing зөв | TC-21 | Тийм | ДАВСАН |
| 4 | /404 routing зөв | TC-22 | Тийм | ДАВСАН |
| 5 | localStorage draft ачаалах | TC-30 | Тийм | ДАВСАН |
| 6 | localStorage draft хадгалах | TC-31 | Тийм | ДАВСАН |
| 7 | localStorage draft арилгах (submit) | TC-32 | Тийм | ДАВСАН |
| 8 | Draft "Цэвэрлэх" товч | TC-33 | Тийм | **УНАСАН — BUG-01** |
| 9 | FAQ accordion Enter/Space товч | TC-40 | Тийм | ДАВСАН |
| 10 | FAQ accordion нэг дор нэг л нээгдэнэ | TC-41 | Тийм | ДАВСАН |
| 11 | Breadcrumb navigateTo дуудлага зөв | TC-50 | Тийм | **УНАСАН — BUG-02** |
| 12 | Skeleton 3 карт харуулна | TC-60 | Тийм | ДАВСАН |
| 13 | React.lazy + Suspense fallback | TC-70 | Тийм | ДАВСАН |
| 14 | ErrorBoundary AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding-г ороосон | TC-71 | Тийм | ДАВСАН |
| 15 | SEO Helmet нүүр хуудсанд | TC-80 | Тийм | ДАВСАН |
| 16 | Skip navigation link | TC-81 | Тийм | ДАВСАН |
| 17 | ARIA progressbar LoanRequest | TC-82 | Тийм | ДАВСАН |
| 18 | onBlur validation ажиллана | TC-90 | Тийм | **УНАСАН — BUG-03** |
| 19 | Drag-drop файл upload | TC-91 | Тийм | ДАВСАН |
| 20 | Зургийн compression харагдац | TC-92 | Тийм | ДАВСАН |
| 21 | popstate (browser back) зөв view сэргээнэ | TC-100 | Тийм | **УНАСАН — BUG-04** |
| 22 | products/promos хоосон үед хамаарах view fallback | TC-101 | Тийм | **УНАСАН — BUG-05** |

---

## 2. Тест кейсүүд

### TC-01 — TC-19: Navigation (19 view)

VIEW_PATHS (`src/data/constants.js`) болон App.jsx-ийн if-chain-г тулгасан бүртгэл:

| TC | View key | URL | App.jsx render | Хамрагдсан |
|---|---|---|---|---|
| TC-01 | `home` | `/` | `<div id="main-content">` + sections | Тийм |
| TC-02 | `financials` | `/financials` | `<FinancialReportsPage />` | Тийм |
| TC-03 | `policies` | `/policies` | `<PoliciesPage />` | Тийм |
| TC-04 | `blog_list` | `/blog` | `<BlogList />` | Тийм |
| TC-05 | `login` | `/login` | `<Login />` | Тийм |
| TC-06 | `loan_request` | `/loan-request` | `<LoanRequest />` (Lazy) | Тийм |
| TC-07 | `calculator` | `/calculator` | `<LoanCalculator />` | Тийм |
| TC-08 | `trust_calculator` | `/trust-calculator` | `<TrustCalculator />` | Тийм |
| TC-09 | `trust_request` | `/trust-request` | `<TrustRequest />` (Lazy) | Тийм |
| TC-10 | `onboarding` | `/onboarding` | `<CustomerOnboarding />` (Lazy) | Тийм |
| TC-11 | `admin` | `/admin` | `<AdminPanel />` (Lazy, auth шаардлагатай) | Тийм |
| TC-12 | `shogun_studio` | `/shogun-studio` | `<ShogunStudio />` | Тийм |
| TC-13 | `privacy_policy` | `/privacy-policy` | `<PrivacyPolicyPage />` | Тийм |
| TC-14 | `terms` | `/terms` | `<TermsPage />` | Тийм |
| TC-15 | `not_found` | `/404` | `<NotFoundPage />` | Тийм |
| TC-16 | `product_detail` | `/products/:key` | `<ProductDetailPage />` | Тийм |
| TC-17 | `governance_detail` | `/governance/:slug` | `<GovernanceDetailPage />` | Тийм |
| TC-18 | `promotion_detail` | `/promo/:slug` | `<PromotionDetailPage />` | Тийм |
| TC-19 | `chat_info` | `/chat-info/:key/:sec/:aud` | `<ChatInfoDetailPage />` | Тийм |

**TC-11 онцгой тохиолдол:** `admin` view-г `currentUser && authToken` шалгалтгүйгээр URL-р шууд нэвтрэхэд:
- `useRouting` → `pathToState` → view: 'admin' set болно
- Харин App.jsx-д `currentView === 'admin' && currentUser && authToken` тул AdminPanel рендер болохгүй — харин `<><BackButton .../><Navbar />...` блок руу унаж, тэрхүү блокт view==='admin' тохирох нөхцөл байхгүй тул **хоосон гаралт** болно.

**Олдсон алдаа: BUG-05-тай холбоотой — доороос харна уу.**

---

### TC-20 — TC-22: Шинэ хуудсуудын routing

**TC-20: /privacy-policy**
- `pathToState('/privacy-policy', ...)` → `VIEW_PATHS` хайлт → `{ view: 'privacy_policy' }` ✓
- App.jsx: `currentView === 'privacy_policy'` → `<PrivacyPolicyPage />` ✓
- Helmet title: "Нууцлалын бодлого | Solongo Capital" ✓
- BackButton onClick → `navigateTo('home')` ✓
- **Үр дүн: ДАВСАН**

**TC-21: /terms**
- Мөн аргаар → `<TermsPage />` ✓
- **Үр дүн: ДАВСАН**

**TC-22: /404**
- `VIEW_PATHS` дотор `not_found: '/404'` бий ✓
- Мэдэгдээгүй URL `/xyz/abc` → pathToState → `not_found` ✓
- **Үр дүн: ДАВСАН**

---

### TC-30 — TC-33: localStorage Draft логик

**TC-30: Draft ачаалах (mount)**
```
localStorage['scm_loan_request_draft'] = JSON.stringify({ selectedProduct: 'biz_loan', firstName: 'Б', ... })
→ Component mount
→ useEffect: saved = localStorage.getItem(STORAGE_KEY) → parse → files хасна → setFormData merge → setShowDraftBanner(true)
```
- Шалгах: `selectedProduct || firstName || orgName` байвал ачааллана ✓
- Хэрэв JSON invalid → `localStorage.removeItem` дуудна ✓
- **Үр дүн: ДАВСАН**

**TC-31: Auto-save**
```
formData өөрчлөгдөнө → useEffect [formData] ажиллана
→ { files: _f, ...saveable } задлана
→ hasContent шалгана → localStorage.setItem
→ autoSaved = true → 2000ms дараа false
```
- Шалгах: `files` талбар хадгалагдахгүй ✓
- **Үр дүн: ДАВСАН**

**TC-32: Submit дараа draft арилгах**
```
handleSubmit → localStorage.removeItem(STORAGE_KEY) ✓
```
- **Үр дүн: ДАВСАН**

**TC-33: "Цэвэрлэх" товч — BUG-01**
- `showDraftBanner` banner дахь "Цэвэрлэх" товч:
  - `localStorage.removeItem` ✓
  - `setFormData(prev => ({ ...prev, ...fields }))` — reset хийнэ
  - `setShowDraftBanner(false)` ✓
- **Алдаа: reset хийхдээ `collaterals`, `guarantors`, `vehicle`, `collateral`, `orgCeo`, `orgOwner` талбаруудыг анхны утганд оруулдаггүй.** Зөвхөн scalar талбаруудыг reset хийдэг тул nested state (collaterals array, guarantors array) өмнөх draft-аас үлдсэн хэвээр байж болно.
- **Үр дүн: УНАСАН — BUG-01 (дунд зэрэг)**

---

### TC-40 — TC-41: FAQ Accordion

**TC-40: Keyboard navigation (Enter/Space)**

`FAQItem` компонент:
```jsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onToggle();
  }
}}
```
- button элемент тул нативаар Enter ажилладаг + onKeyDown дээр давхар дуудлага болно.

**Алдаа олдлоо: BUG-06 (бага зэрэг)** — `<button>` элемент нь нативаар `click` event-г Enter болон Space дээр гаргадаг. `onKeyDown` handler нь `onToggle`-г давхар дуудна: эхлээд `onKeyDown`-д, дараа нь `onClick`-д. Үүний үр дүнд нэг удаа дарахад accordion нээгдэж, тэр даруй хаагдана (эсвэл эсрэгээр).

- `aria-expanded` ✓
- `aria-controls` / `id` холболт ✓
- `focus-visible:ring` ✓
- **Үр дүн: УНАСАН — BUG-06 (бага зэрэг)**

**TC-41: Нэг дор нэг л нээгдэнэ**
```
toggle(idx) → setOpenIndex(prev => prev === idx ? null : idx)
```
- Шинэ FAQ нээхэд өмнөх нь хаагдана ✓
- **Үр дүн: ДАВСАН**

---

### TC-50: Breadcrumb navigateTo дуудлага

`ProductDetailPage.jsx` дахь Breadcrumb:
```jsx
<Breadcrumb items={[
  { label: 'Нүүр', onClick: () => navigateTo('home') },
  { label: 'Бүтээгдэхүүн', onClick: () => navigateTo('home', null, null) },
  { label: selectedItem?.name || selectedItem?.title },
]} />
```

**Алдаа: BUG-02 (дунд зэрэг)**
- "Бүтээгдэхүүн" item нь `navigateTo('home', null, null)` дуудаж нүүр хуудас руу буцаана — гэхдээ `#products` section-д scroll хийдэггүй.
- Хэрэглэгч бүтээгдэхүүний жагсаалт хэсэг рүү буцахыг хүснэ, нүүр хуудасны дээд хэсэгт биш. Зөв дуудлага нь `scrollToSection('products')` байх ёстой.
- **Үр дүн: УНАСАН — BUG-02**

---

### TC-60: Skeleton 3 карт

`BlogList.jsx`:
```jsx
if (loading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <BlogCardSkeleton />
      <BlogCardSkeleton />
      <BlogCardSkeleton />
    </div>
  );
}
```
- 3 skeleton карт ✓
- `aria-hidden="true"` skeleton-д ✓
- `sr-only` aria-live мэдэгдэл ✓
- **Үр дүн: ДАВСАН**

---

### TC-70 — TC-71: React.lazy / ErrorBoundary

**TC-70:** LoanRequest, AdminPanel, TrustRequest, CustomerOnboarding нь `React.lazy()` ашигладаг ✓. Suspense fallback spinner ✓.

**TC-71:** AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding — тус бүр `<ErrorBoundary>` дотор ✓.

---

### TC-80 — TC-82: SEO, Accessibility

**TC-80:** Нүүр хуудасны Helmet:
```jsx
<title>Solongo Capital ББСБ — Найдвартай санхүүгийн түнш</title>
<meta name="description" ... />
<meta property="og:title" ... />
<meta property="og:locale" content="mn_MN" />
```
✓ — **ДАВСАН**

**TC-81:** Skip link:
```jsx
<a href="#main-content" className="sr-only focus:not-sr-only ...">
  Үндсэн агуулга руу очих
</a>
```
- `id="main-content"` нь `<div id="main-content">` дотор ✓
- Гэхдээ skip link нь `admin` view болон бусад detail page-д `id="main-content"` байхгүй учраас link нь хаана ч хүрэхгүй болно.
- **Дунд зэрэг асуудал: BUG-07**

**TC-82:** ARIA progressbar:
```jsx
role="progressbar"
aria-valuenow={step}
aria-valuemin={1}
aria-valuemax={STEPS.length}
aria-label={`Алхам ${step}/${STEPS.length}`}
```
✓ — **ДАВСАН**

---

### TC-90 — TC-92: LoanRequest validation & upload

**TC-90: onBlur validation**

`validateField` нь `formData[key]` ашиглана:
```js
const validateField = (key, value) => {
  const v = value !== undefined ? value : formData[key];
  ...
}
```
`handleBlur` нь `e.target.value` дамжуулна ✓.

**Алдаа: BUG-03 (бага зэрэг)**
- `regNo` талбарын onBlur шалгалт: `validateField('regNo', value)` → `String(v).length < 10`.
- Хэрэглэгч `АБ123` (5 тэмдэгт) оруулаад focus гарахад "Регистр дутуу" гарна — энэ зөв.
- Гэхдээ `handleChange` дотор `regNo`-г uppercase болгодог боловч `validateField` дотор uppercase шалгалт хийдэггүй — зөвхөн урт шалгана. Учир нь энэ нь функциональ асуудал биш.
- **Жинхэнэ алдаа:** `term` талбарт `0` оруулахад `parseInt('0') > 120` → false тул алдаа гарахгүй, гэхдээ 0 сарын хугацаа утгагүй. `validate()` болон `validateField` хоёулаа `term && parseInt(v) > 120` шалгана — `term` truthy учраас `0` нь `if (!formData.term)` нөхцөлд орохгүй (0 is falsy гэхдээ string `'0'` is truthy). `'0'` нь truthy тул "Хугацаа оруулна уу" гарахгүй, `parseInt('0') > 120` нь false тул хоёр дахь алдаа ч гарахгүй — 0 сарын хугацааг зөвшөөрнө.
- **Үр дүн: УНАСАН — BUG-03**

**TC-91: Drag-drop**
```jsx
onDragOver → setDragOver(true)
onDragLeave → setDragOver(false)
onDrop → handleFiles(Array.from(e.dataTransfer.files))
```
✓ — **ДАВСАН**

**TC-92: Compression харагдац**
```jsx
if (origMB > 0.1) {
  newInfo[f.name] = { orig: origMB, compressed: compMB };
}
```
Compression мэдээлэл зөвхөн >0.1MB файлд харагдана ✓ — **ДАВСАН**

---

### TC-100 — TC-101: Edge case, regression

**TC-100: popstate (browser back/forward)**

`useRouting.js`:
```js
const handlePop = () => {
  const s2 = pathToState(pn, h, products, promotions, governanceItems);
  setCurrentView(s2.view);
  setSelectedItem(s2.item);
  if (s2.governance) setSelectedGovernance(s2.governance);
  ...
};
```

**Алдаа: BUG-04 (өндөр)**
- Хэрэглэгч `product_detail` view-д байгаад browser back дарна → `pathToState` `selectedGovernance`-г `null`-аар буцаана (гэхдээ `setSelectedGovernance(null)` дуудахгүй, зөвхөн truthy үед л set хийнэ).
- Хэрэглэгч `governance_detail` → `product_detail` → back дарахад `selectedGovernance` өмнөх state-д үлдэж болно.
- Нарийвчлавал: `governance_detail`-аас явсны дараа `product_detail`-г харуулах үед `s2.governance === null` тул `setSelectedGovernance(null)` дуудагдахгүй → өмнөх governance state хадгалагдана. Гэхдээ view нь `product_detail` болохоор `selectedGovernance` ашиглагдахгүй — тэр хэсгийг App.jsx дахь нөхцөл хамгаалдаг. **Харин** `governance_detail` → back → знову `governance_detail` URL-д очвол `selectedGovernance` шинэчлэгдэхгүй байж болно хэрэв popstate-д `s2.governance` truthy биш бол.
- **Үр дүн: УНАСАН — BUG-04 (regression эрсдэл)**

**TC-101: products хоосон үед URL-р нэвтрэх**

`pathToState('/products/biz_loan', '', [], [], [])`:
```js
const item = prods.find(p => p.productKey === key || String(p.id) === key);
return { view: item ? 'product_detail' : 'home', item: item || null, ... };
```
- `products` ачаалагдаагүй (хоосон array) үед → `view: 'home'` → нүүр хуудас харуулна ✓
- Гэхдээ `useRouting` useEffect нь `[products, promotions, governanceItems]` dependency-тай. CMS data ачаалагдсаны дараа дахин ажиллана → гэхдээ pathname хянах нөхцөл:
  ```js
  if (pathname !== '/' || hash) {
    setCurrentView(s.view);
  ```
  Хэрэв `products` эхлээд хоосон → `view: 'home'` set болно. Дараа нь products ачаалагдаад dependency өөрчлөгдөхөд useEffect дахин ажиллах ч `s.view` одоо `product_detail` болно → `setCurrentView('product_detail')` → `selectedItem` set болно → зөв харуулна.
- **Тийм болохоор энэ нь зөв ажиллана. Гэхдээ хэрэглэгч products ачаалагдахаас өмнө нүүр рүү redirect болсон харагдацаар харна — эхний ачаалалтын flickering.**
- **Үр дүн: ХЭСЭГЧЛЭН ДАВСАН (flickering UI issue — BUG-05 бага зэрэг)**

---

### TC-110: Admin view authentication guard

`App.jsx`:
```jsx
{currentView === 'admin' && currentUser && authToken ? (
  <AdminPanel ... />
) : (
  <>
    <BackButton ... />
    <Navbar />
    {currentView === 'chat_info' && ...}
    ...
    {/* admin view-д тохирох нөхцөл байхгүй */}
  </>
)}
```

**Алдаа: BUG-08 (дунд зэрэг)**
- Хэрэглэгч `/admin` URL-р нэвтрэхэд (нэвтрэлт хийгдээгүй үед):
  - `currentView` = 'admin', `currentUser` = null → AdminPanel рендер болохгүй ✓
  - Харин else блокт `currentView === 'admin'`-д тохирох нөхцөл **байхгүй** тул бүх if-chain дамжиж, `else` блок (нүүр хуудас) харуулна.
  - Энэ нь `/admin` URL-д нэвтрэлт хийгдээгүй байхад нүүр хуудас харуулна — `/login` руу redirect хийхгүй.
- **Үр дүн: УНАСАН — BUG-08**

---

## 3. Regression эрсдэлтэй газрууд

### R-01: navigateTo-н item/govItem state цэвэрлэх асуудал
```js
const navigateTo = (view, item = null, govItem = null) => {
  if (item) setSelectedItem(item);
  if (govItem) setSelectedGovernance(govItem);
  ...
};
```
`item` эсвэл `govItem` null байвал **тухайн state цэвэрлэгддэггүй**. Жишээ нь:
- `navigateTo('product_detail', productA)` → `selectedItem = productA`
- `navigateTo('home')` → `selectedItem` **productA хэвээр үлдэнэ**
- Хэрэв хэрэглэгч нүүр хуудаст буцаад дахин `navigateTo('product_detail')` дуудагдвал өмнөх product харуулж болно.
- Гэхдээ App.jsx-д `currentView === 'product_detail' && selectedItem` шалгалт байдаг тул `navigateTo('home')`-н дараа `product_detail` хэсэг харагдахгүй — **сөргийн нөлөө хязгаарлагдсан** боловч state dirty хэвээр үлдэнэ.

### R-02: PRODUCT_ID_MAP болон PRODUCT_KEY_MAP зөрүү
`LoanRequest.jsx` дахь `PRODUCT_ID_MAP`:
```js
const PRODUCT_ID_MAP = { 1: 'biz_loan', 2: 'car_purchase_loan', 3: 'cons_loan', 5: 'credit_card', 6: 're_loan', 7: 'line_loan' };
```
`constants.js` дахь `PRODUCT_KEY_MAP`:
```js
export const PRODUCT_KEY_MAP = { 1: 'biz_loan', 2: 'car_loan', ... };
```
**Алдаа: BUG-09 (өндөр)**
- ID 2 (автомашины зээл) үед `PRODUCT_KEY_MAP`-д `'car_loan'`, `PRODUCT_ID_MAP`-д `'car_purchase_loan'` байна.
- `pathToState` нь `/products/car_loan` URL-г `prods.find(p => p.productKey === 'car_loan')` гэж хайна.
- Харин `LoanRequest` нь `initialProduct` prop-оор орж ирэх product-ын `id`-г `PRODUCT_ID_MAP`-ээр `'car_purchase_loan'` болгоно.
- `LOAN_PRODUCTS` дотор `car_purchase_loan` ID-тай product байхгүй бол алдаа гарч болно — эсвэл `car_loan` vs `car_purchase_loan` ялгаа routing дотор regression үүсгэнэ.

### R-03: useLayoutEffect focus restore
```jsx
useLayoutEffect(() => {
  const key = activeFieldRef.current;
  const el = key ? inputRefs.current[key] : null;
  if (!el || document.activeElement === el || !document.body.contains(el)) return;
  el.focus({ preventScroll: true });
  ...
});
```
Dependency array байхгүй (`[]` дутуу) тул **render болгон** ажиллана. Энэ нь зориудын хэрэгжүүлэлт (cursor position сэргээх) боловч гадны event (modal нээх, chatbot focus авах) дараа LoanRequest маягт дахь талбар дахин focus авах шалтгаан болно.

### R-04: FAQSection background key буруу
```jsx
const sectionStyle = getSectionBackgroundStyle
  ? getSectionBackgroundStyle('blog', BACKGROUNDS.about, { fixed: false })
  : ...
```
FAQ section нь `'blog'` key ашигладаг — `'faq'` гэсэн тусдаа key байхгүй учраас FAQ section нь blog-ийнх шиг өнгөтэй харагдана. Тематик туршлага дутагдалтай боловч функциональ алдаа биш.

---

## 4. Bug бүртгэл (зэрэглэлтэй)

### BUG-01 — Draft "Цэвэрлэх" товч бүрэн reset хийдэггүй
- **Зэрэглэл:** Дунд (Medium)
- **Файл:** `src/components/LoanRequest.jsx`, мөр 1040–1049
- **Давтан гаргах алхам:**
  1. LoanRequest хуудсыг нээ
  2. Маягтыг бөглөж guarantor нэмэх, collateral нэмэх
  3. Хуудсыг дахин ачаалах (draft хадгалагдсан)
  4. Draft banner дахь "Цэвэрлэх" дарах
- **Хүлээгдсэн:** Бүх талбар анхны хоосон утганд орно (`collaterals`, `guarantors`, `orgCeo`, `orgOwner` хүртэл)
- **Бодит:** `collaterals`, `guarantors`, `vehicle`, `collateral`, `orgCeo`, `orgOwner` хоосордоггүй — draft-аас ачаалсан nested state хэвээр үлдэнэ
- **Шалтгаан:** Reset функц зөвхөн scalar талбаруудыг тодорхойлсон, nested object/array талбаруудыг орхисон

### BUG-02 — Breadcrumb "Бүтээгдэхүүн" дарахад #products section руу scroll хийдэггүй
- **Зэрэглэл:** Дунд (Medium)
- **Файл:** `src/pages/ProductDetailPage.jsx`, мөр 85
- **Давтан гаргах алхам:**
  1. Нүүр хуудасны "Бүтээгдэхүүн" section-оос нэг бүтээгдэхүүн сонгох
  2. Breadcrumb-н "Бүтээгдэхүүн" дарах
- **Хүлээгдсэн:** Нүүр хуудасны `#products` anchor руу scroll хийнэ
- **Бодит:** Нүүр хуудасны дээд хэсэг (hero) харуулна
- **Шалтгаан:** `navigateTo('home', null, null)` дуудаж байгаа бөгөөд `scrollToSection('products')` дуудахгүй

### BUG-03 — Зээлийн хугацаа `0` оруулахад validation алддаг
- **Зэрэглэл:** Бага (Low)
- **Файл:** `src/components/LoanRequest.jsx`, мөр 268, 353
- **Давтан гаргах алхам:**
  1. LoanRequest алхам 4-т хүрэх
  2. Хугацаа талбарт `0` оруулах
  3. "Үргэлжлүүлэх" дарах
- **Хүлээгдсэн:** "Хугацаа 0-с их байх ёстой" гэсэн алдаа гарна
- **Бодит:** Алдаа гарахгүй, алхам 5 руу үргэлжлэнэ
- **Шалтгаан:** `!formData.term` нь `'0'` string-д truthy тул алдаагүй. `parseInt('0') > 120` нь false тул хоёр дахь шалгалт ч алддаг. Minimum утгын шалгалт байхгүй

### BUG-04 — popstate дараа selectedGovernance цэвэрлэгддэггүй
- **Зэрэглэл:** Өндөр (High)
- **Файл:** `src/hooks/useRouting.js`, мөр 75–77
- **Давтан гаргах алхам:**
  1. `/governance/board` руу очно
  2. `/products/biz_loan` руу очно
  3. Browser back дарна → `/governance/board` буцна
  4. Знову `/products/biz_loan` руу очно
  5. Browser back дарна — `selectedGovernance` алдагдаж болно
- **Хүлээгдсэн:** popstate болгонд `selectedGovernance`-г оновчтой шинэчилнэ
- **Бодит:** `s2.governance` null үед `setSelectedGovernance(null)` дуудагдахгүй — state dirty үлдэнэ
- **Шалтгаан:** `if (s2.governance) setSelectedGovernance(s2.governance)` — null шалгалт байхгүй

### BUG-05 — Admin нэвтрэлтгүй /admin URL-д нүүр хуудас харуулна, login руу redirect хийдэггүй
- **Зэрэглэл:** Дунд (Medium)
- **Файл:** `src/App.jsx`, мөр 457–516
- **Давтан гаргах алхам:**
  1. Нэвтрэлт хийгдээгүй байхад `/admin` URL-д шууд ороход
- **Хүлээгдсэн:** `/login` хуудас руу redirect хийнэ
- **Бодит:** Нүүр хуудас харуулна (hero + sections)
- **Шалтгаан:** else-блокт `currentView === 'admin'` нөхцөлгүй, Login redirect логик байхгүй

### BUG-06 — FAQ accordion button Enter/Space дарахад давхар toggle болно
- **Зэрэглэл:** Бага (Low)
- **Файл:** `src/sections/FAQSection.jsx`, мөр 47–51
- **Давтан гаргах алхам:**
  1. FAQ accordion-г keyboard-р tab хийж focus авах
  2. Enter эсвэл Space дарах
- **Хүлээгдсэн:** Accordion нэг удаа нээгдэнэ эсвэл хаагдана
- **Бодит:** Нээгдэж, тэр даруй хаагдана (onKeyDown + onClick хоёулаа trigger болно)
- **Шалтгаан:** `<button>` нативаар Enter/Space-д click event гаргадаг. `onKeyDown` дахь `onToggle()` нь нэмэлт дуудлага болно

### BUG-07 — Skip navigation link зөвхөн нүүр хуудсанд ажиллана
- **Зэрэглэл:** Бага (Low)
- **Файл:** `src/App.jsx`, мөр 427–432
- **Давтан гаргах алхам:**
  1. `/loan-request` хуудсыг нээх
  2. Tab дарж skip link-д focus авах
  3. Enter дарах
- **Хүлээгдсэн:** Үндсэн агуулга руу scroll хийнэ
- **Бодит:** `#main-content` id зөвхөн home view-д байдаг тул бусад хуудсуудад link ажиллахгүй
- **Шалтгаан:** `id="main-content"` зөвхөн нүүр хуудасны `<div>` дотор

### BUG-08 — /admin URL нэвтрэлтгүй үед нүүр хуудас харуулдаг (login redirect байхгүй)
- BUG-05-тай давхцана — нэг мөн асуудал, давтана уу.

### BUG-09 — PRODUCT_ID_MAP ба PRODUCT_KEY_MAP-н ID 2 зөрүү
- **Зэрэглэл:** Өндөр (High)
- **Файл:** `src/components/LoanRequest.jsx` мөр 20, `src/data/constants.js` мөр 64
- **Давтан гаргах алхам:**
  1. Нүүр хуудасны автомашины зээл бүтээгдэхүүн дарах
  2. `navigateTo('loan_request', product)` дуудагдана
  3. `LoanRequest`-д `initialProduct = { id: 2 }`
  4. `PRODUCT_ID_MAP[2]` = `'car_purchase_loan'` → selectedProduct = `'car_purchase_loan'`
  5. Харин `constants.js` дахь `PRODUCT_KEY_MAP[2]` = `'car_loan'`
- **Хүлээгдсэн:** Автомашины зээлийн бүтээгдэхүүн тогтмол нэгдсэн key ашиглана
- **Бодит:** `car_loan` vs `car_purchase_loan` хоёр өөр key ашиглана — product matching-д regression эрсдэл
- **Шалтгаан:** Хоёр файлд тусдаа mapping тодорхойлсон, sync хийгдээгүй

---

## 5. Тест хамрагдалтын хураангуй

| Бүлэг | Тест тоо | Давсан | Унасан | Хэсэгчлэн |
|---|---|---|---|---|
| Navigation (19 view) | 19 | 18 | 0 | 1 (TC-11, BUG-05) |
| Шинэ хуудас routing | 3 | 3 | 0 | 0 |
| localStorage draft | 4 | 3 | 1 | 0 |
| FAQ accordion | 2 | 1 | 1 | 0 |
| Breadcrumb | 1 | 0 | 1 | 0 |
| Skeleton | 1 | 1 | 0 | 0 |
| Lazy + ErrorBoundary | 2 | 2 | 0 | 0 |
| SEO / Accessibility | 3 | 2 | 1 | 0 |
| LoanRequest validation | 3 | 2 | 1 | 0 |
| Regression / Edge case | 4 | 1 | 2 | 1 |
| **Нийт** | **42** | **33** | **7** | **2** |

---

## 6. Bug хураангуй (зэрэглэлээр)

| Bug ID | Тодорхойлолт | Зэрэглэл |
|---|---|---|
| BUG-04 | popstate → selectedGovernance цэвэрлэгддэггүй | Өндөр |
| BUG-09 | PRODUCT_ID_MAP / PRODUCT_KEY_MAP ID 2 зөрүү | Өндөр |
| BUG-01 | Draft "Цэвэрлэх" nested state reset хийдэггүй | Дунд |
| BUG-02 | Breadcrumb "Бүтээгдэхүүн" #products section руу scroll хийдэггүй | Дунд |
| BUG-05 | /admin нэвтрэлтгүй үед login redirect байхгүй | Дунд |
| BUG-03 | Term=0 validation алддаг | Бага |
| BUG-06 | FAQ Enter/Space давхар toggle | Бага |
| BUG-07 | Skip link зөвхөн нүүр хуудсанд ажиллана | Бага |

---

## 7. Дүгнэлт

**Release-д бэлэн эсэх: БЭЛЭН БИШ**

2 өндөр зэрэглэлийн bug олдсон:
- **BUG-04**: Browser history navigation (back/forward) дараа governance state буруу → `GovernanceDetailPage` буруу контент харуулж болно.
- **BUG-09**: Автомашины зээлийн бүтээгдэхүүний key зөрүү (`car_loan` vs `car_purchase_loan`) — LoanRequest маягтад бүтээгдэхүүн буруу тохируулагдах эрсдэлтэй.

Эдгээр 2 өндөр зэрэглэлийн bug засагдаж, дахин тест хийсний дараа release хийх боломжтой. Дунд болон бага зэрэглэлийн алдаануудыг хойшдуулж болох ч FAQ keyboard bug (BUG-06) нь accessibility стандарт зөрчдөг тул ойрын sprint-д засахыг зөвлөнө.
