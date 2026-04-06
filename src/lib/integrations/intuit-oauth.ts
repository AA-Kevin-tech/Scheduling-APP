import "server-only";

const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke";

export const DEFAULT_INTUIT_SCOPE = "com.intuit.quickbooks.accounting";

export type IntuitTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type: string;
};

export function isIntuitOAuthConfigured(): boolean {
  return Boolean(
    process.env.INTUIT_CLIENT_ID?.trim() &&
      process.env.INTUIT_CLIENT_SECRET?.trim(),
  );
}

function getAuthBaseUrl(): string {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!authUrl?.trim()) {
    throw new Error(
      "Set AUTH_URL or NEXT_PUBLIC_APP_URL for QuickBooks OAuth redirects.",
    );
  }
  return authUrl.replace(/\/$/, "");
}

export function getQuickBooksRedirectUri(): string {
  if (process.env.INTUIT_REDIRECT_URI?.trim()) {
    return process.env.INTUIT_REDIRECT_URI.trim();
  }
  return `${getAuthBaseUrl()}/api/integrations/quickbooks/callback`;
}

export function getQuickBooksClientCredentials(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.INTUIT_CLIENT_ID?.trim();
  const clientSecret = process.env.INTUIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing INTUIT_CLIENT_ID or INTUIT_CLIENT_SECRET.");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: getQuickBooksRedirectUri(),
  };
}

export function buildQuickBooksAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getQuickBooksClientCredentials();
  const scope =
    process.env.INTUIT_SCOPES?.trim() || DEFAULT_INTUIT_SCOPE;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeAuthorizationCode(
  code: string,
): Promise<IntuitTokenResponse> {
  const { clientId, clientSecret, redirectUri } =
    getQuickBooksClientCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intuit token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as IntuitTokenResponse;
}

export async function refreshQuickBooksAccessToken(
  refreshToken: string,
): Promise<IntuitTokenResponse> {
  const { clientId, clientSecret } = getQuickBooksClientCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intuit token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as IntuitTokenResponse;
}

export async function revokeIntuitToken(token: string): Promise<void> {
  const { clientId, clientSecret } = getQuickBooksClientCredentials();
  const body = new URLSearchParams({ token });
  const res = await fetch(REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(
      "Intuit token revoke failed (connection still cleared locally):",
      res.status,
      text,
    );
  }
}

export function quickBooksApiBaseUrl(): string {
  return process.env.INTUIT_USE_PRODUCTION === "true"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export async function fetchQuickBooksCompanyName(
  realmId: string,
  accessToken: string,
): Promise<string | null> {
  const base = quickBooksApiBaseUrl();
  const url = `${base}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      CompanyInfo?: { CompanyName?: string };
    };
    const name = json.CompanyInfo?.CompanyName;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}
