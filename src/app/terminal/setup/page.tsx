import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTerminalCookieState } from "@/lib/terminal/server-state";
import { TerminalSetupForm } from "@/components/terminal/terminal-setup-form";

export const dynamic = "force-dynamic";

export default async function TerminalSetupPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/terminal/setup");
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect("/employee");
  }

  const { kioskActive } = await getTerminalCookieState();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href="/manager"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Manager
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Time clock terminal
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure the shared computer employees use to clock in and out. After you
          lock this browser, employees open <span className="font-mono">/terminal</span>{" "}
          and sign in with the time clock PIN you set on each employee&apos;s profile
          (no account password).
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">This browser</h2>
        <div className="mt-4">
          <TerminalSetupForm kioskActive={kioskActive} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Employee URL</h2>
        <p className="mt-2 text-sm text-slate-600">
          After locking, bookmark or set the home page to:
        </p>
        <p className="mt-2 font-mono text-sm text-slate-900">
          {process.env.NEXT_PUBLIC_APP_URL ?? ""}/terminal
        </p>
        {!process.env.NEXT_PUBLIC_APP_URL ? (
          <p className="mt-2 text-xs text-amber-800">
            Set{" "}
            <span className="font-mono">NEXT_PUBLIC_APP_URL</span> in production
            so this link is correct.
          </p>
        ) : null}
      </section>
    </div>
  );
}
