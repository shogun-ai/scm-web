# Frontend Improvements — Судалгаа
_www.scm.mn | React 19 + Vite 7 + Tailwind 3_

---

## 1. Performance Optimization

### Яаралтай засвар

**lucide-react CJS alias устгах** — `vite.config.js`-аас:
```js
// УСТГАХ:
'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react/dist/cjs/lucide-react.js'),
```
Vite 7 автоматаар ESM path ашиглана → tree-shaking идэвхжинэ.

**React.lazy + Suspense:**
```js
const AdminPanel         = React.lazy(() => import('./components/AdminPanel'));
const LoanRequest        = React.lazy(() => import('./components/LoanRequest'));
const TrustRequest       = React.lazy(() => import('./components/TrustRequest'));
const CustomerOnboarding = React.lazy(() => import('./components/CustomerOnboarding'));
```

**Vite manual chunks (`vite.config.js`):**
```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-lucide': ['lucide-react'],
        'vendor-axios': ['axios'],
        'admin': ['./src/components/AdminPanel.jsx', './src/components/Login.jsx'],
        'loan-form': ['./src/components/LoanRequest.jsx', './src/components/CustomerOnboarding.jsx'],
      }
    }
  },
  target: 'es2020',
  minify: 'esbuild',
}
```

**Зураг:** `<img>` tag-т `loading="lazy"` нэмэх; above-the-fold hero зурагт `<link rel="preload" as="image">`.

**Нэмэх packages:**
- `vite-plugin-compression@^0.5.1` — Brotli/Gzip pre-compress
- `vite-bundle-visualizer@^1.2.2` — bundle шинжилгээ (devDependency)

---

## 2. SEO

**Package:** `react-helmet-async@^2.0.5` (React 19-тэй нийцтэй)

```bash
npm install react-helmet-async@2.0.5
```

`main.jsx`-д `<HelmetProvider>` wrap, хуудас бүрт:
```jsx
<Helmet>
  <title>Бизнесийн зээл | Solongo Capital ББСБ</title>
  <meta name="description" content="Бизнесийн өсөлтийг хурдасгах. 500 сая хүртэлх зээл." />
  <meta property="og:locale" content="mn_MN" />
  <link rel="canonical" href="https://www.scm.mn/products/biz_loan" />
</Helmet>
```

Schema.org `FinancialService` JSON-LD нэмэх.

**Нэмэх packages:**
- `vite-plugin-html@^3.2.2` — build-time default meta inject
- `vite-plugin-sitemap@^0.6.1` — автомат sitemap.xml

---

## 3. Accessibility (WCAG 2.1 AA)

**Critical засварууд:**
- Mobile menu button: `aria-label="Цэс нээх"`, `aria-expanded={mobileMenuOpen}`
- Бүх modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; `Escape` товчоор хаах
- LoanRequest steps: `<nav aria-label="Маягтын явц">` + `aria-current="step"` + `role="progressbar"`
- Error messages: `role="alert"` эсвэл `aria-live="polite"`
- Skip navigation link нэмэх

**Color contrast:** `#00A651` жижиг текст → `#007A3D` болгох (4.6:1 ratio, AA pass)

**Focus management:** View шилжих бүрд `mainRef.current?.focus()`

**Dev хэрэгслүүд:**
- `@axe-core/react@^4.10.2` — dev-д автомат тест
- `eslint-plugin-jsx-a11y@^6.10.2` — lint шалгалт

---

## 4. Component Architecture

**Санал болгох бүтэц:**
```
frontend/src/
  pages/       ← HomePage, ProductDetailPage, FinancialReportsPage...
  sections/    ← HeroSection, AboutSection, ProductsSection...
  components/  ← Navbar, OrgChart, ScrollDownArrow, BackButton...
  context/     ← AppContext.jsx (currentView, cfg, products, navigateTo)
  data/        ← products.js, blogPosts.js, governanceItems.js
  hooks/       ← useCmsData.js, useNavigation.js, useScrolled.js
  router.js    ← pathToState, VIEW_PATHS
  App.jsx      ← ~100 мөр болно
```

**State management:** Context API хангалттай. Zustand шаардлагагүй.

**Хуваах аюулгүй дараалал:** data → utilities → Context → sections → pages.

---

## 5. Form UX

**LoanRequest (8-алхам):**
- Auto-save localStorage — browser хаавал өгөгдөл алдагдана
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`
- Validation: `onBlur` дээр (бичиж байхад биш); алдаатай field рүү auto-scroll
- File upload: drag-and-drop zone, progress %, compression харуулах ("5.2MB → 0.8MB")

---

## 6. Skeleton Screens

Tailwind `animate-pulse` ашиглах (гадаад library шаардлагагүй):

```jsx
const BlogCardSkeleton = () => (
  <div className="rounded-lg overflow-hidden bg-white/10 animate-pulse">
    <div className="h-48 bg-white/20" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-white/20 rounded w-1/4" />
      <div className="h-5 bg-white/25 rounded w-3/4" />
      <div className="h-4 bg-white/15 rounded w-full" />
    </div>
  </div>
);
```

Skeleton хэрэгтэй газрууд: BlogList, FinancialReportsPage, financial stats section, AdminPanel table.

---

## 7. Санхүүгийн вэбсайтын тусгай шаардлага

**Заавал нэмэх хуудсууд:**

| Хуудас | Шалтгаан |
|--------|----------|
| Нууцлалын бодлого | Харилцагч мэдээлэл цуглуулж байна |
| Үйлчилгээний нөхцөл | Онлайн маягт хүлээн авч байна |
| Эрсдэлийн мэдэгдэл | Итгэлцлийн бүтээгдэхүүн |
| Хариу нэхэмжлэх журам | Санхүүгийн байгууллагын итгэл |

**Trust indicators:**
- СЗХ лиценз дугаар footer-т
- Байгуулагдсан он, бүртгэлийн дугаар
- Хүүгийн disclaimer (ЖХ тооцоо, "зөвхөн лавлагаа")

---

## Эрсдэл

1. **App.jsx хуваах** — хамгийн том regression эрсдэл. Нэг алхамд хийхгүй.
2. **react-helmet-async@2.0.5 + React 19** — deploy өмнө тест хийх.
3. **СЗХ-ны тусгай шаардлага** — хуулийн зөвлөхөөр нотлуулах.
4. **Монгол Улсын хувийн мэдээлэл хамгаалах хууль (2021)** — онлайн үйлчилгээнд тавих шаардлага баталгаажуулах.
