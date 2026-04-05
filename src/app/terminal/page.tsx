import { getTerminalDashboard } from "@/lib/queries/time-clock-dashboard";
import { getTerminalCookieState } from "@/lib/terminal/server-state";
import { TerminalDashboardView } from "@/components/terminal/terminal-dashboard";
import { TerminalSignInForm } from "@/components/terminal/terminal-sign-in-form";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const { kioskActive, employeeId } = await getTerminalCookieState();

  if (!kioskActive) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8">
          <h1 className="text-xl font-semibold text-amber-950">
            Kiosk is not activated
          </h1>
          <p className="mt-3 text-sm text-amber-900/90">
            A manager must open{" "}
            <span className="font-mono text-amber-950">/terminal/setup</span> on
            this computer and lock this browser as the time clock terminal.
          </p>
        </div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Clock in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your work email or employee ID and password.
          </p>
        </div>
        <TerminalSignInForm />
      </div>
    );
  }

  const dash = await getTerminalDashboard(employeeId);
  if (!dash) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <p className="text-slate-700">Session expired. Sign in again.</p>
        <TerminalSignInForm />
      </div>
    );
  }

  return <TerminalDashboardView dash={dash} />;
}
