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

/** Invite link for employee self-onboarding (account, PIN, payroll profile). */
export async function sendEmployeeOnboardingInviteEmail(
  to: string,
  onboardingUrl: string,
) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn(
      "[email] Employee invite (set RESEND_API_KEY + EMAIL_FROM to send real mail):",
      { to, onboardingUrl },
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
      subject: "Complete your onboarding",
      html: `<p>You have been invited to set up your employee account.</p><p><a href="${onboardingUrl}">Complete onboarding</a></p><p>If the link does not work, copy and paste this URL:</p><p style="word-break:break-all">${onboardingUrl}</p><p>This link expires in seven days. If you did not expect this email, you can ignore it.</p>`,
    }),
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
