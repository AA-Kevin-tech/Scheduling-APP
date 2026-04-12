"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  lockTimeClockTerminal,
  unlockTimeClockTerminal,
} from "@/actions/time-clock";

function SubmitLock({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function TerminalSetupForm({ kioskActive }: { kioskActive: boolean }) {
  const router = useRouter();
  const [lockState, lockAction] = useFormState(lockTimeClockTerminal, {});
  const [unlockState, unlockAction] = useFormState(unlockTimeClockTerminal, {});

  useEffect(() => {
    if (lockState.ok || unlockState.ok) {
      router.refresh();
    }
  }, [lockState.ok, unlockState.ok, router]);

  return (
    <div className="space-y-4">
      {kioskActive ? (
        <form action={unlockAction} className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-700 dark:text-zinc-300">
            This browser is locked as a time clock kiosk.
          </p>
          <SubmitLock label="Unlock kiosk" />
          {unlockState.error ? (
            <p className="text-sm text-red-700">{unlockState.error}</p>
          ) : null}
        </form>
      ) : (
        <form action={lockAction} className="space-y-2">
          <p className="text-sm text-slate-700 dark:text-zinc-300">
            Use this on the computer that should only be used for clock in and
            clock out. Anyone can then open{" "}
            <span className="font-mono">/terminal</span> on this machine.
          </p>
          <SubmitLock label="Lock this browser as time clock" />
          {lockState.error ? (
            <p className="text-sm text-red-700">{lockState.error}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
