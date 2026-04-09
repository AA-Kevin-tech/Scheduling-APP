import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function healthAuthOk(req: Request): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const header = req.headers.get("x-health-check-secret")?.trim() ?? "";
  return bearer === secret || header === secret;
}

export async function GET(req: Request) {
  if (!healthAuthOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
