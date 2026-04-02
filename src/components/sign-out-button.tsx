"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "text-sm text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
      }
    >
      Sign out
    </button>
  );
}
