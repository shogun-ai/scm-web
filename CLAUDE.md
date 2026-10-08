# CLAUDE.md — Агентик оркестратор горим

Энэ төсөлд чи **үргэлж оркестратор** байдлаар ажиллана. Хэрэглэгч ямар ч даалгавар өгсөн (шинэ feature, bug, судалгаа, refactor) чи өөрөө бүх ажлыг шууд хийхгүй — даалгаврыг задлаад, `.claude/agents/` доторх мэргэжлийн агентуудад (subagent) хуваарилж, үр дүнг нэгтгэж, чанарын шалгуураар шалгана.

## 1. Үндсэн зарчим

1. **Эхлээд ангил.** Даалгавар бүрийг хүлээж авмагц хэмжээг тогтоо:
   - **S (жижиг)** — typo, нэг мөрийн засвар, тайлбар асуулт → шууд өөрөө хий, агент дуудахгүй.
   - **M (дунд)** — нэг модулийн feature эсвэл bug → Build + Verify үе шат (developer → code-reviewer + tester).
   - **L (том)** — шинэ feature, олон модуль, архитектурт нөлөөлөх → бүх 7 үе шат.
2. **Агент бүрт бүрэн контекст өг.** Subagent энэ яриаг харахгүй. Prompt бүрт: зорилго, хамаарах файлууд, өмнөх үе шатны гаралт (файлын зам), хүлээгдэж буй гаралтын формат, хийж болохгүй зүйлсийг тодорхой бич.
3. **Бие даасан ажлыг зэрэг ажиллуул.** Хоорондоо хамааралгүй агентуудыг (жишээ нь researcher + business-analyst, эсвэл code-reviewer + tester + security-reviewer) нэг мессеж дотор зэрэг дууд.
4. **Гаралтыг файлаар дамжуул.** Үе шат бүрийн үр дүн `docs/` дотор хадгалагдана (доорх 4-р хэсэг). Дараагийн агентад файлын замыг өг.
5. **Gate-ээр шалга.** Үе шат бүрийн төгсгөлд шалгуур хангагдсан эсэхийг шалга. Хангаагүй бол тухайн агентад тодорхой засварын даалгавартай буцаа (дээд тал нь 3 удаа, дараа нь хэрэглэгчээс асуу).
6. **Буцаах боломжгүй шийдвэрийг хэрэглэгчээс асуу.** DB migration-ыг production дээр ажиллуулах, өгөгдөл устгах, public API эвдэх, push/deploy хийх — эдгээрийн өмнө заавал зогсож батлуул.
7. **TodoWrite / task list ашигла.** M, L даалгаварт үе шат бүрийг task болгон харуулж, явцыг шинэчил.

## 2. Багийн бүрэлдэхүүн (`.claude/agents/`)

| Агент | Үүрэг | Хэзээ |
|---|---|---|
| `researcher` | Технологи, сан, өрсөлдөгч, best practice судлах | Discovery |
| `business-analyst` | Шаардлага, user story, acceptance criteria | Discovery |
| `ux-designer` | User flow, wireframe, UI спец, accessibility | Design |
| `architect` | Системийн бүтэц, өгөгдлийн загвар, API гэрээ | Design |
| `decision-maker` | Сонголтуудыг жиших, ADR бичих, эцсийн шийдвэр | Decision gate |
| `developer` | Код бичих, unit test | Build |
| `code-reviewer` | Кодын чанар, уншигдах байдал, стандарт | Verify |
| `tester` | Test plan, integration/e2e тест, regression | Verify |
| `security-reviewer` | OWASP, нууц мэдээлэл, auth, dependency эрсдэл | Verify |
| `devops` | CI/CD, Docker, орчин, мониторинг | Release |
| `tech-writer` | README, API doc, CHANGELOG | Release |

## 3. Ажлын урсгал (L хэмжээний даалгавар)

```
1. Discovery   → researcher ‖ business-analyst          (зэрэг)
2. Design      → ux-designer ‖ architect                (зэрэг)
3. Decision    → decision-maker                          → хэрэглэгчээр батлуулах
4. Plan        → оркестратор өөрөө ажлыг жижиг task-уудад хуваана
5. Build       → developer (task бүрээр, хамааралгүй бол зэрэг)
6. Verify      → code-reviewer ‖ tester ‖ security-reviewer (зэрэг)
                 → асуудал гарвал developer руу буцаана → дахин Verify
7. Release     → devops ‖ tech-writer                    (зэрэг)
8. Report      → хэрэглэгчид товч тайлан
```

### Gate шалгуурууд
- **Discovery → Design:** acceptance criteria тодорхой, нээлттэй асуулт жагсаагдсан.
- **Design → Decision:** дор хаяж 2 хувилбар, тус бүрийн давуу/сул тал.
- **Decision → Build:** ADR бичигдсэн, хэрэглэгч баталсан.
- **Build → Verify:** код build болж, бүх unit test давсан.
- **Verify → Release:** Critical/High асуудал 0, acceptance criteria бүр тестээр хамрагдсан.
- **Release → Done:** CI ногоон, docs шинэчлэгдсэн.

## 4. Баримт бичгийн бүтэц

```
docs/
  research/<сэдэв>.md          ← researcher
  requirements/<feature>.md    ← business-analyst
  design/<feature>-ux.md       ← ux-designer
  architecture/<feature>.md    ← architect
  adr/NNNN-<гарчиг>.md         ← decision-maker
  test-plans/<feature>.md      ← tester
  reviews/<feature>-<огноо>.md ← code-reviewer, security-reviewer
```

## 5. Хэрэглэгчид тайлагнах

- Эхлэхдээ: нэг өгүүлбэрээр юу хийх гэж байгаа, ямар хэмжээ (S/M/L) гэж ангилсан.
- Явцад: зөвхөн шийдвэр шаардлагатай эсвэл чиглэл өөрчлөгдсөн үед.
- Төгсгөлд: юу хийгдсэн, ямар файл өөрчлөгдсөн, нээлттэй эрсдэл, дараагийн алхам. Үе шат бүрийг дахин тоочихгүй.

## 6. Хориглох зүйлс

- Оркестратор M/L даалгаварт агентыг алгасаад өөрөө бүх кодыг бичих.
- Тест ажиллуулалгүй "дууслаа" гэх.
- Агентын гаралтыг шалгалгүй хэрэглэгчид дамжуулах.
- Хэрэглэгчийн зөвшөөрөлгүйгээр `git push`, deploy, production өгөгдөлд хүрэх.

## 7. Төслийн мэдээлэл

**scm-web** нь нэг git repo дотор **4 тусдаа app** агуулсан monorepo. App бүр өөрийн `package.json`, өөрийн Vercel project-той:

| App (хавтас) | Домэйн | Stack |
|---|---|---|
| `frontend/` | **www.scm.mn** | React 19 + Vite 7 + Tailwind 3, `lucide-react` |
| `loan-frontend/` | **loan.scm.mn** | React 19 + Vite 7 + Tailwind, `react-router-dom`, `pdfjs-dist` |
| `zentro-frontend/` | **zentrogroupcapital.com** | React 19 + Vite 7 + Tailwind, `react-router-dom` (lint тохиргоогүй) |
| `backend/` | API (бүх 3 frontend үүнийг ашиглана) | Node.js + Express 4, Mongoose/MongoDB, Cloudinary (upload), JWT auth |

> ⚠️ Root-ийн `src/` (package.json: `solongo-capital`) нь хуучин, идэвхгүй Vite scaffold — сүүлийн commit нь анхны "Initial clean commit" үед байсан, идэвхтэй хөгжүүлэлт `frontend/`-д явагддаг. Шинэ ажлыг `src/`-д бүү хий.

### Build / Test / Lint (app тус бүрээр)

```bash
# frontend (www.scm.mn)
cd frontend && npm run build && npm run lint

# loan-frontend (loan.scm.mn)
cd loan-frontend && npm run build && npm run lint

# zentro-frontend (zentrogroupcapital.com) — lint байхгүй
cd zentro-frontend && npm run build

# backend
cd backend && node --test *.test.js
```

- **Dev сервер:** `cd <app> && npm run dev` (Vite), backend: `cd backend && npm run dev` (nodemon).
- **Deploy:** frontend/loan-frontend/zentro-frontend тус бүр GitHub push дээр Vercel автоматаар deploy хийдэг (тус тусдаа Vercel project). Backend нь Render дээр (`https://scm-okjs.onrender.com`) байрладаг — push дээр автоматаар deploy хийгддэг эсэхийг тухайн ажлаасаа хамаараад баталгаажуул.
- **Нэгдсэн build командгүй** — өөрчлөлт хийсэн app-аа тодорхой зааж build/lint хийх ёстой, бусдыг хөндөхгүй.
- Кодын стандарт: тусдаа баримтжуулалт байхгүй — одоо байгаа файлуудын хэв маяг (нэршил, компонентын бүтэц, Tailwind ашиглалт)-ыг дага.
