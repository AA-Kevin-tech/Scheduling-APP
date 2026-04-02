import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Forgot password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          We will email you a reset link if an account exists for that address.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-sky-700 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
