"use client";

import type { ThemePreference } from "@prisma/client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { themePreferenceToNextTheme } from "@/lib/theme-preference";

type Props = {
  children: React.ReactNode;
  /** Server session value so first paint matches stored preference. */
  themePreference?: ThemePreference | null;
};

export function Providers({ children, themePreference }: Props) {
  const defaultTheme = themePreference
    ? themePreferenceToNextTheme(themePreference)
    : "system";

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme={defaultTheme}
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
