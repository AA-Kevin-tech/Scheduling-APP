import type { ThemePreference } from "@prisma/client";

export function themePreferenceToNextTheme(
  pref: ThemePreference,
): "light" | "dark" | "system" {
  switch (pref) {
    case "LIGHT":
      return "light";
    case "DARK":
      return "dark";
    case "SYSTEM":
    default:
      return "system";
  }
}

export function nextThemeToThemePreference(
  value: string,
): ThemePreference {
  if (value === "light") return "LIGHT";
  if (value === "dark") return "DARK";
  return "SYSTEM";
}
