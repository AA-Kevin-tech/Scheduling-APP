/**
 * Onboarding document rows for invite emails (federal + Texas employer compliance).
 * These are guidance and commonly used government forms; not legal advice.
 */

export type OfficialPdfKind = "irs_w4" | "uscis_i9";

export type OnboardingDocumentRow = {
  id: string;
  label: string;
  /** Shown under the label in the invite UI */
  help: string;
  /** When set, the app can attach the current PDF from a government URL if the row is selected and no file is uploaded. */
  fetchPdf?: OfficialPdfKind;
  /** When true, selected rows add official links into {{complianceLinksHtml}} */
  includeComplianceLinks: boolean;
};

export const ONBOARDING_DOCUMENT_ROWS: OnboardingDocumentRow[] = [
  {
    id: "OFFICIAL_IRS_W4",
    label: "IRS Form W-4 (Employee’s Withholding Certificate)",
    help: "Federal income tax withholding. Texas has no state income tax, so a separate state withholding form is not required for Texas residency.",
    fetchPdf: "irs_w4",
    includeComplianceLinks: true,
  },
  {
    id: "OFFICIAL_USCIS_I9",
    label: "USCIS Form I-9 (Employment Eligibility Verification)",
    help: "Federal form used to verify identity and employment authorization for all U.S. hires.",
    fetchPdf: "uscis_i9",
    includeComplianceLinks: true,
  },
  {
    id: "TX_OAG_NEW_HIRE",
    label: "Texas new hire reporting (Office of the Attorney General)",
    help: "Texas employers must report new hires to the OAG; use the portal and forms for your reporting process.",
    includeComplianceLinks: true,
  },
  {
    id: "TX_TWC_PAYDAY",
    label: "Texas Payday Law / wage rights (Texas Workforce Commission)",
    help: "Wage payment rules, final pay, and wage claims are administered by TWC.",
    includeComplianceLinks: true,
  },
  {
    id: "TX_TDI_WORKERS_COMP",
    label: "Texas workers’ compensation notices (Texas Department of Insurance)",
    help: "Employers must provide appropriate workers’ compensation coverage or non-coverage notices to employees.",
    includeComplianceLinks: true,
  },
  {
    id: "FED_DOL_MARKETPLACE",
    label: "Health Insurance Marketplace coverage notice (DOL/CMS model notices)",
    help: "Federal notice on Marketplace coverage options and premium tax credits (model English/Spanish notices from DOL/CMS).",
    includeComplianceLinks: true,
  },
];

export const ONBOARDING_DOCUMENT_IDS = new Set(
  ONBOARDING_DOCUMENT_ROWS.map((r) => r.id),
);

export type OnboardingDocSelectionsPayload = {
  selectedIds: string[];
};

export function parseOnboardingDocSelectionsJson(
  raw: string | null | undefined,
): OnboardingDocSelectionsPayload | null {
  if (raw == null || !String(raw).trim()) return { selectedIds: [] };
  try {
    const v = JSON.parse(String(raw)) as unknown;
    if (!v || typeof v !== "object") return null;
    const selectedIds = (v as { selectedIds?: unknown }).selectedIds;
    if (!Array.isArray(selectedIds)) return null;
    const ids = selectedIds.filter((x): x is string => typeof x === "string");
    return { selectedIds: [...new Set(ids)].filter((id) => ONBOARDING_DOCUMENT_IDS.has(id)) };
  } catch {
    return null;
  }
}

type ComplianceLink = { label: string; href: string };

const COMPLIANCE_LINKS_BY_ROW: Record<string, ComplianceLink[]> = {
  OFFICIAL_IRS_W4: [
    {
      label: "IRS — About Form W-4",
      href: "https://www.irs.gov/forms-pubs/about-form-w-4",
    },
  ],
  OFFICIAL_USCIS_I9: [
    {
      label: "USCIS — Form I-9 overview",
      href: "https://www.uscis.gov/i-9",
    },
  ],
  TX_OAG_NEW_HIRE: [
    {
      label: "Texas OAG — Employer services (new hire reporting)",
      href: "https://www.texasattorneygeneral.gov/child-support/services-employers-newhire-reporting",
    },
    {
      label: "Texas OAG — New hire reporting forms",
      href: "https://employer.oag.texas.gov/s/new-hire-forms",
    },
  ],
  TX_TWC_PAYDAY: [
    {
      label: "TWC — Texas Payday Law",
      href: "https://www.twc.texas.gov/programs/wage-claims/texas-payday-law",
    },
    {
      label: "TWC — New hire reporting (unemployment tax program)",
      href: "https://www.twc.texas.gov/programs/unemployment-tax/topic-new-hire-reporting",
    },
  ],
  TX_TDI_WORKERS_COMP: [
    {
      label: "TDI — Workers’ compensation for employers",
      href: "https://www.tdi.texas.gov/wc/employer/index.html",
    },
    {
      label: "TDI — Employee notice / five basic rights",
      href: "https://www.tdi.texas.gov/wc/employer/send5rights.html",
    },
  ],
  FED_DOL_MARKETPLACE: [
    {
      label: "DOL — ACA notices for employers (model Marketplace notices)",
      href: "https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers",
    },
  ],
};

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** HTML fragment inserted into templates as {{complianceLinksHtml}} */
export function buildComplianceLinksHtml(selectedIds: string[]): string {
  const ids = [...new Set(selectedIds)].filter((id) =>
    ONBOARDING_DOCUMENT_IDS.has(id),
  );
  if (ids.length === 0) return "";

  const blocks: string[] = [];
  for (const id of ids) {
    const row = ONBOARDING_DOCUMENT_ROWS.find((r) => r.id === id);
    if (!row?.includeComplianceLinks) continue;
    const links = COMPLIANCE_LINKS_BY_ROW[id];
    if (!links?.length) continue;
    const lis = links
      .map(
        (l) =>
          `<li><a href="${escapeAttr(l.href)}">${escapeAttr(l.label)}</a></li>`,
      )
      .join("");
    blocks.push(
      `<div style="margin-bottom:12px"><p style="margin:0 0 6px;font-weight:600">${escapeAttr(row.label)}</p><ul style="margin:0;padding-left:18px">${lis}</ul></div>`,
    );
  }
  if (blocks.length === 0) return "";
  return `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0"><p style="margin:0 0 8px;font-weight:600">Reference links (official sources)</p>${blocks.join("")}<p style="margin:8px 0 0;font-size:12px;color:#64748b">Confirm each requirement with your legal or HR advisor. Government forms change; use the latest version from the agency site when in doubt.</p></div>`;
}
