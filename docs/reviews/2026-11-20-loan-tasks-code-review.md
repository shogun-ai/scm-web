# Loan task management — code review + QA (commit 376d335)

Reviewer: code-reviewer + tester roles. App code was not modified. Only `backend/loanTasks.review.test.js` was added (probes).
Scope: backend/loanTasks.js, mailer.js, loanTaskEmails.js, models/LoanFormConfig.js, shared/loanWidgets.js, shared/loanTaskStatus.js, server.js touch-points, loanIntake.js, frontend/src/components/loanTask/*, AdminPanel.jsx, QuickLoanRequest.jsx. Design: docs/design/loan-task-management.md (§5, §5.7, §14 D5-D10).

## Verdict
No Critical issue. 2 High (1 functional bug, 1 deployment risk), 5 Medium, 5 Low. Fix H1 and H2 (and preferably M1-M4) before turning `LOAN_TASKS_ENABLED=true`. Flag-off behaviour is unchanged (tests + code reading).

## Findings

### High
**H1. Board quick-assign always sends `expectedRevision: 0` -> 409 on any task with revision >= 1.**
- `frontend/src/components/loanTask/LoanTaskBoard.jsx:69` sends `item.taskRevision || 0`. `toTaskListItem` (backend/loanTasks.js, list mapper) does not return `taskRevision` and `LIST_FIELDS` does not select it. Probe: `backend/loanTasks.review.test.js` "BUG(H1)".
- Scenario: a manager assigns a request from the list dropdown after any earlier action (status, docs, previous assign): "Өөр хүн өөрчилсөн байна", list reloads, same result every time. Works only for never-touched tasks (revision 0). The detail drawer is fine (uses `detail.taskRevision`).
- Fix: add `taskRevision` to `LIST_FIELDS` and `taskRevision: loan.taskRevision || 0` to `toTaskListItem`.

**H2. Rate limiters key on `req.ip` but the server never sets `trust proxy`.**
- `backend/server.js` has no `app.set('trust proxy', ...)` (probe test). `createIntakeLimiter` (loanIntake.js:74-88) uses `req.ip`. Behind Render/Vercel every client shares the proxy address.
- Scenario: with the flag on, `public/submit` (5 / 15 min) is shared by ALL visitors: the 6th applicant in 15 minutes gets 429. Upload POST (20) and GET (300) are shared the same way. The legacy quick limiter has the same pre-existing flaw, but the new endpoints make it the main intake path.
- Fix: `app.set('trust proxy', 1)` (confirm hop count on the host) before routes; verify with two IPs in staging.

### Medium
**M1. Legacy `PUT /api/loans/:id` mass-assigns `task*` fields.** `server.js:3530/3532` does `$set: updateData` / `findByIdAndUpdate(id, updateData)` with the raw body (only `adminUser` removed). Any assigned officer can PUT `taskStatus`, `taskOutcome`, `taskRevision`, `taskHistory`, `taskUploadLinks` (e.g. forge a token hash), bypassing transitions, mandatory outcome/note, revision checks and audit. Pre-existing pattern, but the new fields widen it; `taskLockBlocks` only blocks non-managers on terminal tasks. Fix: in that handler delete keys matching `/^task/` and `formVersion` from `updateData` (probe: "legacy PUT ... static check").

**M2. Status dropdown offers `additional_docs` without creating a link or email.** `LoanTaskDetail.jsx` renders every `allowedActions.transitions` entry; `assigned/in_review -> additional_docs` via `/actions` is accepted by `validateTaskAction`, sets the status, but creates no upload link and sends no applicant email. The applicant is never told. Probe: "status action can move to additional_docs ...". Fix: hide `additional_docs` from the status select (use the "Нэмэлт баримт хүсэх" form) or reject `status -> additional_docs` and the `request_docs` action type on `/actions` in the backend.

**M3. Public product cache can trap a user in CONFIG_CHANGED for up to 60 s.** `GET public/products/:key` is sent with `Cache-Control: public, max-age=60`. After a 409 `CONFIG_CHANGED`, `TaskLoanForm.jsx` (catch block, `fetchPublicProduct`) refetches the same URL; browser/CDN may return the stale product (old `configVersion`) so resubmit returns 409 again until expiry. Fix: refetch with a cache-buster (`?t=Date.now()`), or lower max-age to 0-10 s.

**M4. An active product with nothing live still shows the legacy form.** `QuickLoanRequest.jsx` falls back to `LegacyQuickLoanRequest` whenever `product` is null. `toPublicProduct` returns null for inactive configs AND for `baseProductEnabled:false` with no live sub-product (seasonal product off-season). Admin cannot close a product: the old form keeps accepting requests via `/api/loans/quick`. Fix: when `enabled:true` and the product has a saved config, return an explicit `closed` flag and render a "currently not accepting requests" notice; keep the fallback only for flag-off/network errors.

**M5 (design caveat). Status drift between old LOS and board.** `deriveTaskState` prefers `taskStatus`. After the first board action, `status` edits made in the old LOS stop affecting the board, and board changes never update `status` (D5, by design). With the flag on, the "Хуучин LOS" button shows two diverging statuses. Add a visible note on that button; long term, one flow.

### Low
- L1. Free-text `extra_N` files lose their label: `fieldLabel` knows only presets/snapshot, so files show the generic "Нэмэлт баримт" (storage field `additional`); `extra_1` is reused across successive requests, so the requested text survives only in history `items`. Fix: store `label` on the `taskFiles` entry in the upload handler and prefer it in `fieldLabel`.
- L2. `TaskUploadForm.jsx` ignores `response.data.errors[key]` on 400 and shows only the generic message; show per-item reasons (wrong format/size).
- L3. `recordEmail` writes an `email: skipped` history row on every request when MAIL_ENABLED is off (and for staff without email): noisy timeline. Skip recording when result is `skipped`.
- L4. Applicant upload changes no status and, for unassigned requests, notifies nobody (`staffApplicantUpload` only if `assignee.userId`). Consider a "new files" indicator or mailing a fallback address.
- L5. Legacy `GET /api/loans` and `/api/loan-requests/:id` return the whole lean doc including `taskUploadLinks[].tokenHash` and `taskAnswers` (managers / assigned staff only; hashes are not usable as tokens). Optionally `.select('-taskUploadLinks.tokenHash')`.
- Minor: upload POST updates with `taskStatus: {$nin: terminal}`, so a legacy-terminal request (legacy `status` closed, no `taskStatus`) is guarded only by `findLink`'s derived check (small race window); config cache is per instance (30 s), harmless on one instance.

## Verified fine
- Contract matches §5/§5.7: public submit 400 / 404 PRODUCT_UNAVAILABLE / 409 CONFIG_CHANGED / 429 / 503 DISABLED; admin 409 VERSION_CONFLICT with `expectedVersion` (editor sends `config.version`, 0 for unsaved); TaskAction `expectedRevision` (detail drawer) and `reopen`; doc-request payload `{items:[{key,label}],note,expiresInDays:7,expectedRevision}` and response `{uploadUrl,expiresAt,task}` as used by `LoanTaskDetail`; `extra_1..extra_10` accepted for task-v1 and legacy (extra_0/11 rejected); upload link GET/POST (`items[].accept` arrays, fieldname = item key, `uploaded` flag); `other_loans {hasActiveLoans, loans[{lender,balance,monthlyPayment}]}` matches `prepareAnswers`; answers JSON, `consent:'true'`, honeypot `website`, string `configVersion` all match.
- Admin editor payload (name/version kept; status/saved/updatedAt stripped) validates with `validateConfig` (probe).
- Legacy safety: schema additions have no defaults (test "schema additions do not materialize"); reads never write; `/actions` writes only task* + `assignee` (never `status`/`workflowRevision`/`applicationData`); `POST /api/loans` -> 410 only for that exact path; GET/PUT `/api/loans`, the `/api/loans/:id` guard, `/api/loans/analyze-*` and `/api/loan-research/analyze-*` are untouched; the old `LoanRequest.jsx` that posted to `/api/loans` is not mounted (App.jsx imports QuickLoanRequest); `loan-frontend` only GETs `/api/loans`.
- Flag off: public GET returns `enabled:false` (wrapper falls back to `/api/loans/quick` form), all other loan-task routes 503, AdminPanel renders the old LoanOrigination with the original menu label; the loanIntake automation guard only affects `formVersion==='task-v1'`.
- Correctness: transition table; note required for rejected/resolved; outcome required for resolved and refused otherwise; terminal requires manager reopen; revision conflict via conditional update (`revisionCondition(0)` covers missing field); assign semantics (new<->assigned only); upload links revoked when terminal and on each new doc request; SHA-256 token storage; magic-byte validation; cloud cleanup on failure; history notes persisted on status/reopen/assign/note entries; UB date window (`ubDate` = UTC+8, endDate inclusive); config 409 + optimistic update; default-assignee fallback with system note; emails never affect the HTTP response; Reply-To = valid staff -> MAIL_REPLY_TO -> none; templates contain no PII beyond request no / product / labels.
- Lint: `eslint` on `frontend/src/components/loanTask` and `QuickLoanRequest.jsx`: 0 problems. `AdminPanel.jsx` has 54 errors, all in old code (`themeType`, `RAINBOW_COLORS`, ... around line 1990+), none in the touched hunks.

## Untested critical paths (existing suite)
1. Frontend has no test runner: TaskLoanForm 409/400 handling, TaskUploadForm, board quick-assign, doc-request flow are verified by reading only (H1 slipped through here).
2. `server.js` wiring (`/api/loans/:id` taskLock middleware order, `POST /api/loans` 410 precedence, schema indexes) is tested only through helper functions, not Express.
3. Real Mongoose behaviour (harness uses a hand-written matcher): `runValidators` with `$push`/`$set` on `taskHistory`, `$inc` on a missing `taskRevision`, `immutable` `formVersion`, sparse index creation. Needs real MongoDB (mongodb-memory-server or staging).
4. SMTP end-to-end (real nodemailer, Reply-To header), Cloudinary authenticated URL signing for staff file links.
5. Concurrent actions (two managers) and expiry at UB midnight with a real clock.

## Test run (2026-11-20)
- `node --test` (8 requested files): 97 tests, 97 pass, 0 fail.
- Added `backend/loanTasks.review.test.js`: 7 probes, 7 pass (they assert the CURRENT defective behaviour for H1/H2/M1/M2; update or delete once fixed).
- `npm --prefix frontend run build`: OK (pre-existing chunk-size warning only).
- `node --check backend/server.js`: OK.
