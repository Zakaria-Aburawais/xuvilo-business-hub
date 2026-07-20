import { logger } from "./logger";

// Cloudflare Turnstile verification helper. Shared by every unauthenticated
// POST endpoint that wants the same CAPTCHA defense as the contact form
// (currently: contact, signup, forgot-password). When `TURNSTILE_SECRET_KEY`
// is set, every submission must include a valid token that we cross-check
// against Cloudflare's siteverify endpoint. When the secret is unset,
// verification is skipped entirely so the form keeps working before keys are
// provisioned.

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  ok: boolean;
  reason?: string;
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string,
  context?: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) {
    // Feature disabled — treat all submissions as passing.
    return { ok: true, reason: "disabled" };
  }
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }
  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (remoteIp) params.set("remoteip", remoteIp);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      logger.warn(
        { status: res.status, context },
        "turnstile siteverify returned non-2xx",
      );
      // 5xx means Cloudflare's verifier itself is unhealthy — treat like an
      // outage (fail open, see catch below). 4xx means our request/secret is
      // wrong — keep failing closed so misconfiguration is surfaced loudly.
      if (res.status >= 500) {
        return { ok: true, reason: `siteverify_http_${res.status}_failopen` };
      }
      return { ok: false, reason: `siteverify_http_${res.status}` };
    }
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success === true) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: (data["error-codes"] ?? []).join(",") || "verification_failed",
    };
  } catch (err) {
    logger.error({ err, context }, "turnstile siteverify call threw");
    // Fail OPEN on verifier outages: the caller presented a widget token
    // (missing tokens were already rejected above), so this branch means
    // Cloudflare's siteverify API is unreachable or timing out. Rejecting
    // here would lock every real user out of sign-in/sign-up for the whole
    // outage. Accepting is the availability tradeoff: bots without a token
    // are still rejected, invalid tokens are still rejected whenever the
    // verifier responds, and the strict per-IP/per-email rate limits on
    // these endpoints remain the backstop while verification is degraded.
    return { ok: true, reason: "siteverify_unreachable_failopen" };
  }
}

// Standard JSON body shape the API returns when CAPTCHA verification fails.
// Kept as a constant so all endpoints emit the exact same response, which
// lets the frontend treat captcha_failed uniformly across forms.
export const CAPTCHA_FAILED_RESPONSE = {
  success: false,
  error: "captcha_failed",
  message:
    "We couldn't verify the security check. Please try again, or email support@xuvilo.com directly.",
} as const;
