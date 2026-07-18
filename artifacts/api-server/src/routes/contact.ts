import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, contactMessagesTable, spamEventsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { normalizeLang, type EmailLang } from "../lib/emailTemplate";
import { sendContactEmails } from "../lib/contactMailer";
import { rateLimit } from "../lib/rateLimit";
import { notifyContactFailure } from "../lib/contactFailureNotifier";
import { maybeNotifySpamSpike } from "../lib/spamSpikeNotifier";
import { verifyTurnstile, CAPTCHA_FAILED_RESPONSE } from "../lib/turnstile";

const router: IRouter = Router();

const HOUR = 60 * 60 * 1000;

function emailFromBody(req: Request): string {
  const body = req.body as Record<string, unknown> | undefined;
  return typeof body?.["email"] === "string" ? (body["email"] as string) : "";
}

// Per-(IP, email) limiter: caps a single visitor identifying with one email
// to 5 submissions per hour. Without a second guard this is bypassable by a
// bot rotating the email field on each submission from a single IP, since
// each `(ip, email)` pair gets its own fresh bucket.
const contactLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  prefix: "contact:submit",
  keyer: emailFromBody,
});

// Per-IP-only limiter: caps total submissions from one IP per hour regardless
// of the email field. Closes the email-rotation bypass above. The cap is set
// well above the per-(IP, email) cap so honest users (1–2 submissions per
// hour) are unaffected, while a bot rotating emails from one IP gets stopped
// after 10 attempts.
const contactIpLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  prefix: "contact:submit:ip",
});

function isEmail(s: unknown): s is string {
  return (
    typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  );
}

function trim(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

// Persist a single spam-defense event to the `spam_events` table. Used by the
// admin dashboard to show daily counts of honeypot drops and captcha
// rejections so operators can decide whether the optional Cloudflare
// Turnstile layer is actually needed. Failures are swallowed (logged only) so
// recording stats can never break the contact form for the visitor.
async function recordSpamEvent(params: {
  kind: "honeypot" | "captcha";
  reason?: string;
  ip: string;
  userAgent: string;
}): Promise<void> {
  try {
    await db.insert(spamEventsTable).values({
      source: "contact",
      kind: params.kind,
      reason: (params.reason ?? "").slice(0, 64),
      ip: params.ip.slice(0, 64),
      userAgent: params.userAgent.slice(0, 1000),
    });
  } catch (err) {
    logger.error({ err, kind: params.kind }, "contact: failed to persist spam event");
  }

  // After every recorded spam event, give the spike notifier a chance to
  // alert. The notifier is a no-op when alerting isn't configured (the
  // default), and silently swallows its own errors so it can never break
  // the contact form. We intentionally don't await it from the route so
  // visitor latency isn't affected by webhook/email round-trips.
  void maybeNotifySpamSpike(params.kind);
}

// Both rate limiters apply: per-IP (closes the email-rotation bypass) AND
// per-(IP, email) (caps a single visitor identifying with one email).
router.post("/contact", contactIpLimiter, contactLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Honeypot check. The contact form renders a hidden `website` input that
    // real visitors never see or fill. If it arrives non-empty, the request
    // is almost certainly a bot. We log every hit at WARN and return a fake
    // 200 so the bot can't tell its submission was discarded — and we never
    // touch SendGrid for these requests. (If hit volume ever grows enough to
    // be noisy, consider sampling here.)
    const honeypot = trim(body["website"], 500);
    if (honeypot.length > 0) {
      logger.warn(
        {
          contactHoneypot: {
            ip: req.ip,
            honeypotLength: honeypot.length,
            emailProvided:
              typeof body["email"] === "string" && body["email"].length > 0,
          },
        },
        "contact form honeypot triggered — silently dropping submission",
      );
      await recordSpamEvent({
        kind: "honeypot",
        reason: "filled",
        ip: (req.ip ?? "").toString(),
        userAgent: (req.headers["user-agent"] ?? "").toString(),
      });
      return res.json({ success: true, ok: true });
    }

    const name = trim(body["name"], 200);
    const email = trim(body["email"], 320).toLowerCase();
    const subject = trim(body["subject"], 300);
    const message = trim(body["message"], 5000);
    const lang: EmailLang = normalizeLang(
      body["lang"] ?? body["language"] ?? req.headers["accept-language"],
    );
    // Turnstile token (Cloudflare CAPTCHA fallback). Capped to a generous
    // 4KB — real Turnstile tokens are well under 1KB but Cloudflare reserves
    // the right to lengthen them. Anything bigger is almost certainly junk.
    const turnstileToken = trim(body["turnstileToken"], 4096);

    // Verify the CAPTCHA token before doing any work. We do this BEFORE the
    // field validations so that a bot spamming garbage payloads can't bypass
    // Turnstile by intentionally sending an invalid email and learning from
    // the response shape — they get the same generic captcha error as a real
    // failed challenge would. We do it AFTER the honeypot because honeypot
    // hits should silently succeed (don't tell the bot anything).
    const captchaResult = await verifyTurnstile(
      turnstileToken,
      req.ip ?? "",
      "contact",
    );
    if (!captchaResult.ok) {
      logger.warn(
        {
          contactCaptcha: {
            ip: req.ip,
            reason: captchaResult.reason,
            tokenProvided: turnstileToken.length > 0,
          },
        },
        "contact: turnstile verification failed",
      );
      await recordSpamEvent({
        kind: "captcha",
        reason: captchaResult.reason,
        ip: (req.ip ?? "").toString(),
        userAgent: (req.headers["user-agent"] ?? "").toString(),
      });
      return res.status(400).json(CAPTCHA_FAILED_RESPONSE);
    }

    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "invalid_name", message: "Name is required." });
    }
    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, error: "invalid_email", message: "A valid email is required." });
    }
    if (!subject) {
      return res
        .status(400)
        .json({ success: false, error: "invalid_subject", message: "Subject is required." });
    }
    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        error: "invalid_message",
        message: "Message must be at least 10 characters.",
      });
    }

    // Persist the submission BEFORE attempting to send. This guarantees a
    // durable audit trail even if SendGrid is misconfigured, the team email
    // address is wrong, or the mail send throws unexpectedly. We update the
    // mail_status after the send attempts complete.
    const ip = (req.ip || req.socket.remoteAddress || "").toString().slice(0, 64);
    const userAgent = (req.headers["user-agent"] ?? "").toString().slice(0, 1000);
    let messageId: string | null = null;
    try {
      const [inserted] = await db
        .insert(contactMessagesTable)
        .values({
          name,
          email,
          subject,
          message,
          lang,
          ip,
          userAgent,
          mailStatus: "pending",
        })
        .returning({ id: contactMessagesTable.id });
      messageId = inserted?.id ?? null;
    } catch (dbErr) {
      // Persistence failure should not break the form for the visitor — the
      // email path can still succeed. Log loudly so the team notices.
      logger.error({ err: dbErr }, "contact: failed to persist submission");
    }

    // Send both emails via the shared contact mailer (also used by the
    // admin resend endpoint). Failures are logged but the visitor still gets
    // a 200 — the form already shows a friendly success toast, and we don't
    // want to leak mail-provider state.
    const { userMailOk, teamMailOk, mailStatus } = await sendContactEmails({
      name,
      email,
      subject,
      message,
      lang,
    });

    if (messageId) {
      try {
        await db
          .update(contactMessagesTable)
          .set({ mailStatus })
          .where(eq(contactMessagesTable.id, messageId));
      } catch (dbErr) {
        logger.error(
          { err: dbErr, messageId },
          "contact: failed to update mail_status",
        );
      }
    }

    // If either send failed, alert the team via a fallback channel that does
    // NOT rely on SendGrid (the same path that just failed). The notifier
    // always logs loudly, and additionally posts to CONTACT_FAILURE_WEBHOOK_URL
    // when configured, so the team can follow up with the visitor manually.
    if (mailStatus === "failed" || mailStatus === "partial") {
      await notifyContactFailure({
        messageId,
        name,
        email,
        subject,
        message,
        lang,
        mailStatus,
        userMailOk,
        teamMailOk,
      });
    }

    logger.info(
      {
        contactSubmission: {
          id: messageId,
          name,
          email,
          subject,
          messageLength: message.length,
          lang,
          userMailOk,
          teamMailOk,
          mailStatus,
        },
      },
      "contact form submission",
    );

    return res.json({ success: true, ok: true });
  } catch (err) {
    logger.error({ err }, "contact form submission failed");
    return res.status(500).json({
      success: false,
      error: "internal_error",
      message: "Something went wrong. Please try again or email support@xuvilo.com.",
    });
  }
});

export default router;
