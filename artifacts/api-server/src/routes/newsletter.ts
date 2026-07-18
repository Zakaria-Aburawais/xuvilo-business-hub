import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db, newsletterSubscribersTable } from "@workspace/db";
import {
  SubscribeNewsletterBody,
  UnsubscribeNewsletterBody,
} from "@workspace/api-zod";
import { getUncachableSendGridClient } from "../lib/sendgrid";
import {
  renderBrandedEmail,
  normalizeLang,
  type EmailLang,
} from "../lib/emailTemplate";
import { rateLimit } from "../lib/rateLimit";
import {
  buildUnsubscribeUrl,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../lib/unsubscribeToken";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

const SUPPORT_EMAIL = "support@xuvilo.com";

const HOUR = 60 * 60 * 1000;

function emailFromBody(req: Request): string {
  const body = req.body as Record<string, unknown> | undefined;
  return typeof body?.["email"] === "string" ? (body["email"] as string) : "";
}

// Per-(IP, email) limiter: caps a single visitor identifying with one email
// to 5 subscription attempts per hour. Mirrors the contact form pattern.
const newsletterLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  prefix: "newsletter:subscribe",
  keyer: emailFromBody,
});

// Per-IP-only limiter: caps total submissions from one IP per hour regardless
// of the email field. Closes the email-rotation bypass that the per-(IP, email)
// limiter alone would allow. Cap is well above the per-(IP, email) cap so
// honest users (1 submission, ever) are unaffected.
const newsletterIpLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  prefix: "newsletter:subscribe:ip",
});

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function getTrustedOrigin(): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv && /^https?:\/\//.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain.replace(/\/$/, "")}`;
  const deployDomains =
    process.env["REPLIT_DEPLOYMENT_DOMAINS"] || process.env["REPLIT_DOMAINS"];
  if (deployDomains) {
    const first = deployDomains.split(",")[0]?.trim();
    if (first) return `https://${first.replace(/\/$/, "")}`;
  }
  return "http://localhost:5000";
}

// Both rate limiters apply: per-IP (closes the email-rotation bypass) AND
// per-(IP, email) (caps a single visitor identifying with one email).
router.post(
  "/newsletter/subscribe",
  newsletterIpLimiter,
  newsletterLimiter,
  async (req, res) => {
  // Honeypot check FIRST, before zod validation. The form renders a hidden
  // `website` input that real visitors never see or fill — if it arrives
  // non-empty, the request is almost certainly a bot. By short-circuiting
  // before validation, even bots that submit malformed JSON or junk email
  // values get the same fake-success response a clean honeypot hit would,
  // so they can't probe the validation surface to fingerprint the form.
  // Mirrors the contact route's ordering. We never touch the database or
  // SendGrid for these requests.
  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const rawHoneypot = typeof rawBody["website"] === "string" ? (rawBody["website"] as string) : "";
  const honeypot = rawHoneypot.trim().slice(0, 500);
  if (honeypot.length > 0) {
    req.log.warn(
      {
        newsletterHoneypot: {
          ip: req.ip,
          honeypotLength: honeypot.length,
        },
      },
      "newsletter form honeypot triggered — silently dropping submission",
    );
    return res.json({ status: "subscribed" });
  }

  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_email",
      message: "A valid email address is required.",
    });
  }

  const rawEmail = parsed.data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return res.status(400).json({
      error: "invalid_email",
      message: "A valid email address is required.",
    });
  }

  const source =
    (parsed.data.source ?? "homepage").trim().slice(0, 64) || "homepage";

  // Language for the subscriber-facing welcome email. Same heuristic as the
  // contact form: explicit `lang` field wins, otherwise Accept-Language,
  // otherwise English.
  const lang: EmailLang = normalizeLang(
    parsed.data.lang ?? req.headers["accept-language"],
  );

  // Insert idempotently. The unique index on `email` would normally throw
  // on duplicates; ON CONFLICT DO NOTHING swallows that and returns 0 rows.
  // We DELIBERATELY do not surface the insert-vs-already-active distinction
  // to the caller — both outcomes return the same `{ status: "subscribed" }`
  // payload to prevent email-existence enumeration. An attacker cannot
  // probe whether an address is already on the list.
  //
  // The one case we DO distinguish is "previously unsubscribed and is now
  // opting back in": when the conflicting row has `unsubscribedAt IS NOT
  // NULL`, we clear it and return `resubscribed`. This is a deliberate
  // tradeoff — without it, users who unsubscribed and changed their mind
  // would silently stay off the list and have to email support. The signal
  // is narrower than full enumeration (only reveals previously-unsubscribed
  // addresses) and the user-facing benefit is significant.
  let inserted = false;
  try {
    const rows = await db
      .insert(newsletterSubscribersTable)
      .values({ email: rawEmail, source })
      .onConflictDoNothing({ target: newsletterSubscribersTable.email })
      .returning({ id: newsletterSubscribersTable.id });
    inserted = rows.length > 0;
  } catch (err) {
    req.log.error({ err }, "newsletter: failed to insert subscriber");
    return res.status(500).json({
      error: "internal_error",
      message: "Something went wrong. Please try again.",
    });
  }

  // Duplicate signup: either the row was already active or it was
  // previously unsubscribed. Try to clear `unsubscribedAt` atomically and
  // only when it was actually set; the row count tells us which case
  // applied without a separate read+write race.
  if (!inserted) {
    let resubscribed = false;
    try {
      const reactivated = await db
        .update(newsletterSubscribersTable)
        .set({ unsubscribedAt: null, source })
        .where(
          and(
            eq(newsletterSubscribersTable.email, rawEmail),
            isNotNull(newsletterSubscribersTable.unsubscribedAt),
          ),
        )
        .returning({ id: newsletterSubscribersTable.id });
      resubscribed = reactivated.length > 0;
    } catch (err) {
      req.log.error({ err }, "newsletter: failed to resubscribe");
      return res.status(500).json({
        error: "internal_error",
        message: "Something went wrong. Please try again.",
      });
    }

    if (resubscribed) {
      req.log.info(
        { newsletterSubscriber: { email: rawEmail, source, resubscribed: true } },
        "newsletter resubscribe (cleared unsubscribed_at)",
      );
      // Skip the support notification for resubscribes — the address is
      // already known and the team inbox doesn't need a fresh ping.
      return res.json({ status: "resubscribed" });
    }

    req.log.info(
      { newsletterSubscriber: { email: rawEmail, source, duplicate: true } },
      "newsletter subscription (duplicate, no notification sent)",
    );
    return res.json({ status: "subscribed" });
  }

  // Notify the support inbox. Failure to notify must not fail the request:
  // the row is already saved and the subscriber should still see success.
  try {
    const origin = getTrustedOrigin();
    const safeEmail = escapeHtml(rawEmail);
    const safeSource = escapeHtml(source);

    const heading = "New newsletter subscriber";
    const preheader = `${rawEmail} signed up via ${source}`;
    const bodyHtml = `
      <p style="margin:0 0 12px 0;">A new visitor just signed up for the newsletter on Xuvilo.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Email</div>
          <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">
            <a href="mailto:${safeEmail}" style="color:#2563eb; text-decoration:none;">${safeEmail}</a>
          </div>
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Source</div>
          <div style="font-size:15px; color:#0f172a;">${safeSource}</div>
        </td></tr>
      </table>
    `;
    const bodyText = `A new visitor just signed up for the newsletter on Xuvilo.\n\nEmail: ${rawEmail}\nSource: ${source}`;

    // The unsubscribe link in this internal notification doubles as a quick
    // admin action: when a subscriber replies asking to be removed, support
    // can click it once instead of editing the database. The token is signed
    // for the subscriber's address, so it unsubscribes the right row.
    const unsubscribeUrl = buildUnsubscribeUrl(origin, rawEmail, "en");

    const rendered = renderBrandedEmail({
      lang: "en",
      preheader,
      heading,
      bodyHtml,
      bodyText,
      recipientEmail: SUPPORT_EMAIL,
      baseUrl: origin,
      unsubscribeUrl,
    });

    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({
      to: SUPPORT_EMAIL,
      from: fromEmail,
      subject: `[Newsletter] New subscriber: ${rawEmail}`,
      text: rendered.text,
      html: rendered.html,
      replyTo: rawEmail,
    });
  } catch (err) {
    req.log.error({ err }, "newsletter: failed to send support notification");
  }

  // Send the subscriber a branded welcome email. Only NEW subscribers reach
  // this code path (duplicates and resubscribes returned earlier), so repeat
  // submitters are never re-mailed. Failure to send must not fail the
  // request — the row is saved and the subscriber still sees success.
  try {
    const origin = getTrustedOrigin();
    const isAr = lang === "ar";
    const unsubscribeUrl = buildUnsubscribeUrl(origin, rawEmail, lang);

    const heading = isAr
      ? "أهلاً بك في نشرة Xuvilo البريدية"
      : "Welcome to the Xuvilo newsletter";
    const preheader = isAr
      ? "تم تأكيد اشتراكك — إليك ما يمكن توقعه."
      : "Your subscription is confirmed — here's what to expect.";
    const bodyHtml = isAr
      ? `
      <p style="margin:0 0 12px 0;">شكرًا لاشتراكك! تم تأكيد بريدك الإلكتروني وأنت الآن على قائمتنا.</p>
      <p style="margin:0 0 12px 0;">سنرسل لك بين الحين والآخر نصائح عملية للمستقلين والشركات الصغيرة، وتحديثات عن أدوات Xuvilo الجديدة — دون إزعاج أو رسائل كثيرة.</p>
      <p style="margin:0;">يمكنك إلغاء الاشتراك في أي وقت من الرابط أسفل هذه الرسالة.</p>
    `
      : `
      <p style="margin:0 0 12px 0;">Thanks for subscribing! Your email is confirmed and you're on the list.</p>
      <p style="margin:0 0 12px 0;">From time to time we'll send practical tips for freelancers and small businesses, plus updates when new Xuvilo tools launch — no spam, no flooding your inbox.</p>
      <p style="margin:0;">You can unsubscribe at any time using the link at the bottom of this email.</p>
    `;
    const bodyText = isAr
      ? "شكرًا لاشتراكك! تم تأكيد بريدك الإلكتروني وأنت الآن على قائمتنا.\n\nسنرسل لك بين الحين والآخر نصائح عملية للمستقلين والشركات الصغيرة، وتحديثات عن أدوات Xuvilo الجديدة — دون إزعاج أو رسائل كثيرة.\n\nيمكنك إلغاء الاشتراك في أي وقت من الرابط أسفل هذه الرسالة."
      : "Thanks for subscribing! Your email is confirmed and you're on the list.\n\nFrom time to time we'll send practical tips for freelancers and small businesses, plus updates when new Xuvilo tools launch — no spam, no flooding your inbox.\n\nYou can unsubscribe at any time using the link at the bottom of this email.";

    const rendered = renderBrandedEmail({
      lang,
      preheader,
      heading,
      bodyHtml,
      bodyText,
      cta: {
        label: isAr ? "استكشف أدوات Xuvilo" : "Explore Xuvilo tools",
        url: origin,
      },
      recipientEmail: rawEmail,
      baseUrl: origin,
      unsubscribeUrl,
    });

    const oneClickUrl = buildOneClickUnsubscribeUrl(origin, rawEmail);
    const { client, fromEmail } = await getUncachableSendGridClient();
    const subject = isAr
      ? "أهلاً بك في نشرة Xuvilo البريدية"
      : "Welcome to the Xuvilo newsletter";
    const [sgResponse] = await client.send({
      to: rawEmail,
      from: fromEmail,
      subject,
      text: rendered.text,
      html: rendered.html,
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    req.log.info(
      {
        newsletterWelcome: {
          email: rawEmail,
          lang,
          subject,
          sendgridStatusCode: sgResponse.statusCode,
        },
      },
      "newsletter welcome email sent",
    );
  } catch (err) {
    req.log.error({ err }, "newsletter: failed to send welcome email");
  }

  req.log.info(
    { newsletterSubscriber: { email: rawEmail, source } },
    "newsletter subscription",
  );

  return res.json({ status: "subscribed" });
});

type UnsubResult =
  | { status: "unsubscribed" | "already_unsubscribed" | "not_found"; email: string }
  | { status: "error" };

async function performUnsubscribe(email: string): Promise<UnsubResult> {
  // Atomically mark the subscriber unsubscribed if-and-only-if they are
  // currently active. The `isNull(unsubscribedAt)` clause makes this safe
  // to re-run (idempotent) and lets us distinguish "just unsubscribed"
  // from "already unsubscribed" without a separate read+write race.
  const updated = await db
    .update(newsletterSubscribersTable)
    .set({ unsubscribedAt: new Date() })
    .where(
      and(
        eq(newsletterSubscribersTable.email, email),
        isNull(newsletterSubscribersTable.unsubscribedAt),
      ),
    )
    .returning({ id: newsletterSubscribersTable.id });

  if (updated.length > 0) {
    return { status: "unsubscribed", email };
  }

  // No row was updated. Either the email was already unsubscribed, or it
  // was never on the list at all. Both are safe non-error outcomes.
  const existing = await db
    .select({
      unsubscribedAt: newsletterSubscribersTable.unsubscribedAt,
    })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email))
    .limit(1);

  if (existing.length > 0 && existing[0]!.unsubscribedAt !== null) {
    return { status: "already_unsubscribed", email };
  }
  return { status: "not_found", email };
}

router.post("/newsletter/unsubscribe", async (req, res) => {
  const parsed = UnsubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_token",
      message: "This unsubscribe link is not valid.",
    });
  }

  const email = verifyUnsubscribeToken(parsed.data.token);
  if (!email) {
    return res.status(400).json({
      error: "invalid_token",
      message:
        "This unsubscribe link is not valid or has been tampered with.",
    });
  }

  try {
    const result = await performUnsubscribe(email);
    if (result.status === "unsubscribed") {
      req.log.info(
        { newsletterUnsubscribe: { email } },
        "newsletter unsubscribe",
      );
    }
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "newsletter: failed to unsubscribe");
    return res.status(500).json({
      error: "internal_error",
      message: "Something went wrong. Please try again.",
    });
  }
});

// RFC 8058 one-click unsubscribe endpoint. This is the URL we publish in
// the `List-Unsubscribe` / `List-Unsubscribe-Post` headers of broadcast
// emails. Mailbox providers (Gmail, Yahoo) POST directly to this URL when
// the user clicks "Unsubscribe" in the inbox UI — there is no JSON body
// and no user-facing confirmation page involved, so the token is read
// from the query string and the unsubscribe is performed immediately.
//
// We also accept GET so that mail clients (and curl-based smoke tests)
// that follow the older `mailto:`-or-link convention still work, and
// because some providers probe the URL with GET first. Both verbs share
// the same handler.
const oneClickHandler = async (req: Request, res: Response) => {
  const rawToken = req.query["token"];
  const token =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken) && typeof rawToken[0] === "string"
        ? rawToken[0]
        : "";

  if (!token) {
    return res.status(400).json({
      error: "invalid_token",
      message: "Missing unsubscribe token.",
    });
  }

  const email = verifyUnsubscribeToken(token);
  if (!email) {
    return res.status(400).json({
      error: "invalid_token",
      message:
        "This unsubscribe link is not valid or has been tampered with.",
    });
  }

  try {
    const result = await performUnsubscribe(email);
    if (result.status === "unsubscribed") {
      req.log.info(
        { newsletterUnsubscribe: { email, oneClick: true } },
        "newsletter one-click unsubscribe",
      );
    }
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "newsletter: one-click unsubscribe failed");
    return res.status(500).json({
      error: "internal_error",
      message: "Something went wrong. Please try again.",
    });
  }
};

router.post("/newsletter/one-click-unsubscribe", oneClickHandler);
router.get("/newsletter/one-click-unsubscribe", oneClickHandler);

/**
 * Build the absolute URL we publish in the `List-Unsubscribe` /
 * `List-Unsubscribe-Post` headers. Unlike `buildUnsubscribeUrl`, which
 * returns a frontend page that asks the user to confirm, this points at
 * the API endpoint that performs the unsubscribe immediately on POST so
 * mailbox-provider one-click flows actually work.
 */
function buildOneClickUnsubscribeUrl(origin: string, email: string): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({
    token: signUnsubscribeToken(email),
  });
  return `${base}/api/newsletter/one-click-unsubscribe?${params.toString()}`;
}

// Per-admin throttle for broadcast sends. Caps a logged-in admin to 5
// broadcasts per hour so an accidentally-repeated submit (or compromised
// session) cannot blast the entire subscriber list dozens of times. The
// keyer falls back to IP if the email header is somehow missing.
const broadcastLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  prefix: "newsletter:broadcast",
  keyer: (req) => {
    const email = (req as Request & { userEmail?: string }).userEmail;
    return typeof email === "string" ? email : "";
  },
});

interface BroadcastBody {
  subject?: unknown;
  heading?: unknown;
  bodyHtml?: unknown;
  bodyText?: unknown;
  preheader?: unknown;
  lang?: unknown;
}

function asString(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Admin-only newsletter broadcast. Iterates the active-subscriber list and
// sends a separately-rendered, per-recipient email so each one carries a
// signed unsubscribe URL bound to that subscriber's address (so the link
// in any forwarded email still unsubscribes the original recipient, not
// whoever forwards it). Each message also sets `List-Unsubscribe` and
// `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers so Gmail/
// Yahoo bulk-sender clients can offer one-click opt-out from the inbox UI.
router.post(
  "/admin/newsletter/broadcast",
  requireRole("admin"),
  broadcastLimiter,
  async (req, res) => {
    const body = (req.body ?? {}) as BroadcastBody;
    const subject = asString(body.subject, 200);
    const heading = asString(body.heading, 200) || subject;
    const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml : "";
    const bodyText = typeof body.bodyText === "string" ? body.bodyText : "";
    const preheader = asString(body.preheader, 200);
    const lang = normalizeLang(body.lang);

    if (!subject || !bodyHtml || !bodyText) {
      return res.status(400).json({
        success: false,
        error: "invalid_body",
        message: "subject, bodyHtml, and bodyText are required.",
      });
    }

    let subscribers: { email: string }[];
    try {
      subscribers = await db
        .select({ email: newsletterSubscribersTable.email })
        .from(newsletterSubscribersTable)
        .where(isNull(newsletterSubscribersTable.unsubscribedAt));
    } catch (err) {
      req.log.error({ err }, "newsletter broadcast: failed to load subscribers");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not load subscribers.",
      });
    }

    let client: Awaited<ReturnType<typeof getUncachableSendGridClient>>;
    try {
      client = await getUncachableSendGridClient();
    } catch (err) {
      req.log.error({ err }, "newsletter broadcast: sendgrid unavailable");
      return res.status(503).json({
        success: false,
        error: "Email service unavailable",
        message: "Could not connect to the email service.",
      });
    }

    const origin = getTrustedOrigin();
    const { client: sg, fromEmail } = client;

    let sent = 0;
    let failed = 0;
    for (const { email } of subscribers) {
      try {
        // Two URLs per recipient:
        //  - `unsubscribeUrl` is the user-facing confirmation page linked
        //    in the email footer.
        //  - `oneClickUrl` is the API endpoint published in the
        //    `List-Unsubscribe` headers, which mailbox providers POST
        //    directly per RFC 8058.
        const unsubscribeUrl = buildUnsubscribeUrl(origin, email, lang);
        const oneClickUrl = buildOneClickUnsubscribeUrl(origin, email);
        const rendered = renderBrandedEmail({
          lang,
          preheader: preheader || undefined,
          heading,
          bodyHtml,
          bodyText,
          recipientEmail: email,
          baseUrl: origin,
          unsubscribeUrl,
        });
        await sg.send({
          to: email,
          from: fromEmail,
          subject,
          text: rendered.text,
          html: rendered.html,
          // RFC 8058 / RFC 2369 one-click unsubscribe. Gmail and Yahoo
          // require both headers for bulk senders; the POST variant lets
          // mail clients hit a URL directly without the user leaving
          // the inbox. We use the same signed token URL as the footer
          // link so the existing /newsletter/unsubscribe handler works
          // unchanged for both flows.
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent++;
      } catch (err) {
        failed++;
        req.log.error(
          { err, recipient: email },
          "newsletter broadcast: send failed for recipient",
        );
      }
    }

    req.log.info(
      { newsletterBroadcast: { sent, failed, total: subscribers.length } },
      "newsletter broadcast complete",
    );

    return res.json({
      success: true,
      sent,
      failed,
      total: subscribers.length,
    });
  },
);

export default router;
