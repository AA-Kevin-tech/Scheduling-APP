import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessManagerRoutes } from "@/lib/auth/roles";
import {
  getRequestOrigin,
  isLoopbackOrigin,
} from "@/lib/request-origin";
import { getTerminalCookieState } from "@/lib/terminal/server-state";
import { TerminalSetupForm } from "@/components/terminal/terminal-setup-form";

export const dynamic = "force-dynamic";

export default async function TerminalSetupPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/terminal/setup");
  }
  if (!canAccessManagerRoutes(session.user.role as UserRole)) {
    redirect("/employee");
  }

  const { kioskActive } = await getTerminalCookieState();

  const envBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "").trim() || null;
  const requestOrigin = await getRequestOrigin();
  const baseForTerminal = requestOrigin ?? envBase;
  const employeeTerminalUrl = baseForTerminal
    ? `${baseForTerminal}/terminal`
    : null;
  const showLoopbackTip =
    employeeTerminalUrl != null && isLoopbackOrigin(employeeTerminalUrl);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href="/manager"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Manager
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-zinc-100">
          Time clock terminal
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          Configure the shared computer employees use to clock in and out. After you
          lock this browser, employees open <span className="font-mono">/terminal</span>{" "}
          and sign in with the time clock PIN you set on each employee&apos;s profile
          (no account password).
        </p>
      </div>

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">This browser</h2>
        <div className="mt-4">
          <TerminalSetupForm kioskActive={kioskActive} />
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Employee URL</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          After locking, bookmark or set the home page to:
        </p>
        <p className="mt-2 break-all font-mono text-sm text-slate-900 dark:text-zinc-100">
          {employeeTerminalUrl ?? (
            <span className="text-amber-900">
              Set{" "}
              <span className="font-mono">NEXT_PUBLIC_APP_URL</span> so this link
              can be shown.
            </span>
          )}
        </p>
        {showLoopbackTip ? (
          <p className="mt-2 text-xs text-amber-800">
            <span className="font-mono">localhost</span> only works on this
            computer. For a shared time clock PC, open this setup page using that
            machine&apos;s LAN IP or hostname (or set{" "}
            <span className="font-mono">NEXT_PUBLIC_APP_URL</span> to your public
            site URL).
          </p>
        ) : null}
      </section>
    </div>
  );
}
