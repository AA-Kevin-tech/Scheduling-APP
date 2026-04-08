import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdminRoutes } from "@/lib/auth/roles";
import {
  DEFAULT_INTUIT_SCOPE,
  exchangeAuthorizationCode,
  fetchQuickBooksCompanyName,
  isIntuitOAuthConfigured,
} from "@/lib/integrations/intuit-oauth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const STATE_COOKIE = "qb_oauth_state";
const SINGLETON_ID = "singleton";

function integrationsUrl(path: string): URL {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return new URL(path, base.replace(/\/$/, ""));
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !canAccessAdminRoutes(session.user.role as UserRole)) {
    return NextResponse.redirect(
      integrationsUrl("/admin/integrations?qb_error=forbidden"),
    );
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      integrationsUrl(
        `/admin/integrations?qb_error=${encodeURIComponent(desc)}`,
      ),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      integrationsUrl("/admin/integrations?qb_error=missing_callback_params"),
    );
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!expected || expected !== state) {
    return NextResponse.redirect(
      integrationsUrl("/admin/integrations?qb_error=invalid_state"),
    );
  }

  if (!isIntuitOAuthConfigured()) {
    return NextResponse.redirect(
      integrationsUrl("/admin/integrations?qb_error=not_configured"),
    );
  }

  let tokens: Awaited<ReturnType<typeof exchangeAuthorizationCode>>;
  try {
    tokens = await exchangeAuthorizationCode(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return NextResponse.redirect(
      integrationsUrl(`/admin/integrations?qb_error=${encodeURIComponent(msg)}`),
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const scope = process.env.INTUIT_SCOPES?.trim() || DEFAULT_INTUIT_SCOPE;
  const companyName = await fetchQuickBooksCompanyName(
    realmId,
    tokens.access_token,
  );

  await prisma.quickBooksConnection.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: expiresAt,
      scope,
      companyName,
      connectedByUserId: session.user.id,
    },
    update: {
      realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: expiresAt,
      scope,
      companyName,
      connectedByUserId: session.user.id,
      connectedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "QUICKBOOKS",
    entityId: SINGLETON_ID,
    action: "CONNECTED",
    payload: { realmId, companyName },
  });

  return NextResponse.redirect(
    integrationsUrl("/admin/integrations?qb_connected=1"),
  );
}
