/**
 * Sends transactional email when configured (Resend). Otherwise logs the link in development.
 * Set RESEND_API_KEY and EMAIL_FROM (e.g. "Scheduling <onboarding@yourdomain.com>").
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn(
      "[email] Password reset (set RESEND_API_KEY + EMAIL_FROM to send real mail):",
      { to, resetUrl },
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your password",
      html: `<p>Click to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${res.status} ${text}`);
  }
}

export type OnboardingInviteEmailAttachment = {
  filename: string;
  /** Base64-encoded file bytes */
  contentBase64: string;
};

const DEFAULT_ONBOARDING_SUBJECT = "Complete your onboarding";

const DEFAULT_ONBOARDING_HTML = `<p>Hi {{employeeFirstName}},</p>
<p>You have been invited to set up your employee account.</p>
<p><a href="{{onboardingUrl}}">Complete onboarding</a></p>
<p>If the link does not work, copy and paste this URL:</p>
<p style="word-break:break-all">{{onboardingUrl}}</p>
{{complianceLinksHtml}}
<p style="margin-top:16px;font-size:13px;color:#64748b">This link expires in seven days. If you did not expect this email, you can ignore it.</p>`;

/** Replace <code>{{key}}</code> placeholders (whitespace inside braces allowed). */
export function applyEmailTemplatePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(
      `\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`,
      "g",
    );
    out = out.replace(re, value);
  }
  return out;
}

export function defaultOnboardingInviteEmailHtml(): string {
  return DEFAULT_ONBOARDING_HTML;
}

export function defaultOnboardingInviteEmailSubject(): string {
  return DEFAULT_ONBOARDING_SUBJECT;
}

function sanitizePlainTextForSubject(s: string): string {
  return s.replace(/[\r\n\0]/g, "").slice(0, 4000);
}

/** Build subject + HTML for an onboarding invite; escapes values for safe HTML. */
export function buildOnboardingInviteEmailContent(opts: {
  templateSubject?: string | null;
  templateHtml?: string | null;
  onboardingUrl: string;
  firstName?: string | null;
  lastName?: string | null;
  complianceLinksHtml: string;
}): { subject: string; html: string } {
  const url = opts.onboardingUrl;
  const fn = (opts.firstName ?? "").trim() || "there";
  const ln = (opts.lastName ?? "").trim();
  const htmlVars: Record<string, string> = {
    onboardingUrl: escapeHtml(url),
    employeeFirstName: escapeHtml(fn),
    employeeLastName: escapeHtml(ln),
    complianceLinksHtml: opts.complianceLinksHtml,
  };
  const subjectVars: Record<string, string> = {
    onboardingUrl: sanitizePlainTextForSubject(url),
    employeeFirstName: sanitizePlainTextForSubject(fn),
    employeeLastName: sanitizePlainTextForSubject(ln),
    complianceLinksHtml: "",
  };
  const subjectTpl =
    opts.templateSubject?.trim() || DEFAULT_ONBOARDING_SUBJECT;
  const htmlTpl = opts.templateHtml?.trim() || DEFAULT_ONBOARDING_HTML;
  return {
    subject: applyEmailTemplatePlaceholders(subjectTpl, subjectVars),
    html: applyEmailTemplatePlaceholders(htmlTpl, htmlVars),
  };
}

export type SendEmployeeOnboardingInviteEmailInput = {
  to: string;
  onboardingUrl: string;
  firstName?: string | null;
  lastName?: string | null;
  subject: string;
  html: string;
  attachments?: OnboardingInviteEmailAttachment[];
};

/** Invite link for employee self-onboarding (account, PIN, payroll profile), with optional attachments. */
export async function sendEmployeeOnboardingInviteEmail(
  input: SendEmployeeOnboardingInviteEmailInput,
) {
  const { to, onboardingUrl, attachments = [] } = input;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn(
      "[email] Employee invite (set RESEND_API_KEY + EMAIL_FROM to send real mail):",
      {
        to,
        onboardingUrl,
        attachmentCount: attachments.length,
        attachmentNames: attachments.map((a) => a.filename),
      },
    );
    return;
  }

  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject: input.subject,
    html: input.html,
  };
  if (attachments.length > 0) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.contentBase64,
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${res.status} ${text}`);
  }
}

function appOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "";
  return base.replace(/\/$/, "");
}

/** Transactional alert (schedule, swaps, time off) when Resend is configured. */
export async function sendNotificationEmail(opts: {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  const origin = appOrigin();
  const actionLink = opts.actionUrl.startsWith("http")
    ? opts.actionUrl
    : origin
      ? `${origin}${opts.actionUrl.startsWith("/") ? "" : "/"}${opts.actionUrl}`
      : opts.actionUrl;

  if (!key || !from) {
    console.warn(
      "[email] Notification (set RESEND_API_KEY + EMAIL_FROM to send):",
      {
        to: opts.to,
        subject: opts.subject,
        actionLink,
      },
    );
    return;
  }

  const safeBody = escapeHtml(opts.body);
  const safeTitle = escapeHtml(opts.title);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: `<p><strong>${safeTitle}</strong></p><p>${safeBody.replace(/\n/g, "<br/>")}</p><p><a href="${actionLink}">Open in app</a></p><p style="color:#64748b;font-size:12px">If you did not expect this message, you can ignore it.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${res.status} ${text}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
