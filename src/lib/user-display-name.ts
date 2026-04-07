/** Combined display / session name from structured fields or legacy single `name`. */
export function userDisplayName(parts: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): string {
  const f = parts.firstName?.trim() ?? "";
  const l = parts.lastName?.trim() ?? "";
  const combined = [f, l].filter(Boolean).join(" ");
  if (combined) return combined;
  return parts.name?.trim() ?? "";
}

/** Defaults for forms when `firstName`/`lastName` were never set (legacy `name` only). */
export function initialFirstLastFromUser(parts: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): { firstName: string; lastName: string } {
  const hasStructured =
    (parts.firstName != null && parts.firstName.trim() !== "") ||
    (parts.lastName != null && parts.lastName.trim() !== "");
  if (hasStructured) {
    return {
      firstName: parts.firstName?.trim() ?? "",
      lastName: parts.lastName?.trim() ?? "",
    };
  }
  const n = (parts.name ?? "").trim();
  if (!n) return { firstName: "", lastName: "" };
  const i = n.indexOf(" ");
  if (i === -1) return { firstName: n, lastName: "" };
  return {
    firstName: n.slice(0, i).trim(),
    lastName: n.slice(i + 1).trim(),
  };
}
