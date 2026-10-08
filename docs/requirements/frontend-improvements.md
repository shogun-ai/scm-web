# Frontend Improvements — Шаардлага
_www.scm.mn | MoSCoW ангилал_

---

## Хэрэглэгчийн бүлгүүд

| Бүлэг | Зорилго |
|-------|---------|
| Зочин (P1) | Бүтээгдэхүүн танилцах, тооцоолох, мэдэгдэл авах |
| Зээл хүсэгч (P2) | Хүсэлт илгээх, явцыг хянах |
| Хөрөнгө оруулагч (P3) | Итгэлцлийн мэдээлэл авах, тооцоолох |
| Admin (P4) | Агуулга удирдах, хүсэлт боловсруулах |

---

## Must Have (заавал)

### M1 — Broken content засах
- **M1.1** Google Maps URL-ийг бодит холбоосоор солих
- **M1.2** Кредит карт хэсгийн тасарсан текстийг цэгцлэх
- **M1.3** Дутуу зурагтай бүтээгдэхүүний fallback зураг нэмэх

### M2 — Accessibility (WCAG 2.1 AA)
- **M2.1** Бүх `<img>` тагт утга бүхий `alt` текст нэмэх
- **M2.2** Mobile menu товчлуурт `aria-label`, `aria-expanded` нэмэх
- **M2.3** Бүх modal/dialog-д `role="dialog"`, `aria-modal`, `Escape` хаалт нэмэх
- **M2.4** LoanRequest форм алхамуудад `role="progressbar"`, `aria-current="step"` нэмэх
- **M2.5** Алдааны мессеж бүрт `role="alert"` нэмэх
- **M2.6** Skip navigation link нэмэх
- **M2.7** `#00A651` текстийн өнгийг `#007A3D` болгох (AA contrast)

### M3 — Performance (lazy loading)
- **M3.1** AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding-г `React.lazy` болгох
- **M3.2** lucide-react CJS alias-ийг vite.config.js-аас устгах

### M4 — SEO
- **M4.1** `react-helmet-async` нэмэх, бүх хуудаст өвөрмөц `<title>` тавих
- **M4.2** Нүүр хуудас болон бүтээгдэхүүн хуудас бүрт `<meta name="description">` нэмэх
- **M4.3** `sitemap.xml` үүсгэх

---

## Should Have (байх ёстой)

### S1 — Form сайжруулалт
- **S1.1** LoanRequest форм auto-save (localStorage)
- **S1.2** Validation `onBlur` дээр, алдаатай field рүү auto-scroll
- **S1.3** File upload progress % харуулах, compression үр дүн харуулах

### S2 — Loading states
- **S2.1** BlogList, FinancialReports, Admin table-д skeleton screen нэмэх
- **S2.2** Async хүсэлт бүхий хэсгүүдэд loading indicator нэмэх

### S3 — Navigation
- **S3.1** Бүтээгдэхүүний дэлгэрэнгүй болон засаглалын хуудсуудад breadcrumb нэмэх
- **S3.2** 404 алдааны хуудас нэмэх

### S4 — Шинэ хуудсууд
- **S4.1** Нууцлалын бодлогын хуудас (`/privacy-policy`)
- **S4.2** Үйлчилгээний нөхцөлийн хуудас (`/terms`)
- **S4.3** FAQ хэсэг (нүүр хуудасны доод талд)

### S5 — Trust indicators
- **S5.1** Footer-т СЗХ лиценз дугаар нэмэх
- **S5.2** Тооцоолуурт "Зөвхөн лавлагаа" disclaimer нэмэх

---

## Could Have (байж болно)

### C1 — Component architecture refactor
- **C1.1** App.jsx-ийг pages/, sections/, context/, hooks/, data/ хэсгүүдэд хуваах
- **C1.2** Vite manual chunks тохиргоо нэмэх

### C2 — UX polish
- **C2.1** Товч (button) стилийг бүх хуудсанд нэгдүгээр систем болгох
- **C2.2** Vite Brotli/Gzip compression нэмэх
- **C2.3** Schema.org FinancialService JSON-LD нэмэх

---

## Won't Have (энэ удаад хийхгүй)

- Dark/light mode toggle
- Олон хэлний дэмжлэг (i18n)
- TypeScript шилжилт
- State management library (Zustand г.м.)
- Blog хайлтын функц
- Testimonial/case study хэсэг

---

## Шийдсэн асуултууд

1. **Google Maps URL** → Admin панелаас тохируулах (hardcode биш, dynamic)
2. **Кредит карт** → "ТУН УДАХГҮЙ" badge-тэй хэвээр үлдэх
3. **Нууцлал/Нөхцөл** → Шинэ хуудас үүсгэх
4. **СЗХ лиценз дугаар** → Admin панелаас тохируулах
