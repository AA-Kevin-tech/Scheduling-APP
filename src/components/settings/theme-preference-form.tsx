"use client";

import type { ThemePreference } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { updateThemePreference } from "@/actions/theme-preference";
import {
  nextThemeToThemePreference,
  themePreferenceToNextTheme,
} from "@/lib/theme-preference";

export function ThemePreferenceForm({
  initialPreference,
}: {
  initialPreference: ThemePreference;
}) {
  const { theme, setTheme } = useTheme();
  const { update } = useSession();
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleChange(next: "light" | "dark" | "system") {
    setTheme(next);
    const pref = nextThemeToThemePreference(next);
    startTransition(async () => {
      const result = await updateThemePreference(pref);
      if (result.ok) {
        await update({ themePreference: pref });
      }
    });
  }

  if (!mounted) {
    return (
      <div
        className="mt-3 h-10 max-w-xs animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"
        aria-hidden
      />
    );
  }

  const value = theme ?? themePreferenceToNextTheme(initialPreference);

  return (
    <div className="mt-3">
      <label htmlFor="theme-pref" className="sr-only">
        Appearance
      </label>
      <select
        id="theme-pref"
        className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={value}
        onChange={(e) =>
          handleChange(e.target.value as "light" | "dark" | "system")
        }
        disabled={pending}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">Match device</option>
      </select>
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
        Saved to your account and applied on every device you use.
      </p>
    </div>
  );
}
