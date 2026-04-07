import type { UserRole } from "@prisma/client";
import { sendNotificationEmail } from "@/lib/email";
import { parseToE164 } from "@/lib/phone-e164";
import { prisma } from "@/lib/db";
import { isTwilioSmsConfigured, sendSms } from "@/lib/sms";

/** In-app relative path for deep-linking by notification type and recipient role. */
export function notificationAppPath(type: string, role: UserRole): string {
  const isMgr = role === "MANAGER" || role === "ADMIN";
  if (type === "SCHEDULE_PUBLISHED") {
    return isMgr ? "/manager/schedule" : "/employee/schedule";
  }
  if (type.startsWith("SWAP")) {
    return isMgr ? "/manager/swaps" : "/employee/swaps";
  }
  if (type.startsWith("TIME_OFF")) {
    return isMgr ? "/manager/time-off" : "/employee/time-off";
  }
  if (type.startsWith("TIME_CLOCK")) {
    return "/manager/time-clock";
  }
  return isMgr ? "/manager/notifications" : "/employee/notifications";
}

function buildAbsoluteActionUrl(path: string): string {
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  if (!origin) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Sends email/SMS when configured and user preferences allow. Errors are logged;
 * in-app notification row always exists before this runs.
 */
export async function dispatchNotificationOutbound(
  notificationId: string,
): Promise<void> {
  const row = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: {
        select: {
          email: true,
          role: true,
          notifyEmail: true,
          notifySms: true,
          smsOptInAt: true,
          phoneE164: true,
          employee: { select: { phone: true } },
        },
      },
    },
  });

  if (!row) return;

  const path = notificationAppPath(row.type, row.user.role);
  const actionUrl = buildAbsoluteActionUrl(path);
  const subject = row.title;
  const phoneRaw = row.user.employee?.phone ?? row.user.phoneE164 ?? null;
  const smsTo = parseToE164(phoneRaw);

  const data: { emailSentAt?: Date; smsSentAt?: Date } = {};

  if (row.user.notifyEmail) {
    try {
      const hadResend = !!(
        process.env.RESEND_API_KEY && process.env.EMAIL_FROM
      );
      await sendNotificationEmail({
        to: row.user.email,
        subject,
        title: row.title,
        body: row.body,
        actionUrl,
      });
      if (hadResend) {
        data.emailSentAt = new Date();
      }
    } catch (e) {
      console.error("[notifications] email failed", notificationId, e);
    }
  }

  if (
    row.user.notifySms &&
    row.user.smsOptInAt != null &&
    smsTo &&
    isTwilioSmsConfigured()
  ) {
    try {
      const smsBody = `${row.title}: ${row.body} ${actionUrl}`.slice(0, 1600);
      await sendSms(smsTo, smsBody);
      data.smsSentAt = new Date();
    } catch (e) {
      console.error("[notifications] sms failed", notificationId, e);
    }
  }

  if (data.emailSentAt != null || data.smsSentAt != null) {
    await prisma.notification.update({
      where: { id: notificationId },
      data,
    });
  }
}
