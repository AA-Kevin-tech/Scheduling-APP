import Link from "next/link";
import { firstSearchParam } from "@/lib/search-params";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const raw = await searchParams;
  const token = firstSearchParam(raw.token);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">Missing or invalid reset link.</p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm text-sky-700 hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Set new password
        </h1>
        <ResetPasswordForm token={token} />
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-sky-700 hover:underline">
            ← Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
