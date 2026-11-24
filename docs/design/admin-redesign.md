# Admin panel redesign — "Prism Sky"

Date: 2026-11-24 · Scope: `frontend/src/components/AdminPanel.jsx` shell + dashboard, `components/admin/**`, `components/loanTask/LoanTaskBoard.jsx`.

## Idea
Солонго (rainbow) is treated as **light**, not as a flag: white light enters a prism and leaves as a spectrum.
The brand mark is already a triangle, so the prism metaphor is native. The seven hues never appear as adjacent
stripes on a surface; they appear as *light* — a drifting aurora, a 1px refracted hairline, a hue per module.

## Surfaces
- **Canvas:** twilight sky `#0A1024 → #05070D`, four slow radial aurora bands (indigo, cyan/green, violet/rose, faint gold),
  a ~10% conic prism sheen, a dot grid masked with a radial fade, static film grain. Transform-only animation, 40–70 s cycles,
  paused when the tab is hidden and disabled under `prefers-reduced-motion`.
- **Dark glass (chrome + dashboard):** `rgba(13,17,34,.62)` + `backdrop-filter: blur(22px) saturate(150%)`, top sheen,
  1px specular rim (bright top-left, module hue bottom-right), cursor spotlight and a cursor-following edge light,
  ≤3.5° tilt toward the pointer (fine pointers only).
- **Pearl sheet (all work tabs):** near-opaque light glass `rgba(239,243,249,.95)`, so existing light forms/tables keep their
  contrast unchanged. A 2px module-hue light line on its top edge. The blur lives on a sibling layer so `position: fixed`
  dialogs inside tabs are not trapped.

## Spectrum → modules
Dashboard indigo · Зээлийн хүсэлт green · Итгэлцэл gold · Баримт AI violet · Контент/Файл amber · Чатбот/маягт cyan ·
Устгах rose. Used for the rail icon, the sliding active indicator, the topbar dot and the sheet/card edge light.
Tokens: `components/admin/theme/spectrum.js` and CSS variables in `theme/admin-theme.css`.

## Navigation
Icon rail 76px → 268px after a 280 ms hover dwell or on keyboard focus (`:focus-visible`), labels fade/slide in with a
14 ms stagger; tooltips while collapsed; Escape collapses; pin toggle persisted in `localStorage`
(`scm_admin_rail_pinned`); below 768px an off-canvas drawer with scrim, Escape, focus to the close button and `inert` when closed.
The legacy "Хуучин зээлийн үйл явц" entry and its note are removed from the loan board.

## Motion
Ease-out `cubic-bezier(.22,1,.36,1)`; entry blur-in (8px → 0, 10px rise, 70 ms stagger, 720 ms); count-up 900 ms;
chart reveal via `clip-path`; donut/gauge stroke draw; topbar spectrum hairline has a single light sweep every 9 s.
All motion is disabled under reduced motion.

## Dashboard
Greeting hero (white → slate gradient text), 4–5 KPI glass cards (count-up, 7-day delta, 14-day sparkline),
loan-task pipeline (from `/api/loan-tasks/summary`, hidden if unavailable), 30-day loan/trust area chart with crosshair,
tooltip and arrow-key navigation, product mix donut, resolution gauge, recent activity. Charts are dependency-free SVG.

## Contrast
Ink `#F4F7FB` / `#C5CEDC` / `#93A0B6` on the dark glass are ≥ 6.9:1. Status pills use light tints on dark (≥ 7:1).
Sheet content keeps the original light palette.

## Phase 2 — loan board & detail
- Board renders directly on the sky (no pearl sheet): dark glass toolbar, segmented status chips with spectrum dots,
  data table with sticky header inside its own scroll area, green row-hover light (inset 2px edge + gradient), dark
  assignee selects, ghost row actions. Mobile: filters live in a bottom sheet behind "Шүүлтүүр" (Escape, scrim,
  body scroll lock), chips scroll horizontally, rows are glass cards.
- Detail drawer: frosted light side sheet (dense data stays light), ink header with green/cyan glow and spectrum hairline,
  frosted sticky action bar, every section is a card with a small-caps title. Logic unchanged.
- Status pills: `tone="dark"|"light"` on `TaskStatusBadge` / `ChannelBadge`; dark pills measured 7.8–9.1:1.
- Public ChatBot hidden on `/admin*`; mobile nav drawer auto-closes on module change and locks body scroll.

## Phase 4 — tab extraction & primitives

### Extracted tabs (`frontend/src/components/admin/tabs/`)
AdminPanel.jsx is now a router + data/state owner (~1240 lines, was ~3370). Tab bodies were moved mechanically
(scope-analysed: every outer binding they reference arrives as a prop with the same name; imports re-created), so
behaviour, API calls, permissions and data loading are unchanged. Restyle these files; keep prop names.

| File | Menu | Notes |
|---|---|---|
| `TrustsTab.jsx` + `TrustDrawer.jsx` | Итгэлцлийн хүсэлт | **restyled** with primitives (gold) |
| `UsersTab.jsx` (+ `admin/NotifyEmailEditor.jsx`) | Хэрэглэгчид | |
| `PermissionsTab.jsx` | Эрхийн матриц | wrapper of `TaskPermissionMatrix` |
| `LogsTab.jsx` | Үйлдлийн лог | |
| `FinanceTab.jsx` | Файл засах | |
| `CmsTab.jsx` + `cms/Cms*Section.jsx` | Контент засах | one file per sub-tab: Safety, Hero, Promotions, About, Financials, Products, Calculator, Ceo, Board, Management, Shareholder; "theme" sub-tab still inline in CmsTab |
| `ChatbotTab.jsx` | Чатбот | CMS sub-tab `chatbot` |
| `BotContentTab.jsx` | Ботын агуулга | wrapper of `BotContentPanel` |
| `DeleteSettingsTab.jsx` | Устгах тохиргоо | wrapper of `AdminSettingsPanel` |
| `FacebookTab.jsx` | Facebook холболт | wrapper of `FacebookStatusPanel` |
| `LoanTaskConfigTab.jsx` | Хүсэлтийн маягт | wrapper of `LoanTaskConfigEditor` |
| `DocumentAiTab.jsx` | Баримт AI уншилт | wrapper of `LoanResearch` |
| `ProfileTab.jsx`, `ProfileSecurityTab.jsx` | Миний профайл | |
| `OnboardingTab.jsx`, `OnboardingDetailModal.jsx` | Харилцагч бүртгэл | menu hidden (D16) |
| `LegacyRequestModal.jsx` | (legacy LOS detail, printable) | |

Tabs still listed in `AdminShell sheet` render inside the pearl sheet; to move a tab onto the dark sky, add its key
to the `sheet={!(…)}` exclusion in AdminPanel (as done for dashboard / los / trusts).

## Primitives (`frontend/src/components/admin/ui/`)
Dark tone = on the sky/glass; light tone = inside drawers / pearl sheets. All measured ≥ 4.5:1 (most ≥ 7:1).

- **`PageHeader`** `{ hue, icon, eyebrow, title, count, countLabel, description, actions }` — hue eyebrow, white title, count line.
- **`Toolbar`** `{ search, filters, columns=2..5, activeCount, resultCount, label }` — glass bar; `filters` collapse
  to a bottom sheet below 768px (Escape, scrim, scroll lock). Put `<Field>`s in `filters`, `<SearchInput>` in `search`.
- **`DataTable`** `{ columns, rows, rowKey, caption, cardTitle, cardAside, cardFooter, selected }` —
  column `{ key, header, render(row), align, className, hideOnCard, cardWide, cardLabel, srHeader }`.
  Sticky header in its own scroll area, hue row-hover light, card list on mobile.
- **`Tabs`** `{ items:[{id,label,count,dot}], value, onChange, label }` — segmented chips, role=tablist, arrow keys.
- **`SideDrawer`** `{ hue:'green'|'gold', label, eyebrow, reference, badge, title, subtitle, meta, note, actions, actionsNote, onClose, children }`
  — the loan detail and trust detail both use it (identical structure). Escape (ignored while an alertdialog is open),
  focus in/trap/return. Body building blocks in `ui/Drawer.jsx`: **`DrawerSection`** `{ id, title, first }`,
  **`DrawerAction`** `{ icon, active, danger, busy }` (sticky-bar button, `active` = open panel),
  **`DetailList`** `{ items:[{label,value}], columns }`, **`Timeline`** `{ items:[{key,meta,content}] }`.
  New hues: add `.adm-drawer[data-hue='x'] { --hue; --drawer-ink }` in `admin-data.css` (`--drawer-ink` must be AA on white).
- **`Form`**: `Field` `{ label, hint, error, tone, required }` (render-prop `({ id, describedBy })` to wire the control),
  `Input`, `Select`, `Textarea`, `SearchInput`, `Toggle` (role=switch) — all take `tone`.
- **`Button`** `{ variant: primary|secondary|danger (dark) · ink|light|lightDanger (light), icon, busy, hue }`.
- **`Feedback`**: `Pill` `{ hue: cyan|indigo|gold|violet|rose|green|neutral, tone, dot }`, `EmptyState` `{ icon, title, description, action, tone }`, `Notice` `{ kind: ok|err|info }`.
- **`Modal`** `{ title, description, onClose, busy, footer, size, role }` and **`ConfirmDialog`** `{ title, message, confirmLabel, danger, busy, onConfirm, onCancel }` — z-60 so they stack above a drawer.

Rules learned: never leave `transform`/`filter`/`backdrop-filter` (incl. a filling animation) on an ancestor of a
`position: fixed` dialog — entry animations use `animation-fill-mode: backwards` for this reason; keep fixed dialogs
out of `space-y-*` stacks (they inherit the margin).

## Open questions
- The public `ChatBot` floating button (rendered by `App.jsx`) overlaps the admin bottom-right corner; out of scope here.
- Tab headings inside sheets duplicate the topbar title; kept to avoid touching every tab.
