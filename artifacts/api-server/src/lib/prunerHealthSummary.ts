import { logger } from "./logger";
import {
  evaluatePrunerHealth,
  formatAge,
  type PrunerHealthSnapshot,
} from "./pruneHealthNotifier";
import { readSpamEventsPrunerSnapshot } from "./spamEventsPrune";
import { readRateLimitBucketsPrunerSnapshot } from "./rateLimitBucketsPrune";

// Compact, alert-friendly view of a single background pruner's health.
// Shared by the spam-spike alert email/webhook so an on-call engineer
// reading a spike alert already knows whether background cleanup is
// keeping up — the same story the admin dashboard badge tells.
export interface PrunerHealthSummary {
  prunerKey: string;
  prunerName: string;
  // "ok" — healthy; "failing" / "stale" mirror the dashboard badge;
  // "unknown" — the pruner has never run on this DB (or the status row
  // could not be read). We deliberately do NOT treat unknown as a problem.
  health: "ok" | "failing" | "stale" | "unknown";
  // Age of the most recent SUCCESSFUL run in milliseconds, null when no
  // clean run is on record.
  lastSuccessAgeMs: number | null;
  // ISO timestamp of the most recent successful run, null when none.
  lastSuccessAt: string | null;
}

export function summarizePrunerHealth(
  snap: PrunerHealthSnapshot,
  nowMs: number,
): PrunerHealthSummary {
  const lastSuccessAt = snap.lastRun?.lastSuccessAt ?? null;
  const lastSuccessAgeMs =
    lastSuccessAt == null ? null : Math.max(0, nowMs - lastSuccessAt.getTime());
  const level = evaluatePrunerHealth(snap, nowMs);
  const health: PrunerHealthSummary["health"] =
    level ?? (snap.lastRun == null ? "unknown" : "ok");
  return {
    prunerKey: snap.prunerKey,
    prunerName: snap.prunerName,
    health,
    lastSuccessAgeMs,
    lastSuccessAt: lastSuccessAt == null ? null : lastSuccessAt.toISOString(),
  };
}

/**
 * One-line, human-readable rendering of a summary — the same badge text
 * the dashboard shows ("FAILING" / "STALE" / "OK" / "unknown") plus, when
 * applicable, the "last good run N ago" suffix.
 *
 * Examples:
 *   spam_events pruner: FAILING — last good run 14h ago
 *   rate_limit_buckets pruner: STALE — no successful run on record
 *   spam_events pruner: OK
 */
export function formatPrunerHealthLine(s: PrunerHealthSummary): string {
  const badge =
    s.health === "failing"
      ? "FAILING"
      : s.health === "stale"
        ? "STALE"
        : s.health === "ok"
          ? "OK"
          : "unknown (never run)";
  if (s.health === "ok" || s.health === "unknown") {
    return `${s.prunerName}: ${badge}`;
  }
  const suffix =
    s.lastSuccessAgeMs == null
      ? "no successful run on record"
      : `last good run ${formatAge(s.lastSuccessAgeMs)} ago`;
  return `${s.prunerName}: ${badge} — ${suffix}`;
}

/**
 * Read + summarize health for both background pruners. Best-effort by
 * design: any failure returns an empty array so a DB blip can never block
 * a spam-spike alert from going out (the spike is the primary signal; the
 * cleanup-health section is garnish).
 */
export async function readAllPrunerHealthSummaries(
  nowMs: number,
): Promise<PrunerHealthSummary[]> {
  try {
    const [spamEvents, rateLimitBuckets] = await Promise.all([
      readSpamEventsPrunerSnapshot(),
      readRateLimitBucketsPrunerSnapshot(),
    ]);
    return [
      summarizePrunerHealth(spamEvents, nowMs),
      summarizePrunerHealth(rateLimitBuckets, nowMs),
    ];
  } catch (err) {
    logger.warn(
      { err },
      "pruner-health-summary: failed to read pruner snapshots for spike alert",
    );
    return [];
  }
}
