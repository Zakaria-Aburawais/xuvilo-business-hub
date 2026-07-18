import { sql } from "drizzle-orm";
import { db, prunerAlertEventsTable } from "@workspace/db";
import { logger } from "./logger";
import { getUncachableSendGridClient } from "./sendgrid";
import { renderBrandedEmail } from "./emailTemplate";
import { claimAlertSlot } from "./alertDebounce";

// Persistent debounce-key prefix. The full row name in `alert_debounce` is
// `pruner_health:<prunerKey>` so a chronic failure on one pruner can never
// silence another, AND so the rows are grep-friendly alongside
// `spam_spike` (the spam-spike notifier's key).
const ALERT_KEY_PREFIX = "pruner_health:";

const WEBHOOK_TIMEOUT_MS = 3000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DEFAULT_DEBOUNCE_MINUTES = 60;

// Re-uses the SAME env vars as the spam-spike notifier so an operator who
// already wired up alerting for one signal automatically gets alerts for the
// other — no extra env config required to opt in. The dedicated
// `PRUNE_HEALTH_DEBOUNCE_MINUTES` lets ops separate the cool-down between
// pruner alerts from the spam-spike cool-down (a one-hour spam-spike cadence
// makes sense for live attacks, but a chronic pruner failure usually wants
// a longer pause between repeats so the channel doesn't churn).
const WEBHOOK_ENV = "SPAM_SPIKE_WEBHOOK_URL";
const EMAIL_ENV = "SPAM_SPIKE_ALERT_EMAIL";
const DEBOUNCE_ENV_PRIMARY = "PRUNE_HEALTH_DEBOUNCE_MINUTES";
const DEBOUNCE_ENV_FALLBACK = "SPAM_SPIKE_DEBOUNCE_MINUTES";

export type PrunerHealthLevel = "failing" | "stale";

// What the alert payload represents. "failing" / "stale" mirror
// `PrunerHealthLevel`; "recovered" is fired exactly once when a pruner
// transitions back to healthy after we previously alerted on it; "test"
// is a synthetic delivery check fired manually from the admin dashboard
// (clearly labelled "TEST" in the rendered Slack/email body) so operators
// can verify the channel wiring without inducing a real pruner failure.
export type PrunerAlertKind = "failing" | "stale" | "recovered" | "test";

export interface PrunerLastRunSnapshot {
  ranAt: Date;
  error: string | null;
  // Most recent SUCCESSFUL run timestamp (typically read from the persisted
  // `last_success_at` column). Null if a successful run has never happened
  // (or pre-dates the column being added).
  lastSuccessAt: Date | null;
}

export interface PrunerHealthSnapshot {
  // Stable machine key used for the per-pruner debounce map. Keep it short
  // and grep-friendly (e.g. "spam_events", "rate_limit_buckets") because
  // it also appears in the alert payload.
  prunerKey: string;
  // Human-readable name shown in the alert ("spam_events pruner").
  prunerName: string;
  // Expected cadence in milliseconds. The staleness threshold is `2 *
  // intervalMs`, mirroring the dashboard badge so operators see one
  // consistent "is this thing healthy?" answer in both places.
  intervalMs: number;
  // Most recent persisted run, or null if the pruner has never run on this
  // database (brand-new install). Never-run is treated as "unknown" — we
  // explicitly do NOT page on it because a fresh boot kicks off a prune
  // within ~15s anyway, and paging during deploys would be noisy.
  lastRun: PrunerLastRunSnapshot | null;
}

export interface PrunerHealthAlertPayload {
  prunerKey: string;
  prunerName: string;
  // Kind of alert. Recovery alerts share the payload shape so the webhook
  // and email senders can branch on `health === "recovered"`.
  health: PrunerAlertKind;
  // Last error string when `health === "failing"`, otherwise null.
  lastError: string | null;
  // Age of the most recent SUCCESSFUL run, in milliseconds. Null when no
  // successful run is on record (brand-new DB, or pruner has never managed
  // to succeed).
  lastSuccessAgeMs: number | null;
  // ISO timestamp of the most recent persisted run, success or failure.
  // Useful when health is "stale" and there is no successful run on record
  // (operators still want to know when SOMETHING last happened).
  lastRunAt: string | null;
  // Echoed so the alert recipient can sanity-check the cadence the staleness
  // threshold was computed against.
  intervalMs: number;
  generatedAt: string;
  // Recovery-only: how long the pruner was unhealthy before this recovery
  // (i.e. now - the timestamp of the problem alert that opened the
  // incident). Null for problem alerts.
  unhealthyDurationMs: number | null;
  // Test-only: pre-rendered "Background cleanup health" lines (one per
  // pruner, same text the spam-spike alert carries) so the synthetic test
  // alert previews EXACTLY what a real alert's cleanup-health section looks
  // like. Undefined/empty on real problem/recovery alerts — those already
  // ARE the cleanup-health story.
  cleanupHealthLines?: string[];
}

export interface PrunerHealthConfig {
  webhookUrl: string | null;
  alertEmail: string | null;
  debounceMs: number;
}

interface Deps {
  now: () => number;
  // Atomic claim against the persistent debounce ledger. Returns true when
  // the caller has just won the alerting slot for `alertKey` and should
  // send, false when a previous alert is still inside the cool-down window.
  // Injected so tests can exercise the debounce branch without hitting
  // the DB.
  claimSlot: (
    alertKey: string,
    debounceMs: number,
    nowMs: number,
  ) => Promise<boolean>;
  sendWebhook: (
    url: string,
    payload: PrunerHealthAlertPayload,
  ) => Promise<boolean>;
  sendEmail: (
    to: string,
    payload: PrunerHealthAlertPayload,
  ) => Promise<boolean>;
  // Persist the alert to the `pruner_alert_events` table so the admin
  // dashboard can show a history strip that survives server restarts. The
  // in-memory `alertState` map below resets on every boot, so without this
  // log every prior incident would be invisible after a deploy. Injectable
  // so unit tests can capture writes without touching the DB.
  recordEvent: (payload: PrunerHealthAlertPayload) => Promise<void>;
  // Best-effort reader for the pre-rendered "Background cleanup health"
  // lines the spam-spike alert carries. Used ONLY by the synthetic test
  // alert so operators previewing an alert see the exact same section a
  // real alert would include. Must resolve to [] on any failure — a DB
  // blip can never block the delivery test. Injectable for unit tests.
  readCleanupHealthLines: (nowMs: number) => Promise<string[]>;
}

// Per-pruner *recovery-only* state. The PROBLEM-alert debounce now lives
// in the `alert_debounce` table via `claimAlertSlot` so a deploy in the
// middle of an outage can't re-page ops on the very next pruner tick
// (Task #118). What stays in-memory is the bookkeeping the recovery path
// needs:
//
//  - openIncidentSince: when the *current* unhealthy incident first paged
//    us. Set when a problem alert ACTUALLY fires (post-claim) and there
//    is no open incident yet. Null while the pruner is considered "all
//    clear" for alerting purposes (either it has never paged, or the
//    recovery alert for the previous incident has already gone out).
//    Drives the recovery decision: a recovery alert only fires when this
//    is non-null AND the pruner is currently healthy.
//  - lastRecoveryAlertAt: timestamp of the most recent recovery alert,
//    used to suppress flapping (problem -> recovered -> problem ->
//    recovered within the cool-down window only sends one recovery
//    alert).
//
// These two fields are intentionally NOT in `alert_debounce`: the table
// is a single-column ledger keyed by alert-key, and adding a parallel
// "recovery" key would mean every chronic failure also writes a second
// row per pruner. The trade-off for keeping recovery state in memory is
// the same one the original implementation accepted: a restart in the
// middle of an open incident might cause the recovery alert to be
// missed. Acceptable — the problem alert is the loud one operators
// actually need, and missing a recovery is far better than re-paging on
// every deploy.
interface RecoveryState {
  openIncidentSince: number | null;
  lastRecoveryAlertAt: number;
}

const alertState: Map<string, RecoveryState> = new Map();

function getOrInitState(key: string): RecoveryState {
  let s = alertState.get(key);
  if (!s) {
    s = { openIncidentSince: null, lastRecoveryAlertAt: 0 };
    alertState.set(key, s);
  }
  return s;
}

/**
 * Read the pruner-health alert configuration from env. Returns null when
 * alerting is disabled (no channel configured) — in that case the notifier
 * no-ops without ever touching the DB or any sender.
 *
 * Disabled means: neither `SPAM_SPIKE_WEBHOOK_URL` nor `SPAM_SPIKE_ALERT_EMAIL`
 * is set. (We deliberately re-use the spam-spike envs so opting into one
 * channel opts into both signals — anything else would be a footgun.)
 */
export function readPrunerHealthConfig(): PrunerHealthConfig | null {
  const webhookUrl = process.env[WEBHOOK_ENV]?.trim() || null;
  const alertEmail = process.env[EMAIL_ENV]?.trim() || null;
  if (!webhookUrl && !alertEmail) return null;

  // Same parsing rules as the spam-spike notifier: integer-only, reject
  // decimals so a typo can't silently floor.
  let debounceMinutes = DEFAULT_DEBOUNCE_MINUTES;
  const raw =
    process.env[DEBOUNCE_ENV_PRIMARY]?.trim() ||
    process.env[DEBOUNCE_ENV_FALLBACK]?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) debounceMinutes = n;
  }

  return {
    webhookUrl,
    alertEmail,
    debounceMs: debounceMinutes * MINUTE_MS,
  };
}

/**
 * Decide what (if anything) is wrong with a pruner. Mirrors the dashboard's
 * `computeHealth` so operators see the same answer in both places:
 *   - non-null `lastRun.error` → failing (loudest signal)
 *   - lastRun.ranAt older than 2× intervalMs → stale
 *   - everything else → null (no alert)
 *
 * never-run pruners deliberately return null — see the comment on
 * `PrunerHealthSnapshot.lastRun`.
 */
export function evaluatePrunerHealth(
  snap: PrunerHealthSnapshot,
  nowMs: number,
): PrunerHealthLevel | null {
  const lastRun = snap.lastRun;
  if (!lastRun) return null;
  if (lastRun.error) return "failing";
  if (snap.intervalMs > 0) {
    const ageMs = nowMs - lastRun.ranAt.getTime();
    if (ageMs > 2 * snap.intervalMs) return "stale";
  }
  return null;
}

function buildSlackPayload(p: PrunerHealthAlertPayload): {
  text: string;
  blocks: unknown[];
} {
  if (p.health === "recovered") return buildSlackRecoveryPayload(p);
  if (p.health === "test") return buildSlackTestPayload(p);

  const emoji = p.health === "failing" ? ":rotating_light:" : ":warning:";
  const headlineHealth = p.health === "failing" ? "FAILING" : "STALE";
  const headline = `${emoji} Background pruner ${headlineHealth}: ${p.prunerName}`;

  const lastSuccessLine =
    p.lastSuccessAgeMs == null
      ? "Last successful run: never on record"
      : `Last successful run: ${formatAge(p.lastSuccessAgeMs)} ago`;
  const lastRunLine = p.lastRunAt
    ? `Last run (any outcome): ${p.lastRunAt}`
    : "Last run (any outcome): never";
  const errorLine = p.lastError
    ? `Last error: ${truncate(p.lastError, 300)}`
    : "Last error: (none recorded)";

  const text = [
    headline,
    "",
    lastSuccessLine,
    lastRunLine,
    errorLine,
    `Expected cadence: ${formatCadence(p.intervalMs)}`,
    `Generated at: ${p.generatedAt}`,
  ].join("\n");

  const blocks: unknown[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${headline}*` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Pruner:*\n${p.prunerName}` },
        { type: "mrkdwn", text: `*Status:*\n${headlineHealth}` },
        { type: "mrkdwn", text: `*${lastSuccessLine.split(":")[0]}:*\n${lastSuccessLine.slice(lastSuccessLine.indexOf(":") + 2)}` },
        { type: "mrkdwn", text: `*Cadence:*\n${formatCadence(p.intervalMs)}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${errorLine.split(":")[0]}:*\n${errorLine.slice(errorLine.indexOf(":") + 2)}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated at ${p.generatedAt}. Further alerts for this pruner are debounced for the configured cool-down.`,
        },
      ],
    },
  ];

  return { text, blocks };
}

function buildSlackRecoveryPayload(p: PrunerHealthAlertPayload): {
  text: string;
  blocks: unknown[];
} {
  const emoji = ":white_check_mark:";
  const headline = `${emoji} Background pruner RECOVERED: ${p.prunerName}`;
  const downtimeLine =
    p.unhealthyDurationMs != null
      ? `Was unhealthy for: ${formatAge(p.unhealthyDurationMs)}`
      : "Was unhealthy for: unknown";
  const recoveredAtLine = `Recovered at: ${p.generatedAt}`;
  const lastSuccessLine =
    p.lastSuccessAgeMs == null
      ? "Last successful run: never on record"
      : `Last successful run: ${formatAge(p.lastSuccessAgeMs)} ago`;

  const text = [
    headline,
    "",
    downtimeLine,
    recoveredAtLine,
    lastSuccessLine,
    `Expected cadence: ${formatCadence(p.intervalMs)}`,
  ].join("\n");

  const blocks: unknown[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${headline}*` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Pruner:*\n${p.prunerName}` },
        { type: "mrkdwn", text: `*Status:*\nRECOVERED` },
        {
          type: "mrkdwn",
          text: `*Was unhealthy for:*\n${
            p.unhealthyDurationMs != null
              ? formatAge(p.unhealthyDurationMs)
              : "unknown"
          }`,
        },
        { type: "mrkdwn", text: `*Cadence:*\n${formatCadence(p.intervalMs)}` },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Recovered at ${p.generatedAt}. Recovery alerts are debounced for the configured cool-down so a flapping pruner won't spam this channel.`,
        },
      ],
    },
  ];

  return { text, blocks };
}

function buildSlackTestPayload(p: PrunerHealthAlertPayload): {
  text: string;
  blocks: unknown[];
} {
  // Synthetic delivery check fired manually from the admin dashboard.
  // Every line includes a "TEST" marker so an on-call engineer scanning
  // their channel never confuses this for a real incident.
  const emoji = ":test_tube:";
  const headline = `${emoji} [TEST] Pruner-health alert delivery check`;
  const healthLines = p.cleanupHealthLines ?? [];
  const textLines = [
    headline,
    "",
    "This is a SYNTHETIC test alert triggered manually from the admin dashboard.",
    "No pruner is unhealthy and no incident has been opened.",
    `Generated at: ${p.generatedAt}`,
  ];
  if (healthLines.length > 0) {
    textLines.push(
      "",
      "Background cleanup health (live, as a real alert would show):",
      ...healthLines,
    );
  }
  const text = textLines.join("\n");

  const blocks: unknown[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${headline}*` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "This is a *synthetic test alert* triggered manually from the admin " +
          "dashboard. No pruner is unhealthy and no incident has been opened.",
      },
    },
    ...(healthLines.length > 0
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Background cleanup health (live, as a real alert would show):*\n" +
                healthLines.join("\n"),
            },
          },
        ]
      : []),
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated at ${p.generatedAt}. If you can read this, your pruner-health alert channel is wired up correctly.`,
        },
      ],
    },
  ];

  return { text, blocks };
}

async function defaultSendWebhook(
  url: string,
  payload: PrunerHealthAlertPayload,
): Promise<boolean> {
  if (!/^https?:\/\//.test(url)) {
    logger.error(
      { url: url.slice(0, 64) },
      "pruner-health: webhook URL is not a valid http(s) URL — alert NOT sent",
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
        "pruner-health: webhook returned non-OK status — alert NOT sent",
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error(
      { err },
      "pruner-health: webhook request threw — alert NOT sent",
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

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function formatCadence(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "unknown";
  const hours = Math.max(1, Math.round(ms / HOUR_MS));
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "24h" : `${days}d`;
  }
  return `${hours}h`;
}

export function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
    return `${minutes}m`;
  }
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

async function defaultSendEmail(
  to: string,
  payload: PrunerHealthAlertPayload,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    if (payload.health === "test") {
      // Synthetic delivery check. Subject and body BOTH carry the [TEST]
      // marker so an on-call engineer scanning their inbox can't misread
      // this for a real outage even if they only see the subject line.
      const subject = `[Xuvilo][TEST] Pruner-health alert delivery check`;
      const heading = "[TEST] Pruner-health alert delivery check";
      const healthLines = payload.cleanupHealthLines ?? [];
      const healthTextSection =
        healthLines.length > 0
          ? `\n\nBackground cleanup health (live, as a real alert would show):\n${healthLines.join("\n")}`
          : "";
      const bodyText =
        `This is a SYNTHETIC test alert triggered manually from the admin dashboard.\n\n` +
        `No pruner is unhealthy and no incident has been opened.\n` +
        `Generated at: ${payload.generatedAt}` +
        healthTextSection +
        `\n\nIf you received this, your pruner-health alert channel is wired up correctly.`;

      const healthHtmlSection =
        healthLines.length > 0
          ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-top:12px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#64748b; margin-bottom:6px;">Background cleanup health (live, as a real alert would show)</div>
            ${healthLines
              .map(
                (line) =>
                  `<div style="font-size:14px; color:#0f172a; margin-bottom:4px;">${escapeHtml(line)}</div>`,
              )
              .join("")}
          </td></tr>
        </table>`
          : "";

      const bodyHtml = `
        <p style="margin:0 0 12px 0;">
          This is a <strong>synthetic test alert</strong> triggered manually
          from the admin dashboard.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#1e40af; margin-bottom:4px;">Status</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;"><strong>[TEST]</strong> No pruner is unhealthy. No incident has been opened.</div>
            <div style="font-size:13px; color:#1e40af; margin-bottom:4px;">Generated at</div>
            <div style="font-size:15px; color:#0f172a;">${escapeHtml(payload.generatedAt)}</div>
          </td></tr>
        </table>${healthHtmlSection}
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">
          If you received this, your pruner-health alert channel is wired up
          correctly.
        </p>
      `;

      const rendered = renderBrandedEmail({
        lang: "en",
        preheader: "[TEST] Pruner-health alert delivery check — not a real incident",
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
    }

    if (payload.health === "recovered") {
      const downtimeHuman =
        payload.unhealthyDurationMs != null
          ? formatAge(payload.unhealthyDurationMs)
          : "unknown";
      const lastSuccessHuman =
        payload.lastSuccessAgeMs == null
          ? "never on record"
          : `${formatAge(payload.lastSuccessAgeMs)} ago`;

      const subject = `[Xuvilo] Background pruner recovered — ${payload.prunerName}`;
      const heading = "Background pruner is healthy again";
      const bodyText =
        `${payload.prunerName} is healthy again.\n\n` +
        `Was unhealthy for: ${downtimeHuman}\n` +
        `Recovered at: ${payload.generatedAt}\n` +
        `Last successful run: ${lastSuccessHuman}\n` +
        `Expected cadence: ${formatCadence(payload.intervalMs)}\n\n` +
        `You can close out the incident. Recovery alerts are debounced for the configured cool-down so a flapping pruner won't spam your inbox.`;

      const bodyHtml = `
        <p style="margin:0 0 12px 0;">
          <strong>${escapeHtml(payload.prunerName)}</strong> is
          <strong>healthy again</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#166534; margin-bottom:4px;">Was unhealthy for</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(downtimeHuman)}</div>
            <div style="font-size:13px; color:#166534; margin-bottom:4px;">Recovered at</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(payload.generatedAt)}</div>
            <div style="font-size:13px; color:#166534; margin-bottom:4px;">Last successful run</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(lastSuccessHuman)}</div>
            <div style="font-size:13px; color:#166534; margin-bottom:4px;">Expected cadence</div>
            <div style="font-size:15px; color:#0f172a;">${escapeHtml(formatCadence(payload.intervalMs))}</div>
          </td></tr>
        </table>
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">
          You can close out the incident. Recovery alerts are debounced for
          the configured cool-down so a flapping pruner won't spam your inbox.
        </p>
      `;

      const rendered = renderBrandedEmail({
        lang: "en",
        preheader: `${payload.prunerName} recovered after ${downtimeHuman}`,
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
    }

    const headlineHealth =
      payload.health === "failing" ? "failing" : "stale";
    const subject = `[Xuvilo] Background pruner ${headlineHealth} — ${payload.prunerName}`;
    const heading =
      payload.health === "failing"
        ? "Background pruner is failing"
        : "Background pruner has gone stale";

    const lastSuccessHuman =
      payload.lastSuccessAgeMs == null
        ? "never on record"
        : `${formatAge(payload.lastSuccessAgeMs)} ago`;
    const lastRunHuman = payload.lastRunAt ?? "never";
    const errorHuman = payload.lastError
      ? truncate(payload.lastError, 500)
      : "(none recorded)";

    const bodyText =
      `${payload.prunerName} is currently ${headlineHealth}.\n\n` +
      `Last successful run: ${lastSuccessHuman}\n` +
      `Last run (any outcome): ${lastRunHuman}\n` +
      `Last error: ${errorHuman}\n` +
      `Expected cadence: ${formatCadence(payload.intervalMs)}\n` +
      `Generated at: ${payload.generatedAt}\n\n` +
      `Open the admin Spam dashboard for the full breakdown. Further alerts for this pruner are debounced for the configured cool-down so a chronic failure doesn't flood your inbox.`;

    const bodyHtml = `
        <p style="margin:0 0 12px 0;">
          <strong>${escapeHtml(payload.prunerName)}</strong> is currently
          <strong>${escapeHtml(headlineHealth)}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Last successful run</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(lastSuccessHuman)}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Last run (any outcome)</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(lastRunHuman)}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Last error</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px; word-break:break-word;">${escapeHtml(errorHuman)}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Expected cadence</div>
            <div style="font-size:15px; color:#0f172a; margin-bottom:12px;">${escapeHtml(formatCadence(payload.intervalMs))}</div>
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">Generated at</div>
            <div style="font-size:15px; color:#0f172a;">${escapeHtml(payload.generatedAt)}</div>
          </td></tr>
        </table>
        <p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">
          Further alerts for this pruner are debounced for the configured
          cool-down so a chronic failure doesn't flood your inbox.
        </p>
      `;

    const rendered = renderBrandedEmail({
      lang: "en",
      preheader: `${payload.prunerName} is ${headlineHealth} — last success ${lastSuccessHuman}`,
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
    logger.error({ err }, "pruner-health: alert email send failed");
    return false;
  }
}

async function defaultRecordEvent(
  payload: PrunerHealthAlertPayload,
): Promise<void> {
  // Best-effort: a transient write failure must NEVER take the notifier
  // (let alone the pruner) down. We log and swallow — the dashboard simply
  // won't show this row, but Slack/email already went out so on-call still
  // got the page.
  try {
    await db.insert(prunerAlertEventsTable).values({
      prunerKey: payload.prunerKey,
      kind: payload.health,
      // The notifier already snapshots the dispatch time as `generatedAt`;
      // mirror it into `created_at` so the dashboard timeline lines up
      // exactly with what was sent to the webhook/email even if the insert
      // is delayed by a slow DB.
      createdAt: new Date(payload.generatedAt),
      unhealthyDurationMs: payload.unhealthyDurationMs,
      // Cap stored error to keep the row compact even if the underlying
      // pruner surfaces a runaway driver-level error string.
      lastError:
        payload.lastError != null ? truncate(payload.lastError, 500) : null,
      lastSuccessAgeMs: payload.lastSuccessAgeMs,
      intervalMs: payload.intervalMs,
    });
  } catch (err) {
    logger.warn(
      { err, prunerKey: payload.prunerKey, health: payload.health },
      "pruner-health: failed to persist alert event row",
    );
  }
}

async function defaultReadCleanupHealthLines(
  nowMs: number,
): Promise<string[]> {
  // Dynamic import: `prunerHealthSummary` imports helpers from THIS module
  // (evaluatePrunerHealth, formatAge), so a static import here would create
  // a load-time cycle. Deferring the import to call time keeps module
  // initialisation acyclic while still sharing the exact same summary +
  // formatting code path the spam-spike alert uses.
  try {
    const { readAllPrunerHealthSummaries, formatPrunerHealthLine } =
      await import("./prunerHealthSummary");
    const summaries = await readAllPrunerHealthSummaries(nowMs);
    return summaries.map(formatPrunerHealthLine);
  } catch (err) {
    logger.warn(
      { err },
      "pruner-health: failed to read cleanup-health lines for test alert",
    );
    return [];
  }
}

const realDeps: Deps = {
  now: () => Date.now(),
  claimSlot: claimAlertSlot,
  sendWebhook: defaultSendWebhook,
  sendEmail: defaultSendEmail,
  recordEvent: defaultRecordEvent,
  readCleanupHealthLines: defaultReadCleanupHealthLines,
};

async function dispatchAlert(
  cfg: PrunerHealthConfig,
  deps: Deps,
  payload: PrunerHealthAlertPayload,
): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  if (cfg.webhookUrl) tasks.push(deps.sendWebhook(cfg.webhookUrl, payload));
  if (cfg.alertEmail) tasks.push(deps.sendEmail(cfg.alertEmail, payload));
  // Record the event in parallel with the channel sends. Doing this inside
  // dispatchAlert (rather than at the call sites) guarantees that EVERY
  // dispatched alert — problem or recovery — lands in the history log,
  // and that the timestamp matches the channel payload exactly.
  tasks.push(deps.recordEvent(payload));
  await Promise.allSettled(tasks);
}

/**
 * Fire-and-forget: emit a webhook/email alert when a pruner is failing,
 * stale, or has just recovered. Called from the pruner libs around each
 * scheduled tick.
 *
 * Behaviour:
 *  - Disabled when neither alert channel is configured. Returns immediately.
 *  - Computes health from the snapshot. Branches:
 *      * failing/stale → fire a "problem" alert (debounced per-pruner) and
 *        open an incident if one isn't already open.
 *      * healthy AND we previously paged on this pruner → fire a one-shot
 *        "recovered" alert (also debounced per-pruner so flapping doesn't
 *        spam channels), then close the incident.
 *      * healthy with no open incident → no-op.
 *  - Per-pruner state: a chronic failure on `spam_events` cannot silence
 *    alerts (problem or recovery) for `rate_limit_buckets` and vice versa.
 *  - All errors are swallowed (logged only) — alerting must never break the
 *    pruner itself.
 */
export async function maybeNotifyPrunerHealth(
  snap: PrunerHealthSnapshot,
  depsOverride?: Partial<Deps>,
): Promise<void> {
  const deps: Deps = { ...realDeps, ...depsOverride };
  try {
    const cfg = readPrunerHealthConfig();
    if (!cfg) return;

    const now = deps.now();
    const health = evaluatePrunerHealth(snap, now);
    const state = getOrInitState(snap.prunerKey);

    const lastRun = snap.lastRun;
    const lastSuccessAgeMs =
      lastRun?.lastSuccessAt != null
        ? now - lastRun.lastSuccessAt.getTime()
        : null;

    if (health) {
      // Problem path: failing/stale.
      //
      // Reserve the debounce slot BEFORE sending so two near-simultaneous
      // calls (start-of-tick + end-of-tick on the same iteration) can't both
      // fire their own alert. The claim is persistent (alert_debounce row),
      // so a deploy in the middle of an ongoing failure does NOT re-page ops
      // on the next tick — the cool-down is honoured across restarts
      // (Task #118).
      const claimed = await deps.claimSlot(
        `${ALERT_KEY_PREFIX}${snap.prunerKey}`,
        cfg.debounceMs,
        now,
      );
      if (!claimed) return;

      // Open an incident if we don't have one yet. The `firstAlertedAt`
      // anchor is what the recovery alert later uses to compute the
      // "unhealthy for X" duration — re-using a still-open incident across
      // back-to-back failing ticks gives operators the FULL outage length.
      if (state.openIncidentSince == null) state.openIncidentSince = now;

      const payload: PrunerHealthAlertPayload = {
        prunerKey: snap.prunerKey,
        prunerName: snap.prunerName,
        health,
        lastError: lastRun?.error ?? null,
        lastSuccessAgeMs,
        lastRunAt: lastRun ? lastRun.ranAt.toISOString() : null,
        intervalMs: snap.intervalMs,
        generatedAt: new Date(now).toISOString(),
        unhealthyDurationMs: null,
      };

      logger.warn(
        {
          prunerHealth: {
            prunerKey: payload.prunerKey,
            health: payload.health,
            lastSuccessAgeMs: payload.lastSuccessAgeMs,
            lastErrorPreview: payload.lastError
              ? truncate(payload.lastError, 200)
              : null,
            webhookConfigured: Boolean(cfg.webhookUrl),
            emailConfigured: Boolean(cfg.alertEmail),
          },
        },
        "pruner-health: pruner unhealthy — sending alert",
      );

      await dispatchAlert(cfg, deps, payload);
      return;
    }

    // Healthy path: only interesting if we previously paged on this pruner.
    if (state.openIncidentSince == null) return;

    // Recovery debounce: if a recovery just went out (and the pruner has
    // since flapped problem -> healthy again within the cool-down), keep
    // quiet. Without this, a flaky pruner could spam recovery messages
    // every few minutes.
    if (
      state.lastRecoveryAlertAt > 0 &&
      now - state.lastRecoveryAlertAt < cfg.debounceMs
    ) {
      // Still close the incident so we don't accumulate a permanent open
      // marker. The next failing tick will open a fresh incident.
      state.openIncidentSince = null;
      return;
    }

    const unhealthyDurationMs = Math.max(0, now - state.openIncidentSince);
    state.lastRecoveryAlertAt = now;
    state.openIncidentSince = null;

    const payload: PrunerHealthAlertPayload = {
      prunerKey: snap.prunerKey,
      prunerName: snap.prunerName,
      health: "recovered",
      lastError: null,
      lastSuccessAgeMs,
      lastRunAt: lastRun ? lastRun.ranAt.toISOString() : null,
      intervalMs: snap.intervalMs,
      generatedAt: new Date(now).toISOString(),
      unhealthyDurationMs,
    };

    logger.info(
      {
        prunerHealth: {
          prunerKey: payload.prunerKey,
          health: payload.health,
          unhealthyDurationMs,
          lastSuccessAgeMs: payload.lastSuccessAgeMs,
          webhookConfigured: Boolean(cfg.webhookUrl),
          emailConfigured: Boolean(cfg.alertEmail),
        },
      },
      "pruner-health: pruner recovered — sending all-clear alert",
    );

    await dispatchAlert(cfg, deps, payload);
  } catch (err) {
    // Belt-and-suspenders: never let alerting failures bubble into the
    // pruner. The whole point of this notifier is fire-and-forget.
    logger.error({ err }, "pruner-health: notifier threw unexpectedly");
  }
}

// Synthetic prunerKey used for delivery-test alerts. Picked to be obviously
// non-real (double underscores + "test") so any operator inspecting logs or
// payloads can immediately tell this isn't a normal pruner row.
const TEST_PRUNER_KEY = "__delivery_test__";
const TEST_PRUNER_NAME = "Pruner-health alert delivery test";

export interface PrunerHealthTestAlertChannelResult {
  // What the operator configured. When false the channel was skipped because
  // the corresponding env var is not set.
  attempted: boolean;
  // Send result. Null when not attempted; true/false reflects whether the
  // sender (webhook POST or SendGrid send) returned successfully.
  ok: boolean | null;
}

export interface PrunerHealthTestAlertResult {
  // False when neither alert channel is configured. The caller should treat
  // this as "nothing to test" and surface a 503 / "alerts not configured"
  // message rather than a generic success.
  enabled: boolean;
  // Per-channel result. Always present so the UI can render two stable rows
  // ("webhook attempted: yes — sent OK", "email attempted: no").
  webhook: PrunerHealthTestAlertChannelResult;
  email: PrunerHealthTestAlertChannelResult;
  // ISO timestamp baked into the payload so callers can correlate the result
  // with what landed in Slack / the inbox.
  generatedAt: string;
  // Echo of the pre-rendered "Background cleanup health" lines embedded in
  // the sent Slack/email bodies, so the admin dashboard can preview the
  // section without the operator opening Slack or their inbox. Empty when
  // alerting is disabled or the lines couldn't be read (best-effort).
  cleanupHealthLines: string[];
}

/**
 * Send a SYNTHETIC pruner-health alert on every configured channel so an
 * admin can verify the wiring (new webhook URL, rotated alert email, …)
 * without inducing a real pruner failure.
 *
 * Hard guarantees:
 *  - Re-uses the SAME env config (`SPAM_SPIKE_WEBHOOK_URL` /
 *    `SPAM_SPIKE_ALERT_EMAIL`). Operators cannot accidentally set up a
 *    "test only" channel that diverges from the real one — if you can
 *    deliver this, you can deliver a real failing alert.
 *  - Payload `health` is `"test"` and the rendered Slack/email body carries
 *    a "[TEST]" / "SYNTHETIC" marker on every line that would otherwise read
 *    like a real incident. Recipients can never confuse it with an outage.
 *  - Does NOT touch `alertState`. The per-pruner debounce window and any
 *    open incident on `spam_events` / `rate_limit_buckets` are completely
 *    untouched. A test send from the dashboard will not silence (or
 *    re-trigger) the next real problem alert by even one tick.
 *  - Always resolves. Channel send failures are reflected in the result
 *    object (ok: false) but never thrown — alerting plumbing must never
 *    crash the admin endpoint.
 */
export async function sendPrunerHealthTestAlert(
  depsOverride?: Partial<Deps>,
): Promise<PrunerHealthTestAlertResult> {
  const deps: Deps = { ...realDeps, ...depsOverride };
  const generatedAt = new Date(deps.now()).toISOString();

  const cfg = readPrunerHealthConfig();
  if (!cfg) {
    return {
      enabled: false,
      webhook: { attempted: false, ok: null },
      email: { attempted: false, ok: null },
      generatedAt,
      cleanupHealthLines: [],
    };
  }

  // Best-effort: pull the live cleanup-health lines so the test alert
  // previews the exact same "Background cleanup health" section a real
  // spam-spike alert carries. Any failure degrades to an empty section —
  // it can never block the delivery test.
  let cleanupHealthLines: string[] = [];
  try {
    cleanupHealthLines = await deps.readCleanupHealthLines(deps.now());
  } catch (err) {
    logger.warn(
      { err },
      "pruner-health: cleanup-health lines unavailable for test alert",
    );
  }

  const payload: PrunerHealthAlertPayload = {
    prunerKey: TEST_PRUNER_KEY,
    prunerName: TEST_PRUNER_NAME,
    health: "test",
    lastError: null,
    lastSuccessAgeMs: null,
    lastRunAt: null,
    intervalMs: 0,
    generatedAt,
    unhealthyDurationMs: null,
    cleanupHealthLines,
  };

  logger.info(
    {
      prunerHealth: {
        kind: "test",
        webhookConfigured: Boolean(cfg.webhookUrl),
        emailConfigured: Boolean(cfg.alertEmail),
      },
    },
    "pruner-health: sending synthetic delivery-test alert (no state mutated)",
  );

  // Run channels in parallel so the admin endpoint waits at most one
  // round-trip even with both channels configured. Each send wrapped so a
  // throw in one provider can't shadow the other channel's result.
  const webhookTask: Promise<boolean | null> = cfg.webhookUrl
    ? deps
        .sendWebhook(cfg.webhookUrl, payload)
        .catch((err) => {
          logger.error(
            { err },
            "pruner-health: test webhook send threw — reporting failure",
          );
          return false;
        })
    : Promise.resolve(null);
  const emailTask: Promise<boolean | null> = cfg.alertEmail
    ? deps
        .sendEmail(cfg.alertEmail, payload)
        .catch((err) => {
          logger.error(
            { err },
            "pruner-health: test email send threw — reporting failure",
          );
          return false;
        })
    : Promise.resolve(null);

  const [webhookOk, emailOk] = await Promise.all([webhookTask, emailTask]);

  return {
    enabled: true,
    webhook: {
      attempted: Boolean(cfg.webhookUrl),
      ok: webhookOk,
    },
    email: {
      attempted: Boolean(cfg.alertEmail),
      ok: emailOk,
    },
    generatedAt,
    cleanupHealthLines,
  };
}

// Test-only helper. Clears the in-memory recovery-state map between cases
// so order-dependence doesn't creep in. The PROBLEM-alert debounce now
// lives in the `alert_debounce` table — tests that need to reset that
// should call `_resetAlertDebounceForTests("pruner_health:<key>")` from
// `./alertDebounce` instead. This same helper is what the
// "debounce survives a simulated restart" test calls to wipe in-process
// state and prove the persistent ledger still honours the cool-down.
export function _resetPrunerHealthStateForTests(): void {
  alertState.clear();
}

// Stable export so tests and other modules can refer to the same alert
// key prefix the notifier uses internally.
export const PRUNER_HEALTH_DEBOUNCE_KEY_PREFIX = ALERT_KEY_PREFIX;

export interface PrunerAlertHistoryEntry {
  // ISO timestamp matching the dispatched payload's `generatedAt`. Lets the
  // dashboard sort/format the strip without re-parsing a Date.
  at: string;
  kind: PrunerAlertKind;
  // Recovery-only: how long the pruner was unhealthy before this recovery.
  // Null on problem rows (failing/stale).
  unhealthyDurationMs: number | null;
  // Optional snapshot of the error string at dispatch time. Null on
  // recovery rows. Useful for hover/title text on the strip.
  lastError: string | null;
}

/**
 * Read the most recent dispatched alerts for a set of pruners, keyed by
 * `prunerKey` so the admin dashboard can render one strip per pruner block.
 *
 * The in-memory `alertState` map only tracks "is there an open incident"
 * for debounce decisions; the dashboard timeline reads from the persisted
 * `pruner_alert_events` table so it survives server restarts and matches
 * exactly what was sent to webhook/email.
 *
 * Returns an empty map on error (transient DB blip / table missing during
 * a mid-rollout) — the dashboard's strip simply renders as "no recent
 * alerts" rather than blocking the rest of the spam-stats payload.
 */
export async function readRecentPrunerAlerts(
  prunerKeys: readonly string[],
  perPrunerLimit = 5,
): Promise<Record<string, PrunerAlertHistoryEntry[]>> {
  const result: Record<string, PrunerAlertHistoryEntry[]> = {};
  for (const k of prunerKeys) result[k] = [];
  if (prunerKeys.length === 0) return result;

  try {
    // Use a window function so each pruner gets its own independent
    // "top N most recent" slice. A naive `ORDER BY created_at DESC LIMIT
    // N*pruners` query would let a noisy pruner (e.g. hourly rate-limit
    // alerts firing during an outage) crowd out rows for a quieter pruner
    // (e.g. daily spam-events alerts) and leave that pruner's strip
    // misleadingly empty. `ROW_NUMBER() OVER (PARTITION BY pruner_key
    // ORDER BY created_at DESC)` guarantees every pruner key in the
    // `prunerKeys` list returns up to `perPrunerLimit` rows regardless
    // of how many incidents the others logged in the same window.
    //
    // The composite `(pruner_key, created_at)` index on the table makes
    // the partitioned ORDER BY cheap — the planner can walk the index
    // backwards per group.
    // Build the IN-list explicitly via `sql.join` so each key becomes its
    // own bound parameter. Embedding a raw JS array (`${keyArray}`) makes
    // node-postgres serialize it as a Postgres array literal — which then
    // requires a `::text[]` cast and `= ANY(...)` to bind correctly.
    // Expanding to `IN ($1, $2, ...)` is simpler, faster for small lists,
    // and behaves identically across all supported pg versions.
    const keyList = sql.join(
      [...prunerKeys].map((k) => sql`${k}`),
      sql`, `,
    );
    const rowsResult = await db.execute<{
      pruner_key: string;
      kind: string;
      created_at: Date;
      unhealthy_duration_ms: string | number | null;
      last_error: string | null;
    }>(sql`
      select pruner_key, kind, created_at, unhealthy_duration_ms, last_error
      from (
        select
          pruner_key,
          kind,
          created_at,
          unhealthy_duration_ms,
          last_error,
          row_number() over (
            partition by pruner_key
            order by created_at desc
          ) as rn
        from ${prunerAlertEventsTable}
        where pruner_key in (${keyList})
      ) ranked
      where rn <= ${perPrunerLimit}
      order by pruner_key, created_at desc
    `);

    // node-postgres returns rows on `.rows`; tolerate both shapes since
    // some drizzle adapters surface the array directly.
    const rows: Array<{
      pruner_key: string;
      kind: string;
      created_at: Date | string;
      unhealthy_duration_ms: string | number | null;
      last_error: string | null;
    }> = Array.isArray(rowsResult)
      ? (rowsResult as unknown as typeof rows)
      : ((rowsResult as { rows: typeof rows }).rows ?? []);

    for (const row of rows) {
      const bucket = result[row.pruner_key];
      if (!bucket) continue;
      bucket.push({
        at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : new Date(row.created_at).toISOString(),
        kind: row.kind as PrunerAlertKind,
        unhealthyDurationMs:
          row.unhealthy_duration_ms == null
            ? null
            : Number(row.unhealthy_duration_ms),
        lastError: row.last_error,
      });
    }
  } catch (err) {
    logger.warn(
      { err, prunerKeys },
      "pruner-health: failed to read alert history rows",
    );
  }
  return result;
}

// Re-export so the admin route's test helpers can purge events between
// runs without re-importing from `@workspace/db` (which would split the
// table-name source-of-truth across two import sites).
export { prunerAlertEventsTable };

// Test-only accessor. Lets the unit test for `sendPrunerHealthTestAlert`
// assert that the synthetic test does NOT mutate the per-pruner recovery
// state — without exporting the whole map publicly. Note: the problem-
// alert debounce is no longer in this map (it lives in `alert_debounce`),
// so this only reflects open-incident + recovery bookkeeping.
export function _peekPrunerHealthStateForTests(): Map<string, RecoveryState> {
  return new Map(alertState);
}

