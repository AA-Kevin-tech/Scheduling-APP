"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  async function handleSignOut() {
    try {
      await signOut({ redirect: false });
    } catch {
      // Still leave the app; session clear may have failed (e.g. offline).
    }
    // Same-origin navigation avoids a bad AUTH_URL/NEXTAUTH_URL host (typo → NXDOMAIN).
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={
        className ??
        "text-sm text-slate-600 dark:text-zinc-400 underline-offset-2 hover:text-slate-900 dark:hover:text-zinc-100 dark:text-zinc-100 dark:hover:text-zinc-100 dark:text-zinc-100 hover:underline"
      }
    >
      Sign out
    </button>
  );
}
