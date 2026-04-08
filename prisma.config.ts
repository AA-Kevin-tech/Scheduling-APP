import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI config (replaces deprecated `package.json#prisma`).
 * With a config file present, Prisma does not auto-load `.env`; `dotenv/config`
 * restores local `npx prisma *` behavior. Connection URL stays in `schema.prisma` (ORM 6.x).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
});
