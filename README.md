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

   Default seed uses `SEED_PASSWORD` or `changeme` for all sample users.

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

Phase 1 delivers scaffolding, auth, schema, shells, swap-validation utilities, seed, and deployment docs. Later phases add scheduling CRUD, swap engine, manager tooling, notifications, and mobile polish.

## License

Private — Austin Aquarium internal use.
