# Twilio SMS alerts (Pulse / scheduling app)

Scheduling notifications can send **SMS** when Twilio is configured and the user opts in (Profile or Manager → Settings → Alert preferences).

## Environment variables (Railway or `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | From Twilio Console → Account. |
| `TWILIO_AUTH_TOKEN` | Yes | Same place; keep secret. |
| `TWILIO_PHONE_NUMBER` | One of two | Your Twilio **From** number, E.164 (e.g. `+15551234567`). |
| `TWILIO_MESSAGING_SERVICE_SID` | One of two | `MG…` Messaging Service (optional alternative to `From`; use for number pools / 10DLC). |

Set **`TWILIO_PHONE_NUMBER` *or* `TWILIO_MESSAGING_SERVICE_SID`** (plus SID + token). When `TWILIO_MESSAGING_SERVICE_SID` is set, it is used as the sender; otherwise `TWILIO_PHONE_NUMBER` is used as `From`.

Also set **`AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`** to your live site so texts include working links.

## Twilio Console checklist

1. **Buy or claim** a phone number with **SMS** capability, *or* create a **Messaging Service** and add sender numbers to it.
2. Copy **Account SID** and **Auth Token** into Railway.
3. **Trial accounts:** You may only send to **verified** destination numbers until you upgrade and add billing. Add test mobiles under verified numbers in the console.
4. US A2P: For higher volume or long-code messaging to US mobiles, complete **A2P 10DLC** / toll-free verification per Twilio’s current requirements.

## In-app requirements

- User enables **SMS** and **SMS consent**.
- **Employees:** mobile on **Profile → Phone**.
- **Manager-only logins:** **Settings → Mobile for text alerts** (`User.phoneE164`).

## Troubleshooting

- Check Railway logs for `[sms]` or `[notifications] sms failed`.
- Errors include Twilio’s message and code when the API returns JSON; common trial and number-format issues include short hints in logs.
- If SMS is “not configured,” one of `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or sender / Messaging Service is missing.

## Code

- `src/lib/sms.ts` — `sendSms`, `isTwilioSmsConfigured`
- `src/lib/services/notification-dispatch.ts` — when to send after an in-app notification
