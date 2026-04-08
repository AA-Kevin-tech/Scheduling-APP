import type { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdminRoutes } from "@/lib/auth/roles";
import {
  buildQuickBooksAuthorizeUrl,
  isIntuitOAuthConfigured,
} from "@/lib/integrations/intuit-oauth";

const STATE_COOKIE = "qb_oauth_state";
const STATE_MAX_AGE_SEC = 600;

function integrationsUrl(path: string): URL {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return new URL(path, base.replace(/\/$/, ""));
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccessAdminRoutes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isIntuitOAuthConfigured()) {
    return NextResponse.redirect(
      integrationsUrl("/admin/integrations?qb_error=not_configured"),
    );
  }

  let authorizeUrl: string;
  try {
    const state = randomBytes(32).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: STATE_MAX_AGE_SEC,
      path: "/",
    });
    authorizeUrl = buildQuickBooksAuthorizeUrl(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_setup_failed";
    return NextResponse.redirect(
      integrationsUrl(
        `/admin/integrations?qb_error=${encodeURIComponent(msg)}`,
      ),
    );
  }

  return NextResponse.redirect(authorizeUrl);
}
