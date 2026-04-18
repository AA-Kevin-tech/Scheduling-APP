import { Buffer } from "node:buffer";
import {
  ONBOARDING_DOCUMENT_ROWS,
  type OnboardingDocSelectionsPayload,
} from "@/lib/onboarding/document-catalog";
import { fetchOfficialPdf } from "@/lib/onboarding/fetch-official-pdfs";

const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const MAX_EXTRA_FILES = 8;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const ALLOWED_EXT = /\.(pdf|doc|docx|png|jpe?g)$/i;

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\s-]+/g, "_").trim().slice(0, 180);
  return base || "attachment.bin";
}

function isAllowedUpload(file: File, buffer: Buffer): boolean {
  if (buffer.length === 0 || buffer.length > MAX_BYTES_PER_FILE) return false;
  const ct = (file.type || "").toLowerCase();
  if (ALLOWED_MIME.has(ct)) return true;
  if (!ct && ALLOWED_EXT.test(file.name || "")) return true;
  return false;
}

function uniqueFilename(desired: string, used: Set<string>): string {
  const name = sanitizeFilename(desired);
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  let candidate = `${stem}-${i}${ext}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export type PreparedInviteAttachment = {
  docKey: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type BuildInviteAttachmentsResult =
  | { ok: true; attachments: PreparedInviteAttachment[] }
  | { ok: false; error: string };

/**
 * Builds attachment buffers for the invite email and DB rows from form selections + uploads.
 */
export async function buildInviteAttachmentsFromFormData(
  formData: FormData,
  selections: OnboardingDocSelectionsPayload,
): Promise<BuildInviteAttachmentsResult> {
  const selected = new Set(selections.selectedIds);
  const usedNames = new Set<string>();
  const out: PreparedInviteAttachment[] = [];
  let total = 0;

  function pushRow(row: PreparedInviteAttachment): string | null {
    if (total + row.sizeBytes > MAX_TOTAL_BYTES) {
      return "Attachments exceed the maximum total size for one email.";
    }
    total += row.sizeBytes;
    out.push(row);
    return null;
  }

  for (const row of ONBOARDING_DOCUMENT_ROWS) {
    const entry = formData.get(`docFile_${row.id}`);
    const hasFile =
      entry &&
      typeof entry !== "string" &&
      typeof (entry as Blob).arrayBuffer === "function" &&
      (entry as File).size > 0;

    if (hasFile) {
      const file = entry as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!isAllowedUpload(file, buffer)) {
        return {
          ok: false,
          error: `Unsupported or oversized file for “${row.label}”. Use PDF, Word, or PNG/JPEG up to 5 MB each.`,
        };
      }
      const fileName = uniqueFilename(file.name || "document.pdf", usedNames);
      const err = pushRow({
        docKey: row.id,
        fileName,
        contentType: file.type || "application/octet-stream",
        sizeBytes: buffer.length,
        buffer,
      });
      if (err) return { ok: false, error: err };
      continue;
    }

    if (selected.has(row.id) && row.fetchPdf) {
      const fetched = await fetchOfficialPdf(row.fetchPdf);
      if (!fetched) {
        return {
          ok: false,
          error: `Could not download the official PDF for “${row.label}”. Try again, upload a copy manually, or deselect that row.`,
        };
      }
      const fileName = uniqueFilename(fetched.filename, usedNames);
      const err = pushRow({
        docKey: row.id,
        fileName,
        contentType: fetched.contentType,
        sizeBytes: fetched.buffer.length,
        buffer: fetched.buffer,
      });
      if (err) return { ok: false, error: err };
    }
  }

  const extras = formData.getAll("extraAttachments");
  let extraCount = 0;
  for (const entry of extras) {
    if (
      !entry ||
      typeof entry === "string" ||
      typeof (entry as Blob).arrayBuffer !== "function"
    ) {
      continue;
    }
    const file = entry as File;
    if (!file.size) continue;
    extraCount += 1;
    if (extraCount > MAX_EXTRA_FILES) {
      return {
        ok: false,
        error: `Too many extra files (max ${MAX_EXTRA_FILES}).`,
      };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isAllowedUpload(file, buffer)) {
      return {
        ok: false,
        error:
          "Each extra attachment must be PDF, Word, or PNG/JPEG and under 5 MB.",
      };
    }
    const fileName = uniqueFilename(file.name || "attachment.pdf", usedNames);
    const err = pushRow({
      docKey: null,
      fileName,
      contentType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
      buffer,
    });
    if (err) return { ok: false, error: err };
  }

  return { ok: true, attachments: out };
}
