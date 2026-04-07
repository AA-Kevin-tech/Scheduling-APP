/**
 * Outbound SMS via Twilio when credentials and a sender are configured.
 *
 * Configure either:
 * - TWILIO_PHONE_NUMBER (E.164 From), or
 * - TWILIO_MESSAGING_SERVICE_SID (MG…; pool / 10DLC / toll-free), with Account SID + token.
 *
 * If incomplete, logs a preview and returns without throwing.
 */

export function isTwilioSmsConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  return Boolean(
    sid && token && (from?.trim() || messagingServiceSid?.trim()),
  );
}

function formatTwilioErrorBody(status: number, text: string): string {
  const trimmed = text.trim();
  try {
    const j = JSON.parse(trimmed) as {
      message?: string;
      code?: number;
      more_info?: string;
    };
    if (j.message) {
      const code = j.code != null ? ` [Twilio ${j.code}]` : "";
      const hint =
        j.code === 21608 || j.code === 21211
          ? " Trial accounts can only SMS verified numbers; upgrade or verify the destination in Twilio Console."
          : j.code === 21614
            ? " Invalid To number format (use E.164, e.g. +15551234567)."
            : "";
      return `${j.message}${code}${hint}`;
    }
  } catch {
    // not JSON
  }
  return trimmed || `HTTP ${status}`;
}

export async function sendSms(toE164: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!sid || !token || (!from && !messagingServiceSid)) {
    console.warn(
      "[sms] Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID):",
      {
        toE164,
        preview: body.slice(0, 120),
      },
    );
    return;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    To: toE164,
    Body: body,
  });
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (from) {
    params.set("From", from);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    const detail = formatTwilioErrorBody(res.status, text);
    throw new Error(`Twilio SMS failed: ${detail}`);
  }
}
