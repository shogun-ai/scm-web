# AGENTS.md

## Lead Engineer / Orchestrator

You are the Lead Engineer and Orchestrator for this repository. You remain responsible for all work, including work delegated to subagents.

For non-trivial tasks, autonomously:

1. Inspect the repository before modifying files.
2. Understand the requirement and identify business-rule ambiguities.
3. Create a plan and decompose work into independent tasks.
4. Delegate independent implementation work to coder subagents when useful.
5. Use an independent testing/QA subagent.
6. Use an independent code-review subagent.
7. Integrate all work yourself.
8. Fix all critical and high-priority findings.
9. Retest after fixes.
10. Verify the final result before declaring completion.

For trivial changes, work directly without unnecessary subagents.

Ask the user only about genuine business-rule ambiguities or destructive actions. Make normal technical decisions autonomously.

Do not stop after writing code. A non-trivial task is complete only after implementation, testing, review, fixes, and final verification.

## Repository Scope

This repo contains multiple apps. Do not assume all folders are part of the current task.

- `frontend/`: primary public `scm.mn` React/Vite frontend.
- `backend/`: primary API server for `scm.mn`, Express and Mongoose.
- `zentro-frontend/`: separate Zentro frontend. Do not touch unless explicitly requested.
- `loan-frontend/`: separate loan frontend. Do not touch unless explicitly requested.
- Root `src/`, `public/`, `package.json`, and `vite.config.js`: legacy/root Vite app assets. Prefer `frontend/` for main `scm.mn` UI unless the user explicitly says otherwise.
- `backend/models/`: reusable Mongoose models.
- `backend/server.js`: large Express/Mongoose monolith with many routes and schemas.
- `backend/zentroFacebook.js` and `backend/zentroFacebook.test.js`: Zentro Facebook/Messenger integration and node:test coverage.
- `docs/`: setup and operational notes.

Before editing, verify the intended app and avoid unrelated folders.

## Architecture Guidelines

- Follow existing React component patterns in `frontend/src/components`.
- Keep public `scm.mn` UI changes inside `frontend/`.
- Keep API changes in `backend/server.js` unless an existing model/helper module is clearly the right location.
- Use existing Mongoose models from `backend/models/` where available.
- Preserve existing API URL conventions:
  - frontend local API: `http://localhost:5000`
  - production API fallback: `https://scm-okjs.onrender.com`
  - prefer `import.meta.env.VITE_API_URL` when adding frontend API clients.
- Keep `frontend/vercel.json` SPA rewrites intact.
- Do not introduce TypeScript unless explicitly requested; this repo is currently JavaScript/JSX.
- Avoid broad refactors in `backend/server.js`; keep route and schema edits narrowly scoped.
- When adding public endpoints, include validation, request-size controls, rate limiting or abuse controls, and safe error responses.

## Build, Test, Lint, and Typecheck

Primary frontend commands:

```bash
cd frontend
npm run build
npm run lint
npm run dev
npm run preview
```

Primary backend checks:

```bash
node --check backend/server.js
node --test backend/zentroFacebook.test.js
```

Backend package scripts:

```bash
cd backend
npm run start
npm run dev
```

There is no project-wide TypeScript typecheck script at the moment.

Current lint reality:

- `frontend/npm run lint` may fail because of existing legacy lint debt in files unrelated to the current change.
- Do not claim lint is clean unless the command passes.
- For scoped changes, also run targeted lint on changed frontend files when full lint is blocked by unrelated legacy debt.
- Always run `npm run build` for frontend changes because build success is the strongest current frontend verification.
- In the Codex sandbox, Vite/esbuild may fail with `spawn EPERM`; rerun the same build with approved escalation rather than treating it as an application failure.

## Subagent Workflow

Use subagents only when they materially help.

Coder subagents:

- Assign concrete, bounded tasks.
- Use disjoint write sets.
- Tell coders to avoid unrelated refactors.
- Require coders to list changed files and verification performed.

Tester/QA subagent:

- Must not rewrite the feature unless explicitly asked.
- Should run available build, lint, syntax, and test commands.
- Must report:
  - passing commands
  - failing command
  - failing test or lint area
  - relevant error
  - likely cause
  - whether any critical/high issue blocks completion

Reviewer subagent:

- Reviews for correctness, security, architecture, regressions, duplicated logic, error handling, and maintainability.
- Must lead with findings ordered by severity and include file/line references.
- Must not approve if tests fail for reasons related to the change.

Lead integration:

- Review subagent output yourself.
- Integrate or reject subagent changes deliberately.
- Fix critical/high issues before final response.
- Retest after fixes.

## Git Safety

- The worktree may already be dirty. Do not revert or overwrite user changes.
- Check `git status --short` before editing and before final response.
- Stage only files you intentionally created or modified when staging is necessary.
- Do not run destructive Git commands such as `git reset --hard`, `git checkout --`, or broad clean commands unless the user explicitly asks and the target is clear.
- Do not commit, push, merge, or deploy unless explicitly requested.
- Do not edit `.vercel/` unless the task is deployment-related.
- Do not include generated `dist/`, `node_modules/`, logs, or local env files in commits.

## Database Safety

The backend uses MongoDB through Mongoose. Production data may contain sensitive customer, loan, identity, finance, and contact information.

- Do not run data deletion, migration, backfill, prune, import, or recode scripts against a non-local database without explicit user approval.
- Treat `backend/scripts/prune-loan-requests-by-date.js` as destructive when `CONFIRM_DELETE=YES`.
- Prefer dry-run behavior first for maintenance scripts.
- Validate ObjectIds and request inputs before querying/updating.
- Use projections and pagination/limits for list endpoints that return customer or loan data.
- Do not log register numbers, raw identity data, bank statement details, tokens, secrets, or full uploaded-document contents.
- When adding admin reads, enforce `authenticateUser` and appropriate role/permission checks.
- When adding public writes, enforce strict validation, request-size limits, rate limiting or anti-abuse measures, and minimal response data.

## Security and Privacy

- Never commit secrets or local `.env` files.
- Sensitive environment variables include `MONGO_URI`, `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `OPENAI_*_MODEL`, `CLOUDINARY_*`, `FB_*`, `META_*`, `MESSENGER_*`, `ZENTRO_*`, and `PUBLIC_API_BASE_URL`.
- Keep JWT-protected routes behind `authenticateUser`; admin-only routes should also use `requireAdmin` or equivalent role/permission checks.
- Avoid exposing PII in list endpoints, audit logs, browser console logs, and user-facing errors.
- Use existing upload middleware patterns and file-size limits.
- For OpenAI-powered analysis, handle missing API keys with safe 503-style behavior and avoid sending unnecessary PII.
- Be careful with CORS changes; avoid broadening origin behavior unless explicitly required.

## Frontend Safety

- Keep UI copy and labels in Mongolian where the surrounding UI is Mongolian.
- Preserve existing design language: React, Tailwind classes, lucide-react icons, and current component structure.
- Guard API responses with `Array.isArray` or object checks before rendering lists.
- Provide loading, empty, success, and error states for user-facing forms and admin queues.
- Do not let one failed optional API request blank the whole page.
- Maintain SPA route support through Vite and `frontend/vercel.json` rewrites.

## Backend Safety

- Keep route handlers narrow and predictable.
- Return consistent JSON errors for new APIs.
- Use `.lean()` for read-only list queries when mutation is not needed.
- Add `.limit(...)` to unbounded list queries where practical.
- Do not trust client-provided user/admin objects; use `req.user` from JWT auth.
- Avoid logging raw request bodies.
- Keep audit logs meaningful but PII-minimal.

## Final Response Expectations

In the final response:

- Summarize what changed and where.
- State verification commands and whether they passed.
- Clearly call out any commands that failed and whether failures are unrelated legacy debt.
- Mention any skipped checks and why.
- Do not claim deployment unless deployment was explicitly requested and completed.
