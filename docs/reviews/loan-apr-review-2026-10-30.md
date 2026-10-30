# Loan APR independent review — 2026-10-30

Дүгнэлт: **Батлах**. Дахин хяналтаар өмнөх гурван Medium олдвор хаагдсан. Шалгасан APR хүрээнд нээлттэй Critical/High/Medium олдворгүй.

## Хамрах хүрээ

Шинэ shared/loanApr.js, loanAprConfig.js болон тестүүд; LoanAprDetails.jsx, LoanAprSettingsEditor.jsx; LoanCalculator.jsx, AdminPanel.jsx, backend/server.js-ийн зөвхөн APR өөрчлөлтийг шалгав. Өмнөх dirty дизайн, car admin болон loan intake өөрчлөлтийг үнэлгээнд оруулаагүй. AGENTS.md болон холбогдох архитектур/async UI баримтыг уншсан; APR-ийн acceptance criteria нь өгсөн хүсэлт болно.

Сүүлийн normalization, increment хийсний дараах date validation, upsert metadata/options, route-handler mock тест, pure schedule helper, public config status/retry, admin load/save хамгаалалтын засваруудыг багтаасан.

## Асуудлын хүснэгт

| Анхны зэрэглэл | Одоогийн файл:мөр | Өмнөх асуудал | Дахин хяналтын үр дүн |
|---|---|---|---|
| Medium — хаасан | frontend/src/components/AdminPanel.jsx:790 | Config GET бүтэлгүйтсэн/дуусаагүй үед default APR-ээр өмнөх config-ийг дарах боломжтой байсан. | fetch эхлэхэд loading, амжилтад ready, алдаанд error болно. ready хүртэл fieldset болон Save хаалттай; handler өөрөө мөн буцдаг. Retry бий. idle/loading/error guard тус бүрийг локал тусгаарласан гүйцэтгэлээр шалгахад write руу ороогүй. |
| Medium — хаасан | frontend/src/components/LoanCalculator.jsx:130 | Config fetch алдахад default APR-ийг тайлбаргүй харуулдаг байсан. | HTTP ok болон object response шалгалттай. Loading/error үед анхны тохиргоогоор бодож байгааг APR-ийн өмнө тодорхой харуулж, error үед retry өгнө. Хэрэглэгчийн өөрчилсөн даатгалын утгыг config response дарахгүй хэвээр. |
| Medium — хаасан | frontend/src/components/LoanCalculator.jsx:7 | Шинэ useMemo хэсгийн preserve-manual-memoization lint алдаа. | Schedule тооцоолол компонентын гаднах helper болсон; date increment-ийн дараах overflow хамгаалалт хадгалагдсан. Targeted ESLint давсан; zero-rate schedule болон date overflow-ийг helper-ийн локал гүйцэтгэлээр баталсан. |

## Шалгалт ба хязгаар

- `node --test shared/loanApr.test.js shared/loanAprConfig.test.js`: **11/11 PASS**, сүүлийн өөрчлөлт дээр дахин ажиллуулсан. Эхний sandbox spawn EPERM-ийн дараа зөвшөөрөгдсөн гаднах ажиллуулалтаар давсан.
- `npm run build` (frontend): **PASS**, сүүлийн хувилбар дээр. Browserslist болон том bundle-ийн анхааруулга байна.
- `node --check backend/server.js`: **PASS**.
- `npx eslint src/components/LoanAprDetails.jsx src/components/LoanAprSettingsEditor.jsx src/components/LoanCalculator.jsx` (frontend): **PASS**, дахин хяналтын хувилбар дээр.
- Нэмэлт локал тусгаарласан гүйцэтгэл: zero-rate schedule, Date хязгаарыг давсан schedule, admin idle/loading/error үед save guard — **PASS**. Эдгээр нь source-оос helper/guard-ийг ажиллуулсан түр шалгалт; хадгалсан browser regression suite биш.
- AdminPanel-ийг багтаасан өмнөх targeted lint: 54 errors, 1 warning; APR-ээс гадуурх unused variables/theme хэсгийн алдаанууд. Бүх repo lint цэвэр гэж дүгнээгүй.
- Browser interaction болон бодит MongoDB integration ажиллуулаагүй. Public notice/retry, admin fieldset болон fetch status шилжилтийг кодоор нягталсан. Handler mock нь жинхэнэ handler-ийг ажиллуулж write аргумент/дарааллыг шалгадаг; JWT middleware-ийн бодит гүйцэтгэлийг шалгахгүй, registration-д auth/admin хэвээр байгааг батална.
- 2.4/2.5-ийн бүх 5+5 дэд хэсэг default config-д байгаа, admin-аар засварлагдана. Хуулийн эхийн үгчилсэн зөв байдлыг гаднын эх сурвалжаар баталгаажуулах нь энэ code review-ийн хүрээнд ороогүй.

## Сайн хийгдсэн зүйлс

- PMT нь principal + costs дээр; сарын IRR-ийн PV нь principal дээр; жилийн хувь нь monthly IRR × 12 × 100. Effective annual compounding хийгээгүй нь шаардлагатай нийцсэн.
- Zero/near-zero rate, 1200 сарын term, 100%-иас их сарын IRR, invalid/overflow утгыг хамарсан. log1p/expm1 болон dynamic IRR bound нь тоон тогтвортой байдлыг сайжруулсан.
- APR үргэлж тэнцүү төлбөрийн суурьтай, жилээр гэсэн шошготой; bullet сонголт APR томьёог өөрчлөхгүй. Үндсэн хуваарь fee/insurance агуулахгүйг тайлбарласан.
- Даатгалын хэрэглэгчийн өөрчлөлтийг удаан config response дарахгүй. Хуучин malformed APR config-ийг admin GET normalization аюулгүй сэргээнэ.
- PUT/bulk нь admin auth-тай, APR validation бүх write-ээс өмнө. Шинэ handler mock нь invalid bulk бусад key-д ч ZERO writes болохыг, valid upsert value/group/label/options зөвийг баталдаг.

Хэрэгжүүлэлтийн файл өөрчлөөгүй. Deploy болон production write хийгээгүй.
