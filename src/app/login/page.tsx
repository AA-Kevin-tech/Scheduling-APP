import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loginHomePath } from "@/lib/auth/roles";
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
    const dest = loginHomePath(session.user.role as UserRole);
    redirect(safeCallbackUrl(params.callbackUrl, dest));
  }

  return (
    <div className="surface-page flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-sm p-8">
        <h1 className="text-center text-xl font-semibold text-app-heading">
          Sign in
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-zinc-500">
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
