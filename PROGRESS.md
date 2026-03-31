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

---

## Current State (2026-04-01)

### What's Working
- `npm run build` — zero errors, 20 routes
- Deployed and functional at https://siteproof-ashy.vercel.app
- Clerk auth with auto-provisioning (org + user created on first sign-in)
- Demo mode: Clerk bypass, dual-contractor selector, Stripe bypass
- All endpoints protected + org-isolated
- 7 tRPC routers: project, task, evidence, zone, report, audit, dashboard
- Mobile capture → review → upload → gallery flow
- Evidence uploads working on Vercel (via /tmp + serve route)
- PDF report generation working on Vercel (@sparticuz/chromium-min + DB storage)
- Interactive Gantt chart with list/gantt toggle, zoom, evidence markers
- Audit trail for all mutations with CSV export
- PWA installable with offline capture queue
- Stripe billing coded (bypassed in demo mode)
- Error pages + breadcrumb navigation on all project sub-pages

### Environment Variables on Vercel
- **Configured:** Clerk (correct names), DATABASE_URL (Supabase pooler), DEMO_MODE, sign-in/up URLs
- **Not configured:** R2 storage, Stripe, Inngest, Mapbox, Anthropic API

### Vercel-Specific Adaptations
- Uploads: write to `/tmp`, serve via `/api/uploads/[...path]` (ephemeral)
- PDFs: stored as base64 in `report_data` JSONB, served via `/api/reports/[id]/pdf`
- Chromium: `@sparticuz/chromium-min` + `puppeteer-core` with remote binary download
- tRPC route: `maxDuration = 60` for report generation

---

## What to Build Next

### Production Readiness
1. **R2 storage setup** — configure Cloudflare R2 for persistent evidence/PDF storage
2. **Inngest configuration** — background report generation (sync fallback works)
3. **App branding** — logo, name, tagline (brand TBD)

### Nice-to-Have
4. Project member management (multi-user teams)
5. Evidence search by metadata
6. Offline queue status indicator
7. Video playback in evidence detail
8. Fix themeColor viewport warnings
