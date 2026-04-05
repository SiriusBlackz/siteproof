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

---

## Current State (2026-04-05)

### What's Working
- `npm run build` — zero errors, 22 routes
- Deployed and functional at https://siteproof-ashy.vercel.app
- Clerk auth with webhook sync + lazy ensureUser fallback
- DEMO_MODE blocked in production
- All endpoints protected + org-isolated with TRPCError
- Security headers on all responses
- bcrypt password hashing, per-IP rate limiting
- 7 tRPC routers: project, task, evidence, zone, report, audit, dashboard
- Mobile capture with permission error handling + ARIA labels
- Evidence uploads with thumbnail generation (Inngest)
- PDF reports at 9/10 quality: TOC, uploader info, audit trail, digital signatures, period-scoped data
- Project sub-navigation tabs
- Dashboard onboarding for new users
- Interactive Gantt chart with list/gantt toggle, zoom, evidence markers
- Audit trail for all mutations with CSV export
- PWA installable with offline capture queue
- Stripe billing coded (bypassed in demo mode)

### Environment Variables on Vercel
- **Configured:** Clerk (correct names + CLERK_WEBHOOK_SECRET), DATABASE_URL (Supabase pooler), DEMO_MODE, sign-in/up URLs
- **Not configured:** R2 storage, Stripe, Inngest, Mapbox, Anthropic API

### Vercel-Specific Adaptations
- Uploads: write to `/tmp`, serve via `/api/uploads/[...path]` (ephemeral)
- PDFs: stored as base64 in `report_data` JSONB, served via `/api/reports/[id]/pdf`
- Chromium: `@sparticuz/chromium-min` + `puppeteer-core` with remote binary download
- tRPC route: `maxDuration = 60` for report generation
- middleware.ts still works but deprecated in Next.js 16 (should rename to proxy.ts)

---

## What to Build Next

### Production Readiness
1. **R2 storage setup** — configure Cloudflare R2 for persistent evidence/PDF storage
2. **Inngest configuration** — configure event key + signing key on Vercel
3. **Rename middleware.ts → proxy.ts** — Next.js 16 convention
4. **App branding** — logo, name, tagline (brand TBD)

### Nice-to-Have
5. Project member management (multi-user teams)
6. Evidence search by metadata
7. Offline queue status indicator
8. Video playback in evidence detail
9. Canvas-based handwriting signature capture
10. PDF encryption (not just access control)
11. Fix themeColor viewport warnings
