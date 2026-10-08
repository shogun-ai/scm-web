# Хэрэгжүүлэлтийн Task жагсаалт

Огноо: 2026-10-07
Холбогдох ADR: 0001, 0002, 0003

---

## Priority дараалал

Доорх task-ууд **дарааллаар** хэрэгжүүлэгдэнэ. Хамааралгүй task-уудыг зэрэг хийж болохыг тэмдэглэсэн.

---

### Phase 1: Яаралтай засварууд (1-2 хоног)

Эдгээр нь App.jsx хуваахаас **өмнө** хийгдэнэ. Одоогийн файлын бүтцэд шууд нэмэхэд аюулгүй, бие даасан ажлууд.

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P1.1 | lucide-react CJS alias устгах | `vite.config.js` | Байхгүй | Дунд — build шалгах |
| P1.2 | React.lazy нэмэх (AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding) | `App.jsx` | P1.1 | Бага |
| P1.3 | `#00A651` -> `#007A3D` ногоон өнгө солих (WCAG AA) | CSS/Tailwind, компонентууд | Байхгүй | Бага |
| P1.4 | Бүх `<img>` тагт `alt` текст нэмэх | Компонентууд | Байхгүй | Бага |

> P1.1 болон P1.3, P1.4 нь бие даасан — **зэрэг** хийж болно.
> P1.2 нь P1.1-ийн дараа хийгдэнэ (lucide-react ESM зөв ажиллаж байгааг баталгаажуулах).

**Шалгалт:** `cd frontend && npm run build && npm run lint` + бүх icon render шалгах.

---

### Phase 2: App.jsx Incremental Extraction (5-7 хоног)

ADR-0001-ийн дагуу 10 алхамаар хэрэгжүүлнэ. Алхам бүр тусдаа commit.

| # | Task | Үүсгэх файл(ууд) | Хамаарал | Эрсдэл |
|---|------|-------------------|----------|--------|
| P2.1 | Data файлд гаргах | `src/data/products.js`, `blogPosts.js`, `governanceItems.js`, `backgrounds.js`, `constants.js` | Байхгүй | Бага |
| P2.2 | Router файлд гаргах | `src/router/paths.js`, `pathToState.js` | P2.1 | Бага |
| P2.3 | Hooks файлд гаргах | `src/hooks/useCmsData.js`, `useScrolled.js`, `useRouting.js` | P2.1, P2.2 | Бага |
| P2.4 | AppContext үүсгэх | `src/context/AppContext.jsx` | P2.1-P2.3 | **Дунд** |
| P2.5 | Inline компонентууд гаргах | `src/components/BackButton.jsx`, `ScrollDownArrow.jsx`, `OrgChart.jsx` | P2.4 | Бага |
| P2.6 | Sections гаргах | `src/sections/HeroSection.jsx`, `AboutSection.jsx`, `FinancialsSection.jsx`, `GovernanceSection.jsx`, `ProductsSection.jsx`, `BlogSection.jsx`, `ContactSection.jsx` | P2.4 | Дунд |
| P2.7 | Pages гаргах | `src/pages/ProductDetailPage.jsx`, `GovernanceDetailPage.jsx`, `PromotionDetailPage.jsx`, `FinancialReportsPage.jsx`, `PoliciesPage.jsx`, `ChatInfoDetailPage.jsx` | P2.4 | Дунд |
| P2.8 | Navbar тусдаа файлд | `src/components/Navbar.jsx` | P2.4-P2.7 | Бага |

> P2.5, P2.6, P2.7 нь бие даасан — **зэрэг** хийж болно (бүгд P2.4-ээс хамаарна).
> P2.1, P2.2, P2.3 нь дарааллаар хийгдэнэ.

**Gate шалгалт:** Алхам бүрийн дараа `npm run build && npm run lint`. P2.4-ийн дараа бүх navigation, scroll, data ачаалалтыг гар тестээр шалгах.

---

### Phase 3: Шинэ хуудсууд + SEO (2-3 хоног)

ADR-0002, ADR-0003-ийн дагуу.

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P3.1 | Routing-д шинэ view нэмэх (privacy_policy, terms, not_found) | `router/paths.js`, `pathToState.js` | P2.2 | Бага |
| P3.2 | NotFoundPage үүсгэх | `src/pages/NotFoundPage.jsx` | P3.1, P2.4 | Бага |
| P3.3 | PrivacyPolicyPage үүсгэх | `src/pages/PrivacyPolicyPage.jsx` | P3.1, P2.4 | Бага |
| P3.4 | TermsPage үүсгэх | `src/pages/TermsPage.jsx` | P3.1, P2.4 | Бага |
| P3.5 | react-helmet-async суулгах, HelmetProvider wrap | `package.json`, `main.jsx` | Байхгүй | Бага |
| P3.6 | Бүх page-д Helmet нэмэх (title, description, OG tags) | Бүх page компонент | P3.5, P2.7 | Бага |
| P3.7 | sitemap.xml автомат үүсгэх (vite-plugin-sitemap) | `vite.config.js` | P3.5 | Бага |
| P3.8 | Schema.org FinancialService JSON-LD нэмэх | Нүүр хуудас | P3.5 | Бага |

> P3.2, P3.3, P3.4 нь бие даасан — **зэрэг** хийж болно.
> P3.5 нь P3.6, P3.7, P3.8-аас өмнө хийгдэнэ.
> P3.1 болон P3.5 нь бие даасан — **зэрэг** хийж болно.

**Gate шалгалт:** `npm run build && npm run lint` + бүх шинэ route нээгдэх тест + title шалгах.

---

### Phase 4: Accessibility + UX (2-3 хоног)

Бие даасан ажлууд — Phase 2, 3-тэй зэрэг хийж болно (зөвхөн компонент файлд хүрэх).

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P4.1 | Mobile menu button-д aria-label, aria-expanded | Navbar | P2.8 | Бага |
| P4.2 | Бүх modal/dialog-д role="dialog", aria-modal, Escape | Компонентууд | Байхгүй | Бага |
| P4.3 | LoanRequest progress bar-д aria атрибутууд | `LoanRequest.jsx` | Байхгүй | Бага |
| P4.4 | Алдааны мессежид role="alert" | Компонентууд | Байхгүй | Бага |
| P4.5 | Skip navigation link нэмэх | `App.jsx` | Байхгүй | Бага |
| P4.6 | FAQ хэсэг нэмэх (нүүр хуудасны доод хэсэг) | Шинэ component | P2.6 | Бага |
| P4.7 | Breadcrumb component | Шинэ component | P2.4 | Бага |
| P4.8 | Skeleton screens (BlogList, FinancialReports, Admin table) | Компонентууд | Байхгүй | Бага |

> P4.1-P4.5 нь бие даасан — бүгд **зэрэг** хийж болно.
> P4.6, P4.7 нь P2.4 (AppContext)-ээс хамаарна.

---

### Phase 5: Trust indicators + Admin тохиргоо (1-2 хоног)

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P5.1 | Footer trust strip (СЗХ лиценз, байгуулагдсан он) | Footer component | P2.6 (ContactSection) | Бага |
| P5.2 | Footer-д privacy/terms холбоос нэмэх | Footer component | P3.3, P3.4 | Бага |
| P5.3 | Тооцоолуурт disclaimer нэмэх | `LoanCalculator.jsx` | Байхгүй | Бага |
| P5.4 | Google Maps URL admin тохиргоо | `AdminPanel.jsx`, backend | Байхгүй | Бага |
| P5.5 | Contact section-д динамик maps URL | Contact section | P5.4 | Бага |

> P5.1, P5.3, P5.4 нь бие даасан — **зэрэг** хийж болно.

---

### Phase 6: Performance + Vite config (1 хоног)

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P6.1 | Vite manualChunks тохиргоо | `vite.config.js` | P1.1 | Дунд |
| P6.2 | vite-plugin-compression (Brotli/gzip) | `vite.config.js` | Байхгүй | Бага |
| P6.3 | Зурагт loading="lazy" нэмэх, hero preload | Компонентууд | Байхгүй | Бага |
| P6.4 | ErrorBoundary нэмэх (React.lazy chunk load failure) | Шинэ component | P1.2 | Бага |

---

### Phase 7: Form UX сайжруулалт (2-3 хоног)

| # | Task | Файл | Хамаарал | Эрсдэл |
|---|------|------|----------|--------|
| P7.1 | LoanRequest auto-save (localStorage) | `LoanRequest.jsx` | Байхгүй | Дунд |
| P7.2 | Validation onBlur + auto-scroll | `LoanRequest.jsx` | Байхгүй | Дунд |
| P7.3 | File upload drag-drop + progress + compression | `LoanRequest.jsx` | Байхгүй | Дунд |

---

## Нийт хугацааны тооцоо

| Phase | Хугацаа | Зэрэг хийж болох |
|-------|---------|-------------------|
| Phase 1: Яаралтай засварууд | 1-2 хоног | Phase 4-ийн зарим task-тай |
| Phase 2: App.jsx хуваах | 5-7 хоног | — |
| Phase 3: Шинэ хуудсууд + SEO | 2-3 хоног | Phase 2-ийн дараа |
| Phase 4: Accessibility + UX | 2-3 хоног | Phase 2-ийн зарим хэсэгтэй зэрэг |
| Phase 5: Trust + Admin | 1-2 хоног | Phase 3-ийн дараа |
| Phase 6: Performance | 1 хоног | Phase 1-ийн дараа |
| Phase 7: Form UX | 2-3 хоног | Бие даасан |
| **Нийт (дарааллаар)** | **14-21 хоног** | |
| **Нийт (зэрэг ажилласан)** | **10-14 хоног** | |

---

## Regression эрсдэлийн дүгнэлт

### Өндөр эрсдэлтэй task-ууд (онцгой анхаарал шаардана)

| Task | Эрсдэл | Шийдэл |
|------|--------|--------|
| **P2.4** AppContext үүсгэх | Бүх state нэг дор шилжих — props нэр өөрчлөгдвөл UI эвдрэнэ | Context value-ийн нэршлийг одоогийн prop нэрстэй яг ижил хадгалах. Build + бүх nav, scroll, data fetch гар тест |
| **P2.6** Sections гаргах | Scroll anchor (#about-intro г.м.) алдагдах, theme system (overlay) тасрах | Section id-г яг хэвээр хадгалах. getSectionBackgroundStyle-ийг context-ээр дамжуулах |
| **P1.1** lucide-react CJS alias устгах | Icon render fail — ESM path зөв ажиллахгүй бол UI эвдрэнэ | Build + бүх icon visual шалгах. Ажиллахгүй бол alias буцаах (1 мөр) |
| **P6.1** Vite manualChunks | Chunk conflict, React.lazy-тай давхцал | Build warning шалгах, шаардлагатай бол chunk тохиргоо хасах |

### Rollback стратеги

- **Алхам бүр тусдаа commit** — ямар ч алхмыг `git revert <commit>` хийж буцаах боломжтой
- **Phase 1 (CJS alias)** нь хамгийн түрүүнд хийгддэг бөгөөд бие даасан — ажиллахгүй бол 1 мөр буцаана
- **Phase 2 (App.jsx хуваах)** 8 алхамтай, алхам бүрийн дараа build шалгана. Алхам N-д алдаа гарвал зөвхөн N-ийг буцаана

### Хамгийн чухал шалгуурууд (алхам бүрийн дараа)

1. `npm run build` амжилттай
2. `npm run lint` алдаагүй
3. Нүүр хуудас ачаалагдана
4. Navigation (бүх 19 view) ажиллана
5. Mobile menu нээгдэнэ/хаагдана
6. Scroll to section (#about-intro г.м.) ажиллана
7. Admin panel нэвтрэх ажиллана
8. LoanRequest форм нээгдэнэ

### Тест suite байхгүй нь хамгийн том эрсдэл

Тест байхгүй тул **бүх шалгалт гар тестээр** хийгдэнэ. Энэ нь хугацаа нэмж, хүний алдааны боломжийг нээнэ. Ирээдүйд e2e тест (Playwright/Cypress) нэмэх нь дараагийн том ажил байх ёстой, гэхдээ энэ refactor-ийн scope-д ороогүй.
