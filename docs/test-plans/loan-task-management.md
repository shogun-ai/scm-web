# Test plan and results — loan task management (commit 376d335)

Related: docs/reviews/2026-11-20-loan-tasks-code-review.md, docs/design/loan-task-management.md.

## Automated results (2026-11-20)
| Command | Result |
|---|---|
| `node --test backend/loanTasks.test.js backend/mailer.test.js shared/loanWidgets.test.js shared/loanTaskStatus.test.js backend/loanIntake.test.js backend/safetyNotices.test.js backend/zentroFacebook.test.js shared/heroSliderConfig.test.js` | 97 pass / 0 fail |
| `node --test backend/loanTasks.review.test.js` | 7 pass (probes pinning known defects H1, H2, M1, M2) |
| `npm --prefix frontend run build` | pass |
| `npx eslint src/components/loanTask src/components/QuickLoanRequest.jsx` (frontend dir) | 0 problems |
| `npx eslint src/components/AdminPanel.jsx` | pre-existing errors only, none in touched hunks |
| `node --check backend/server.js` | pass |

Coverage map (area -> existing automated test in loanTasks.test.js): flag off/503 -> "feature flag off"; public config exposure -> "public products expose only active..."; submit validation and cleanup -> "valid submission", "invalid submissions", "cloud failure"; version/honeypot/limits -> "product availability, config version..."; default assignee + emails -> "default assignee...", "mail failures..."; admin config -> "admin config CRUD"; list scope/PII -> "staff list is scoped..."; legacy safety -> "legacy request actions write only task fields", "schema additions do not materialize", "legacy POST /api/loans is gone"; transitions/notes -> "status transitions require outcome/note"; staff files -> "staff file upload..."; applicant link -> "applicant upload link lifecycle", "doc-request validation".

Not covered automatically: frontend components (no runner), Express wiring in server.js, real MongoDB behaviour, real SMTP/Cloudinary (see review, "Untested critical paths").

## Manual QA checklist (staging, `LOAN_TASKS_ENABLED=true`)
Preconditions: staging DB copy with legacy requests (pending, assigned, studying, approved); SMTP test inbox (MAIL_ENABLED=true, SMTP_* set, optional MAIL_REPLY_TO); `trust proxy` configured (review H2); users: admin, director, loan_officer A (with email), loan_officer B.

Flag OFF first:
- [ ] Public loan page shows the old quick form and submits to `/api/loans/quick`.
- [ ] Admin sidebar says "Зээлийн үйл явц"; old LOS works.
- [ ] `POST /api/loans` returns 410; `GET /api/loan-tasks` returns 503 `DISABLED`; `GET /api/loan-tasks/public/products` returns `enabled:false`.

1. Admin config
   - [ ] Flag on: sidebar shows "Зээлийн хүсэлт" and (admin only) "Хүсэлтийн маягт"; director does not see the config tab.
   - [ ] Open a product: default form mirrors the old quick form. Toggle required/optional, add a custom text field and a custom file field (PDF/JPG, 2 files); full_name and phone cannot be made optional.
   - [ ] Set default assignee = officer A; save -> version increments; preview matches.
   - [ ] Two browsers: save in A, then stale save in B -> 409 message, reload works.
   - [ ] Sub-product starting tomorrow (UB date): status "scheduled", not on public page. Start/end = today: live all day UB time, gone after 00:00 UB.
   - [ ] Product inactive, or base disabled with no live sub-product: note current behaviour (legacy form shows, review M4).
2. Public submit
   - [ ] `/loan-request?product=cons_loan`: dynamic form with steps and sub-product chooser (if live subs). Required messages; other-loans rows add/remove; file limits (11 MB, .exe, text renamed .pdf).
   - [ ] Honeypot filled -> generic 400; consent unchecked -> blocked.
   - [ ] Edit config in admin while the form is open, then submit -> notice "Маягт шинэчлэгдсэн", answers kept, resubmit succeeds (watch the 60 s cache, M3).
   - [ ] Success: reference `SCM-2026-XXXXXX`; 6th submit in 15 min from same IP -> 429 text; different IP works (H2).
   - [ ] Applicant email: subject "Таны зээлийн хүсэлт хүлээн авлаа — <ref>", Reply-To = officer A (or MAIL_REPLY_TO), no personal data in body. Officer A gets assignment email with admin link.
   - [ ] Request is assigned to A (status "Хуваарилсан"); history: created, assigned, email rows.
3. Assign / work
   - [ ] Board lists the request; filters (status chips with counts, assignee, product, source task/legacy, search by ref/phone) and pagination work.
   - [ ] Reassign to officer B in the drawer: B gets email; A no longer sees it; A opening it by id gets 404.
   - [ ] Reassign from the list dropdown on a request that already has history -> must succeed (fails today: H1).
   - [ ] Officer B: sees only own requests, no assignee filter/assign control; adds a note (persisted in history); moves to "Хянаж буй".
   - [ ] Legacy request (studying): "Хуучин урсгал" label and legacy history message; assign changes only the assignee; legacy status untouched in old LOS.
4. Document request
   - [ ] On assigned/in_review: tick preset file fields, add 2 free-text items; create link -> link and expiry shown; status "Нэмэлт баримт хүлээж буй"; history row with items and note.
   - [ ] Applicant email lists items, UB expiry time, Reply-To = assignee; link opens `/loan-request?upload=<token>`.
   - [ ] Choosing "Нэмэлт баримт хүлээж буй" in the status dropdown: confirm what staff see (M2: no link, no email).
   - [ ] Second request revokes the first link (first link -> "Холбоос хүчингүй").
5. Applicant upload
   - [ ] Page shows request no, product, items, note, expiry; no name/RD. Upload valid PDF/JPG/PNG/WEBP per item; invalid type/size shows an error (L2); uploaded item marked "Өмнө нь оруулсан".
   - [ ] Staff drawer: files under "Харилцагч (холбоосоор)"; staff email "Харилцагч нэмэлт баримт орууллаа"; history `file_added`.
   - [ ] Tampered/expired/revoked token -> "Холбоос хүчингүй"; flag off -> error page without data.
   - [ ] Staff "Файл нэмэх" appears under Ажилтан; signed URLs open.
6. Resolve / reject / reopen
   - [ ] Resolve: outcome and note required; terminal; upload link invalid afterwards.
   - [ ] Reject: note required. Officer cannot change a terminal request (403), also not via legacy PUT (403).
   - [ ] Manager reopens with note -> "Хянаж буй", outcome cleared, history shows reopened with previous outcome.
   - [ ] Concurrent edit in two browsers -> "Өөр хүн өөрчилсөн" and reload.
7. Emails and logs
   - [ ] MAIL_ENABLED=false: no emails, no UI errors, history `email: skipped` (L3).
   - [ ] SMTP down: submit still 201; history `email: failed`; server log has no addresses/secrets.
   - [ ] Admin log entries: `loan_task_config_saved`, `loan_task_status`, `loan_task_assign`, `loan_task_doc_request`, `loan_task_file_added`.
8. Regression with flag on
   - [ ] "Баримт AI уншилт" menu works; `/api/loan-research/analyze-statement` ok.
   - [ ] Old LOS list/edit/committee on legacy requests; task-v1 requests skip AI automation unless `LOAN_TASKS_AI_AUTOMATION=true`; manual retry works.
   - [ ] 400 px width: public form, upload page, board, drawer usable; keyboard order; Esc closes drawer.
9. Rollback
   - [ ] Flag off: public pages return to the old form (after cache TTL up to 60 s), admin returns to old LOS; task-created requests stay visible in old LOS.

## Bugs found
H1 quick-assign revision, H2 trust proxy / shared limiter, M1 legacy PUT mass-assignment, M2 additional_docs via status dropdown, M3 config cache loop, M4 cannot close a product, M5 status drift, L1-L5. Details, file locations and fixes in the review.

## Conclusion
Not ready to enable in production until H1 and H2 are fixed (M1-M4 strongly recommended). Backend logic and contracts otherwise verified; flag-off behaviour unchanged.
