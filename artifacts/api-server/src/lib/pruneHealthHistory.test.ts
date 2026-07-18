import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db, prunerAlertEventsTable } from "@workspace/db";

// Silence pino lines so the test output stays focused on assertion failures
// rather than structured warnings from the best-effort DB paths.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const { readRecentPrunerAlerts } = await import("./pruneHealthNotifier");

const TEST_KEYS = ["__test_quiet_pruner__", "__test_noisy_pruner__"];

async function clearTestRows(): Promise<void> {
  await db
    .delete(prunerAlertEventsTable)
    .where(inArray(prunerAlertEventsTable.prunerKey, TEST_KEYS));
}

beforeEach(async () => {
  await clearTestRows();
});

afterAll(async () => {
  await clearTestRows();
});

// Regression test for the per-pruner-limit guarantee called out in the
// code review for Task #120. The old implementation used a single global
// `ORDER BY created_at DESC LIMIT N*pruners` query and bucketed in JS,
// which let a noisy pruner crowd out a quieter one. Window-function
// bucketing must give every requested key its own independent top-N
// regardless of how many rows the others wrote in the same window.
test("readRecentPrunerAlerts returns up to N rows per pruner even when one pruner has many more events", async () => {
  const baseMs = Date.now() - 10 * 60 * 60 * 1000; // 10h ago — well clear of any real prod rows

  // Seed 50 NOISY rows (every minute) and only 3 QUIET rows. With the old
  // global-limit approach, asking for 5 per pruner with 2 keys (limit
  // ~= 5*2*4 = 40 rows) would return 40 noisy rows newer than any quiet
  // row, leaving the quiet bucket empty. With the per-partition window
  // function, the quiet bucket must still get all 3 of its rows.
  const noisyRows = Array.from({ length: 50 }, (_, i) => ({
    prunerKey: TEST_KEYS[1] as string,
    kind: i % 2 === 0 ? "failing" : ("recovered" as const),
    createdAt: new Date(baseMs + i * 60 * 1000),
    unhealthyDurationMs: i % 2 === 0 ? null : 5 * 60 * 1000,
    lastError: i % 2 === 0 ? `noisy err ${i}` : null,
    lastSuccessAgeMs: 60 * 1000,
    intervalMs: 60 * 60 * 1000,
  }));
  const quietRows = Array.from({ length: 3 }, (_, i) => ({
    prunerKey: TEST_KEYS[0] as string,
    kind: "failing" as const,
    // Make the quiet rows OLDER than every noisy row so that a global
    // ORDER BY ... LIMIT can't accidentally include them.
    createdAt: new Date(baseMs - (i + 1) * 60 * 60 * 1000),
    unhealthyDurationMs: null,
    lastError: `quiet err ${i}`,
    lastSuccessAgeMs: 60 * 1000,
    intervalMs: 24 * 60 * 60 * 1000,
  }));

  await db
    .insert(prunerAlertEventsTable)
    .values([...noisyRows, ...quietRows]);

  const result = await readRecentPrunerAlerts(TEST_KEYS, 5);

  // Both keys must always be present in the result map, even if empty.
  expect(Object.keys(result).sort()).toEqual([...TEST_KEYS].sort());

  // Noisy pruner: gets the 5 most recent of its 50 rows.
  const noisy = result[TEST_KEYS[1] as string];
  expect(noisy).toBeDefined();
  expect(noisy!.length).toBe(5);
  // Newest first — the last row inserted (i=49) must be at index 0.
  expect(noisy![0]!.lastError ?? "(recovery)").toMatch(
    /noisy err 4(8|9)|\(recovery\)/,
  );

  // Quiet pruner: gets ALL 3 of its rows even though they're older than
  // every noisy row. This is the regression guard — proves no
  // cross-pruner crowding.
  const quiet = result[TEST_KEYS[0] as string];
  expect(quiet).toBeDefined();
  expect(quiet!.length).toBe(3);
  for (const entry of quiet!) {
    expect(entry.lastError).toMatch(/^quiet err \d$/);
    expect(entry.kind).toBe("failing");
  }
  // Newest-first ordering within the partition: quiet[0] is "quiet err 0"
  // (createdAt = baseMs - 1h), then "quiet err 1" (baseMs - 2h), etc.
  expect(quiet![0]!.lastError).toBe("quiet err 0");
  expect(quiet![2]!.lastError).toBe("quiet err 2");
});

test("readRecentPrunerAlerts returns an empty map entry for a pruner with no rows", async () => {
  // Only seed the noisy bucket; the quiet key must come back as `[]`,
  // not be missing, so the dashboard can confidently render an empty
  // strip without a defensive `?? []` at every call site.
  await db.insert(prunerAlertEventsTable).values({
    prunerKey: TEST_KEYS[1] as string,
    kind: "failing",
    createdAt: new Date(),
    unhealthyDurationMs: null,
    lastError: "boom",
    lastSuccessAgeMs: 60 * 1000,
    intervalMs: 60 * 60 * 1000,
  });

  const result = await readRecentPrunerAlerts(TEST_KEYS, 5);
  expect(result[TEST_KEYS[0] as string]).toEqual([]);
  expect(result[TEST_KEYS[1] as string]?.length).toBe(1);
});

test("readRecentPrunerAlerts handles an empty pruner-keys list without hitting the DB path", async () => {
  const result = await readRecentPrunerAlerts([], 5);
  expect(result).toEqual({});
});
