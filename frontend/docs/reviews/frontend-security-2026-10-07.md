# Frontend Security Review -- www.scm.mn

**Огноо:** 2026-10-07  
**Хамрах хүрээ:** LoanRequest, PrivacyPolicyPage, TermsPage, ContactSection, AdminPanel (maps_url), useRouting, pathToState, constants  
**Шалгасан:** XSS, localStorage, open redirect, input validation, information disclosure, dependency  

---

## Олдвор (Findings)

### 1. localStorage-д хувийн мэдээлэл (PII) шифрлэлтгүй хадгалагдаж байна

| | |
|---|---|
| **Зэрэглэл** | **High** |
| **Байршил** | `src/components/LoanRequest.jsx` -- 153-164 мөр, `STORAGE_KEY = 'scm_loan_request_draft'` |
| **Эрсдэл** | `formData`-ын бүх талбар (овог, нэр, регистрийн дугаар, утасны дугаар, и-мэйл, орлого, байгууллагын мэдээлэл, батлан даагчийн мэдээлэл) localStorage-д шифрлэлтгүй JSON хэлбэрээр хадгалагдаж байна. XSS эмзэг байдал, browser extension, эсвэл тухайн төхөөрөмжид физик хандалттай хэн ч энэ мэдээллийг шууд унших боломжтой. Мөн localStorage хугацаагүй хадгалагддаг тул хэрэглэгч маягтаа илгээгээгүй тохиолдолд PII мэдээлэл устгагдахгүй үлдэнэ. |
| **Засах зөвлөмж** | (a) localStorage-д хадгалах өгөгдлийг хамгийн бага хэмжээнд байлгах -- зөвхөн `selectedProduct`, `userType`, `step` зэрэг мэдрэмтгий бус талбаруудыг хадгалах. (b) Хэрэв PII хадгалах шаардлагатай бол `SubtleCrypto` (Web Crypto API) ашиглан encrypt хийх. (c) TTL (жишээ нь 24 цаг) тогтоож хугацаа дууссан draft-ыг автоматаар устгах. (d) Хуудас хаагдах (beforeunload) үед draft устгах сонголт нэмэх. |

---

### 2. maps_url -- Open Redirect / Phishing эрсдэл

| | |
|---|---|
| **Зэрэглэл** | **Medium** |
| **Байршил** | `src/sections/ContactSection.jsx` -- 19 мөр; `src/components/AdminPanel.jsx` -- 2993-3001 мөр |
| **Эрсдэл** | `cfg.maps_url` нь backend-ийн `/api/config/flat` endpoint-оос ирдэг бөгөөд Admin Panel-ээр дурын URL оруулах боломжтой. Frontend-д URL-ын protocol, domain шалгалт байхгүй. Админ эрхтэй хэн нэгэн `javascript:alert(1)` эсвэл phishing URL оруулбал ContactSection дээрх `<a href={cfg.maps_url}>` линкээр хэрэглэгчийг хортой сайт руу чиглүүлнэ. AdminPanel дээр `type="url"` байгаа ч browser-ийн url validation submit дээр л ажилладаг, `onChange` дээр шалгахгүй. |
| **Засах зөвлөмж** | (a) Frontend-д maps_url render хийхдээ `https://` эсвэл `http://` protocol-оор эхэлж байгааг шалгаж, бусад тохиолдолд fallback (`https://maps.google.com`) руу буцах. (b) Илүү хатуу шалгалт: `google.com/maps`, `goo.gl/maps`, `maps.app.goo.gl` зэрэг зөвшөөрөгдсөн домэйнд хязгаарлах. (c) Backend-д URL validation нэмэх (config хадгалах endpoint дээр). |

---

### 3. POST /api/loans -- Rate limiting байхгүй

| | |
|---|---|
| **Зэрэглэл** | **Medium** |
| **Байршил** | `src/components/LoanRequest.jsx` -- 321 мөр (submit); Backend: `server.js` -- 3215 мөр |
| **Эрсдэл** | `POST /api/loans` endpoint дээр rate limiting байхгүй (`/api/onboarding` дээр бий, гэхдээ loans дээр алга). Халдагч автоматжуулсан хүсэлтээр сервер-ийг хэт ачаалах (DoS), эсвэл олон тооны хуурамч зээлийн хүсэлт үүсгэх боломжтой. Frontend дээр зөвхөн `loading` state-ээр товчийг disable хийдэг нь client-side хамгаалалт бөгөөд API-г шууд дуудахаас хамгаалахгүй. |
| **Засах зөвлөмж** | Backend-д `POST /api/loans` endpoint дээр IP-based rate limiting нэмэх (жишээ нь 15 минутад 5 хүсэлт). Frontend дээр нэмэлт debounce хийх. |

---

### 4. Алдааны мессежид серверийн мэдээлэл ил гарах эрсдэл

| | |
|---|---|
| **Зэрэглэл** | **Low** |
| **Байршил** | `src/components/LoanRequest.jsx` -- 326 мөр |
| **Эрсдэл** | `alert('Алдаа гарлаа: ' + (err.response?.data?.message \|\| 'Сервертэй холбогдож чадсангүй'))` -- серверээс ирж буй `message` талбарыг шүүлэггүйгээр `alert()`-аар харуулж байна. Сервер дотоод алдааны мэдээлэл (stack trace, DB error) буцаавал хэрэглэгчид ил болно. `alert()` нь HTML render хийдэггүй тул XSS эрсдэл байхгүй, гэхдээ information disclosure асуудал байна. |
| **Засах зөвлөмж** | (a) Серверийн буцаасан message-ыг хэрэглэгчид бүрэн харуулахгүй -- зөвхөн `err.response?.status` код дээр суурилсан Mongolian error message харуулах. (b) `alert()` ашиглахын оронд UI component (toast/banner) ашиглах. |

---

### 5. CSRF хамгаалалт байхгүй (state-changing POST)

| | |
|---|---|
| **Зэрэглэл** | **Low** |
| **Байршил** | `src/components/LoanRequest.jsx` -- 321 мөр; Backend CORS config |
| **Эрсдэл** | `POST /api/loans` нь authentication шаарддаггүй (нийтийн маягт), CSRF token ашигладаггүй. CORS нь `ALLOWED_ORIGINS`-оор хязгаарлагдсан ч, `<form>` элемент ашигласан cross-origin POST request-ийг CORS хориглодоггүй (simple request). Гэхдээ энэ endpoint нь `multipart/form-data` ашигладаг бөгөөд серверт `multer` parse хийдэг тул бодит эрсдэл бага. |
| **Засах зөвлөмж** | (a) Хэрэв ирээдүйд JSON body ашиглавал CSRF token нэмэх. (b) Backend-д `Origin` header шалгалт нэмэх. (c) Одоогийн multipart + CORS тохиргоо нь зохих хэмжээний хамгаалалт өгч байгаа ч defence-in-depth зарчмаар CSRF token нэвтрүүлэх нь зөв. |

---

### 6. URL.createObjectURL() memory leak эрсдэл

| | |
|---|---|
| **Зэрэглэл** | **Low** |
| **Байршил** | `src/components/LoanRequest.jsx` -- 437-439 мөр (openFile), 521 мөр (img preview) |
| **Эрсдэл** | `openFile` функц дотор `URL.revokeObjectURL(url)` 60 секундын `setTimeout`-ээр дуудагдаж байгаа нь OK. Гэхдээ 521 мөрт зурган preview-д `URL.createObjectURL(f)` render бүрт дуудагдаж, `revokeObjectURL` хэзээ ч дуудагдахгүй. Олон файл оруулсан тохиолдолд browser memory-д blob reference хуримтлагдана. Аюулгүй байдлын бус, performance асуудал, гэхдээ DoS vector болж болно. |
| **Засах зөвлөмж** | `useMemo` эсвэл `useEffect` ашиглан blob URL-ыг нэг удаа үүсгэж, component unmount эсвэл файл солигдох үед `revokeObjectURL` дуудах. |

---

### 7. pathToState -- URL segment injection хяналт

| | |
|---|---|
| **Зэрэглэл** | **Low** |
| **Байршил** | `src/router/pathToState.js` -- 21-41 мөр |
| **Эрсдэл** | URL pathname-ын segment-ыг (`/products/<key>`, `/promo/<slug>`, `/governance/<slug>`) array-аас `find()` ашиглан хайдаг. Олдохгүй бол `home` эсвэл `not_found` view руу redirect хийдэг -- энэ нь зөв. Гэхдээ `/governance/` path-д `gov.isLink` бол `gov.linkType`-ыг шууд view болгон буцаадаг (39 мөр). Хэрэв `linkType` хортой утга агуулбал аппликейшний state-д нөлөөлж болно. Гэхдээ энэ нь backend-с ирдэг мэдээлэл тул эрсдэл бага. |
| **Засах зөвлөмж** | `linkType`-ыг зөвшөөрөгдсөн view нэрсийн жагсаалтаар (`VIEW_PATHS` key-ууд) шалгаж, жагсаалтад байхгүй бол `home` руу буцах. |

---

### 8. Dependency шалгалт

| | |
|---|---|
| **Зэрэглэл** | **Low** |
| **Байршил** | `frontend/package.json` |
| **Эрсдэл** | Шинэ нэмэгдсэн сангууд: `react-helmet-async@2.0.5` (SEO meta tag), `vite-plugin-compression@0.5.1` (build-time gzip). Энэ хоёр сан нь өргөн хэрэглэгддэг, мэдэгдэж буй critical CVE байхгүй (2026-10 байдлаар). `xlsx@0.18.5` нь prototype pollution эмзэг байдалтай байсан (CVE-2023-30533) -- энэ нь AdminPanel дотор ашиглагддаг бөгөөд зөвхөн authenticated admin хэрэглэгч хандах боломжтой тул эрсдэл бага. |
| **Засах зөвлөмж** | (a) `npm audit` тогтмол ажиллуулж шалгах. (b) `xlsx` санг `SheetJS` хамгийн сүүлийн хувилбар руу шинэчлэх (`xlsx@0.20+`). (c) CI/CD pipeline-д `npm audit --audit-level=high` нэмэх. |

---

### 9. PrivacyPolicyPage, TermsPage -- статик контент (эрсдэлгүй)

| | |
|---|---|
| **Зэрэглэл** | **Эрсдэлгүй** |
| **Байршил** | `src/pages/PrivacyPolicyPage.jsx`, `src/pages/TermsPage.jsx` |
| **Тайлбар** | Хоёр хуудас нь бүрэн статик текст (`SECTIONS` array), хэрэглэгчийн оруулга хүлээж авахгүй, `dangerouslySetInnerHTML` ашиглаагүй. `react-helmet-async` ашиглан meta tag тогтоож байгаа нь зөв хэрэглээ. Аюулгүй байдлын эрсдэл илрээгүй. |

---

## Дүгнэлт: **Засвар шаардлагатай**

### Нэн тэргүүнд засах (High)
- **#1** -- localStorage дахь PII мэдээллийн хамгаалалт

### Дараагийн ээлжинд засах (Medium)
- **#2** -- maps_url URL validation
- **#3** -- POST /api/loans rate limiting

### Хүлээн зөвшөөрөгдөхүйц эрсдэл (Low)
- #4, #5, #6, #7, #8 -- defence-in-depth зарчмаар аажмаар сайжруулах

### Сайн талууд
- `dangerouslySetInnerHTML` ашиглаагүй -- XSS-ийн гол vector хаагдсан
- CORS зөв тохируулагдсан (allowed origins жагсаалт)
- Хэрэглэгчийн оруулгад input validation байна (regNo, phone, email)
- `rel="noopener noreferrer"` зөв ашиглагдсан (target="_blank" линкүүд)
- Файл upload дээр `accept` attribute-аар зөвшөөрөгдөх файл төрлийг хязгаарласан
- API URL hardcoded (env-ээс биш) -- frontend-д энэ нь хэвийн
- console.log production кодонд байхгүй (LoanRequest.jsx)
