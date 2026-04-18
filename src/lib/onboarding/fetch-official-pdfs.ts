import type { OfficialPdfKind } from "@/lib/onboarding/document-catalog";

const PDF_SOURCES: Record<
  OfficialPdfKind,
  { url: string; filename: string; contentType: string }
> = {
  irs_w4: {
    url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
    filename: "IRS-Form-W-4.pdf",
    contentType: "application/pdf",
  },
  uscis_i9: {
    url: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf",
    filename: "USCIS-Form-I-9.pdf",
    contentType: "application/pdf",
  },
};

const MAX_BYTES = 6 * 1024 * 1024;

export type FetchedOfficialPdf = {
  kind: OfficialPdfKind;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export async function fetchOfficialPdf(
  kind: OfficialPdfKind,
): Promise<FetchedOfficialPdf | null> {
  const meta = PDF_SOURCES[kind];
  try {
    const res = await fetch(meta.url, {
      redirect: "follow",
      headers: {
        "User-Agent": "PulseSchedulingApp/1.0 (onboarding; +https://www.irs.gov https://www.uscis.gov)",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_BYTES) {
      return null;
    }
    const buffer = Buffer.from(arrayBuf);
    return {
      kind,
      filename: meta.filename,
      contentType: meta.contentType,
      buffer,
    };
  } catch {
    return null;
  }
}
