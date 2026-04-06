import Link from "next/link";
import { disconnectQuickBooksAction } from "@/actions/admin/quickbooks";
import { isIntuitOAuthConfigured } from "@/lib/integrations/intuit-oauth";
import { getQuickBooksIntegrationSummary } from "@/lib/queries/quickbooks";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const qbConnected = firstParam(sp.qb_connected) === "1";
  const qbDisconnected = firstParam(sp.qb_disconnected) === "1";
  const qbError = firstParam(sp.qb_error);

  const oauthReady = isIntuitOAuthConfigured();
  const qb = await getQuickBooksIntegrationSummary();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect external services used by HR and payroll. Only administrators
          can authorize or remove connections.
        </p>
      </div>

      <section
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="qb-heading"
      >
        <h2 id="qb-heading" className="text-base font-semibold text-slate-900">
          QuickBooks Online
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Link your company&apos;s QuickBooks Online company file so approved
          time can be exported to QuickBooks Payroll in a later step. This uses
          Intuit&apos;s secure sign-in; Pulse never sees your QuickBooks
          password.
        </p>

        {qbConnected ? (
          <p
            className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            QuickBooks is connected. You can close the pay-period export flow when
            it is available.
          </p>
        ) : null}
        {qbDisconnected ? (
          <p
            className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800"
            role="status"
          >
            QuickBooks was disconnected.
          </p>
        ) : null}
        {qbError ? (
          <p
            className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="alert"
          >
            Connection issue: {qbError}
          </p>
        ) : null}

        {!oauthReady ? (
          <p className="mt-4 text-sm text-slate-600">
            QuickBooks is not enabled on this server yet. Add{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              INTUIT_CLIENT_ID
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              INTUIT_CLIENT_SECRET
            </code>{" "}
            from the Intuit Developer portal (see README), redeploy, and add the
            redirect URI{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              …/api/integrations/quickbooks/callback
            </code>
            .
          </p>
        ) : null}

        {qb ? (
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-slate-700">Company</dt>
              <dd className="text-slate-900">
                {qb.companyName ?? "—"}
                <span className="ml-2 text-slate-500">
                  (realm {qb.realmId})
                </span>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-slate-700">Connected</dt>
              <dd className="text-slate-900">
                {qb.connectedAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-slate-700">Access token expires</dt>
              <dd className="text-slate-900">
                {qb.accessTokenExpiresAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            {qb.scope ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-slate-700">Scopes</dt>
                <dd className="break-all text-slate-700">{qb.scope}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {oauthReady ? (
            <a
              href="/api/integrations/quickbooks/connect"
              className="inline-flex items-center justify-center rounded-md bg-[#2ca01c] px-4 py-2 text-sm font-medium text-white hover:bg-[#238016]"
            >
              {qb ? "Reconnect QuickBooks" : "Connect QuickBooks"}
            </a>
          ) : null}
          {qb ? (
            <form action={disconnectQuickBooksAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Disconnect
              </button>
            </form>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Use a QuickBooks Online company with Payroll (US) that matches your
          Intuit app settings. Sandbox companies use{" "}
          <code className="rounded bg-slate-100 px-1">INTUIT_USE_PRODUCTION</code>{" "}
          unset or not{" "}
          <code className="rounded bg-slate-100 px-1">true</code>.{" "}
          <Link
            href="/manager/settings"
            className="text-sky-700 hover:underline"
          >
            Manager settings
          </Link>{" "}
          lists other scheduling options.
        </p>
      </section>
    </div>
  );
}
