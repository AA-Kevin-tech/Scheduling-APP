import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 16;

function vaultKey(): Buffer {
  const raw = process.env.PAYROLL_VAULT_KEY?.trim();
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
      throw new Error("PAYROLL_VAULT_KEY must be 32 bytes, base64-encoded.");
    }
    return buf;
  }
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Set PAYROLL_VAULT_KEY (32-byte base64) or AUTH_SECRET for payroll vault encryption.",
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production requires PAYROLL_VAULT_KEY (32-byte base64) for payroll data encryption.",
    );
  }
  return scryptSync(secret, "pulse-payroll-vault", 32);
}

export type PayrollVaultPayload = {
  ssn: string;
  federalFilingStatus: string;
  federalDependentsAmount?: string;
  federalExtraWithholding?: string;
  stateCode?: string;
  stateAllowancesOrNotes?: string;
  stateExtraWithholding?: string;
  directDeposits: Array<{
    bankName?: string;
    routingNumber: string;
    accountNumber: string;
    accountType: "checking" | "savings";
  }>;
};

export function encryptPayrollVaultPayload(payload: PayrollVaultPayload): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = vaultKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptPayrollVaultPayload(parts: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): PayrollVaultPayload {
  const key = vaultKey();
  const iv = Buffer.from(parts.iv, "base64");
  const authTag = Buffer.from(parts.authTag, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(parts.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString("utf8")) as PayrollVaultPayload;
}
