"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { terminalSignIn } from "@/actions/time-clock";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[52px] w-full rounded-xl bg-sky-700 px-4 text-base font-medium text-white hover:bg-sky-800 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function TerminalSignInForm() {
  const router = useRouter();
  const [state, action] = useFormState(terminalSignIn, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={action} className="mx-auto max-w-md space-y-5">
      <div>
        <label
          htmlFor="pin"
          className="block text-sm font-medium text-slate-700"
        >
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          minLength={4}
          maxLength={8}
          pattern="[0-9]{4,8}"
          title="4 to 8 digits"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg tracking-widest text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>
      {state.error ? (
        <p className="text-center text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label="Continue" />
    </form>
  );
}
