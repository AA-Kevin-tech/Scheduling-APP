# Pulse - Scheduling

**Pulse** is production-oriented **staff scheduling**: multi-department scheduling, shifts, swaps (with rules and audit), manager workflows, and a **kiosk time clock** with alerts for managers and admins. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, and **PostgreSQL**.

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

   Set `DATABASE_URL` to your Postgres connection string. Generate `AUTH_SECRET` (e.g. `openssl rand -base64 32`). Optional time clock and schedule variables are documented in `.env.example` (kiosk window, late/missing-in grace, weekly cap warning, default schedule timezone).

3. **Database**

   The repo includes an initial migration under `prisma/migrations/`. Apply it, then seed:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

   For active schema development you can use `npx prisma migrate dev` instead of `deploy`.

   The seeded **admin** uses its own password (set in `prisma/seed.ts`, overridable with `SEED_ADMIN_ACCOUNT_PASSWORD`). Other sample users use `SEED_PASSWORD` or `SEED_ADMIN_PASSWORD` if set, otherwise `changeme`. Seeded login emails are defined in `prisma/seed.ts`. The seed creates seven departments (Attendant + Lead roles each), zones under Guest Services, sample coverage rules and hour limits (including one department-role limit), locations, and users: admin, manager, and three employees (multi- and single-department).

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with the admin, manager, and employee accounts defined in `prisma/seed.ts` (passwords per the setup step above).

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
   | `NEXT_PUBLIC_DEFAULT_SCHEDULE_TIMEZONE` | Optional; IANA zone for the manager schedule grid and create-shift defaults (default `America/Chicago`) |
   | `TIME_CLOCK_*` | Optional; see `.env.example` — early clock-in window, late/missing-in thresholds, weekly hour-cap alert threshold, kiosk and worker session cookies |
   | `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET` | Optional; QuickBooks Online OAuth (see note below) |
   | `INTUIT_REDIRECT_URI` | Optional; defaults to `{AUTH_URL}/api/integrations/quickbooks/callback` (must match the Intuit app redirect URI exactly) |
   | `INTUIT_USE_PRODUCTION` | Optional; set to `true` for the live QuickBooks API hostname (omit for sandbox with development keys) |

   Do **not** expose secrets with `NEXT_PUBLIC_*`. Only non-sensitive values belong in `NEXT_PUBLIC_*`.

   **QuickBooks Online:** Administrators connect a company file under **Admin → Integrations**. OAuth tokens are stored in Postgres (`QuickBooksConnection`) for future pay-period export to QuickBooks Payroll; connecting does not send hours by itself. Create an app in the [Intuit Developer](https://developer.intuit.com/) portal, add the redirect URI `https://your-domain.com/api/integrations/quickbooks/callback` (local: `http://localhost:3000/api/integrations/quickbooks/callback`), set `INTUIT_CLIENT_*` and `AUTH_URL`, run migrations, then sign in as admin and use **Connect QuickBooks**. Optional: `INTUIT_SCOPES` (default `com.intuit.quickbooks.accounting`).

4. **Migrations**

   - Preferred: run migrations in CI or a **release command** / one-off job: `npx prisma migrate deploy`.
   - Alternatively: `start` script `npx prisma migrate deploy && npm run start` so deploys apply migrations before serving (acceptable for small teams; watch for concurrent deploys).

5. **Health check**

   Railway can use `GET /api/health` — returns `{ ok: true, db: "up" }` when the database is reachable.

## Project layout

- `src/app/` — App Router pages (employee vs manager areas, **`/terminal`** kiosk, auth, API routes)
- `src/auth.ts` — Auth.js (NextAuth v5) configuration
- `src/lib/` — DB client, validation helpers, shared utilities
- `prisma/schema.prisma` — Data model
- `prisma/seed.ts` — Sample departments and users

## Phases

All six phases below are **implemented in this repo**. Use the paths and API noted when verifying behavior.

**Phase 1** — Scaffolding, auth, schema, shells, swap-validation utilities, seed, deployment docs.

**Phase 2** — Scheduling core:

- Shifts: create (with optional weekly materialization for `repeatWeeks`), edit, delete; assignments enforce qualification, no double-booking, hour caps, and minimum rest (aligned with swap rules); manager override with reason + audit when rules would block the assign.
- Manager **schedule** (`/manager/schedule`): week grid in `NEXT_PUBLIC_DEFAULT_SCHEDULE_TIMEZONE` (or `America/Chicago`), filters (department, role, **staff rows**: scheduled-only vs all, name search), **empty cells** link to create a shift for that day; shift times shown in that zone.
- Each **employee** has a profile **time zone** (set when provisioning users or on **Profile**); **my schedule** (`/employee/schedule`) and **shift detail** (`/employee/shifts/[id]`) use it.
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

- **Refresh:** `RefreshBridge` polls `router.refresh()` (~45s) on employee, manager, and admin layouts so open tabs pick up schedule/swap changes without manual reload.
- **Mobile:** touch-friendly nav and home links; manager mobile nav shows all sections (horizontal scroll).

**Phase 6** — Time off:

- **Employee:** request time off (start/end, optional reason); list history; cancel while `PENDING`.
- **Manager:** queue at `/manager/time-off` with overlap context (how many assigned shifts intersect the window); approve or deny; notifications to staff on decision.
- **Managers** are notified on new requests; **audit** entries for create / cancel / approve / deny.

**Time clock (kiosk)** — Implemented alongside the scheduling model (`ShiftTimePunch` on assignments):

- **`/terminal`** — After a manager locks the browser at **`/terminal/setup`**, employees authenticate and clock in or out against their shift assignments (shared tablet / kiosk; no geofence).
- **Alerts** — **Managers** and **admins** receive in-app notifications (under **Alerts**) for late clock-in, weekly hour-limit approach or exceed (uses configured **`HourLimit`** caps), still clocked in after shift end, missing clock-in while a shift is in progress, and ended shifts with no punch. The manager **Clock issues** page (`/manager/time-clock`) lists current issues; the dashboard shows a total count. Admins can open the same page from the admin nav.
- **Configuration** — See `.env.example` for `TIME_CLOCK_EARLY_MINUTES`, `TIME_CLOCK_LATE_AFTER_MINUTES`, `TIME_CLOCK_MISSING_IN_AFTER_MINUTES`, `TIME_CLOCK_WEEKLY_CAP_WARN_PERCENT`, and kiosk/session cookie lifetime.

## License

Proprietary — **all rights reserved.** Only the copyright holder is permitted to use this code. See [`LICENSE`](./LICENSE) in the repository root. No license is granted to others (this is not open source).
