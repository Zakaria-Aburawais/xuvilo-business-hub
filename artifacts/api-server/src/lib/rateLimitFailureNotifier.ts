import { logger } from "./logger";
import { getUncachableSendGridClient } from "./sendgrid";
import { renderBrandedEmail } from "./emailTemplate";
import { claimAlertSlot } from "./alertDebounce";

// Stable, grep-friendly key in the `alert_debounce` ledger, alongside
// `spam_spike` and `pruner_health:*`.
const RATE_LIMIT_ALERT_KEY = "rate_limit_fail_closed";

const WEBHOOK_TIMEOUT_MS = 3000;
const MINUTE_MS = 60 * 1000;
const DEFAULT_DEBOUNCE_MINUTES = 60;

// How many fail-closed 503s within the rolling window it takes before we
// treat this as "an incident" rather than a single blip. A one-off dropped
// connection self-heals and shouldn't page anyone; a stream of denials
// within a minute means real visitors are being turned away.
const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60 * 1000;

// Re-uses the SAME env vars as the spam-spike notifier so an operator who
// already wired up alerting automatically gets this signal too. The
// dedicated debounce env lets ops tune this alert's cool-down separately.
const WEBHOOK_ENV = "SPAM_SPIKE_WEBHOOK_URL";
const EMAIL_ENV = "SPAM_SPIKE_ALERT_EMAIL";
const DEBOUNCE_ENV_PRIMARY = "RATE_LIMIT_ALERT_DEBOUNCE_MINUTES";
const DEBOUNCE_ENV_FALLBACK = "SPAM_SPIKE_DEBOUNCE_MINUTES";

export interface RateLimitAlertConfig {
  webhookUrl: string | null;
  alertEmail: string | null;
  debounceMs: number;
}

export interface RateLimitFailurePayload {
  // Prefix → number of denied requests inside the rolling window at the
  // moment the alert fired. Names the limiter(s) affected so ops can see
  // which routes (contact, auth, …) are turning visitors away.
  deniedByPrefix: Record<string, number>;
  totalDenied: number;
  windowSeconds: number;
  generatedAt: string;
}

interface Deps {
  now: () => number;
  // Persistent debounce claim. May THROW when the DB is down — the caller
  // treats a throw as "ledger unreachable" and falls back to the in-memory
  // debounce rather than suppressing (the DB being down is exactly the
  // condition this alert exists for).
  claimSlotPersistent: (
    alertKey: string,
    debounceMs: number,
    nowMs: number,
  ) => Promise<boolean>;
  sendWebhook: (
    url: string,
    payload: RateLimitFailurePayload,
  ) => Promise<boolean>;
  sendEmail: (to: string, payload: RateLimitFailurePayload) => Promise<boolean>;
}

// Rolling window of fail-closed denial timestamps, per limiter prefix.
// In-memory on purpose: this counter must keep working while the database
// is unreachable (that's the whole trigger condition).
const recentFailures: Map<string, number[]> = new Map();

// In-memory debounce timestamp. Primary guard when the persistent ledger
// can't be written (DB down); also consulted first as a cheap pre-check.
// Trade-off: a server restart mid-outage may re-send one alert. Acceptable —
// far better than an outage alert that can never fire because the debounce
// store shares the outage.
let lastAlertAtMs = 0;

/**
 * Read alert config from env. Returns null when alerting is disabled
 * (no channel configured) so the hot path can no-op cheaply.
 */
export function readRateLimitAlertConfig(): RateLimitAlertConfig | null {
  const webhookUrl = process.env[WEBHOOK_ENV]?.trim() || null;
  const alertEmail = process.env[EMAIL_ENV]?.trim() || null;
  if (!webhookUrl && !alertEmail) return null;

  // Integer-only parsing, same rule as the other notifiers — a typo like
  // "1.5" must not silently floor.
  let debounceMinutes = DEFAULT_DEBOUNCE_MINUTES;
  const raw =
    process.env[DEBOUNCE_ENV_PRIMARY]?.trim() ||
    process.env[DEBOUNCE_ENV_FALLBACK]?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) debounceMinutes = n;
  }

  return { webhookUrl, alertEmail, debounceMs: debounceMinutes * MINUTE_MS };
}

function pruneAndCount(nowMs: number): {
  deniedByPrefix: Record<string, number>;
  totalDenied: number;
} {
  const cutoff = nowMs - FAILURE_WINDOW_MS;
  const deniedByPrefix: Record<string, number> = {};
  let totalDenied = 0;
  for (const [prefix, stamps] of recentFailures) {
    const kept = stamps.filter((t) => t > cutoff);
    if (kept.length === 0) {
      recentFailures.delete(prefix);
      continue;
    }
    recentFailures.set(prefix, kept);
    deniedByPrefix[prefix] = kept.length;
    totalDenied += kept.length;
  }
  return { deniedByPrefix, totalDenied };
}

function formatPrefixLines(p: RateLimitFailurePayload): string[] {
  return Object.entries(p.deniedByPrefix)
    .sort((a, b) => b[1] - a[1])
    .map(([prefix, count]) => `• ${prefix}: ${count} denied`);
}

function buildSlackPayload(p: RateLimitFailurePayload): {
  text: string;
  blocks: unknown[];
} {
  const headline =
    `:rotating_light: Rate limiter failing CLOSED: ~${p.totalDenied} real requests denied with 503 ` +
    `in the last ${p.windowSeconds}s (limiter storage unreachable).`;
  const prefixLines = formatPrefixLines(p);

  const text = [
    headline,
    "",
    "Affected limiter prefixes:",
    ...prefixLines,
    "",
    "Likely cause: the database backing the rate limiter is unreachable.",
    `Generated at: ${p.generatedAt}`,
  ].join("\n");

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `*${headline}*` } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Affected limiter prefixes:*\n${prefixLines.join("\n")}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "Real visitors on protected routes (contact form, auth, …) are being " +
          "turned away with 503s. Likely cause: the database backing the rate " +
          "limiter is unreachable. Check database health first.",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated at ${p.generatedAt}. Further alerts are debounced for the configured cool-down window.`,
        },
      ],
    },
  ];

  return { text, blocks };
}

async function defaultSendWebhook(
  url: string,
  payload: RateLimitFailurePayload,
): Promise<boolean> {
  if (!/^https?:\/\//.test(url)) {
    logger.error(
      { url: url.slice(0, 64) },
      "rate-limit-alert: webhook URL is not a valid http(s) URL — alert NOT sent",
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
        "rate-limit-alert: webhook returned non-OK status — alert NOT sent",
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error(
      { err },
      "rate-limit-alert: webhook request threw — alert NOT sent",
    );
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
export function buildRateLimitAlertEmailBody(payload: RateLimitFailurePayload): {
  subject: string;
  heading: string;
  bodyText: string;
  bodyHtml: string;
} {
  const subject = `[Xuvilo] Rate limiter failing closed — ~${payload.totalDenied} requests denied`;
  const heading = "Rate limiter is denying real visitors (fail-closed)";
  const prefixLines = formatPrefixLines(payload);

  const bodyText =
    `The rate limiter's storage is unreachable, so protected routes are ` +
    `returning 503 to real visitors instead of letting requests through.\n\n` +
    `~${payload.totalDenied} requests denied in the last ${payload.windowSeconds} seconds.\n\n` +
    `Affected limiter prefixes:\n${prefixLines.join("\n")}\n\n` +
    `Likely cause: the database is down or unreachable. Check database health first.\n` +
    `Generated at: ${payload.generatedAt}\n\n` +
    `Further alerts are debounced for the configured cool-down window.`;

  const prefixHtml = prefixLines
    .map(
      (line) =>
        `<div style="font-size:14px; color:#0f172a; margin-bottom:4px;">${escapeHtml(line)}</div>`,
    )
    .join("\n");

  const bodyHtml = `
        <p style="margin:0 0 12px 0;">
          The rate limiter's storage is unreachable, so protected routes
          (contact form, auth, …) are returning <strong>503</strong> to real
          visitors instead of letting requests through.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#991b1b; margin-bottom:4px;">Denied requests (last ${payload.windowSeconds}s)</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">~${payload.totalDenied}</div>
            <div style="font-size:13px; color:#991b1b; margin-bottom:6px;">Affected limiter prefixes</div>
            ${prefixHtml}
            <div style="font-size:13px; color:#991b1b; margin:12px 0 4px 0;">Generated at</div>
            <div style="font-size:15px; color:#0f172a;">${escapeHtml(payload.generatedAt)}</div>
          </td></tr>
        </table>
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">
          Likely cause: the database is down or unreachable. Check database
          health first. Further alerts are debounced for the configured
          cool-down window.
        </p>
      `;

  return { subject, heading, bodyText, bodyHtml };
}

async function defaultSendEmail(
  to: string,
  payload: RateLimitFailurePayload,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const { subject, heading, bodyText, bodyHtml } =
      buildRateLimitAlertEmailBody(payload);

    const rendered = renderBrandedEmail({
      lang: "en",
      preheader: `~${payload.totalDenied} requests denied in the last ${payload.windowSeconds}s — limiter storage unreachable`,
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
    logger.error({ err }, "rate-limit-alert: alert email send failed");
    return false;
  }
}

const realDeps: Deps = {
  now: () => Date.now(),
  // Best-effort write to the shared ledger; the result is advisory only
  // (see the call site in `recordRateLimitStorageFailure`).
  claimSlotPersistent: claimAlertSlot,
  sendWebhook: defaultSendWebhook,
  sendEmail: defaultSendEmail,
};

/**
 * Called (fire-and-forget) from the rate limiter's fail-closed catch block
 * every time a request is denied with 503 because the limiter's storage was
 * unreachable.
 *
 * Behaviour:
 *  - Disabled by default: if neither SPAM_SPIKE_WEBHOOK_URL nor
 *    SPAM_SPIKE_ALERT_EMAIL is set, this only maintains the in-memory
 *    counter (cheap) and never sends anything.
 *  - Counts denials per limiter prefix in a rolling 60s window (in-memory —
 *    the DB is down when this matters, so no DB reads/writes on this path).
 *  - When total denials in the window reach the threshold, sends one alert
 *    via the existing spam-alert channels, naming the affected prefixes and
 *    the approximate denial count.
 *  - Debounce: the in-memory timestamp is the primary guard (it works while
 *    the DB is down). The persistent ledger is ALSO written best-effort so
 *    the cool-down survives restarts once the DB is back; but a persistent-
 *    claim "false" (which may just mean "DB unreachable") never suppresses
 *    an alert the in-memory guard allows.
 *  - All errors are swallowed (logged only) so the request path is never
 *    affected by alerting failures.
 */
export async function recordRateLimitStorageFailure(
  prefix: string,
  depsOverride?: Partial<Deps>,
): Promise<void> {
  const deps: Deps = { ...realDeps, ...depsOverride };
  try {
    const nowMs = deps.now();

    const stamps = recentFailures.get(prefix) ?? [];
    stamps.push(nowMs);
    recentFailures.set(prefix, stamps);

    const { deniedByPrefix, totalDenied } = pruneAndCount(nowMs);

    const cfg = readRateLimitAlertConfig();
    if (!cfg) return;
    if (totalDenied < FAILURE_THRESHOLD) return;

    // In-memory debounce is the source of truth here (the DB — where the
    // persistent ledger lives — is the thing that's down).
    if (nowMs - lastAlertAtMs < cfg.debounceMs) return;
    lastAlertAtMs = nowMs;

    // Best-effort persistent claim so the cool-down survives a restart
    // once the DB recovers. Its answer is deliberately ADVISORY ONLY and
    // never suppresses: `false` is ambiguous — it can mean "a previous
    // process alerted recently" OR "the ledger itself is unreachable"
    // (claimAlertSlot fails closed on DB errors), and the DB being down
    // is exactly the condition this alert exists for. The in-memory guard
    // above is the debounce source of truth; the ledger write just makes
    // a mid-incident restart less likely to re-page once the DB is back.
    try {
      await deps.claimSlotPersistent(
        RATE_LIMIT_ALERT_KEY,
        cfg.debounceMs,
        nowMs,
      );
    } catch (err) {
      logger.warn(
        { err },
        "rate-limit-alert: persistent debounce claim failed — proceeding with in-memory debounce",
      );
    }

    const payload: RateLimitFailurePayload = {
      deniedByPrefix,
      totalDenied,
      windowSeconds: Math.round(FAILURE_WINDOW_MS / 1000),
      generatedAt: new Date(nowMs).toISOString(),
    };

    logger.error(
      { rateLimitFailClosed: { deniedByPrefix, totalDenied } },
      "rate-limit-alert: fail-closed threshold exceeded — sending alert",
    );

    const tasks: Array<Promise<unknown>> = [];
    if (cfg.webhookUrl) tasks.push(deps.sendWebhook(cfg.webhookUrl, payload));
    if (cfg.alertEmail) tasks.push(deps.sendEmail(cfg.alertEmail, payload));
    await Promise.allSettled(tasks);
  } catch (err) {
    // Never let alerting failures affect the request path.
    logger.error({ err }, "rate-limit-alert: notifier threw unexpectedly");
  }
}

// Stable export so tests and the admin dashboard can refer to the ledger key.
export const RATE_LIMIT_ALERT_DEBOUNCE_KEY = RATE_LIMIT_ALERT_KEY;

/** Test-only: wipe the in-memory failure window and debounce timestamp. */
export function _resetRateLimitAlertStateForTests(): void {
  recentFailures.clear();
  lastAlertAtMs = 0;
}
