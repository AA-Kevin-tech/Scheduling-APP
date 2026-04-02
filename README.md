# Austin Aquarium Scheduling

Production-oriented staff scheduling for the Austin Aquarium: multi-department scheduling, shifts, swaps (with rules and audit), and manager workflows. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, and **PostgreSQL**.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local Docker, or Railway Postgres)

## Local setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your Postgres connection string. Generate `AUTH_SECRET` (e.g. `openssl rand -base64 32`).

3. **Database**

   The repo includes an initial migration under `prisma/migrations/`. Apply it, then seed:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

   For active schema development you can use `npx prisma migrate dev` instead of `deploy`.

   Default seed uses `SEED_PASSWORD` or `SEED_ADMIN_PASSWORD` (if set), otherwise `changeme`, for all sample users. The seed creates seven departments (Attendant + Lead roles each), zones under Guest Services, sample coverage rules and hour limits (including one department-role limit), locations, and users: admin, manager, and three employees (multi- and single-department).

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with seeded accounts:

   - `admin@austin-aquarium.local`
   - `manager@austin-aquarium.local`
   - `alex@austin-aquarium.local` / `sam@austin-aquarium.local` (employees)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` (prototyping only) |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio |

## Railway deployment

1. **Create a Railway project** and add a **PostgreSQL** plugin. Copy `DATABASE_URL` from the Postgres service.

2. **Connect GitHub** and deploy this repo as a **Node** service with:

   - **Build command:** `npm run build`
   - **Start command:** `npm run start` (or `npx prisma migrate deploy && npm run start` if you apply migrations on boot — see below)

3. **Environment variables** on the Railway service:

   | Variable | Notes |
   |----------|--------|
   | `DATABASE_URL` | From Railway Postgres (same value as local format) |
   | `AUTH_SECRET` | Strong random string (server-only) |
   | `AUTH_URL` | Public URL of the app, e.g. `https://your-app.up.railway.app` |
   | `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` if you use it in client code for links |
   | `MIN_REST_MINUTES` | Optional; minimum rest between shifts for swap/assignment validation (default 480) |

   Do **not** expose secrets with `NEXT_PUBLIC_`. Only non-sensitive values belong in `NEXT_PUBLIC_*`.

4. **Migrations**

   - Preferred: run migrations in CI or a **release command** / one-off job: `npx prisma migrate deploy`.
   - Alternatively: `start` script `npx prisma migrate deploy && npm run start` so deploys apply migrations before serving (acceptable for small teams; watch for concurrent deploys).

5. **Health check**

   Railway can use `GET /api/health` — returns `{ ok: true, db: "up" }` when the database is reachable.

## Project layout

- `src/app/` — App Router pages (employee vs manager areas, auth, API routes)
- `src/auth.ts` — Auth.js (NextAuth v5) configuration
- `src/lib/` — DB client, validation helpers, shared utilities
- `prisma/schema.prisma` — Data model
- `prisma/seed.ts` — Sample departments and users

## Phases

**Phase 1** — Scaffolding, auth, schema, shells, swap-validation utilities, seed, deployment docs.

**Phase 2** — Scheduling core:

- Shifts: create (with optional weekly materialization for `repeatWeeks`), edit, delete; assignments with qualification + overlap checks; manager override with reason + audit.
- Manager **schedule board** (`/manager/schedule`) with week navigation and filters by department and role.
- **Coverage** view (`/manager/coverage`) vs `CoverageRule` minimums (per day × department).
- **Employees** and **Departments** directory (read-focused).
- Employee **my schedule** and **availability** CRUD.
- **API:** `GET /api/v1/shifts?from=&to=&departmentId=&roleId=` — managers see full schedule; employees see only their shifts (session cookie).

**Phase 3** — Swap engine and rules:

- **Validation:** qualification, weekly/daily hour caps (`HourLimit`), minimum rest between shifts (`MIN_REST_MINUTES`, default 480).
- **Flows:** one-way and two-way swap requests; target accept/reject; manager approve/deny with optional override reason; full swap execution in one transaction.
- **Eligible staff:** manager shift detail suggests who can take the shift under current rules.

**Phase 4** — Workflows and UI:

- **Employee:** swap requests and incoming actions, profile, notifications (Alerts).
- **Manager:** swap queue, audit log, notifications; dashboards surface unassigned shifts, pending swaps, and coverage gaps.

**Phase 5** — Polish:

- **Refresh:** `RefreshBridge` polls `router.refresh()` (~45s) on employee and manager layouts so open tabs pick up schedule/swap changes without manual reload.
- **Mobile:** touch-friendly nav and home links; manager mobile nav shows all sections (horizontal scroll).

**Phase 6** — Time off:

- **Employee:** request time off (start/end, optional reason); list history; cancel while `PENDING`.
- **Manager:** queue at `/manager/time-off` with overlap context (how many assigned shifts intersect the window); approve or deny; notifications to staff on decision.
- **Managers** are notified on new requests; **audit** entries for create / cancel / approve / deny.

## License

Private — Austin Aquarium internal use.
