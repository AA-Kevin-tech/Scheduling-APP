import Link from "next/link";
import { notFound } from "next/navigation";
import { EmployeeOnboardingForm } from "@/components/onboarding/employee-onboarding-form";
import { getOnboardingInviteMeta } from "@/lib/queries/employee-invite";
import { recordEmployeeInviteOpened } from "@/lib/services/employee-invite-progress";

export default async function OnboardingTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const meta = await getOnboardingInviteMeta(token);

  if (!meta.ok) {
    const msg =
      meta.reason === "used"
        ? "This onboarding link has already been used."
        : meta.reason === "expired"
          ? "This onboarding link has expired. Ask your manager to send a new invite."
          : "This onboarding link is invalid.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Onboarding unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">{msg}</p>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-sky-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  await recordEmployeeInviteOpened(token);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Complete your onboarding
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Setting up account for{" "}
          {meta.inviteDisplayName ? (
            <>
              <span className="font-medium text-slate-800">
                {meta.inviteDisplayName}
              </span>
              <span className="text-slate-500"> · </span>
            </>
          ) : null}
          <span className="font-medium text-slate-800">{meta.email}</span>
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Payroll details (tax and direct deposit) are encrypted. QuickBooks
          export will be available when your payroll team enables it.
        </p>
        <div className="mt-8">
          <EmployeeOnboardingForm
            token={token}
            defaultFirstName={meta.defaultFirstName ?? undefined}
            defaultLastName={meta.defaultLastName ?? undefined}
          />
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Already finished?{" "}
          <Link href="/login" className="text-sky-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
