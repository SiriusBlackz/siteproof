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
19. **Gantt chart** — exists in report templates but NOT as standalone page view

### Phase 5 — Security & Launch Hardening ✅
20. **Auth on all endpoints** — all 26 tRPC endpoints switched to protectedProcedure, assertProjectAccess() verifies org ownership
21. **Audit logging wired** — writeAuditLog() called in 14 mutations across all 6 routers (create/update/delete/link/unlink/upload/import/generate)
22. **Dashboard stats** — stats cards (projects, tasks, evidence, completion %), recent activity feed from audit log, delayed tasks alert

---

## Current State

### What's Working
- `npm run build` — zero errors, 18 routes
- Clerk auth with auto-provisioning (org + user created on first sign-in)
- All endpoints protected + org-isolated
- 7 tRPC routers: project, task, evidence, zone, report, audit, dashboard
- Mobile capture → review → upload → gallery flow
- PDF report generation (sync fallback when Inngest not configured)
- Audit trail for all mutations with CSV export
- PWA installable with offline capture queue

### Environment Variables Status
- **Configured:** Clerk (pk_test/sk_test), DATABASE_URL (Supabase), Clerk sign-in/up URLs
- **Placeholder:** R2 storage, Stripe, Inngest, Mapbox, Anthropic API

### API Coverage (26 implemented / 8 from spec remaining)
**Missing from CLAUDE.md spec:**
- `project.members.list/add/remove` (multi-user not yet built)
- `evidence.get` (single item), `evidence.updateNote`, `evidence.delete`
- Dashboard routes renamed: `dashboard.summary` + `dashboard.recentActivity`

---

## What to Build Next

### Revenue Blockers
1. ~~**Stripe integration**~~ — coded, uncommitted. Commit when ready to lock in.
2. **R2 storage setup** — configure Cloudflare R2 bucket for production evidence storage

### Should-Fix Before Launch
3. **Auth page branding** — logo + tagline on sign-in/sign-up
4. **Global error/404 pages** — `app/error.tsx`, `app/not-found.tsx`
5. **Breadcrumb navigation** — deep pages need way back
6. **Inngest configuration** — background report generation

### Nice-to-Have
7. Project member management (multi-user teams)
8. Evidence search by metadata
9. Standalone Gantt chart page
10. Offline queue status indicator in dashboard
11. Video playback in evidence detail
