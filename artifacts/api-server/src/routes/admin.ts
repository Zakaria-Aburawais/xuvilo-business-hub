import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  spamEventsTable,
  spamEventsPruneStatusTable,
  SPAM_EVENTS_PRUNE_STATUS_ROW_ID,
  rateLimitBucketsPruneStatusTable,
  RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
} from "@workspace/db";
import { requireRole } from "../lib/auth";
import { rateLimit } from "../lib/rateLimit";
import {
  getSpamEventsRetentionDays,
  SPAM_EVENTS_PRUNE_INTERVAL_MS,
  pruneOldSpamEvents,
} from "../lib/spamEventsPrune";
import {
  getRateLimitBucketsRetentionDays,
  RATE_LIMIT_BUCKETS_PRUNE_INTERVAL_MS,
} from "../lib/rateLimitBucketsPrune";
import { logger } from "../lib/logger";
import {
  getSpikeAlertSummary,
  type SpikeAlertSummary,
  SPAM_SPIKE_DEBOUNCE_KEY,
  readSpikeConfig,
} from "../lib/spamSpikeNotifier";
import {
  readRecentPrunerAlerts,
  type PrunerAlertHistoryEntry,
  sendPrunerHealthTestAlert,
  readPrunerHealthConfig,
  PRUNER_HEALTH_DEBOUNCE_KEY_PREFIX,
} from "../lib/pruneHealthNotifier";
import { readAlertDebounceTimes } from "../lib/alertDebounce";

// Stable machine keys matching the pruner libs. Kept here as constants so
// the admin route owns the contract between (a) what `pruneHealthNotifier`
// persists as `prunerKey`, and (b) which buckets the dashboard expects in
// the `prune.alertHistory` / `rateLimitPrune.alertHistory` fields.
const SPAM_EVENTS_PRUNER_KEY = "spam_events";
const RATE_LIMIT_BUCKETS_PRUNER_KEY = "rate_limit_buckets";

// How many of the most recent alerts to surface per pruner. Five is enough
// for an at-a-glance "last incident + the recovery + the one before"
// timeline without overflowing the card.
const ALERT_HISTORY_LIMIT = 5;

const router: IRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

interface DailyBucket {
  date: string;
  honeypot: number;
  captcha: number;
}

interface SpamStatsResponse {
  rangeDays: number;
  generatedAt: string;
  totals: {
    honeypot: number;
    captcha: number;
  };
  last24h: {
    honeypot: number;
    captcha: number;
  };
  daily: DailyBucket[];
  recent: Array<{
    id: string;
    createdAt: string;
    kind: string;
    reason: string;
    ip: string;
  }>;
  turnstileEnabled: boolean;
  // Background-pruner visibility. `retentionDays` is always the *currently
  // configured* value (so an operator who just changed the env var sees the
  // new number even before the next prune tick). `lastRun` reflects what's
  // persisted from the most recent execution and is null on a brand-new
  // database that has never pruned yet.
  prune: {
    retentionDays: number;
    // Expected cadence in milliseconds. Echoed so the dashboard can compute a
    // staleness threshold (currently 2× this) without hardcoding the cadence
    // on the client and silently drifting if the server ever changes it.
    intervalMs: number;
    lastRun: {
      ranAt: string;
      deleted: number;
      retentionDays: number;
      error: string | null;
    } | null;
    // Timestamp of the most recent SUCCESSFUL run (i.e. one that did not
    // record an error). Stays put when a failing run overwrites the row, so
    // the dashboard can answer "the pruner is failing now, but it last
    // actually did its job N hours ago" alongside the existing `lastRun`
    // block. Null on a brand-new database that has never seen a clean prune.
    lastSuccessAt: string | null;
    // Most recent dispatched alerts (problem + recovery) in newest-first
    // order. Empty array when nothing has paged yet, or when the alert
    // history table can't be read (transient blip — the rest of the
    // payload still loads). Survives server restarts because it's read
    // from the persisted `pruner_alert_events` table, not the in-memory
    // `alertState` map in the notifier.
    alertHistory: PrunerAlertHistoryEntry[];
  };
  // Same shape as `prune`, but for the `app_rate_limit_buckets` background
  // pruner. Surfaced alongside the spam-events row so operators get a single
  // one-glance health check for both pruners.
  rateLimitPrune: {
    retentionDays: number;
    intervalMs: number;
    lastRun: {
      ranAt: string;
      deleted: number;
      retentionDays: number;
      error: string | null;
    } | null;
    lastSuccessAt: string | null;
    alertHistory: PrunerAlertHistoryEntry[];
  };
  alerts: SpikeAlertSummary;
  // Per-signal cool-down ledger read from the persisted `alert_debounce`
  // table. One entry per operational alert key, in a stable order. Lets the
  // dashboard answer "when did ops last actually get paged for this signal,
  // and when would the next page be allowed?" — especially during deploys
  // where silence could mean either "healthy" or "cool-down active".
  alertCooldowns: AlertCooldownEntry[];
}

// One row of the alert cool-down widget. `debounceMs` is the SAME value the
// notifier passes to `claimAlertSlot` (read via the notifier's own config
// reader) so the client-side countdown always matches what would actually
// fire. Null when that signal's alerting is currently disabled (no channel
// env configured) — the cool-down is meaningless when nothing can page.
interface AlertCooldownEntry {
  key: string;
  lastAlertedAt: string | null;
  debounceMs: number | null;
}

// GET /admin/spam-stats?days=7
//
// Admin-only summary of contact-form spam-defense events. Reports per-day
// counts of honeypot drops and captcha rejections so operators can decide
// whether the optional Cloudflare Turnstile layer is actually warranted
// before provisioning `VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.
router.get("/admin/spam-stats", requireRole("admin"), async (req, res) => {
  try {
    const rawDays = Number(
      typeof req.query["days"] === "string" ? req.query["days"] : "",
    );
    const days =
      Number.isFinite(rawDays) && rawDays >= 1 && rawDays <= 90
        ? Math.floor(rawDays)
        : 7;

    const now = new Date();
    // Anchor the window to the START of the UTC day that's (days-1) calendar
    // days ago, so that `totals` aggregated from `>= sinceRange` and the
    // calendar-day buckets we render below cover the same exact set of rows.
    // Mixing a rolling N*24h filter with calendar-day buckets would cause
    // boundary-time mismatches where `totals` includes events that no bucket
    // shows (or vice versa).
    const todayUtcStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );
    const sinceRange = new Date(todayUtcStart.getTime() - (days - 1) * DAY_MS);
    const since24h = new Date(now.getTime() - DAY_MS);

    // Aggregate counts grouped by UTC day + kind. We use date_trunc so the
    // bucketing matches what an operator sees on a server clock and stays
    // stable across DST changes. Reading rows in a single round-trip keeps
    // the endpoint snappy even when spam volume is high.
    const grouped = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${spamEventsTable.createdAt}) at time zone 'UTC', 'YYYY-MM-DD')`,
        kind: spamEventsTable.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(spamEventsTable)
      .where(sql`${spamEventsTable.createdAt} >= ${sinceRange}`)
      .groupBy(
        sql`date_trunc('day', ${spamEventsTable.createdAt})`,
        spamEventsTable.kind,
      );

    // Build a fully-populated day-by-day window so the UI can render a stable
    // bar chart even when a day had zero events.
    const buckets = new Map<string, DailyBucket>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, honeypot: 0, captcha: 0 });
    }
    let totalHoneypot = 0;
    let totalCaptcha = 0;
    for (const row of grouped) {
      const bucket = buckets.get(row.day);
      const count = Number(row.count) || 0;
      if (row.kind === "honeypot") {
        totalHoneypot += count;
        if (bucket) bucket.honeypot += count;
      } else if (row.kind === "captcha") {
        totalCaptcha += count;
        if (bucket) bucket.captcha += count;
      }
    }

    const last24hRows = await db
      .select({
        kind: spamEventsTable.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(spamEventsTable)
      .where(sql`${spamEventsTable.createdAt} >= ${since24h}`)
      .groupBy(spamEventsTable.kind);

    let last24Honeypot = 0;
    let last24Captcha = 0;
    for (const row of last24hRows) {
      const count = Number(row.count) || 0;
      if (row.kind === "honeypot") last24Honeypot = count;
      else if (row.kind === "captcha") last24Captcha = count;
    }

    // Last 20 raw events for quick spot-checking. Intentionally excludes the
    // user-agent string to keep the payload small — the table is still there
    // for deeper investigation if needed.
    const recent = await db
      .select({
        id: spamEventsTable.id,
        createdAt: spamEventsTable.createdAt,
        kind: spamEventsTable.kind,
        reason: spamEventsTable.reason,
        ip: spamEventsTable.ip,
      })
      .from(spamEventsTable)
      .orderBy(sql`${spamEventsTable.createdAt} desc`)
      .limit(20);

    // Pull the most recent prune-run status row. There's only ever one row
    // (id=1) and the read is cheap. We tolerate a missing row (brand-new DB
    // that hasn't pruned yet) and any read error (transient blip) by falling
    // back to `lastRun: null`, so the widget still loads and shows the
    // configured retention.
    let lastRun: SpamStatsResponse["prune"]["lastRun"] = null;
    let lastSuccessAt: SpamStatsResponse["prune"]["lastSuccessAt"] = null;
    try {
      const rows = await db
        .select()
        .from(spamEventsPruneStatusTable)
        .where(eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID))
        .limit(1);
      const row = rows[0];
      if (row) {
        lastRun = {
          ranAt:
            row.lastRunAt instanceof Date
              ? row.lastRunAt.toISOString()
              : String(row.lastRunAt),
          deleted: row.lastDeleted,
          retentionDays: row.lastRetentionDays,
          error: row.lastError,
        };
        // `lastSuccessAt` is preserved across failing runs (the writer uses
        // a SQL coalesce on failure) so a non-null value here means the
        // dashboard can show "last good run N ago" even while `lastRun.error`
        // is non-null. Null on a fresh DB / a pruner that has never had a
        // clean execution.
        lastSuccessAt =
          row.lastSuccessAt == null
            ? null
            : row.lastSuccessAt instanceof Date
              ? row.lastSuccessAt.toISOString()
              : String(row.lastSuccessAt);
      }
    } catch (err) {
      logger.warn({ err }, "admin/spam-stats: failed to read prune status row");
    }

    // Same read for the rate-limit-buckets pruner. Independent try/catch so
    // a transient blip on one row never hides the other from the dashboard.
    let rateLimitLastRun: SpamStatsResponse["rateLimitPrune"]["lastRun"] = null;
    let rateLimitLastSuccessAt: SpamStatsResponse["rateLimitPrune"]["lastSuccessAt"] =
      null;
    try {
      const rows = await db
        .select()
        .from(rateLimitBucketsPruneStatusTable)
        .where(
          eq(
            rateLimitBucketsPruneStatusTable.id,
            RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
          ),
        )
        .limit(1);
      const row = rows[0];
      if (row) {
        rateLimitLastRun = {
          ranAt:
            row.lastRunAt instanceof Date
              ? row.lastRunAt.toISOString()
              : String(row.lastRunAt),
          deleted: row.lastDeleted,
          retentionDays: row.lastRetentionDays,
          error: row.lastError,
        };
        rateLimitLastSuccessAt =
          row.lastSuccessAt == null
            ? null
            : row.lastSuccessAt instanceof Date
              ? row.lastSuccessAt.toISOString()
              : String(row.lastSuccessAt);
      }
    } catch (err) {
      logger.warn(
        { err },
        "admin/spam-stats: failed to read rate-limit prune status row",
      );
    }

    // Read the recent alert history for both pruners in a single round-trip.
    // This is best-effort: an internal failure short-circuits to empty
    // arrays so the rest of the dashboard (counts, last-run badge) still
    // renders. The notifier's `readRecentPrunerAlerts` already swallows DB
    // errors and logs them, so we only need to defensively destructure.
    const alertHistoryByKey = await readRecentPrunerAlerts(
      [SPAM_EVENTS_PRUNER_KEY, RATE_LIMIT_BUCKETS_PRUNER_KEY],
      ALERT_HISTORY_LIMIT,
    );

    // Alert cool-down ledger: when did each operational signal last actually
    // page, and what cool-down window applies? The keys mirror exactly what
    // the notifiers pass to `claimAlertSlot`, and the debounce values are
    // read through the SAME config readers the notifiers use — so the
    // dashboard countdown always matches what would really fire.
    const spamEventsDebounceKey = `${PRUNER_HEALTH_DEBOUNCE_KEY_PREFIX}${SPAM_EVENTS_PRUNER_KEY}`;
    const rateLimitDebounceKey = `${PRUNER_HEALTH_DEBOUNCE_KEY_PREFIX}${RATE_LIMIT_BUCKETS_PRUNER_KEY}`;
    const debounceTimes = await readAlertDebounceTimes([
      SPAM_SPIKE_DEBOUNCE_KEY,
      spamEventsDebounceKey,
      rateLimitDebounceKey,
    ]);
    const spikeCfg = readSpikeConfig();
    const prunerCfg = readPrunerHealthConfig();
    const toCooldownEntry = (
      key: string,
      debounceMs: number | null,
    ): AlertCooldownEntry => ({
      key,
      lastAlertedAt: debounceTimes[key]?.toISOString() ?? null,
      debounceMs,
    });
    const alertCooldowns: AlertCooldownEntry[] = [
      toCooldownEntry(SPAM_SPIKE_DEBOUNCE_KEY, spikeCfg?.debounceMs ?? null),
      toCooldownEntry(spamEventsDebounceKey, prunerCfg?.debounceMs ?? null),
      toCooldownEntry(rateLimitDebounceKey, prunerCfg?.debounceMs ?? null),
    ];

    const payload: SpamStatsResponse = {
      rangeDays: days,
      generatedAt: now.toISOString(),
      totals: { honeypot: totalHoneypot, captcha: totalCaptcha },
      last24h: { honeypot: last24Honeypot, captcha: last24Captcha },
      daily: Array.from(buckets.values()),
      recent: recent.map((r) => ({
        id: r.id,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
        kind: r.kind,
        reason: r.reason,
        ip: r.ip,
      })),
      turnstileEnabled: Boolean(process.env["TURNSTILE_SECRET_KEY"]),
      prune: {
        retentionDays: getSpamEventsRetentionDays(),
        intervalMs: SPAM_EVENTS_PRUNE_INTERVAL_MS,
        lastRun,
        lastSuccessAt,
        alertHistory: alertHistoryByKey[SPAM_EVENTS_PRUNER_KEY] ?? [],
      },
      rateLimitPrune: {
        retentionDays: getRateLimitBucketsRetentionDays(),
        intervalMs: RATE_LIMIT_BUCKETS_PRUNE_INTERVAL_MS,
        lastRun: rateLimitLastRun,
        lastSuccessAt: rateLimitLastSuccessAt,
        alertHistory:
          alertHistoryByKey[RATE_LIMIT_BUCKETS_PRUNER_KEY] ?? [],
      },
      alerts: getSpikeAlertSummary(),
      alertCooldowns,
    };

    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    return res.json(payload);
  } catch (err) {
    logger.error({ err }, "admin/spam-stats failed");
    return res.status(500).json({
      success: false,
      error: "internal_error",
      message: "Failed to load spam stats.",
    });
  }
});

// POST /admin/prune-health/test-alert
//
// Fire a SYNTHETIC pruner-health alert on every configured channel
// (Slack webhook + alert email) so an operator can verify their wiring
// without inducing a real pruner failure. Re-uses the SAME env vars the
// real notifier reads — there is intentionally no separate "test channel"
// because that would defeat the purpose (you'd be testing a different
// channel from the one that pages on a real outage).
//
// Hard guarantees enforced by `sendPrunerHealthTestAlert`:
//  - Payload is clearly labelled "[TEST]" / "synthetic" in both Slack and
//    email so recipients can never confuse it with a real incident.
//  - Per-pruner debounce + open-incident state for the real `spam_events`
//    and `rate_limit_buckets` notifiers is NOT touched.
//
// Response shape mirrors the helper so the dashboard can render a
// per-channel result row without re-deriving anything.
//
// Per-admin cool-down for the synthetic test-alert button. The dashboard
// already disables the button while a send is in flight, but an admin with
// the page open in two tabs (or hammering curl) could otherwise spam a real
// on-call channel. 30s is short enough that legitimate "did it actually
// arrive? let me try once more" retries still work, but long enough that
// accidental double-clicks collapse to a single send.
//
// Keyed on the authenticated admin's email so two different admins can each
// run their own test concurrently without blocking each other — and so the
// limit isn't bypassable by a NAT'd second admin sharing an IP. We mount
// the limiter AFTER `requireRole("admin")` so `req.userEmail` is populated
// (and so we don't burn bucket entries on unauthenticated probes).
const testAlertLimiter = rateLimit({
  windowMs: 30_000,
  max: 1,
  prefix: "admin:prune-health:test-alert",
  keyer: (req) => req.userEmail ?? "",
  errorCode: "rate_limited",
  message: (retryAfter) =>
    `Please wait ${retryAfter} second${retryAfter === 1 ? "" : "s"} before sending another test alert.`,
});

router.post(
  "/admin/prune-health/test-alert",
  requireRole("admin"),
  testAlertLimiter,
  async (_req, res) => {
    try {
      const result = await sendPrunerHealthTestAlert();

      if (!result.enabled) {
        // Surfaced as 503 (rather than 200 + enabled:false) so the dashboard
        // button can react with a clear "alerts not configured" toast
        // instead of a misleading "sent" success.
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(503).json({
          success: false,
          error: "alerts_not_configured",
          message:
            "Pruner-health alerts are disabled. Set SPAM_SPIKE_WEBHOOK_URL or SPAM_SPIKE_ALERT_EMAIL to enable a channel, then try again.",
          result,
        });
      }

      // Even when at least one channel is configured we may have had a
      // partial failure (e.g. webhook 500, email OK). Report success of
      // the overall request but include the per-channel breakdown so the
      // operator sees exactly what happened.
      const anyAttemptedFailed =
        (result.webhook.attempted && result.webhook.ok === false) ||
        (result.email.attempted && result.email.ok === false);

      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).json({
        success: !anyAttemptedFailed,
        result,
      });
    } catch (err) {
      logger.error({ err }, "admin/prune-health/test-alert failed");
      return res.status(500).json({
        success: false,
        error: "internal_error",
        message: "Failed to send the synthetic pruner-health test alert.",
      });
    }
  },
);

// POST /admin/spam-stats/prune
//
// Admin-only "Run cleanup now" trigger for the spam_events background
// pruner. Lets an operator force a fresh prune immediately — e.g. right
// after lowering SPAM_EVENTS_RETENTION_DAYS, or when the table is bloated
// and they don't want to wait for the next daily tick.
//
// `pruneOldSpamEvents()` is the exact same function the scheduled pruner
// runs, so a manual run updates the same status row the dashboard reads
// (last-run time, deleted count) and feeds the same health notifier.
//
// Per-admin cool-down: the delete itself is cheap and idempotent, but a
// stuck key / double-clicking admin shouldn't be able to hammer the DB
// with full-table-scan deletes. 10s collapses accidental repeats while
// staying invisible for legitimate use. Keyed on the admin's email and
// mounted after requireRole so req.userEmail is populated.
const manualPruneLimiter = rateLimit({
  windowMs: 10_000,
  max: 1,
  prefix: "admin:spam-stats:prune",
  keyer: (req) => req.userEmail ?? "",
  errorCode: "rate_limited",
  message: (retryAfter) =>
    `Please wait ${retryAfter} second${retryAfter === 1 ? "" : "s"} before running cleanup again.`,
});

router.post(
  "/admin/spam-stats/prune",
  requireRole("admin"),
  manualPruneLimiter,
  async (_req, res) => {
    try {
      const deleted = await pruneOldSpamEvents();
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).json({
        success: true,
        deleted,
        retentionDays: getSpamEventsRetentionDays(),
      });
    } catch (err) {
      logger.error({ err }, "admin/spam-stats/prune failed");
      return res.status(500).json({
        success: false,
        error: "internal_error",
        message: "Failed to run the spam-events cleanup.",
      });
    }
  },
);

export default router;
