import { logger } from "./logger";
import { getUncachableSendGridClient } from "./sendgrid";
import { renderBrandedEmail, type EmailLang } from "./emailTemplate";

export interface ContactMailInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  lang: EmailLang;
}

export interface ContactMailResult {
  userMailOk: boolean;
  teamMailOk: boolean;
  mailStatus: "sent" | "partial" | "failed";
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br/>");
}

function isEmail(s: unknown): s is string {
  return (
    typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  );
}

export function getTrustedOrigin(): string {
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

export function getTeamEmail(): string {
  const fromEnv = process.env["CONTACT_TEAM_EMAIL"];
  if (fromEnv && isEmail(fromEnv)) return fromEnv.trim();
  return "support@xuvilo.com";
}

/**
 * Send the two contact-form emails (auto-reply to the visitor + notification
 * to the team inbox) for a submission. Used by both the public contact route
 * and the admin resend endpoint.
 *
 * Never throws: each send failure is logged and reflected in the returned
 * flags, and a SendGrid client failure results in `mailStatus: "failed"`.
 */
export async function sendContactEmails(
  input: ContactMailInput,
): Promise<ContactMailResult> {
  const { name, email, subject, message, lang } = input;
  const origin = getTrustedOrigin();
  const teamEmail = getTeamEmail();
  const isAr = lang === "ar";
  const safeName = escapeHtml(name);

  // ---------- Auto-reply to user ----------
  const userSubject = isAr
    ? `استلمنا رسالتك — Xuvilo`
    : `We got your message — Xuvilo`;
  const userHeading = isAr
    ? "شكراً على تواصلك معنا"
    : "Thanks for reaching out";
  const userPreheader = isAr
    ? "استلمنا رسالتك وسنرد عليك في أقرب وقت."
    : "We received your message and will be in touch shortly.";
  const userBodyHtml = isAr
    ? `
        <p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p>
        <p style="margin:0 0 12px 0;">شكراً على تواصلك مع فريق Xuvilo. لقد استلمنا رسالتك وسنرد عليك خلال يوم أو يومي عمل.</p>
        <p style="margin:0 0 8px 0; font-weight:600; color:#0f172a;">نسخة من رسالتك:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">الموضوع</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(subject)}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">الرسالة</div>
            <div style="font-size:14px; color:#0f172a; line-height:1.6; white-space:pre-wrap;">${nl2br(message)}</div>
          </td></tr>
        </table>
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">إذا كنت بحاجة إلى إضافة معلومات، فقط رد على هذه الرسالة وسنتلقى ردك مباشرة.</p>
      `
    : `
        <p style="margin:0 0 12px 0;">Hi ${safeName},</p>
        <p style="margin:0 0 12px 0;">Thanks for reaching out to the Xuvilo team. We've received your message and will get back to you within one to two business days.</p>
        <p style="margin:0 0 8px 0; font-weight:600; color:#0f172a;">A copy of your message:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Subject</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(subject)}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Message</div>
            <div style="font-size:14px; color:#0f172a; line-height:1.6; white-space:pre-wrap;">${nl2br(message)}</div>
          </td></tr>
        </table>
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">If you need to add anything, just reply to this email and your follow-up will land in our support inbox.</p>
      `;
  const userBodyText = isAr
    ? `مرحباً ${name},\n\nشكراً على تواصلك مع فريق Xuvilo. لقد استلمنا رسالتك وسنرد عليك خلال يوم أو يومي عمل.\n\nنسخة من رسالتك\nالموضوع: ${subject}\n\n${message}\n\nإذا كنت بحاجة إلى إضافة معلومات، فقط رد على هذه الرسالة.`
    : `Hi ${name},\n\nThanks for reaching out to the Xuvilo team. We've received your message and will get back to you within one to two business days.\n\nA copy of your message\nSubject: ${subject}\n\n${message}\n\nIf you need to add anything, just reply to this email.`;

  const userEmail = renderBrandedEmail({
    lang,
    preheader: userPreheader,
    heading: userHeading,
    bodyHtml: userBodyHtml,
    bodyText: userBodyText,
    recipientEmail: email,
    baseUrl: origin,
  });

  // ---------- Notification to team (always English for the team inbox) ----------
  const teamLang: EmailLang = "en";
  const teamSubject = `[Contact] ${subject}`;
  const teamHeading = "New contact form submission";
  const teamPreheader = `From ${name} <${email}>`;
  const teamBodyHtml = `
      <p style="margin:0 0 12px 0;">A visitor just submitted the contact form on Xuvilo.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Name</div>
          <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(name)}</div>
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Email</div>
          <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">
            <a href="mailto:${escapeHtml(email)}" style="color:#2563eb; text-decoration:none;">${escapeHtml(email)}</a>
          </div>
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Subject</div>
          <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(subject)}</div>
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Language</div>
          <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${isAr ? "Arabic (ar)" : "English (en)"}</div>
          <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Message</div>
          <div style="font-size:14px; color:#0f172a; line-height:1.6; white-space:pre-wrap;">${nl2br(message)}</div>
        </td></tr>
      </table>
      <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">Reply directly to this email to respond to ${escapeHtml(name)} — the Reply-To header is set to their address.</p>
    `;
  const teamBodyText = `A visitor just submitted the contact form on Xuvilo.\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nLanguage: ${isAr ? "Arabic (ar)" : "English (en)"}\n\nMessage:\n${message}\n\nReply directly to this email to respond to ${name}.`;

  const teamEmailRendered = renderBrandedEmail({
    lang: teamLang,
    preheader: teamPreheader,
    heading: teamHeading,
    bodyHtml: teamBodyHtml,
    bodyText: teamBodyText,
    recipientEmail: teamEmail,
    baseUrl: origin,
  });

  let userMailOk = false;
  let teamMailOk = false;
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    try {
      await client.send({
        to: email,
        from: fromEmail,
        subject: userSubject,
        text: userEmail.text,
        html: userEmail.html,
        replyTo: teamEmail,
      });
      userMailOk = true;
    } catch (userErr) {
      logger.error({ err: userErr }, "contact: user auto-reply send failed");
    }

    try {
      await client.send({
        to: teamEmail,
        from: fromEmail,
        subject: teamSubject,
        text: teamEmailRendered.text,
        html: teamEmailRendered.html,
        replyTo: email,
      });
      teamMailOk = true;
    } catch (teamErr) {
      logger.error({ err: teamErr }, "contact: team notification send failed");
    }
  } catch (mailErr) {
    logger.error({ err: mailErr }, "contact: sendgrid client unavailable");
  }

  const mailStatus =
    userMailOk && teamMailOk
      ? "sent"
      : !userMailOk && !teamMailOk
        ? "failed"
        : "partial";

  return { userMailOk, teamMailOk, mailStatus };
}
