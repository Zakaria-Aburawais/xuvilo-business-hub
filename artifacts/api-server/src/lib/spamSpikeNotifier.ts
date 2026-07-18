import { sql } from "drizzle-orm";
import { db, spamEventsTable } from "@workspace/db";
import { logger } from "./logger";
import { getUncachableSendGridClient } from "./sendgrid";
import { renderBrandedEmail } from "./emailTemplate";
import { claimAlertSlot } from "./alertDebounce";
import {
  readAllPrunerHealthSummaries,
  formatPrunerHealthLine,
  type PrunerHealthSummary,
} from "./prunerHealthSummary";

// Stable, grep-friendly alert key for the persistent debounce ledger. Kept
// distinct from the per-pruner keys used by `pruneHealthNotifier` so a
// chronic spam-spike cool-down can never silence a separate pruner alert
// (and vice versa).
const SPAM_SPIKE_ALERT_KEY = "spam_spike";

const ONE_HOUR_MS = 60 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 3000;
const DEFAULT_DEBOUNCE_MINUTES = 60;

export interface SpikeChannelConfig {
  webhookUrl: string | null;
  alertEmail: string | null;
}

export interface SpikeConfig extends SpikeChannelConfig {
  threshold: number;
  debounceMs: number;
}

interface HourCounts {
  honeypot: number;
  captcha: number;
  total: number;
}

interface SpikeDeps {
  now: () => number;
  countLastHour: () => Promise<HourCounts>;
  // Atomic claim against the persistent debounce ledger. Returns true when
  // the caller has just won the alerting slot and should send, false when
  // a previous alert is still inside the cool-down window. Injected so
  // tests can exercise the debounce branch without hitting the DB.
  claimSlot: (
    alertKey: string,
    debounceMs: number,
    nowMs: number,
  ) => Promise<boolean>;
  sendWebhook: (url: string, payload: SpikeAlertPayload) => Promise<boolean>;
  sendEmail: (to: string, payload: SpikeAlertPayload) => Promise<boolean>;
  // Best-effort read of background-pruner health so the alert can carry a
  // "Background cleanup health" section. Must never throw; an empty array
  // means "couldn't read / nothing to report" and the section is omitted
  // from human-facing renderings.
  readPrunerHealth: (nowMs: number) => Promise<PrunerHealthSummary[]>;
}

export interface SpikeAlertSummary {
  enabled: boolean;
  threshold: number | null;
  debounceMinutes: number | null;
  channels: {
    webhook: boolean;
    email: boolean;
  };
}

export interface SpikeAlertPayload {
  threshold: number;
  windowMinutes: number;
  counts: HourCounts;
  triggerKind: "honeypot" | "captcha";
  generatedAt: string;
  // Health of the background pruners at alert time — same story the admin
  // dashboard badges tell ("failing"/"stale" + last good run age). Included
  // in the webhook payload so downstream automation can read it
  // programmatically, and rendered as a "Background cleanup health" section
  // in the email/Slack bodies. Empty array when the snapshots couldn't be
  // read (a DB blip must never block the spike alert itself).
  prunerHealth: PrunerHealthSummary[];
}

// Debouncing is now persisted to the `alert_debounce` table via
// `claimAlertSlot` so a deploy-driven restart in the middle of an ongoing
// spike doesn't immediately re-page ops. There is intentionally NO
// in-memory cache here — the persistent ledger is the single source of
// truth, and one extra DB upsert per spam event is cheaper than the
// nightmare of two debounce sources of truth disagreeing after a restart.

/**
 * Read and validate spike-alert configuration from env vars. Returns null
 * when alerting is disabled — which is the DEFAULT — so the rest of the
 * notifier can no-op cheaply on every spam event without a deploy needing
 * any of these set.
 *
 * Disabled means any of:
 *  - SPAM_SPIKE_THRESHOLD missing or not a positive integer.
 *  - Neither SPAM_SPIKE_WEBHOOK_URL nor SPAM_SPIKE_ALERT_EMAIL set
 *    (we have nowhere to send the alert).
 */
export function readSpikeConfig(): SpikeConfig | null {
  // Threshold must be a positive INTEGER. Reject decimals like "1.9"
  // outright instead of silently flooring them — a typo in production env
  // shouldn't quietly change behaviour.
  const rawThreshold = process.env["SPAM_SPIKE_THRESHOLD"]?.trim();
  if (!rawThreshold || !/^\d+$/.test(rawThreshold)) return null;
  const threshold = Number(rawThreshold);
  if (!Number.isFinite(threshold) || threshold < 1) return null;

  const rawDebounce = process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"]?.trim();
  let debounceMinutes = DEFAULT_DEBOUNCE_MINUTES;
  if (rawDebounce) {
    // Same rule for debounce minutes — integer only, no silent flooring.
    if (/^\d+$/.test(rawDebounce)) {
      const n = Number(rawDebounce);
      if (Number.isFinite(n) && n >= 1) debounceMinutes = n;
    }
  }

  const webhookUrl = process.env["SPAM_SPIKE_WEBHOOK_URL"]?.trim() || null;
  const alertEmail = process.env["SPAM_SPIKE_ALERT_EMAIL"]?.trim() || null;
  if (!webhookUrl && !alertEmail) return null;

  return {
    threshold: Math.floor(threshold),
    debounceMs: debounceMinutes * 60 * 1000,
    webhookUrl,
    alertEmail,
  };
}

/**
 * Public, leak-safe view of the spike-alert configuration for the admin
 * dashboard. Reports whether alerting is wired up at all and which channels
 * would be notified, but NEVER returns the actual webhook URL or alert
 * email address — those stay server-side.
 */
export function getSpikeAlertSummary(): SpikeAlertSummary {
  const cfg = readSpikeConfig();
  if (!cfg) {
    return {
      enabled: false,
      threshold: null,
      debounceMinutes: null,
      channels: { webhook: false, email: false },
    };
  }
  return {
    enabled: true,
    threshold: cfg.threshold,
    debounceMinutes: Math.round(cfg.debounceMs / 60000),
    channels: {
      webhook: Boolean(cfg.webhookUrl),
      email: Boolean(cfg.alertEmail),
    },
  };
}

async function defaultCountLastHour(): Promise<HourCounts> {
  const since = new Date(Date.now() - ONE_HOUR_MS);
  const rows = await db
    .select({
      kind: spamEventsTable.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(spamEventsTable)
    .where(sql`${spamEventsTable.createdAt} >= ${since}`)
    .groupBy(spamEventsTable.kind);

  let honeypot = 0;
  let captcha = 0;
  for (const r of rows) {
    const c = Number(r.count) || 0;
    if (r.kind === "honeypot") honeypot += c;
    else if (r.kind === "captcha") captcha += c;
  }
  return { honeypot, captcha, total: honeypot + captcha };
}

function buildSlackPayload(p: SpikeAlertPayload): {
  text: string;
  blocks: unknown[];
} {
  const headline =
    `:rotating_light: Contact-form spam spike: ${p.counts.total} hits in the last ${p.windowMinutes}m ` +
    `(threshold ${p.threshold}).`;

  const healthLines = p.prunerHealth.map(formatPrunerHealthLine);

  const text = [
    headline,
    "",
    `Honeypot: ${p.counts.honeypot}`,
    `Captcha:  ${p.counts.captcha}`,
    `Most recent kind: ${p.triggerKind}`,
    `Generated at: ${p.generatedAt}`,
    ...(healthLines.length > 0
      ? ["", "Background cleanup health:", ...healthLines]
      : []),
  ].join("\n");

  const blocks: unknown[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${headline}*` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Honeypot:*\n${p.counts.honeypot}` },
        { type: "mrkdwn", text: `*Captcha:*\n${p.counts.captcha}` },
        { type: "mrkdwn", text: `*Total:*\n${p.counts.total}` },
        { type: "mrkdwn", text: `*Threshold:*\n${p.threshold}` },
        { type: "mrkdwn", text: `*Window:*\n${p.windowMinutes} min` },
        { type: "mrkdwn", text: `*Latest kind:*\n${p.triggerKind}` },
      ],
    },
    ...(healthLines.length > 0
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Background cleanup health:*\n${healthLines.join("\n")}`,
            },
          },
        ]
      : []),
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated at ${p.generatedAt}. Open the admin Spam dashboard for the full breakdown.`,
        },
      ],
    },
  ];

  return { text, blocks };
}

async function defaultSendWebhook(
  url: string,
  payload: SpikeAlertPayload,
): Promise<boolean> {
  if (!/^https?:\/\//.test(url)) {
    logger.error(
      { url: url.slice(0, 64) },
      "spam-spike: SPAM_SPIKE_WEBHOOK_URL is not a valid http(s) URL — alert NOT sent",
    );
    return false;
  }
  const slack = buildSlackPayload(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slack),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: body.slice(0, 500) },
        "spam-spike: webhook returned non-OK status — alert NOT sent",
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "spam-spike: webhook request threw — alert NOT sent");
    return false;
  } finally {
    clearTimeout(timer);
  }
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Exported so tests can assert on the rendered email body without going
// through SendGrid. `defaultSendEmail` is a thin shell around this.
export function buildSpikeEmailBody(payload: SpikeAlertPayload): {
  subject: string;
  heading: string;
  bodyText: string;
  bodyHtml: string;
} {
  const subject = `[Xuvilo] Contact spam spike — ${payload.counts.total} hits in the last hour`;
  const heading = "Contact-form spam spike detected";

  const healthLines = payload.prunerHealth.map(formatPrunerHealthLine);
  const healthTextSection =
    healthLines.length > 0
      ? `\n\nBackground cleanup health:\n${healthLines.join("\n")}`
      : "";
  const healthHtmlSection =
    healthLines.length > 0
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; margin-top:12px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#92400e; margin-bottom:6px;">Background cleanup health</div>
            ${healthLines
              .map(
                (line) =>
                  `<div style="font-size:14px; color:#0f172a; margin-bottom:4px;">${escapeHtml(line)}</div>`,
              )
              .join("\n")}
          </td></tr>
        </table>`
      : "";

  const bodyText =
    `${payload.counts.total} spam-defense hits in the last ${payload.windowMinutes} minutes ` +
    `(threshold ${payload.threshold}).\n\n` +
    `Honeypot: ${payload.counts.honeypot}\n` +
    `Captcha:  ${payload.counts.captcha}\n` +
    `Latest kind: ${payload.triggerKind}\n` +
    `Generated at: ${payload.generatedAt}` +
    healthTextSection +
    `\n\nOpen the admin Spam dashboard for the full breakdown. Further alerts are debounced for the configured cool-down window.`;
  const bodyHtml = `
        <p style="margin:0 0 12px 0;">
          <strong>${payload.counts.total}</strong> spam-defense hits in the last
          <strong>${payload.windowMinutes} minutes</strong>
          (threshold <strong>${payload.threshold}</strong>).
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Honeypot hits</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${payload.counts.honeypot}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Captcha rejections</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${payload.counts.captcha}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Latest kind</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${payload.triggerKind}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Generated at</div>
            <div style="font-size:15px; color:#0f172a;">${payload.generatedAt}</div>
          </td></tr>
        </table>${healthHtmlSection}
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">
          Further alerts are debounced for the configured cool-down window so a
          single ongoing wave doesn't flood your inbox.
        </p>
      `;

  return { subject, heading, bodyText, bodyHtml };
}

async function defaultSendEmail(
  to: string,
  payload: SpikeAlertPayload,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const { subject, heading, bodyText, bodyHtml } =
      buildSpikeEmailBody(payload);

    const rendered = renderBrandedEmail({
      lang: "en",
      preheader: `${payload.counts.total} hits in the last ${payload.windowMinutes}m (threshold ${payload.threshold})`,
      heading,
      bodyHtml,
      bodyText,
      recipientEmail: to,
      baseUrl: getTrustedOrigin(),
    });

    await client.send({
      to,
      from: fromEmail,
      subject,
      text: rendered.text,
      html: rendered.html,
    });
    return true;
  } catch (err) {
    logger.error({ err }, "spam-spike: alert email send failed");
    return false;
  }
}

const realDeps: SpikeDeps = {
  now: () => Date.now(),
  countLastHour: defaultCountLastHour,
  claimSlot: claimAlertSlot,
  sendWebhook: defaultSendWebhook,
  sendEmail: defaultSendEmail,
  readPrunerHealth: readAllPrunerHealthSummaries,
};

/**
 * Called from the contact route after each spam-defense event is recorded.
 *
 * Behaviour:
 *  - Disabled by default. If `SPAM_SPIKE_THRESHOLD` and at least one channel
 *    (`SPAM_SPIKE_WEBHOOK_URL` / `SPAM_SPIKE_ALERT_EMAIL`) are not set, the
 *    function returns immediately without touching the DB.
 *  - Otherwise counts honeypot+captcha events in the last hour. If the count
 *    is >= threshold AND no alert has fired in the debounce window, sends
 *    a Slack-compatible webhook and/or an email and updates the in-memory
 *    debounce timestamp.
 *  - All errors are swallowed (logged only) so the contact form is never
 *    affected by alerting failures.
 */
export async function maybeNotifySpamSpike(
  triggerKind: "honeypot" | "captcha",
  depsOverride?: Partial<SpikeDeps>,
): Promise<void> {
  const deps: SpikeDeps = { ...realDeps, ...depsOverride };
  try {
    const cfg = readSpikeConfig();
    if (!cfg) return;

    const now = deps.now();
    const counts = await deps.countLastHour();
    if (counts.total < cfg.threshold) return;

    // Reserve the debounce slot BEFORE sending so a burst of concurrent
    // events that all cross the threshold can't each fire their own alert.
    // The claim is persistent (alert_debounce table), so a deploy in the
    // middle of an ongoing spike does NOT re-page ops on the next event —
    // the cool-down is honoured across restarts.
    const claimed = await deps.claimSlot(
      SPAM_SPIKE_ALERT_KEY,
      cfg.debounceMs,
      now,
    );
    if (!claimed) return;

    // Best-effort pruner-health snapshot for the "Background cleanup
    // health" section. Guarded so a failure here can never block the
    // spike alert itself — the section simply drops out.
    let prunerHealth: PrunerHealthSummary[] = [];
    try {
      prunerHealth = await deps.readPrunerHealth(now);
    } catch (err) {
      logger.warn(
        { err },
        "spam-spike: failed to read pruner health for alert — section omitted",
      );
    }

    const payload: SpikeAlertPayload = {
      threshold: cfg.threshold,
      windowMinutes: 60,
      counts,
      triggerKind,
      generatedAt: new Date(now).toISOString(),
      prunerHealth,
    };

    logger.warn(
      {
        spamSpike: {
          threshold: cfg.threshold,
          honeypot: counts.honeypot,
          captcha: counts.captcha,
          total: counts.total,
          triggerKind,
          webhookConfigured: Boolean(cfg.webhookUrl),
          emailConfigured: Boolean(cfg.alertEmail),
        },
      },
      "spam-spike: threshold exceeded — sending alert",
    );

    const tasks: Array<Promise<unknown>> = [];
    if (cfg.webhookUrl) tasks.push(deps.sendWebhook(cfg.webhookUrl, payload));
    if (cfg.alertEmail) tasks.push(deps.sendEmail(cfg.alertEmail, payload));
    await Promise.allSettled(tasks);
  } catch (err) {
    // Belt-and-suspenders: any unexpected failure must not bubble up to the
    // contact route. The whole point of this notifier is to fire-and-forget.
    logger.error({ err }, "spam-spike: notifier threw unexpectedly");
  }
}

// Test-only helpers. With the persistent ledger there is no in-memory state
// to clear, but tests that exercise the real `claimAlertSlot` path need to
// wipe the row from `alert_debounce` between cases. Tests that override
// `claimSlot` via deps don't need to call this at all.
//
// Exported for backwards compatibility with existing tests that called the
// reset helper purely as a hygiene step — it is now a no-op for those
// tests (they inject `claimSlot` and never touch the DB row).
export function _resetSpikeStateForTests(): void {
  // Intentional no-op: persistent state lives in `alert_debounce`. Use
  // `_resetAlertDebounceForTests("spam_spike")` from `./alertDebounce` when
  // a test exercises the real DB-backed claim path.
}

// Stable export so tests and other modules can refer to the same alert
// key the notifier uses internally — keeps the `alert_debounce` row name
// in one place.
export const SPAM_SPIKE_DEBOUNCE_KEY = SPAM_SPIKE_ALERT_KEY;
