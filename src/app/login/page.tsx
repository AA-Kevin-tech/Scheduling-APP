import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; onboarded?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    const dest =
      session.user.role === "ADMIN"
        ? "/admin"
        : session.user.role === "MANAGER"
          ? "/manager"
          : "/employee";
    redirect(safeCallbackUrl(params.callbackUrl, dest));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Sign in
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Staff sign-in
        </p>
        {params.onboarded === "1" ? (
          <p
            className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-800"
            role="status"
          >
            Onboarding complete. Sign in with the password you just created.
          </p>
        ) : null}
        <LoginForm
          callbackUrl={safeCallbackUrl(params.callbackUrl, "/")}
        />
        <p className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="text-sky-700 hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
