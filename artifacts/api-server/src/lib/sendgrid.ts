// SendGrid email client.
// Credential resolution order:
//   1. Direct env vars: SENDGRID_API_KEY + SENDGRID_FROM_EMAIL  (works on any platform)
//   2. Replit Connectors API                                     (only available on Replit)
// Do not cache the client — credentials may rotate.
import sgMail from "@sendgrid/mail";

interface ConnectionItem {
  connector_name?: string;
  settings?: { api_key?: string; from_email?: string };
}

async function getCredentials(): Promise<{ apiKey: string; email: string }> {
  // SENDGRID_FROM_EMAIL overrides the connector's from_email even when the
  // API key comes from the Replit connector. This lets the From address use
  // the domain-authenticated sending domain (e.g. no-reply@xuvilo.com)
  // instead of the personal address stored on the connector — deliverability
  // (DKIM alignment) requires the From domain to match the authenticated one.
  const directKey = process.env["SENDGRID_API_KEY"];
  const directFrom = process.env["SENDGRID_FROM_EMAIL"];

  // ── Path 1: direct env vars (standard, works on any host) ─────────────────
  if (directKey && directFrom) {
    return { apiKey: directKey, email: directFrom };
  }

  // ── Path 2: Replit Connectors (only available on Replit) ──────────────────
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (hostname && xReplitToken) {
    // NOTE: the `connector_names=sendgrid` query filter stopped matching on
    // the connectors API (returns 0 items even when the connection exists),
    // so we fetch the unfiltered list and select by connector_name instead.
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true`,
      { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } },
    );
    if (!res.ok) {
      throw new Error(
        `SendGrid credential lookup failed: connectors API returned ${res.status}`,
      );
    }
    const data = (await res.json()) as { items?: ConnectionItem[] };
    const item = data.items?.find((i) => i.connector_name === "sendgrid");
    const fromEmail = directFrom || item?.settings?.from_email;
    if (item?.settings?.api_key && fromEmail) {
      return { apiKey: item.settings.api_key, email: fromEmail };
    }
  }

  throw new Error(
    "SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.",
  );
}

export async function getUncachableSendGridClient(): Promise<{
  client: typeof sgMail;
  fromEmail: string;
}> {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return { client: sgMail, fromEmail: email };
}
