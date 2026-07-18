import { Router, type IRouter, type Request } from "express";
import { logger } from "../lib/logger";
import {
  hashPassword,
  issueToken,
  verifyPassword,
  verifyToken,
} from "../lib/auth";
import {
  createUserWithPassword,
  getUserByEmail,
  setPreferredLanguage,
  setUserPasswordHash,
} from "../lib/userStore";
import {
  consumeResetToken,
  createResetToken,
  purgeExpiredTokens,
} from "../lib/passwordResetStore";
import { getUncachableSendGridClient } from "../lib/sendgrid";
import { renderBrandedEmail, normalizeLang, type EmailLang } from "../lib/emailTemplate";
import { rateLimit } from "../lib/rateLimit";
import { verifyTurnstile, CAPTCHA_FAILED_RESPONSE } from "../lib/turnstile";

const router: IRouter = Router();

const HOUR = 60 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

// Pre-computed scrypt hash of a fixed, never-used password. The login handler
// runs verifyPassword against this when no user is found for the supplied
// email, so the response time of "user does not exist" matches the response
// time of "user exists but wrong password". Without this, an attacker can
// enumerate registered emails by measuring login latency.
const DUMMY_PASSWORD_HASH = hashPassword("__not_a_real_password__");

function emailFromBody(req: Request): string {
  const body = req.body as Record<string, unknown> | undefined;
  return typeof body?.["email"] === "string" ? (body["email"] as string) : "";
}

const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 5,
  prefix: "auth:login",
  keyer: emailFromBody,
});

// Per-IP backstop for login: without this, an attacker rotating email
// addresses from a single IP gets a fresh (ip, email) bucket per address and
// the pair limiter above never trips (credential stuffing across accounts).
// Mirrors the contact route's contactIpLimiter pattern.
const loginIpLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 20,
  prefix: "auth:login:ip",
});

const registerLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  prefix: "auth:register",
});

const forgotLimiter = rateLimit({
  windowMs: HOUR,
  max: 3,
  prefix: "auth:forgot",
  keyer: emailFromBody,
});

// Per-IP backstop for forgot-password: prevents one IP from enumerating /
// spamming reset emails by rotating target addresses past the pair limiter.
const forgotIpLimiter = rateLimit({
  windowMs: HOUR,
  max: 10,
  prefix: "auth:forgot:ip",
});

const resetLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  prefix: "auth:reset",
});

function getTrustedOrigin(): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv && /^https?:\/\//.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain.replace(/\/$/, "")}`;
  const deployDomains = process.env["REPLIT_DEPLOYMENT_DOMAINS"] || process.env["REPLIT_DOMAINS"];
  if (deployDomains) {
    const first = deployDomains.split(",")[0]?.trim();
    if (first) return `https://${first.replace(/\/$/, "")}`;
  }
  return "http://localhost:5000";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function trimString(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

router.post("/auth/register", registerLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const password = typeof body["password"] === "string" ? body["password"] : "";
    const name = typeof body["name"] === "string" ? body["name"].trim() : "";
    // Honeypot: real users never see or fill this. If it arrives non-empty,
    // the request is almost certainly a bot. We log loudly and return a fake
    // success so the bot can't tell its submission was discarded — and we
    // never touch the user store for these requests.
    const honeypot = trimString(body["website"], 500);
    if (honeypot.length > 0) {
      logger.warn(
        {
          authHoneypot: {
            ip: req.ip,
            route: "register",
            honeypotLength: honeypot.length,
            emailProvided: email.length > 0,
          },
        },
        "auth/register honeypot triggered — silently dropping submission",
      );
      // Mimic the success response shape so a bot can't distinguish a
      // honeypot rejection from a real registration. We return a synthetic
      // (and useless) token; the bot has nothing to verify it against.
      return res.json({
        token: "",
        user: { email: "", name: "", tier: "free", role: "user" },
      });
    }
    // Cloudflare Turnstile token (optional — only enforced when
    // TURNSTILE_SECRET_KEY is set on the server). Capped to a generous 4KB,
    // matching the contact form.
    const turnstileToken = trimString(body["turnstileToken"], 4096);

    // Verify the CAPTCHA token before doing any work. Done BEFORE the field
    // validations so a bot spamming garbage payloads can't bypass Turnstile
    // by intentionally sending an invalid email and learning from the
    // response shape — they get the same generic captcha error every time.
    // Done AFTER the honeypot because honeypot hits should silently succeed.
    const captchaResult = await verifyTurnstile(
      turnstileToken,
      req.ip ?? "",
      "auth/register",
    );
    if (!captchaResult.ok) {
      logger.warn(
        {
          authCaptcha: {
            ip: req.ip,
            route: "register",
            reason: captchaResult.reason,
            tokenProvided: turnstileToken.length > 0,
          },
        },
        "auth/register: turnstile verification failed",
      );
      return res.status(400).json(CAPTCHA_FAILED_RESPONSE);
    }

    if (!isEmail(email)) return res.status(400).json({ error: "invalid_email" });
    if (password.length < 6) return res.status(400).json({ error: "weak_password" });

    const existing = await getUserByEmail(email);
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: "email_taken", message: "An account with this email already exists." });
    }

    const hash = hashPassword(password);
    let user = existing;
    if (!user) {
      user = await createUserWithPassword(email, name, hash);
    } else {
      await setUserPasswordHash(user.id, hash);
      user = (await getUserByEmail(email))!;
    }

    // Persist the UI language the user signed up in, so transactional
    // emails match it. Only when the client explicitly sent one — we never
    // want a missing field to silently overwrite a stored preference with
    // the "en" default.
    const langRaw = body["lang"] ?? body["language"];
    if (typeof langRaw === "string" && langRaw.trim()) {
      try {
        await setPreferredLanguage(user.id, normalizeLang(langRaw));
      } catch (e) {
        logger.warn({ err: e }, "auth/register: setPreferredLanguage failed");
      }
    }

    const token = issueToken(user.email);
    return res.json({
      token,
      user: { email: user.email, name: user.name, tier: user.tier, role: user.role },
    });
  } catch (err) {
    logger.error({ err }, "auth/register failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/auth/login", loginIpLimiter, loginLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const password = typeof body["password"] === "string" ? body["password"] : "";

    // Honeypot: real users never see or fill this. If it arrives non-empty,
    // the request is almost certainly a bot. We log loudly and return the
    // same generic 401 a wrong password produces, so the bot can't tell its
    // submission was discarded — and we never touch the user store.
    const honeypot = trimString(body["website"], 500);
    if (honeypot.length > 0) {
      logger.warn(
        {
          authHoneypot: {
            ip: req.ip,
            route: "login",
            honeypotLength: honeypot.length,
            emailProvided: email.length > 0,
          },
        },
        "auth/login honeypot triggered — silently dropping submission",
      );
      return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect." });
    }

    // Verify the CAPTCHA token before doing any work. Done BEFORE the field
    // validations so a bot spamming garbage payloads can't learn anything
    // from the response shape — it gets the same generic captcha error
    // every time. Done AFTER the honeypot because honeypot hits should
    // silently look like ordinary failed logins.
    const turnstileToken = trimString(body["turnstileToken"], 4096);
    const captchaResult = await verifyTurnstile(
      turnstileToken,
      req.ip ?? "",
      "auth/login",
    );
    if (!captchaResult.ok) {
      logger.warn(
        {
          authCaptcha: {
            ip: req.ip,
            route: "login",
            reason: captchaResult.reason,
            tokenProvided: turnstileToken.length > 0,
          },
        },
        "auth/login: turnstile verification failed",
      );
      return res.status(400).json(CAPTCHA_FAILED_RESPONSE);
    }

    if (!isEmail(email) || !password) {
      return res.status(400).json({ error: "invalid_credentials" });
    }
    const user = await getUserByEmail(email);
    // Always spend approximately the same wall-clock time on the password
    // check, even when the email isn't registered. Otherwise a tight
    // measurement of the response latency on /auth/login leaks whether a
    // given email exists in our database (timing-based user enumeration).
    const storedHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordOk = verifyPassword(password, storedHash);
    if (!user || !user.passwordHash || !passwordOk) {
      return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect." });
    }
    // Keep the stored language preference in sync with the UI language the
    // user actually logs in with. Only when explicitly provided, and only
    // when it differs, to avoid a pointless write on every login.
    const langRaw = body["lang"] ?? body["language"];
    if (typeof langRaw === "string" && langRaw.trim()) {
      const nextLang = normalizeLang(langRaw);
      if (nextLang !== normalizeLang(user.preferredLanguage)) {
        try {
          await setPreferredLanguage(user.id, nextLang);
        } catch (e) {
          logger.warn({ err: e }, "auth/login: setPreferredLanguage failed");
        }
      }
    }
    const token = issueToken(user.email);
    return res.json({
      token,
      user: { email: user.email, name: user.name, tier: user.tier, role: user.role },
    });
  } catch (err) {
    logger.error({ err }, "auth/login failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/auth/me", async (req, res) => {
  const header = req.headers["authorization"];
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (!token) return res.json({ user: null });
  const payload = verifyToken(token);
  if (!payload) return res.json({ user: null });
  const user = await getUserByEmail(payload.email);
  if (!user) return res.json({ user: null });
  return res.json({
    user: { email: user.email, name: user.name, tier: user.tier, role: user.role },
  });
});

router.post("/auth/forgot-password", forgotIpLimiter, forgotLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const explicitLangRaw = body["lang"] ?? body["language"];
    const hasExplicitLang =
      typeof explicitLangRaw === "string" && explicitLangRaw.trim().length > 0;

    // Honeypot: real users never see or fill this. If it arrives non-empty,
    // log loudly and return the same generic 200 the endpoint always returns
    // — bots can't tell their submission was discarded, and we never touch
    // SendGrid or the reset-token store for these requests.
    const honeypot = trimString(body["website"], 500);
    if (honeypot.length > 0) {
      logger.warn(
        {
          authHoneypot: {
            ip: req.ip,
            route: "forgot-password",
            honeypotLength: honeypot.length,
            emailProvided: email.length > 0,
          },
        },
        "auth/forgot-password honeypot triggered — silently dropping submission",
      );
      return res.json({ ok: true });
    }
    // Cloudflare Turnstile token (optional — only enforced when
    // TURNSTILE_SECRET_KEY is set on the server). Capped to a generous 4KB.
    const turnstileToken = trimString(body["turnstileToken"], 4096);

    // Verify the CAPTCHA token before any expensive work (token issuance,
    // SendGrid call). Same ordering rationale as the contact form / signup:
    // after the honeypot, before field validation.
    const captchaResult = await verifyTurnstile(
      turnstileToken,
      req.ip ?? "",
      "auth/forgot-password",
    );
    if (!captchaResult.ok) {
      logger.warn(
        {
          authCaptcha: {
            ip: req.ip,
            route: "forgot-password",
            reason: captchaResult.reason,
            tokenProvided: turnstileToken.length > 0,
          },
        },
        "auth/forgot-password: turnstile verification failed",
      );
      return res.status(400).json(CAPTCHA_FAILED_RESPONSE);
    }

    if (!isEmail(email)) {
      return res.json({ ok: true });
    }

    const user = await getUserByEmail(email);
    // Explicit request lang wins; otherwise fall back to the user's stored
    // preference (set at signup/login/checkout), then Accept-Language.
    const lang: EmailLang = hasExplicitLang
      ? normalizeLang(explicitLangRaw)
      : normalizeLang(user?.preferredLanguage ?? req.headers["accept-language"]);
    if (user && user.passwordHash) {
      try {
        await purgeExpiredTokens();
      } catch (e) {
        logger.warn({ err: e }, "purgeExpiredTokens failed");
      }
      const { token, expiresAt } = await createResetToken(email);
      const origin = getTrustedOrigin();
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      const displayName = user.name ? user.name : email;
      const safeName = escapeHtml(displayName);
      const mins = Math.round((expiresAt.getTime() - Date.now()) / 60000);

      const isAr = lang === "ar";
      const subject = isAr ? "إعادة تعيين كلمة مرور Xuvilo" : "Reset your Xuvilo password";
      const heading = isAr ? "إعادة تعيين كلمة المرور" : "Reset your password";
      const ctaLabel = isAr ? "إعادة تعيين كلمة المرور" : "Reset password";
      const preheader = isAr
        ? `رابط إعادة تعيين آمن صالح لمدة ${mins} دقيقة.`
        : `A secure reset link valid for ${mins} minutes.`;

      const bodyHtml = isAr
        ? `
            <p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p>
            <p style="margin:0 0 12px 0;">تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في Xuvilo. اضغط على الزر أدناه لاختيار كلمة مرور جديدة. ينتهي هذا الرابط خلال <strong>${mins} دقيقة</strong>.</p>
            <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان — لن تتغير كلمة المرور.</p>
          `
        : `
            <p style="margin:0 0 12px 0;">Hi ${safeName},</p>
            <p style="margin:0 0 12px 0;">We received a request to reset your Xuvilo password. Click the button below to choose a new password. This link expires in <strong>${mins} minutes</strong>.</p>
            <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
          `;

      const bodyText = isAr
        ? `مرحباً ${displayName},\n\nتلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في Xuvilo. استخدم الرابط أدناه لاختيار كلمة مرور جديدة. ينتهي هذا الرابط خلال ${mins} دقيقة.\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.`
        : `Hi ${displayName},\n\nWe received a request to reset your Xuvilo password. Use the link below to choose a new password. This link expires in ${mins} minutes.\n\nIf you didn't request this, you can safely ignore this email.`;

      const { html, text } = renderBrandedEmail({
        lang,
        preheader,
        heading,
        bodyHtml,
        bodyText,
        cta: { label: ctaLabel, url: resetUrl },
        recipientEmail: email,
        baseUrl: origin,
      });

      try {
        const { client, fromEmail } = await getUncachableSendGridClient();
        await client.send({
          to: email,
          from: fromEmail,
          subject,
          text,
          html,
        });
      } catch (mailErr) {
        logger.error({ err: mailErr }, "auth/forgot-password sendgrid send failed");
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "auth/forgot-password failed");
    return res.json({ ok: true });
  }
});

router.post("/auth/reset-password", resetLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = typeof body["token"] === "string" ? body["token"].trim() : "";
    const password = typeof body["password"] === "string" ? body["password"] : "";
    if (!token) return res.status(400).json({ error: "invalid_token", message: "Reset link is invalid." });
    if (password.length < 6) return res.status(400).json({ error: "weak_password", message: "Password must be at least 6 characters." });

    const email = await consumeResetToken(token);
    if (!email) {
      return res.status(400).json({ error: "invalid_or_expired", message: "This reset link is invalid or has expired. Please request a new one." });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "user_not_found", message: "Account not found." });
    }
    const hash = hashPassword(password);
    await setUserPasswordHash(user.id, hash);
    const authToken = issueToken(user.email);
    return res.json({
      token: authToken,
      user: { email: user.email, name: user.name, tier: user.tier, role: user.role },
    });
  } catch (err) {
    logger.error({ err }, "auth/reset-password failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
