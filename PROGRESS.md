# SiteProof — Progress Log

## Phase 1: Core Loop

### Completed

#### 1. Scaffold (Next.js + Tailwind + shadcn/ui + Clerk + Drizzle)
- Next.js 16 with TypeScript strict mode, App Router, Turbopack
- Tailwind CSS v4 + shadcn/ui v4 (Base UI) — 14 components installed: button, card, input, label, form, dialog, table, select, textarea, badge, separator, dropdown-menu, avatar, sheet, sonner
- Clerk auth middleware + sign-in/sign-up pages (stubbed — works without API keys)
- Drizzle ORM with postgres.js driver
- tRPC v11 with superjson transformer, React Query integration
- Full directory structure matching the spec in CLAUDE.md
- Environment variables templated in `.env.example`

#### 2. Database Schema + Migrations
- All 9 tables defined in `src/server/db/schema.ts`:
  - `organisations`, `users`, `projects`, `projectMembers`, `tasks`, `gpsZones`, `evidence`, `evidenceLinks`, `reports`, `auditLog`
- Relations defined between all tables
- Zod insert/select schemas exported via drizzle-zod
- Initial migration generated at `src/server/db/migrations/0000_windy_zzzax.sql`
- DB connection with globalThis caching for dev hot-reload

#### 3. Project CRUD
- tRPC project router: `list`, `get`, `create`, `update`, `archive`
- Pages:
  - `/projects` — list with loading skeleton + empty state
  - `/projects/new` — create form with Zod validation
  - `/projects/[projectId]` — detail view with sub-page navigation
  - `/projects/[projectId]/settings` — edit form pre-populated with current data
- Components: `ProjectCard`, `ProjectForm` (react-hook-form + zod)
- Dashboard home page with quick action links
- Sidebar navigation (desktop) + mobile sheet nav

### What's Working
- `npm run dev` starts cleanly
- TypeScript compiles with zero errors (`npx tsc --noEmit`)
- `npx drizzle-kit generate` produces valid migration SQL
- All pages render (project CRUD requires a running database for data)
- Auth is stubbed — tRPC context has `userId: null`, project routes use `publicProcedure`

### Known Limitations
- No real database connected yet — pages show empty/error states without PostgreSQL
- Clerk auth stubbed — no actual sign-in/sign-up flow
- Project router uses hardcoded org ID (`00000000-...`) in create mutation
- Next.js 16 shows deprecation warning for `middleware.ts` (prefers `proxy` convention)
- Seed script exists but requires a running database

---

## What to Build Next (Phase 1 remaining)

### 4. Manual Task List
- Task tRPC router: `list`, `create`, `update`, `delete`, `reorder`
- `/projects/[projectId]/tasks` page with tree-structured task list
- Task form (name, description, dates, progress %, parent task)
- Drag-to-reorder with sort_order field

### 5. Evidence Upload
- Presigned URL generation for R2 (storage service)
- Evidence tRPC router: `getUploadUrl`, `confirm`, `list`, `get`, `delete`
- EXIF extraction (Sharp + exifr)
- Thumbnail generation
- Upload queue component

### 6. Evidence Gallery
- `/projects/[projectId]/evidence` page
- Grid view with thumbnails
- Filters (by date, task, uploader)
- Evidence detail view (full image, metadata, GPS coords)

### 7. Manual Task Linking
- Evidence-to-task link/unlink via dropdown
- evidence_links join table (already in schema)
- Link method tracking (manual)
