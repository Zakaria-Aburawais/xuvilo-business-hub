import { logger } from "./logger";

export interface ContactFailureDetails {
  messageId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  lang: string;
  mailStatus: "failed" | "partial";
  userMailOk: boolean;
  teamMailOk: boolean;
}

const WEBHOOK_TIMEOUT_MS = 3000;
const MESSAGE_PREVIEW_MAX = 1000;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

function describeFailure(d: ContactFailureDetails): string {
  if (d.mailStatus === "failed") {
    return "Contact form email FAILED — visitor did not get an auto-reply and the team did not get a notification.";
  }
  const parts: string[] = [];
  if (!d.userMailOk) parts.push("auto-reply to visitor failed");
  if (!d.teamMailOk) parts.push("team notification failed");
  return `Contact form email PARTIALLY failed — ${parts.join(" + ")}.`;
}

function buildSlackPayload(d: ContactFailureDetails): {
  text: string;
  blocks: unknown[];
} {
  const headline = describeFailure(d);
  const messagePreview = truncate(d.message, MESSAGE_PREVIEW_MAX);

  const text = [
    headline,
    "",
    `From: ${d.name} <${d.email}>`,
    `Subject: ${d.subject}`,
    `Lang: ${d.lang}`,
    d.messageId ? `Message ID: ${d.messageId}` : null,
    "",
    "Message:",
    messagePreview,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const fields: Array<{ type: "mrkdwn"; text: string }> = [
    { type: "mrkdwn", text: `*From:*\n${d.name}` },
    { type: "mrkdwn", text: `*Email:*\n${d.email}` },
    { type: "mrkdwn", text: `*Subject:*\n${d.subject}` },
    { type: "mrkdwn", text: `*Language:*\n${d.lang}` },
  ];
  if (d.messageId) {
    fields.push({ type: "mrkdwn", text: `*Message ID:*\n${d.messageId}` });
  }

  const blocks: unknown[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:warning: *${headline}*` },
    },
    { type: "section", fields },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Message:*\n\`\`\`${messagePreview}\`\`\``,
      },
    },
  ];

  return { text, blocks };
}

/**
 * Notify the team that a contact-form email failed to send, using a fallback
 * channel that does NOT depend on SendGrid (the same path that just failed).
 *
 * Behaviour:
 *  - Always logs the failure at error level with structured fields, so the
 *    team can find it in production logs even if no webhook is configured.
 *  - If `CONTACT_FAILURE_WEBHOOK_URL` is set, posts a Slack-compatible JSON
 *    payload to it (Slack, Discord, and most generic webhook tools accept
 *    this shape — unknown fields are ignored).
 *  - If the webhook itself fails (non-OK status, timeout, network error),
 *    logs that loudly so the team knows the fallback also failed.
 */
export async function notifyContactFailure(
  d: ContactFailureDetails,
): Promise<void> {
  const webhookUrl = process.env["CONTACT_FAILURE_WEBHOOK_URL"]?.trim();
  const webhookConfigured = Boolean(webhookUrl);

  // Include the message body (truncated) directly in the structured log so
  // that even when no webhook is configured, the team has everything they
  // need in production logs to follow up with the visitor manually.
  logger.error(
    {
      contactFailure: {
        id: d.messageId,
        name: d.name,
        email: d.email,
        subject: d.subject,
        lang: d.lang,
        mailStatus: d.mailStatus,
        userMailOk: d.userMailOk,
        teamMailOk: d.teamMailOk,
        webhookConfigured,
        message: truncate(d.message, MESSAGE_PREVIEW_MAX),
      },
    },
    "contact: mail send failed — team must follow up with the visitor manually",
  );

  if (!webhookUrl) return;

  if (!/^https?:\/\//.test(webhookUrl)) {
    logger.error(
      { messageId: d.messageId },
      "contact: CONTACT_FAILURE_WEBHOOK_URL is set but is not a valid http(s) URL — fallback notification did NOT reach the team",
    );
    return;
  }

  const payload = buildSlackPayload(d);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        {
          status: res.status,
          body: body.slice(0, 500),
          messageId: d.messageId,
        },
        "contact: failure webhook returned non-OK status — fallback notification did NOT reach the team",
      );
    }
  } catch (err) {
    logger.error(
      { err, messageId: d.messageId },
      "contact: failure webhook request threw — fallback notification did NOT reach the team",
    );
  } finally {
    clearTimeout(timer);
  }
}
