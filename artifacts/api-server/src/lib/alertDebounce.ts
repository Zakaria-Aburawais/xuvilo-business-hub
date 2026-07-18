import { inArray, sql } from "drizzle-orm";
import { db, alertDebounceTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Atomically attempt to claim the "alerting slot" for `alertKey`.
 *
 * Returns true when the caller has just won the slot and SHOULD send an
 * alert, false when the previously-recorded `last_alerted_at` for this
 * key is still inside the configured cool-down window and the alert
 * MUST be suppressed.
 *
 * Persists the timestamp to the `alert_debounce` table — so the cool-down
 * survives process restarts. Without this, the in-memory debounce map is
 * wiped on every deploy and a chronic outage that paged ops 10 minutes
 * ago will re-fire the moment the next pruner tick or spam event hits.
 *
 * Concurrency: the upsert's `setWhere` clause guarantees that out of N
 * near-simultaneous callers (e.g. a burst of spam hits or two pruners
 * tripping in the same iteration) exactly one wins the slot. The losers
 * see no row in the `RETURNING` set and back off.
 *
 * Failure mode: if writing to `alert_debounce` itself throws (transient
 * DB blip, table missing on a half-migrated environment) we log and FAIL
 * CLOSED — i.e. return false to suppress the alert. Suppressing one alert
 * is preferable to flooding ops every tick when the database is itself
 * the broken thing, and the next scheduled tick will retry once the DB
 * recovers.
 */
export async function claimAlertSlot(
  alertKey: string,
  debounceMs: number,
  nowMs: number,
): Promise<boolean> {
  const now = new Date(nowMs);
  // Anything claimed strictly later than this is still inside the cool-down
  // window and must block a new claim. Equality is treated as "elapsed" so
  // a debounce of 0ms (used by some tests) always allows the claim through.
  const cutoff = new Date(nowMs - debounceMs);
  try {
    const rows = await db
      .insert(alertDebounceTable)
      .values({ alertKey, lastAlertedAt: now })
      .onConflictDoUpdate({
        target: alertDebounceTable.alertKey,
        set: { lastAlertedAt: now },
        // Only advance the timestamp (and therefore "claim" the slot) if
        // the previously-recorded alert is at or before the cool-down
        // cutoff. Otherwise the upsert silently skips the update and
        // RETURNING comes back empty, signalling "still debounced".
        setWhere: sql`${alertDebounceTable.lastAlertedAt} <= ${cutoff}`,
      })
      .returning({ lastAlertedAt: alertDebounceTable.lastAlertedAt });
    return rows.length > 0;
  } catch (err) {
    logger.error(
      { err, alertKey },
      "alert-debounce: failed to claim slot — failing closed (alert suppressed)",
    );
    return false;
  }
}

/**
 * Release a previously-claimed alert slot so a future caller can claim it
 * again immediately. Used when the action gated by the claim (e.g. sending
 * an email) failed after the slot was won — without the release, the failed
 * attempt would suppress every retry for the full debounce window.
 *
 * Best-effort: if the delete itself fails we log and move on. The row then
 * expires naturally via the debounce window / pruner, which only costs one
 * suppressed retry cycle, never a duplicate send.
 */
export async function releaseAlertSlot(alertKey: string): Promise<void> {
  try {
    await db
      .delete(alertDebounceTable)
      .where(sql`${alertDebounceTable.alertKey} = ${alertKey}`);
  } catch (err) {
    logger.error(
      { err, alertKey },
      "alert-debounce: failed to release slot after failed action",
    );
  }
}

/**
 * Read-only view of the debounce ledger for the admin dashboard.
 *
 * Returns a map of `alertKey → lastAlertedAt` for the requested keys. Keys
 * with no row (never paged) are simply absent from the result, so callers
 * can render a "never paged" state.
 *
 * Best-effort: any DB failure logs a warning and returns an EMPTY map so
 * the rest of the dashboard payload still loads. Unlike `claimAlertSlot`
 * (which must fail closed to avoid alert floods), a read failure here only
 * costs visibility, never correctness.
 */
export async function readAlertDebounceTimes(
  keys: string[],
): Promise<Record<string, Date>> {
  if (keys.length === 0) return {};
  try {
    const rows = await db
      .select({
        alertKey: alertDebounceTable.alertKey,
        lastAlertedAt: alertDebounceTable.lastAlertedAt,
      })
      .from(alertDebounceTable)
      .where(inArray(alertDebounceTable.alertKey, keys));
    const out: Record<string, Date> = {};
    for (const row of rows) {
      out[row.alertKey] = row.lastAlertedAt;
    }
    return out;
  } catch (err) {
    logger.warn(
      { err, keys },
      "alert-debounce: failed to read last-alerted times for dashboard",
    );
    return {};
  }
}

/**
 * Test-only helper. Vitest needs to wipe the persisted debounce rows
 * between cases (and between "simulated restart" steps) so order-dependence
 * doesn't creep in. Pass an `alertKey` to scope the delete; omit it to
 * truncate the whole table.
 *
 * Not exported from `@workspace/db` so production callers can't reach it.
 */
export async function _resetAlertDebounceForTests(
  alertKey?: string,
): Promise<void> {
  if (alertKey === undefined) {
    await db.delete(alertDebounceTable);
    return;
  }
  await db
    .delete(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} = ${alertKey}`);
}
