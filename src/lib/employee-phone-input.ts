/** Normalize contact phone for `Employee.phone` (flexible string, not strict E.164). */
export function normalizeEmployeePhoneInput(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > 40) return null;
  if (!/^[\d\s\-+().]+$/.test(t)) return null;
  return t;
}

export type PhoneFormValidation =
  | { ok: true; phone: string | null }
  | { ok: false; error: string };

export function validateEmployeePhoneFormValue(raw: string): PhoneFormValidation {
  if (raw.length > 40) {
    return { ok: false, error: "Phone number is too long." };
  }
  const phone = normalizeEmployeePhoneInput(raw);
  if (phone === null && raw.trim() !== "") {
    return {
      ok: false,
      error:
        "Use digits and common phone symbols only (spaces, dashes, +, parentheses).",
    };
  }
  return { ok: true, phone };
}
