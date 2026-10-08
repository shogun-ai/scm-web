# 0003. Шинэ хуудсуудын routing

Төлөв: Батлагдсан
Огноо: 2026-10-07

## Нөхцөл байдал

Frontend-д 3 шинэ хуудас нэмэх шаардлагатай:
- `/privacy-policy` — Нууцлалын бодлого
- `/terms` — Үйлчилгээний нөхцөл
- `/404` — Хуудас олдсонгүй

Одоогийн routing нь `window.history.pushState` + `popstate` listener дээр суурилсан custom шийдэл. `VIEW_PATHS` объектоор view нэр -> URL mapping хийж, `pathToState()` функцээр URL-г state руу хөрвүүлдэг. 19 view, 14 нөхцөлт ternary chain байна.

## Авч үзсэн хувилбарууд

### Хувилбар A: Одоогийн custom routing-д нэмэх

`VIEW_PATHS`-д 3 шинэ entry нэмж, `pathToState()`-д шинэ path-уудыг таних нөхцөл нэмнэ. Ternary chain-д 3 шинэ нөхцөл нэмэгдэнэ. Бүтэц хэвээр.

### Хувилбар B: React Router v7 руу шилжих

Бүх routing-ийг React Router v7-ийн `<Routes>`, `<Route>`, `useNavigate()`, `useParams()`-ээр солих. `VIEW_PATHS`, `pathToState()`, `navigateTo()`, `scrollToSection()`, popstate listener бүгдийг устгаж, React Router-ийн pattern-ээр орлуулна.

### Шалгуурын харьцуулалт

| Шалгуур (жин) | A: Custom routing-д нэмэх | B: React Router v7 |
|---|---|---|
| Бизнесийн үнэ цэнэ (15%) | 7/10 — 3 хуудас нэмэгдэнэ | 7/10 — ижил |
| Эрсдэл (30%) | **9/10 — бага, 3 entry нэмэх л болно** | 2/10 — routing бүхлээрээ солигдоно, 19 view бүрт regression |
| Хөгжүүлэх хугацаа (15%) | **9/10 — хэдхэн цаг** | 3/10 — 3-5 хоног (routing шилжилт + бүх view тест) |
| Засвар үйлчилгээ (15%) | 5/10 — custom routing хадгалах | 9/10 — стандарт library |
| Буцаах боломж (20%) | **9/10 — 3 entry устгахад л болно** | 2/10 — бүх routing буцаах |
| Багийн ур чадвар (5%) | 8/10 — одоогийн кодыг мэдэж байгаа | 7/10 — React Router стандарт |
| **Жинтэй нийлбэр** | **8.1** | **3.9** |

## Шийдвэр

**Хувилбар A: Одоогийн custom routing-д нэмэх сонгогдов.**

### Шалтгаан

1. **Regression эрсдэл хэт өндөр.** React Router руу шилжих нь 19 view-ийн routing, scroll behavior, hash-based section navigation, popstate handling бүгдийг нэг дор өөрчлөнө. Тест suite байхгүй тул энэ хэмжээний өөрчлөлтийг production сайтад хийх нь хүлээн зөвшөөрөгдөхгүй.

2. **Зорилго нь 3 хуудас нэмэх.** React Router-ийн давуу тал (nested routes, loader, code splitting) одоогоор шаардлагагүй. Custom routing-д 3 entry нэмэх нь хэдхэн цагийн ажил.

3. **Ирээдүйд шилжих боломж хэвээр.** ADR-0001 дагуу App.jsx incremental extraction хийсний дараа, routing logic `router/paths.js` болон `router/pathToState.js` файлд тусгаарлагдана. Дараагийн шатанд React Router руу шилжих нь илүү аюулгүй, тодорхой болно (гэхдээ энэ удаад шаардлагагүй).

### Хэрэгжүүлэлтийн товч

1. `VIEW_PATHS`-д нэмэх:
   ```js
   privacy_policy: '/privacy-policy',
   terms: '/terms',
   not_found: '/404',
   ```

2. `pathToState()`-д нэмэх:
   - `/privacy-policy` -> `{ view: 'privacy_policy' }`
   - `/terms` -> `{ view: 'terms' }`
   - Unknown path бүр -> `{ view: 'not_found' }` (одоо `home` руу буцаадгийг өөрчлөх)

3. Ternary chain-д 3 нөхцөл нэмэх:
   ```js
   currentView === 'privacy_policy' ? <PrivacyPolicyPage /> :
   currentView === 'terms' ? <TermsPage /> :
   currentView === 'not_found' ? <NotFoundPage /> :
   ```

4. Footer-д `/privacy-policy` болон `/terms` холбоос нэмэх.

5. Unknown route-ийг NotFoundPage render хийх (URL redirect хийхгүй — URL хэвээр үлдэнэ).

## Үр дагавар

### Эерэг
- 3 шинэ хуудас нэмэгдэж, санхүүгийн байгууллагын хуулийн шаардлагыг хангана
- 404 хуудас unknown URL-д ээлтэй мэдэгдэл өгнө
- Одоогийн routing-ийн ажиллагаа хэвээр, regression эрсдэлгүй

### Сөрөг
- Custom routing хэвээр үлдэнэ (стандарт бус)
- Ternary chain 14 -> 17 нөхцөл болно (App.jsx хуваахад багасна)
- React Router-ийн nested routes, lazy loading зэрэг built-in боломжийг ашиглахгүй

### Эрсдэл
- Ternary chain урт болох -> ADR-0001-ийн дагуу App.jsx хуваахад routing logic тусдаа файлд шилжиж, ternary chain-ийг view map pattern-ээр солих боломжтой
- Custom routing-ийн edge case (double popstate, browser back/forward) -> Одоогийн routing-д шинээр нөлөөлөхгүй, байгаа pattern-ийг дагана

## Хэрэглэгчээс батлуулах асуулт

Энэ шийдвэр буцаах боломжтой (3 entry устгахад л болно). Тусгай батлуулах шаардлагагүй.

---

**Тэмдэглэл:** React Router руу шилжих шийдвэрийг ирээдүйд (тест coverage нэмэгдсэний дараа) дахин авч үзэж болно. Тэр үед тусдаа ADR бичнэ.
