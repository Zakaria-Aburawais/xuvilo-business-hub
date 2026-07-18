import { sql } from "drizzle-orm";
import {
  db,
  alertDebounceTable,
  ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// How often the background pruner runs. Daily is plenty — the table holds
// one row per distinct alert key (a handful today) and the pruner exists
// purely as a safety valve against future high-cardinality keys (per-user,
// per-tenant, per-IP signals) accumulating without housekeeping.
export const ALERT_DEBOUNCE_PRUNE_INTERVAL_MS = DAY_MS;

// Hard floor on retention. Every debounce window in use today is measured
// in minutes-to-hours, so 7 days is comfortably above any active cool-down.
// The floor exists so an accidental `ALERT_DEBOUNCE_RETENTION_DAYS=0` can
// never delete a row whose cool-down is still running — which would let a
// chronic incident re-page ops on the very next tick.
const MIN_RETENTION_DAYS = 7;

// Hard ceiling so a typo like `ALERT_DEBOUNCE_RETENTION_DAYS=99999` can't
// keep stale rows around for decades and silently defeat the pruner.
const MAX_RETENTION_DAYS = 3650;

export function getAlertDebounceRetentionDays(): number {
  const raw = process.env["ALERT_DEBOUNCE_RETENTION_DAYS"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      const floored = Math.floor(parsed);
      if (floored >= MIN_RETENTION_DAYS && floored <= MAX_RETENTION_DAYS) {
        return floored;
      }
      logger.warn(
        {
          provided: raw,
          min: MIN_RETENTION_DAYS,
          max: MAX_RETENTION_DAYS,
          fallback: ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
        },
        "ALERT_DEBOUNCE_RETENTION_DAYS out of range; using default",
      );
    } else {
      logger.warn(
        {
          provided: raw,
          fallback: ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
        },
        "ALERT_DEBOUNCE_RETENTION_DAYS is not a number; using default",
      );
    }
  }
  return ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT;
}

// Delete every `alert_debounce` row whose `last_alerted_at` is older than
// the configured retention window. Returns the number of rows deleted
// (best-effort — Postgres reports it via the command tag). Errors are
// caught and logged so a transient DB blip can never crash the server;
// the next scheduled pass will retry.
//
// Deliberately NO status row / admin-dashboard surface, unlike the
// spam_events and rate_limit_buckets pruners. Those tables grow with
// traffic, so operators need to see that their pruners are alive. This
// table is bounded by the number of distinct alert keys (currently three)
// and the pruner is purely defensive hygiene for hypothetical future
// high-cardinality keys — a silent failure here has no operational impact
// beyond a few stale rows, and the error log below is sufficient signal.
// If a high-cardinality alert key is ever introduced, promote this pruner
// to the full status-row + health-notifier pattern used by its siblings.
export async function pruneStaleAlertDebounceRows(): Promise<number> {
  const retentionDays = getAlertDebounceRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
  try {
    const result = await db.execute(
      sql`delete from ${alertDebounceTable} where ${alertDebounceTable.lastAlertedAt} < ${cutoff}`,
    );
    const deleted =
      typeof (result as { rowCount?: number | null }).rowCount === "number"
        ? ((result as { rowCount: number }).rowCount ?? 0)
        : 0;
    if (deleted > 0) {
      logger.info(
        { deleted, retentionDays, cutoff: cutoff.toISOString() },
        "alert_debounce: pruned stale rows",
      );
    } else {
      logger.debug(
        { retentionDays, cutoff: cutoff.toISOString() },
        "alert_debounce: no rows to prune",
      );
    }
    return deleted;
  } catch (err) {
    logger.error(
      { err, retentionDays, cutoff: cutoff.toISOString() },
      "alert_debounce: prune failed",
    );
    return 0;
  }
}

let timer: NodeJS.Timeout | null = null;

// Start the background pruner. Runs once shortly after boot and then on a
// daily cadence. Safe to call multiple times — subsequent calls are no-ops.
//
// `unref()` ensures the timer never blocks process exit, so SIGTERM still
// shuts the server down cleanly without waiting for the next interval tick.
export function startAlertDebouncePruner(): void {
  if (timer) return;

  // Defer the initial run by a few seconds so it doesn't compete with
  // startup work (migrations, first request handling) or the other
  // pruners' initial runs (10s and 15s).
  setTimeout(() => {
    void pruneStaleAlertDebounceRows();
  }, 20_000).unref();

  timer = setInterval(() => {
    void pruneStaleAlertDebounceRows();
  }, ALERT_DEBOUNCE_PRUNE_INTERVAL_MS);
  timer.unref();
}

// Test-only hook: cancel the scheduled pruner so the process can exit
// promptly in unit tests. Not exported from the package barrel.
export function _stopAlertDebouncePrunerForTests(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
