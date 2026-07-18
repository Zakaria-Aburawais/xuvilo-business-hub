import { eq, sql } from "drizzle-orm";
import {
  db,
  spamEventsTable,
  spamEventsPruneStatusTable,
  SPAM_EVENTS_PRUNE_STATUS_ROW_ID,
  SPAM_EVENTS_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";
import { logger } from "./logger";
import {
  maybeNotifyPrunerHealth,
  type PrunerHealthSnapshot,
} from "./pruneHealthNotifier";

// Stable machine key used by the unhealthy-pruner notifier for per-pruner
// debouncing. Matches the underlying table name so log/alert payloads are
// grep-friendly across infra.
const PRUNER_KEY = "spam_events";
const PRUNER_NAME = "spam_events pruner";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// How often the background pruner runs. Daily is plenty — the cleanup is
// O(deletes-per-day) and the only consumer of the table (the admin spam-stats
// widget) tolerates a stale row for many hours without changing what an
// operator actually sees.
//
// Exported so the admin spam-stats endpoint can echo the expected cadence
// back to the dashboard, which uses it to drive the per-pruner health badge
// (amber when the most recent run is older than 2× this interval).
export const SPAM_EVENTS_PRUNE_INTERVAL_MS = DAY_MS;

// Hard floor on retention so an accidental `SPAM_EVENTS_RETENTION_DAYS=0` (or
// negative) can never wipe the entire table — the admin widget queries up to
// 90 days, so anything below that would also break the dashboard.
const MIN_RETENTION_DAYS = 7;

// Hard ceiling so a typo like `SPAM_EVENTS_RETENTION_DAYS=99999` can't keep
// rows around for years and silently bloat the database.
const MAX_RETENTION_DAYS = 3650;

export function getSpamEventsRetentionDays(): number {
  const raw = process.env["SPAM_EVENTS_RETENTION_DAYS"];
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
          fallback: SPAM_EVENTS_RETENTION_DAYS_DEFAULT,
        },
        "SPAM_EVENTS_RETENTION_DAYS out of range; using default",
      );
    } else {
      logger.warn(
        {
          provided: raw,
          fallback: SPAM_EVENTS_RETENTION_DAYS_DEFAULT,
        },
        "SPAM_EVENTS_RETENTION_DAYS is not a number; using default",
      );
    }
  }
  return SPAM_EVENTS_RETENTION_DAYS_DEFAULT;
}

// Persist the most recent prune outcome so the admin spam-stats widget can
// surface it after a restart. Best-effort: if writing the status row itself
// fails (transient DB blip), we just log and move on — the next successful
// prune will overwrite this row.
//
// `lastSuccessAt` is bumped only when `error === null`. On failure we
// deliberately leave the previous successful timestamp in place so the
// unhealthy-pruner notifier can still answer "how long has it been since
// this thing actually did its job?".
async function recordPruneStatus(params: {
  retentionDays: number;
  deleted: number;
  error: string | null;
}): Promise<void> {
  try {
    const now = new Date();
    await db
      .insert(spamEventsPruneStatusTable)
      .values({
        id: SPAM_EVENTS_PRUNE_STATUS_ROW_ID,
        lastRunAt: now,
        lastDeleted: params.deleted,
        lastRetentionDays: params.retentionDays,
        lastError: params.error,
        lastSuccessAt: params.error === null ? now : null,
      })
      .onConflictDoUpdate({
        target: spamEventsPruneStatusTable.id,
        set: {
          lastRunAt: now,
          lastDeleted: params.deleted,
          lastRetentionDays: params.retentionDays,
          lastError: params.error,
          // SQL coalesce so the previous lastSuccessAt is preserved on a
          // failed run. A naive overwrite would erase the only signal the
          // notifier has for "age of the last successful run".
          ...(params.error === null
            ? { lastSuccessAt: now }
            : {
                lastSuccessAt: sql`coalesce(${spamEventsPruneStatusTable.lastSuccessAt}, null)`,
              }),
        },
      });
  } catch (err) {
    logger.warn({ err }, "spam_events: failed to record prune status row");
  }
}

// Read the persisted status row for the unhealthy-pruner notifier. Returns
// null when no row exists (brand-new DB) or on a transient read failure —
// in both cases the notifier treats it as "unknown" and stays silent rather
// than paging operators about a missing snapshot.
export async function readSpamEventsPrunerSnapshot(): Promise<PrunerHealthSnapshot> {
  return readPrunerSnapshot();
}

async function readPrunerSnapshot(): Promise<PrunerHealthSnapshot> {
  let lastRun: PrunerHealthSnapshot["lastRun"] = null;
  try {
    const rows = await db
      .select()
      .from(spamEventsPruneStatusTable)
      .where(
        eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID),
      )
      .limit(1);
    const row = rows[0];
    if (row) {
      lastRun = {
        ranAt:
          row.lastRunAt instanceof Date
            ? row.lastRunAt
            : new Date(row.lastRunAt as unknown as string),
        error: row.lastError,
        lastSuccessAt:
          row.lastSuccessAt == null
            ? null
            : row.lastSuccessAt instanceof Date
              ? row.lastSuccessAt
              : new Date(row.lastSuccessAt as unknown as string),
      };
    }
  } catch (err) {
    logger.warn(
      { err },
      "spam_events: failed to read prune status row for health check",
    );
  }
  return {
    prunerKey: PRUNER_KEY,
    prunerName: PRUNER_NAME,
    intervalMs: SPAM_EVENTS_PRUNE_INTERVAL_MS,
    lastRun,
  };
}

// Delete every `spam_events` row older than the configured retention window.
// Returns the number of rows deleted (best-effort — Postgres reports it via
// the command tag). Errors are caught and logged so a transient DB blip can
// never crash the server; the next scheduled pass will retry.
//
// Each invocation also writes a single status row that the admin spam-stats
// endpoint reads — both successes and failures are recorded so operators can
// distinguish "the pruner ran cleanly and there was nothing to delete" from
// "the pruner crashed and the table is unbounded".
export async function pruneOldSpamEvents(): Promise<number> {
  // Health check BEFORE the prune runs. Catches the "stale" case where the
  // server was down/restarted and the persisted row is older than 2× the
  // expected cadence — by the time `recordPruneStatus` writes a fresh
  // timestamp below, that signal is gone, so this read has to happen first.
  // The notifier is fire-and-forget: a failure here can't block the prune.
  await maybeNotifyPrunerHealth(await readPrunerSnapshot());

  const retentionDays = getSpamEventsRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
  try {
    const result = await db.execute(
      sql`delete from ${spamEventsTable} where ${spamEventsTable.createdAt} < ${cutoff}`,
    );
    const deleted =
      typeof (result as { rowCount?: number | null }).rowCount === "number"
        ? ((result as { rowCount: number }).rowCount ?? 0)
        : 0;
    if (deleted > 0) {
      logger.info(
        { deleted, retentionDays, cutoff: cutoff.toISOString() },
        "spam_events: pruned old rows",
      );
    } else {
      logger.debug(
        { retentionDays, cutoff: cutoff.toISOString() },
        "spam_events: no rows to prune",
      );
    }
    await recordPruneStatus({ retentionDays, deleted, error: null });
    return deleted;
  } catch (err) {
    logger.error(
      { err, retentionDays, cutoff: cutoff.toISOString() },
      "spam_events: prune failed",
    );
    const message = err instanceof Error ? err.message : String(err);
    await recordPruneStatus({
      retentionDays,
      deleted: 0,
      // Cap the stored error message so a runaway driver-level error string
      // can't blow up the single-row status table.
      error: message.slice(0, 500),
    });
    // Health check AFTER the failed write. The "failing" case (lastError
    // just got set) is what this catches — without it, a chronically
    // failing pruner would only alert once per cadence interval (24h here)
    // because the next start-of-tick read happens that far in the future.
    await maybeNotifyPrunerHealth(await readPrunerSnapshot());
    return 0;
  }
}

let timer: NodeJS.Timeout | null = null;

// Start the background pruner. Runs once shortly after boot (so a freshly
// started server with months of accumulated rows catches up immediately) and
// then on a daily cadence. Safe to call multiple times — subsequent calls are
// no-ops.
//
// `unref()` ensures the timer never blocks process exit, so SIGTERM still
// shuts the server down cleanly without waiting for the next interval tick.
export function startSpamEventsPruner(): void {
  if (timer) return;

  // Defer the initial run by a few seconds so it doesn't compete with
  // startup work (Stripe init, migrations, first request handling).
  setTimeout(() => {
    void pruneOldSpamEvents();
  }, 10_000).unref();

  timer = setInterval(() => {
    void pruneOldSpamEvents();
  }, SPAM_EVENTS_PRUNE_INTERVAL_MS);
  timer.unref();
}

// Test-only hook: cancel the scheduled pruner so the process can exit
// promptly in unit tests. Not exported from the package barrel.
export function _stopSpamEventsPrunerForTests(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
