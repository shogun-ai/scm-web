# 0002. SEO шийдэл

Төлөв: Батлагдсан
Огноо: 2026-10-07

## Нөхцөл байдал

www.scm.mn нь React 19 SPA (Single Page Application) бөгөөд одоогоор бүх хуудсанд ижил `<title>` болон `<meta description>` байна. Google хайлтад хуудас бүрийг ялгахгүй, social sharing (OG tags) ажиллахгүй байна. Санхүүгийн байгууллагын вэбсайтын хувьд хайлтын илэрц болон итгэлийг нэмэгдүүлэх үүднээс SEO сайжруулалт шаардлагатай.

SPA архитектур учир SSR (Server Side Rendering) шийдэл хэрэгжүүлэхгүй — одоогийн Vite + React client-side rendering хэвээр үлдэнэ.

## Авч үзсэн хувилбарууд

### Хувилбар A: react-helmet-async@2.0.5 (client-side)

React компонент дотор `<Helmet>` ашиглан хуудас бүрт динамикаар `<title>`, `<meta>`, OG tags тавина. Runtime-д DOM-ийг шинэчилнэ.

- **Сул тал:** Crawler (Googlebot) JavaScript-ийг ажиллуулах хүртэл meta tag харагдахгүй. Гэхдээ Googlebot 2024-оос хойш JS rendering-ийг бүрэн дэмждэг.
- **Давуу тал:** Хуудас бүрт динамик title/description (product нэр, blog гарчиг). React 19-тэй нийцтэй (v2.0.5). Sitemap.xml-тэй хослуулан ашиглах боломжтой.

### Хувилбар B: vite-plugin-html (build-time static inject)

`index.html`-д build үед статик meta tag-ууд inject хийнэ. Нэг `<title>`, нэг `<meta description>` бүх хуудсанд.

- **Сул тал:** Хуудас бүрт өвөрмөц title/description өгөх боломжгүй (SPA нэг index.html-тэй). Product detail, blog нийтлэл зэрэг динамик хуудсуудад SEO-г сайжруулахгүй.
- **Давуу тал:** JavaScript шаардахгүй, crawler-т тохиромжтой. Хэрэгжүүлэлт энгийн.

### Шалгуурын харьцуулалт

| Шалгуур (жин) | A: react-helmet-async | B: vite-plugin-html |
|---|---|---|
| Бизнесийн үнэ цэнэ (30%) | **9/10 — хуудас бүрт өвөрмөц SEO** | 4/10 — зөвхөн нүүр хуудас |
| Эрсдэл (20%) | 7/10 — React 19 нийцэл шалгах | 9/10 — build-time, аюулгүй |
| Хөгжүүлэх хугацаа (15%) | 7/10 — хуудас бүрт Helmet нэмэх | 9/10 — 1 тохиргоо |
| Засвар үйлчилгээ (15%) | 8/10 — компонент дотор тодорхой | 7/10 — build config |
| Буцаах боломж (10%) | 9/10 — package устгахад л болно | 9/10 — plugin устгах |
| Багийн ур чадвар (10%) | 8/10 — react-helmet нь өргөн тархсан | 8/10 — энгийн |
| **Жинтэй нийлбэр** | **8.1** | **6.5** |

## Шийдвэр

**Хувилбар A: react-helmet-async@2.0.5 сонгогдов.**

### Шалтгаан

1. **Динамик хуудсуудын SEO.** www.scm.mn-д 19 view байна. Product detail, blog нийтлэл, засаглалын хуудас зэрэг бүгдэд өвөрмөц title/description байх ёстой. `vite-plugin-html` үүнийг хийж чадахгүй.

2. **Googlebot JS rendering.** 2024-оос хойш Googlebot Chrome-based rendering engine ашиглаж, client-side meta tag-ийг уншдаг. SPA-ийн SEO-д react-helmet хангалттай.

3. **Нэмэлт хослол.** `vite-plugin-sitemap@0.6.1`-ээр sitemap.xml автоматаар үүсгэж, react-helmet-async-тай хослуулна. Нүүр хуудасны default meta-г `index.html`-д статикаар тавьж, JavaScript ачаалагдахаас өмнөх fallback болгоно.

4. **Schema.org JSON-LD.** react-helmet-async-ийн `<Helmet>` дотор `<script type="application/ld+json">` нэмж, FinancialService schema-г хуудас бүрт inject хийж болно.

### Хэрэгжүүлэлтийн товч

1. `npm install react-helmet-async@2.0.5`
2. `main.jsx`-д `<HelmetProvider>` wrap нэмэх
3. Page компонент бүрт `<Helmet>` нэмэх (title, description, OG tags)
4. `index.html`-д default fallback meta тавих
5. `vite-plugin-sitemap` нэмж sitemap.xml автоматаар үүсгэх
6. Schema.org FinancialService JSON-LD нүүр хуудсанд нэмэх

## Үр дагавар

### Эерэг
- 19 view тус бүрт өвөрмөц `<title>` болон `<meta description>` тавигдана
- Google хайлтын илэрцэд хуудас бүр тусдаа, утга бүхий гарчигтай харагдана
- Social sharing (Facebook, LinkedIn) OG tags-ийн ачаар зураг, тайлбартай preview-тэй болно
- Admin хуудсуудад `<meta name="robots" content="noindex">` нэмэгдэнэ

### Сөрөг
- Шинэ dependency нэмэгдэнэ (react-helmet-async ~8KB gzip)
- Page компонент бүрт `<Helmet>` block нэмэх ажил гарна

### Эрсдэл
- R10: react-helmet-async@2.0.5 React 19-тэй нийцтэй байдал -> `npm run build` + dev тестээр баталгаажуулах. Ажиллахгүй бол version pin буюу `index.html` дахь статик meta-д буцна (Хувилбар B рүү downgrade)

## Хэрэглэгчээс батлуулах асуулт

Энэ шийдвэр буцаах боломжтой (package устгахад л болно). Тусгай батлуулах шаардлагагүй.
