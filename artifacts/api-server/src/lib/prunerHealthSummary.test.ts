import { test, expect } from "vitest";
import {
  summarizePrunerHealth,
  formatPrunerHealthLine,
  type PrunerHealthSummary,
} from "./prunerHealthSummary";
import type { PrunerHealthSnapshot } from "./pruneHealthNotifier";

const HOUR = 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function snap(
  overrides: Partial<PrunerHealthSnapshot> & {
    lastRun?: PrunerHealthSnapshot["lastRun"];
  },
): PrunerHealthSnapshot {
  return {
    prunerKey: "spam_events",
    prunerName: "spam_events pruner",
    intervalMs: 24 * HOUR,
    lastRun: null,
    ...overrides,
  };
}

test("never-run pruner summarizes as unknown", () => {
  const s = summarizePrunerHealth(snap({}), NOW);
  expect(s.health).toBe("unknown");
  expect(s.lastSuccessAgeMs).toBeNull();
  expect(s.lastSuccessAt).toBeNull();
  expect(formatPrunerHealthLine(s)).toBe(
    "spam_events pruner: unknown (never run)",
  );
});

test("healthy recent run summarizes as ok", () => {
  const s = summarizePrunerHealth(
    snap({
      lastRun: {
        ranAt: new Date(NOW - HOUR),
        error: null,
        lastSuccessAt: new Date(NOW - HOUR),
      },
    }),
    NOW,
  );
  expect(s.health).toBe("ok");
  expect(s.lastSuccessAgeMs).toBe(HOUR);
  expect(formatPrunerHealthLine(s)).toBe("spam_events pruner: OK");
});

test("failing pruner keeps the preserved last-success age", () => {
  const s = summarizePrunerHealth(
    snap({
      lastRun: {
        ranAt: new Date(NOW - HOUR),
        error: "boom",
        lastSuccessAt: new Date(NOW - 14 * HOUR),
      },
    }),
    NOW,
  );
  expect(s.health).toBe("failing");
  expect(s.lastSuccessAgeMs).toBe(14 * HOUR);
  expect(formatPrunerHealthLine(s)).toBe(
    "spam_events pruner: FAILING — last good run 14h ago",
  );
});

test("stale pruner (last run older than 2x cadence) with no success on record", () => {
  const s = summarizePrunerHealth(
    snap({
      lastRun: {
        ranAt: new Date(NOW - 3 * 24 * HOUR),
        error: null,
        lastSuccessAt: null,
      },
    }),
    NOW,
  );
  expect(s.health).toBe("stale");
  expect(s.lastSuccessAgeMs).toBeNull();
  expect(formatPrunerHealthLine(s)).toBe(
    "spam_events pruner: STALE — no successful run on record",
  );
});

test("formatPrunerHealthLine renders 'last good run N ago' for stale with a success on record", () => {
  const s: PrunerHealthSummary = {
    prunerKey: "rate_limit_buckets",
    prunerName: "rate_limit_buckets pruner",
    health: "stale",
    lastSuccessAgeMs: 6 * HOUR,
    lastSuccessAt: new Date(NOW - 6 * HOUR).toISOString(),
  };
  expect(formatPrunerHealthLine(s)).toBe(
    "rate_limit_buckets pruner: STALE — last good run 6h ago",
  );
});
