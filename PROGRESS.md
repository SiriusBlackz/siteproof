# SiteProof — Progress Log

## Completed Phases

### Phase 1 — Core Loop ✅
1. **Scaffold** — Next.js 16, TypeScript strict, Tailwind v4, shadcn/ui v4 (Base UI), Clerk, Drizzle ORM, tRPC v11, postgres.js
2. **Database schema** — 11 tables (organisations, users, projects, projectMembers, tasks, gpsZones, evidence, evidenceLinks, reports, auditLog), relations, Zod schemas, initial migration
3. **Project CRUD** — list, get, create, update, archive with org-scoped queries
4. **Task list CRUD** — tree hierarchy with sortOrder, add/edit/delete/reorder, parent-child with depth rendering
5. **Evidence upload** — R2 presigned URLs with local file fallback, client-side EXIF extraction (exifr), XHR upload progress, upload queue component
6. **Evidence gallery** — responsive grid, cursor-based pagination, filters (task, date range), infinite scroll
7. **Manual task linking** — evidence-to-task link/unlink via Select dropdown, linked task badges on cards

### Phase 2 — Intelligence ✅
8. **GPS zone map editor** — Mapbox GL + Draw plugin (dynamic import, SSR disabled), polygon drawing, zone CRUD, default task per zone, stub page if no Mapbox token
9. **AI task suggestion** — heuristic scoring: GPS zone match (50pts), time overlap (30pts), recency (20pts), confidence badges in task linker
10. **MS Project XML import** — fast-xml-parser, auto-detect MS Project vs P6 format, preview before import, hierarchical task creation in transaction

### Phase 3 — Reports ✅
11. **Report HTML templates** — 7 pages with inline styles for Puppeteer: cover, executive summary, Gantt timeline with evidence markers, evidence gallery grouped by task, before/after comparison, verification metrics, sign-off
12. **PDF generation** — Puppeteer headless Chromium, renderToStaticMarkup, Inngest background job with sync fallback
13. **Report management** — generate dialog (period + optional password), report list with status badges, password-verified download
14. **Before/after pairing** — auto-match earliest + latest evidence per task per GPS zone

### Phase 4 — Polish ✅ (except Stripe)
15. **PWA setup** — manifest.json, service worker (network-first nav, cache-first static), IndexedDB offline queue, usePWA hook (online status + install prompt), PWA meta tags
16. **Mobile capture flow** — full-screen camera with flash/switch/GPS/haptic, batch photo review with per-photo task linking + notes, XHR upload progress, offline IndexedDB fallback
17. **Stripe integration** — Checkout flow, webhook handler, billing banner, portal session, dev bypass (coded, uncommitted)
18. **Audit log UI** — chronological feed with user avatars, action badges, filters (action type, date), CSV export
19. **Gantt chart** ✅ — interactive standalone view on tasks page with list/gantt toggle, zoom (months/weeks/days), evidence markers, today line, progress bars, tooltips

### Phase 5 — Security & Launch Hardening ✅
20. **Auth on all endpoints** — all 26 tRPC endpoints switched to protectedProcedure, assertProjectAccess() verifies org ownership
21. **Audit logging wired** — writeAuditLog() called in 14 mutations across all 6 routers (create/update/delete/link/unlink/upload/import/generate)
22. **Dashboard stats** — stats cards (projects, tasks, evidence, completion %), recent activity feed from audit log, delayed tasks alert

### Phase 6 — 360 Review & Hardening ✅ (2026-04-05)

#### Security Hardening
23. **DEMO_MODE production guard** — `isDemoMode()` returns false + logs warning when NODE_ENV=production
24. **Auth gap fixes** — task.update, zone.update, zone.delete always throw NOT_FOUND before assertProjectAccess (was skipping on null)
25. **SQL injection fix** — raw SQL in evidence.bulkLink replaced with Drizzle `inArray()`
26. **Error standardisation** — all `throw new Error()` replaced with `TRPCError` + proper HTTP codes across all routers
27. **Security headers** — middleware sets X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy
28. **bcrypt passwords** — report password hashing switched from unsalted SHA-256 to bcrypt (10 rounds)
29. **Rate limiting** — per-IP rate limit (20/min) on /api/upload with Retry-After header

#### Workflow Fixes
30. **Clerk webhook** — `/api/webhooks/clerk` handles user.created/user.updated with svix signature verification
31. **process-upload Inngest** — thumbnail generation (sharp 400x400 JPEG) triggered from evidence.confirm
32. **Report sync fallback removed** — fails immediately if Inngest unavailable (was risking 504 timeouts)
33. **Report query optimisation** — evidence filtered by period at DB level (was loading all into memory)
34. **Report failure recovery** — onFailure handler marks report as "failed" after 3 retries (was 1 retry, no failure status)

#### UX Improvements
35. **Camera permission handling** — detects PermissionDeniedError/NotFoundError with specific messages + retry button
36. **Accessibility** — ARIA labels on all icon-only buttons in capture page, video element labelled
37. **Confirmation dialogs** — alert-dialog for zone delete, toast confirmation for evidence unlink
38. **Dashboard onboarding** — empty state with workflow guide (Capture → Link → Report) when no projects exist
39. **Project sub-navigation** — tabbed nav (Overview/Tasks/Evidence/Zones/Reports/Settings) on all project pages

#### Performance & Logic
40. **Report idempotency** — rejects generation if another report already "generating" for same project
41. **AI linker improvements** — minimum 0.4 confidence threshold, uses actualStart/actualEnd when available

#### Report Quality (7/10 → 9/10)
42. **Data integrity** — before/after pairs filtered by period (was all-time), verification stats scoped to period
43. **Uploader info** — gallery shows uploader name + role (was null TODO)
44. **Audit trail** — verification page populated from auditLog with user names (was empty TODO)
45. **Cover page** — client name shown when available
46. **Table of contents** — page 2 with section names, dotted leaders, accurate page numbers
47. **Template polish** — footer safe zone (24mm padding), notes word-wrapped, system font stack, empty sections skip blank pages
48. **Page breaks** — page-break-inside:avoid on evidence cards and before-after pairs
49. **Thumbnails** — gallery uses thumbnailKey when available (reduces PDF size)
50. **Digital signatures** — sign-off blocks accept typed signatures with green "Digitally Signed" badge

### Phase 7 — Beta-Test Review ✅ (2026-04-11)

Comprehensive review against `betatest.md` (consolidated security /
correctness / architecture pass). Static analysis → runtime walkthrough
→ deployed. **7 commits, all live in production.**

#### Phase A — Security hardening (`a46aa19`)

51. **Sibling access helpers** — `assertTaskInProject`,
    `assertEvidenceInProject`, `assertZoneInProject` in
    `src/server/trpc/helpers.ts`. Wired into every mutation that takes a
    related ID (`evidence.link/bulkLink`, `task.create/update/reorder`,
    `zone.create/update`). Closed cross-project ID-juggling holes.
52. **Task cycle / self-parent guards** — `task.update` walks ancestors
    to detect cycles, rejects self-parenting.
53. **`task.reorder` project-scoped predicate** — pre-validates every
    referenced ID belongs to the project, scopes UPDATE clauses with
    `and(eq(id), eq(projectId))`.
54. **PDF route lockdown** —
    `src/app/api/reports/[id]/pdf/route.ts` now requires resolved user +
    project access + `status === "completed"`, and bcrypt-compares the
    password if `passwordHash` is set. Streams PDF bytes through the
    auth handler instead of serving via filesystem path.
55. **Generic `/api/uploads/[...path]` lockdown** — strict canonical
    path shape, refuses anything under `projects/*/reports/` (forces
    PDF downloads through dedicated route), requires auth + project
    access via `assertProjectAccess`.
56. **`upload_intents` table** (migration `0002_known_prowler.sql`) —
    `evidence.getUploadUrl` records an intent; `evidence.confirm` and
    `/api/upload` verify the storage key was minted for the same
    user+project, single-use, with 1h expiry. Closes the upload trust
    boundary that previously trusted client-supplied keys.
57. **Local `/api/upload` fallback hardening** — auth + intent lookup
    + project access check.
58. **Report password cleanup** — stripped plaintext password from
    Inngest event payload, removed unused `password` parameter from
    `htmlToPdf`, renamed UI copy "PDF password" → "Download password"
    with honest caveat ("does not encrypt the file itself").
59. **Safe production tRPC error formatter** — strips `cause`/stack
    from non-dev responses, replaces generic 500 messages with a
    static safe string. Logs full details server-side only.
60. **Deterministic demo mode** — new `lookupDemoUser` that does NOT
    auto-provision; throws `DemoNotSeededError` if seed missing. Plus
    `scripts/seed-demo.ts` for idempotent demo org/users seeding.
    Shared `resolveCurrentUser` factored out so tRPC context and route
    handlers use one identity path.

#### Phase B — Polish + deps (`d843134`)

61. **Dependency upgrades** — `next 16.2.1 → 16.2.3` (DoS advisory),
    `drizzle-orm ^0.45.1 → ^0.45.2` (SQL identifier injection
    advisory). `pnpm audit --prod` is clean after the bumps.
62. **`evidence.count` tRPC procedure** — replaces the `1+` placeholder
    on the project overview page with a real count.
63. **Task list a11y** — controls always visible on touch /
    `md:opacity-0 md:group-hover:opacity-100` on desktop, plus
    `aria-label` on every move/edit/delete button.
64. **`scripts/smoke.ts`** — end-to-end smoke that creates two
    projects via tRPC callers, asserts cross-project evidence linking
    is rejected with FORBIDDEN, queues a report, optionally hits
    `/api/reports/[id]/pdf` anonymously to assert 401 when
    `SMOKE_BASE_URL` is set. `pnpm smoke`.

#### Runtime walkthrough fixes (`491082e`)

65. **Local-dev auth bypass closed** — `getPublicUrl` was returning
    plain `/uploads/...` paths in local dev which Next served
    statically from `public/uploads/`, bypassing the entire Phase A
    PDF lockdown. All non-R2 writes now go to `.local-uploads/`
    (gitignored) and `getPublicUrl` always routes through
    `/api/uploads/`. Cleaned up the leaked `public/uploads/projects/`
    tree. Production was unaffected (writes to `/tmp`) but dev testing
    was missing the hardened path.
66. **`audit_log` cascade** (migration `0003_sweet_justice.sql`) —
    `audit_log.project_id` had no `ON DELETE` action, blocking project
    deletion. Now `ON DELETE CASCADE` on project, `SET NULL` on
    user_id.
67. **`report.generate` error surfacing** — was swallowing Inngest
    failures, returning the report row as if everything was fine.
    Now throws a TRPCError so the client knows.
68. **Inngest placeholder fallback** — client now treats
    `INNGEST_EVENT_KEY=PLACEHOLDER` (or any value <12 chars) as unset,
    so `INNGEST_DEV=1` mode kicks in for local dev without manual env
    surgery.

#### Final P0s + transactional bug (`bd16a18`)

69. **Stripe webhook idempotency** (migration `0004_bent_firebrand.sql`) —
    new `stripe_events` table keyed by `event.id`. Webhook handler
    refactored into a single transaction: insert event id with
    `ON CONFLICT DO NOTHING`, throw `DuplicateEventError` if 0 rows
    (returns 200 ack without re-running), otherwise process event in
    the same tx. On any non-duplicate error returns 500 so Stripe
    retries with the rolled-back state. Verified at runtime against
    four scenarios (bogus / valid / replayed / new event id).
70. **`report-list.tsx` setState-in-effect refactor** — was calling
    `setState` in render-phase branches and (after first fix) in
    `useEffect`, both flagged by React 19's
    `react-hooks/set-state-in-effect` rule. Refactored to use
    `trpc.useUtils().report.download.fetch()` as an imperative event
    handler. No `useEffect`, no handled-id ref, no error-message
    string matching inside render.
71. **`writeAuditLog` transactional bug fix** — discovered while
    testing Stripe idempotency. The helper was swallowing its own
    errors with try/catch, which silently corrupted postgres
    transaction semantics: a failing audit insert would abort the tx,
    the helper would catch it, the outer code thought everything was
    fine, Drizzle's COMMIT was silently rolled back, and the route
    returned 200 with **zero rows committed**. Split into:
    - `writeAuditLog(db, entry)` — throws, safe inside a tx
    - `writeAuditLogAsync(db, entry)` — fire-and-forget for tRPC
      mutations that already committed their work
    Migrated all non-tx callers in task / evidence / project / zone /
    report routers to `writeAuditLogAsync`.

#### UX polish + auto-login fix (`798dcb3`)

72. **Demo auto-login fallback closed** — `getDemoUser(null)` was
    defaulting to `contractor-1`, so any API client without the
    `demo_user` cookie got an implicit contractor-1 session. Now
    returns `null`, and `resolveCurrentUser` surfaces it as
    unauthenticated. Verified: `curl /api/trpc/project.list` with no
    cookie now → 401, with bogus cookie → 401, with valid cookie → 200.
73. **`task-form` parent filter walks descendants** — was only
    excluding the task being edited, not its subtree. Server-side
    cycle guard caught it, but the user saw a backend error instead
    of the option being hidden. Now does a fixed-point descendant
    walk on the flat tree.
74. **`task-form` no reset on error** — `handleFormSubmit` was
    calling `reset()` unconditionally, clearing the form on mutation
    failure too. Now relies on the parent closing the dialog (which
    unmounts DialogContent and clears state) on success.
75. **Settings member removal AlertDialog** — single-click trash icon
    used to remove team members with no confirmation. Now uses the
    same `AlertDialog` pattern as task delete, with accessible
    `aria-label`.
76. **Manage Billing button consistency** — replaced inline-styled
    raw `<button>` on the settings page with the shadcn `<Button>`
    component for focus ring + disabled state consistency.
77. **CLAUDE.md doc drift** — corrected `project.members.list` →
    `project.memberList`, `dashboard.projectSummary` →
    `dashboard.summary`. Documented `project.orgUsers`.

#### R2 + reportNumber + sharp (`9aafb96` + `22fdd16`)

78. **Report PDFs now upload to R2** — was writing to `/tmp/uploads`
    which evaporated between Vercel function invocations, silently
    breaking report downloads in production. New `uploadToStorage`
    and `fetchFromStorage` helpers in `storage.ts` switch between R2
    `PutObject` / `GetObject` and `.local-uploads/` based on
    `isR2Configured`. `generate-report.ts` and `process-upload.ts`
    use them; the PDF route and `/api/uploads/` route read via them.
    Report PDFs NEVER hand out a public R2 URL — they always stream
    through the auth+password-aware route.
79. **`reportNumber` race fixed** — `gatherReportData` was recomputing
    `max+1` after the tRPC mutation had already inserted the row, so
    DB row's `reportNumber` and `pdfStorageKey` filename disagreed by
    1. Now Inngest looks up the inserted row's `reportNumber` and
    passes it in via the new `reportNumber` field on
    `GenerateReportInput`.
80. **`sharp` pinned as explicit dep** (`^0.34.5`) — was being pulled
    in transitively via Next.js (which uses it for image
    optimization), and `pnpm` hoisted it locally so dev builds
    passed. Vercel's stricter typecheck failed on
    `let sharp: typeof import("sharp")`. Pinning unblocks the deploy
    and removes the latent fragility.

#### Production deploy

- Deployment ID `dpl_BZPjVdMdzbCrZtR1WKsz9xwhUbLL`
- Stable alias: **https://siteproof-ashy.vercel.app** (the working URL)
- Custom domain `www.siteproof.app` is **still parked at Namecheap** —
  Vercel has the alias registered but DNS doesn't reach Vercel.
- Hash deployment URLs (`siteproof-<hash>-…vercel.app`) have
  Deployment Protection enabled → return 401. Test against the stable
  alias.

#### Production runtime verification (after deploy)

- `siteproof-ashy.vercel.app/api/inngest` → `mode:cloud`,
  `has_event_key:true`, `has_signing_key:true`, `function_count:3` ✓
- Anonymous `project.list` → 401 UNAUTHORIZED "Not signed in" ✓
- Anonymous `/api/reports/<id>/pdf` → 401 "Not signed in" ✓
- `/api/uploads/projects/*/reports/*` → 403 "Use /api/reports/[id]/pdf" ✓

---

## Current State (2026-04-11)

### What's Working
- `npm run build` — zero errors, zero lint warnings, 23 routes
- Deployed at https://siteproof-ashy.vercel.app (aliased to www.siteproof.app)
- Clerk auth with webhook sync + lazy ensureUser fallback
- DEMO_MODE blocked in production
- All endpoints protected + org-isolated + project-member-scoped
- Security headers on all responses
- bcrypt password hashing, per-IP rate limiting
- 7 tRPC routers: project, task, evidence, zone, report, audit, dashboard
- Mobile capture with GPS, permission handling, ARIA labels
- Evidence uploads to R2 with thumbnail generation (Inngest)
- Evidence metadata search (type, text, uploader, date filters)
- Video playback in evidence cards + detail dialog
- Project member management (add/remove via settings page)
- Offline queue status indicator (IndexedDB polling, shown in nav)
- PDF reports at 9/10 quality: TOC, uploader info, audit trail, canvas signatures, period-scoped data
- Project sub-navigation tabs
- Dashboard onboarding for new users
- Interactive Gantt chart with list/gantt toggle, zoom, evidence markers
- Audit trail for all mutations with CSV export
- PWA installable with offline capture queue
- Stripe billing coded (bypassed in demo mode)
- Landing page at / (redirects to /projects or /sign-in)

### Infrastructure on Vercel
- **Clerk:** `proud-bluejay-8` instance, webhook + publishable key + secret key
- **Database:** Supabase pooler (aws-1-eu-central-1)
- **R2 Storage:** Cloudflare bucket `siteproof-media`, WEUR region, public dev URL enabled
- **Inngest:** synced, 3 functions (generate-report, failure handler, process-upload)
- **Not configured:** Stripe, Mapbox, Anthropic API

### Security Review (2026-04-10)
- assertProjectAccess checks project membership (org admins bypass, members required)
- Demo cookie validated against allowlist
- Upload limit reduced to 100MB
- Date validation on project + task forms
- Storage key sanitized against path traversal
- GPS callback guarded against unmounted state updates
- JPEG capture quality increased to 0.95

### Vercel-Specific Adaptations
- Uploads: R2 presigned URLs (fallback: `/tmp` + `/api/uploads/[...path]`)
- PDFs: R2 storage (fallback: base64 in `report_data` JSONB, served via `/api/reports/[id]/pdf`)
- Chromium: `@sparticuz/chromium-min` + `puppeteer-core` with remote binary download
- tRPC route: `maxDuration = 60` for report generation
- proxy.ts (Next.js 16 convention)

---

## What's Outstanding (2026-04-11)

### Active blockers — your side, no code work needed
1. **`www.siteproof.app` DNS** — domain is registered with **Namecheap Inc.**
   (RDAP-confirmed), DNS resolves to `parkingpage.namecheap.com`. Vercel has
   the alias but no traffic reaches it. Need to log into Namecheap and
   either (a) add `A @ → 76.76.21.21` + `CNAME www → cname.vercel-dns.com`,
   or (b) delegate nameservers to Cloudflare, or (c) transfer to Cloudflare
   Registrar.
2. **`STRIPE_WEBHOOK_SECRET`** — handler is fully wired up + idempotent
   (mig 0004), waiting on a real Stripe account + secret.
3. **Real Clerk validation** — `DEMO_MODE` is OFF in Vercel production,
   site redirects to `/sign-in`. Confirm a real Clerk account flow works
   end-to-end before opening to beta testers.

### Optional polish
- **Mapbox token** — enables GPS zone editor
- **Anthropic key** — currently 18 chars (looks truncated); only needed
  for v2 LLM linking
- **Custom R2 domain** (`media.siteproof.app`) — deferred until brand
  naming finalised; currently using `pub-4059c4c9c3a8464eb90e87b52033bd04.r2.dev`
- **App branding** — name/logo/tagline
- **Sentry** — no external observability yet
- **PDF encryption** — pdf-lib installed but unused (current "password"
  is download-gating only, UI copy now correctly says so)

### Code-side items deferred
- Replace in-memory rate limit with Upstash/Redis
- Offline upload queue retry/error surfacing
- XML import guardrails (size + count limits)
- `/api/upload` raw POST replay protection (low impact)
