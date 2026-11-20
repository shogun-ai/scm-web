# Loan task management — аюулгүй байдлын хяналт (2026-11-20)

- Хамрах хүрээ: commit `376d335` (backend/loanTasks.js, mailer.js, loanTaskEmails.js, models/LoanFormConfig.js, shared/loanWidgets.js, shared/loanTaskStatus.js, server.js холболтууд, loanIntake.js өөрчлөлт, frontend/src/components/loanTask/*, AdminPanel.jsx, QuickLoanRequest.jsx). Дизайн: `docs/design/loan-task-management.md` §9, §14.
- Хянагч: security-reviewer (read-only, код засаагүй).
- Нөхцөл: production-д `LOAN_TASKS_ENABLED` унтраалттай, `MAIL_ENABLED=false`. Өгөгдөл: иргэдийн РД, утас, орлогын баримт — өндөр мэдрэмжтэй.
- Ажиллуулсан шалгалт: `node --check backend/server.js`, `node --check backend/loanTasks.js` — OK; `node --test backend/loanTasks.test.js backend/mailer.test.js shared/loanTaskStatus.test.js shared/loanWidgets.test.js backend/safetyNotices.test.js backend/zentroFacebook.test.js shared/heroSliderConfig.test.js` — 81/81 pass; `npm audit --omit=dev` (backend) — доор.

## Дүгнэлт: **Засвар шаардлагатай** (flag асаахаас өмнө)

Critical олдвор алга. Шинэ endpoint-ууд өөрсдөө сайн хамгаалагдсан (allow-list, scope, magic bytes, hashed token, PII-гүй имэйл/лог). Асаахаас өмнө заавал: **H1** (trust proxy / limiter). Асаахаас өмнө хүчтэй зөвлөх: **M1, M2** (хуучин route-ууд шинэ task талбарыг тойрч бичих), **M3**, **M4**.

| # | Зэрэг | Товч |
|---|---|---|
| H1 | High | `trust proxy` байхгүй → public limiter бүх зочинд нэг сав; 5 хүсэлтээр бүх өргөдлийг 15 мин хаана |
| M1 | Medium | Хуучин `PUT /api/loans/:id` (non-quick) болон `POST /api/loans/staff` `req.body`-г шүүлтгүй бичдэг → одоо `task*` талбар, upload link, file publicId хуурамчаар оруулах боломжтой |
| M2 | Medium | `PATCH /api/loan-requests/:id` нь `taskLockBlocks`-оос гадуур → terminal task-ийн legacy `status`/`assignee`-г task history, revision, link revoke-гүйгээр өөрчилнө |
| M3 | Medium | Cloudinary `sign_url` URL хугацаагүй (мөнхийн bearer холбоос), DB-д (`fileNames`, `fileDetails.fileUrl`) хадгалагдана |
| M4 | Medium | Public multipart memoryStorage: нэг хүсэлт 12×10 МБ = 120 МБ RAM-д буфер болсны дараа л нийт 50 МБ-ыг шалгана |
| L1–L9 | Low | Доор |

---

## High

### H1 — Rate limiter нь proxy-ийн IP-гаар түлхүүрлэгдэнэ (R1)
- Байршил: `backend/loanIntake.js:79` (`req.ip`), `backend/loanTasks.js:327-329`, `backend/server.js:258` (trust proxy тохируулаагүй гэсэн тайлбар).
- Эрсдэл: Render proxy-ийн ард `req.ip` = proxy-ийн хаяг. `submitLimiter` (5/15мин), `linkUploadLimiter` (20), `linkReadLimiter` (300) бүгд бүх зочинд нэг сав болно. Limiter нь honeypot/validation-аас **өмнө** тоолдог тул халдагч 15 минут тутам 5 хоосон POST илгээхэд л бүх иргэний өргөдөл 429 авна (бизнесийн хүртээмжийн DoS). Эсрэгээр `LOAN_TASK_SUBMIT_MAX`-ийг их болговол хамгаалалт утгагүй болно.
- Нэмэлт: `trust proxy`-г `true` гэж тохируулбал `X-Forwarded-For`-ийг хуурч limiter-ийг тойрох, мөн `attempts.size >= 10000` хязгаарыг дүүргэж бүх шинэ түлхүүрийг хаах боломжтой болно.
- Засвар: Render-ийн hop тоог devops баталгаажуулаад `app.set('trust proxy', 1)` (яг тоо, `true` биш). `proxy-addr`-ийн critical advisory-г (L9) мөн шинэчил. Асаахаас өмнө staging дээр 2 өөр IP-гаас тусдаа сав үүсч байгааг шалга.

## Medium

### M1 — Хуучин route-уудын mass assignment одоо task талбаруудад хүрнэ
- Байршил: `backend/server.js:3532` (`findByIdAndUpdate(req.params.id, updateData)` — non-`quick-v1` хүсэлтэд ямар ч authenticated хэрэглэгч, scope-гүй), `backend/server.js:3576-3580` (`new LoanRequest({ ...req.body, ... })`, зөвхөн `authenticateUser`). Шалтгаан: `applyLoanTaskSchema` (`server.js:~411`) schema-д `taskStatus, taskOutcome, taskHistory, taskFiles, taskUploadLinks, taskForm, taskAnswers, taskRevision...` нэмсэн тул Mongoose strict mode өмнө нь хаядаг байсан эдгээр түлхүүрийг одоо хадгална.
- Exploit хувилбар (дотоод, нэвтэрсэн бага эрхтэй хэрэглэгч, жишээ нь default `employee`):
  - Хуучин хүсэлтэд `taskStatus: 'resolved'`, хуурамч `taskHistory` (өөр ажилтны нэрээр actor), `taskOutcome` бичих → state machine, manager-only reopen, аудитын бүрэн бүтэн байдлыг тойрно.
  - `POST /api/loans/staff`-аар `intakeVersion:'quick-v1', formVersion:'task-v1', assignee, taskUploadLinks:[{ tokenHash: <өөрийн мэдэх токены sha256>, expiresAt: хол ирээдүй }]` бүхий хүсэлт үүсгэх → 30 хоногийн хязгааргүй, нэргүй upload холбоос (storage abuse).
  - `taskFiles`/`fileDetails`-д `publicId` + `deliveryType:'authenticated'` оруулбал `toTaskDetail` (`loanTasks.js:207-209`) ямар ч publicId-д гарын үсэгтэй URL үүсгэнэ → publicId мэдэж байвал assignment scope-ийг тойрч өөр иргэний private баримтыг унших (signing oracle; publicId санамсаргүй тул практик магадлал бага).
  - `fileDetails[].fileUrl`-д дурын URL → manager-ийн самбарт "Нээх" холбоос болж харагдана (фишинг; `javascript:`-ийг React 19 хаадаг).
  - Mongoose 8.22.0-ийн `__proto__` dotted-path prototype pollution advisory (L9) энэ шүүлтгүй `$set`-ээр хүрэх боломжтой.
- Засвар (хамгийн бага): хоёр route-д `Object.keys(LOAN_TASK_SCHEMA_FIELDS)` + `formVersion`, `assignee`, `intakeVersion`, `fileDetails`, `fileNames`-ийг body-оос хасах (эсвэл илүү зөв нь allow-list, quick-v1 middleware-ийн `allowed` жагсаалттай адил). `POST /api/loans/staff`-д `requireStaff` нэм. `toTaskDetail`-д зөвхөн `scm_loan_private/` угтвартай publicId-д гарын үсэг зур.

### M2 — `PATCH /api/loan-requests/:id` нь task lock болон task state machine-ийг тойрно
- Байршил: `backend/loanIntake.js:253-283`; `taskLockBlocks` зөвхөн `app.use('/api/loans/:id')` дээр (`server.js:3231`).
- Эрсдэл: task-v1 болон task төлөвтэй legacy хүсэлтүүд энэ route-д мөн орно (scope нь `requestScope`). Non-manager assignee `taskStatus: 'resolved'/'rejected'` болсон хүсэлтийн legacy `status`-ыг өөрчилж чадна (terminal lock зөвхөн legacy status дээр шалгагдана); manager `assigneeId`-аар дахин хуваарилахад `taskHistory`, `taskRevision`, `taskAssignedAt` шинэчлэгдэхгүй, upload link хүчингүй болохгүй. Үр дүнд хоёр зэрэгцээ төлөв, аудитын цоорхой; "хуучин LOS" харагдацад task-ийн шийдвэртэй зөрчилдсөн статус харагдана.
- Засвар: энэ handler-ийн эхэнд `taskLockBlocks(req.user, loan, 'PATCH')` шалгах; `formVersion === 'task-v1'` (эсвэл `taskStatus` байгаа) хүсэлтэд legacy `status`/`assigneeId` патчийг 409/403-аар хааж `/api/loan-tasks/:id/actions` руу чиглүүлэх, эсвэл ядаж assignment-д task history/revision бичих.

### M3 — Private файлын гарын үсэгтэй URL хугацаагүй
- Байршил: `backend/loanTasks.js:208`, `:354`, `:493` (`fileNames` DB-д URL хадгална), `loanIntake.js:150` (ижил загвар, өмнөх).
- Эрсдэл: Cloudinary `type:'authenticated'` + `sign_url:true` нь тодорхойлогддог, хугацаагүй гарын үсэг. URL нэг удаа задарвал (browser history, дамжуулсан чат, ажлаас гарсан ажилтан, лог) РД/орлогын баримтад мөнхийн хандалт; assignment өөрчлөгдсөн ч хүчинтэй хэвээр. DB backup/экспортод ч URL-ууд бүгд bearer эрх болно.
- Засвар: `cloudinary.utils.private_download_url(publicId, '', { resource_type:'raw', type:'authenticated', expires_at: now+300 })` (богино хугацаатай) эсвэл backend-ээр auth+scope шалгаад stream хийх download endpoint. DB-д URL биш зөвхөн `publicId` хадгал (`fileNames`, `fileDetails.fileUrl`-д URL бичихээ болих).

### M4 — Public upload-ын санах ойн DoS
- Байршил: `backend/loanTasks.js:333`, `:335` (`multer.memoryStorage`, `files: 12`, `fileSize: 10MB`), нийт 50 МБ-ыг `validateTaskFiles` (`:121`) буферлэсний дараа шалгана.
- Эрсдэл: нэг нэргүй хүсэлт ~120 МБ RAM. H1 засагдсаны дараа хэдэн IP-гаас зэрэг илгээхэд Render instance OOM болж **бүх** scm.mn API унана. (Одоогийн `/api/loans/quick`-д ижил эрсдэл бий.)
- Засвар: multer-ээс өмнө `Content-Length` > ~52 МБ бол 413; эсвэл `fileSize`-ийг бага байлгах / disk storage; зэрэгцээ public upload-ын тоог (semaphore) хязгаарлах.

## Low

- **L1 — Upload токен URL-д.** `?upload=<token>` (`loanTasks.js:893`) browser history-д үлдэнэ; API дуудлага токеныг path-д (`/api/loan-tasks/upload/:token`) явуулдаг тул hosting/proxy access log-д бичигдэж болзошгүй. `QuickLoanRequest.jsx` токеныг уншсаны дараа `history.replaceState` хийдэггүй. Засвар: уншсаны дараа URL-аас арилгах, тухайн хуудсанд `Referrer-Policy: no-referrer`, API-д токеныг header/body-оор дамжуулах.
- **L2 — Link удирдлага.** Гараар revoke хийх endpoint алга; хариуцагч солигдоход link хүчинтэй хэвээр; `LINK_UPLOAD_CAP` шалгалт (`:573-574`) atomic биш тул зэрэг хүсэлтээр 30-аас давж болно. Засвар: revoke action, reassignment-д revoke (сонголттой), cap-ийг update нөхцөлд (`$expr`/`$size`) оруулах.
- **L3 — Ажилтны тайлбар public хуудас/имэйлд.** `note` нь `GET /upload/:token` (`:549`) болон харилцагчийн имэйлд (`loanTaskEmails.js:126,134`) гарна; харилцагч имэйлээ буруу бичсэн бол гуравдагч этгээд линк+тайлбар авна. Ажилтан тайлбарт нэр/дүн/РД бичвэл PII алдагдана. Засвар: UI-д "хувийн мэдээлэл бүү бич" анхааруулга, эсвэл note-ийг имэйлд оруулахгүй.
- **L4 — Баталгаажаагүй имэйл рүү ack.** Хэн ч дурын хаягаар маягт илгээж scm.mn-ээс имэйл явуулах (spam/sender reputation). Rate limit-ээр л хязгаарлагдана (H1-тэй холбоотой). `MAIL_ENABLED` асаахдаа SPF/DKIM/DMARC болон илгээлтийн тоог хянах.
- **L5 — `file.url` протоколын шалгалтгүй.** `LoanTaskDetail.jsx:184` `href={file.url}`; React 19 `javascript:`-ийг хаадаг ч legacy `fileUrl` (M1) дурын байж болно. Засвар: `toTaskDetail`-д зөвхөн `https://res.cloudinary.com/` (эсвэл allow-list) URL буцаах.
- **L6 — Зөвшөөрлийн нотолгоо.** `consents: { dataProcessing: true, acceptedAt }` (`:279`) — нууцлалын бодлогын хувилбар/текст хадгалагдаагүй. Хувь хүний мэдээлэл хамгаалах хуулийн дагуу нотлох боломжийг сайжруулахын тулд `policyVersion` хадгал.
- **L7 — РД нуулт зөвхөн client талд.** API бүтэн `regNo` буцаана (`:225`), UI masked; "Харах" дарсныг аудит хийдэггүй. Хүлээн зөвшөөрөгдөх; хүсвэл reveal-ийг тусдаа endpoint + createLog болго.
- **L8 — Том body parser.** Global `express.json`/`urlencoded` 50 МБ (`server.js:250,283`, өмнөх) шинэ route-уудад ч үйлчилнэ; `validateConfig` нь `step.fields` массивыг хязгааргүй давтана (зөвхөн admin). Засвар: `/api/loan-tasks`-д ~256 КБ JSON limit.
- **L9 — Dependency.** `nodemailer@10.6.0`: `npm audit`-д advisory алга — OK. Lockfile-аас хасагдсан `puppeteer` гэх мэт нь package.json-д байхгүй (extraneous) — OK. Өмнөх өр: `npm audit --omit=dev` = 2 critical (`mongoose@8.22.0` — sanitizeFilter, `__proto__` update casting; `proxy-addr` — IP spoofing), 8 high (`path-to-regexp`, `multer-storage-cloudinary/cloudinary`, `axios`, `body-parser`, `form-data`, `lodash`, `undici`), 5 moderate. Асаахаас өмнө `mongoose`, `proxy-addr`, `path-to-regexp`-ийг `npm audit fix`-ээр шинэчлэхийг зөвлөнө (H1, M1-тэй шууд холбоотой).

Хамрах хүрээнээс гадуурх ажиглалт: `server.js:1698` токенгүй хүсэлтэд `JSON.stringify(req.headers)` (cookie гэх мэт) лог руу бичдэг — `/api/loan-tasks/*` staff route-уудад ч үйлчилнэ. Тусад нь засах.

---

## Зөв хийгдсэн зүйлс (баталгаажуулсан)

- **AuthN/AuthZ:** Бүх staff route `ensureEnabled → authenticateUser → requireStaff`; detail/action/files/doc-request нь `loadScoped` (`requestScope`) + update query-д дахин scope (`:750, :830, :890`) — IDOR → 404. Admin config `requireAdmin` (backend-д хэрэгжсэн; frontend-ийн нуулт зөвхөн UX). Assign/reopen manager-only, transition allow-list (`loanTaskStatus.js:29-36, 133-196`), optimistic lock (`taskRevision`), non-manager terminal lock (files route `:830`). Staff list: non-manager зөвхөн `assignee=me`.
- **Mass assignment (шинэ route):** `validateTaskAction` түлхүүрийн allow-list, doc-request `extra` түлхүүр хориг (`:857`), `validateConfig` бүх талбарыг шинээр байгуулдаг, `validateAnswers` зөвхөн config-ийн түлхүүрийг уншина, `mirrorAnswers` тогтмол талбарууд. `formVersion` immutable.
- **NoSQL injection:** query параметр бүр `typeof`/regex/Set-ээр шалгагдана (`:667-696`); `[object Object]` хэлбэрийн operator object бүх regex-д унана; search `escapeRegex` + 80 тэмдэгт; ID-ууд `OBJECT_ID_RE`.
- **Upload:** magic bytes + MIME тохирол + формат allow-list (`:87-118`), файл/нийт хэмжээ, тоо, field allow-list (`errorKey` `__proto__` хамгаалалттай), хоосон файл хориг, Cloudinary `type:'authenticated'`, санамсаргүй publicId (`use_filename` үгүй), fileName 200 тэмдэгт + React text, алдаа гарвал Cloudinary-аас устгах (`destroyAll`).
- **Upload токен:** 32 byte `randomBytes` base64url (256 bit), DB-д зөвхөн SHA-256, hash-аар index lookup (timing-safe харьцуулалт хэрэггүй), strict `TOKEN_RE`, нэгэн жигд 404, хугацаа 1–30 хоног, шинэ хүсэлтэд өмнөх link revoke, terminal үед revoke, update нөхцөлд `revokedAt:null, expiresAt>$now, taskStatus∉terminal` дахин шалгана (race-safe), зөвхөн link-ийн `items` түлхүүрт файл, `Cache-Control: no-store`, токен лог/history-д бичигдэхгүй; GET хариуд нэр/РД байхгүй.
- **Honeypot/consent:** `website` honeypot, consent заавал (сервер тал), `configVersion` таарахгүй бол 409.
- **Имэйл:** `to`/`replyTo` нь `isValidEmailAddress` (CR/LF, `<>",;` хориг, display name үгүй) → header injection боломжгүй; subject-ийн утгууд `clean()`; HTML `escapeHtml`, link `href` escape; агуулгад зөвхөн дугаар/бүтээгдэхүүн/баримтын нэр (PII-гүй); `MAIL_ENABLED` + бүх SMTP env байхгүй бол skipped; лог-д хаяг/агуулга/нууц үг байхгүй; HTTP хариунд нөлөөлөхгүй.
- **XSS:** `dangerouslySetInnerHTML`/`innerHTML` loanTask компонентуудад алга; label/helpText/хариулт/history React text-ээр; гадаад холбоос `rel="noopener noreferrer"`.
- **CSV/formula injection:** экспорт байхгүй — хамаарахгүй.
- **Алдаа/лог:** 500 үед зөвхөн ерөнхий мессеж, лог-д зөвхөн `error.name`; createLog-д ID/төлөв, PII-гүй; list projection-д `regNo/taskAnswers/applicationData` байхгүй.
- **Feature flag:** бүх бичих/нэргүй upload route `ensureEnabled`; public GET нь `enabled:false` буцаана; flag унтраалттай үед public гадаргуу хаалттай.
- **410 legacy route:** `app.post('/api/loans', legacyLoanPostGone)` хуучин handler-ээс өмнө бүртгэгдсэн (Express non-strict/case-insensitive тул `/api/loans/` ч хамаарна) — хуучин public Cloudinary upload хүрэх боломжгүй.
- **`taskLockBlocks`:** `/api/loans/:id` бүх non-GET/HEAD-д manager бус хэрэглэгчийг terminal task дээр хаана, `intakeVersion` шалгалтаас өмнө ажиллана (M2-д заасан өөр route-ыг эс тооцвол).
- **DoS (regex):** хэрэглэгчийн оролтоос regex үүсгэдэг цорын ганц газар escape хийгдсэн; бусад regex-үүд шугаман.
- **loanIntake.js өөрчлөлт:** task-v1-д AI automation default унтраалттай — эрх/өгөгдлийн эрсдэл нэмээгүй.
