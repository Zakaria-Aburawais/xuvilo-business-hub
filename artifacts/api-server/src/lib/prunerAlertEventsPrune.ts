import { sql } from "drizzle-orm";
import {
  db,
  prunerAlertEventsTable,
  PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// How often the background trim runs. Daily is plenty — alert volume is
// heavily debounced (default 60-min cool-down per pruner) so even a
// chronically failing pruner adds ~24 rows/day at worst, and the only
// consumer (the admin dashboard's alert-history strip) reads just the
// latest 5 rows per pruner.
export const PRUNER_ALERT_EVENTS_PRUNE_INTERVAL_MS = DAY_MS;

// Hard floor on retention so an accidental
// `PRUNER_ALERT_EVENTS_RETENTION_DAYS=0` (or negative) can never wipe the
// entire alert history, which would blank the dashboard strip mid-incident.
const MIN_RETENTION_DAYS = 7;

// Hard ceiling so a typo like `PRUNER_ALERT_EVENTS_RETENTION_DAYS=99999`
// can't keep rows around for decades and silently defeat the trim.
const MAX_RETENTION_DAYS = 3650;

export function getPrunerAlertEventsRetentionDays(): number {
  const raw = process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"];
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
          fallback: PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
        },
        "PRUNER_ALERT_EVENTS_RETENTION_DAYS out of range; using default",
      );
    } else {
      logger.warn(
        {
          provided: raw,
          fallback: PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
        },
        "PRUNER_ALERT_EVENTS_RETENTION_DAYS is not a number; using default",
      );
    }
  }
  return PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT;
}

// Delete every `pruner_alert_events` row older than the configured retention
// window. Returns the number of rows deleted (best-effort — Postgres reports
// it via the command tag). Errors are caught and logged so a transient DB
// blip can never crash the server; the next scheduled pass will retry.
//
// Deliberately NO status row / health-notifier surface, mirroring the
// alert_debounce pruner's reasoning: growth here is capped by the debounce
// (~24 rows/day per pruner at absolute worst), so a silent trim failure has
// no operational impact beyond a slightly larger history table, and the
// error log below is sufficient signal. Wiring this table's trim into the
// health notifier would also be circular — a failing trim writing alert
// rows about its own failure to the very table it cannot trim.
export async function pruneOldPrunerAlertEvents(): Promise<number> {
  const retentionDays = getPrunerAlertEventsRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
  try {
    const result = await db.execute(
      sql`delete from ${prunerAlertEventsTable} where ${prunerAlertEventsTable.createdAt} < ${cutoff}`,
    );
    const deleted =
      typeof (result as { rowCount?: number | null }).rowCount === "number"
        ? ((result as { rowCount: number }).rowCount ?? 0)
        : 0;
    if (deleted > 0) {
      logger.info(
        { deleted, retentionDays, cutoff: cutoff.toISOString() },
        "pruner_alert_events: pruned old rows",
      );
    } else {
      logger.debug(
        { retentionDays, cutoff: cutoff.toISOString() },
        "pruner_alert_events: no rows to prune",
      );
    }
    return deleted;
  } catch (err) {
    logger.error(
      { err, retentionDays, cutoff: cutoff.toISOString() },
      "pruner_alert_events: prune failed",
    );
    return 0;
  }
}

let timer: NodeJS.Timeout | null = null;

// Start the background trim. Runs once shortly after boot and then on a
// daily cadence. Safe to call multiple times — subsequent calls are no-ops.
//
// `unref()` ensures the timer never blocks process exit, so SIGTERM still
// shuts the server down cleanly without waiting for the next interval tick.
export function startPrunerAlertEventsPruner(): void {
  if (timer) return;

  // Defer the initial run so it doesn't compete with startup work or the
  // other pruners' initial runs (10s, 15s, 20s).
  setTimeout(() => {
    void pruneOldPrunerAlertEvents();
  }, 25_000).unref();

  timer = setInterval(() => {
    void pruneOldPrunerAlertEvents();
  }, PRUNER_ALERT_EVENTS_PRUNE_INTERVAL_MS);
  timer.unref();
}

// Test-only hook: cancel the scheduled trim so the process can exit
// promptly in unit tests. Not exported from the package barrel.
export function _stopPrunerAlertEventsPrunerForTests(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
