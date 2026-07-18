import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  db,
  alertDebounceTable,
  ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";

// Silence structured pino output so assertion failures stay readable.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const {
  pruneStaleAlertDebounceRows,
  getAlertDebounceRetentionDays,
  _stopAlertDebouncePrunerForTests,
} = await import("./alertDebouncePrune");

// All test rows live under this prefix so the suite only ever asserts on
// its own keys and never collides with rows other suites (or a live
// notifier) may have written.
const TEST_PREFIX = "test:alert-debounce-prune:";

const DAY_MS = 24 * 60 * 60 * 1000;

async function clearTestRows(): Promise<void> {
  await db
    .delete(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} LIKE ${TEST_PREFIX + "%"}`);
}

async function readTestKeys(): Promise<string[]> {
  const rows = await db
    .select({ key: alertDebounceTable.alertKey })
    .from(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} LIKE ${TEST_PREFIX + "%"}`);
  return rows.map((r) => r.key).sort();
}

beforeEach(async () => {
  delete process.env["ALERT_DEBOUNCE_RETENTION_DAYS"];
  await clearTestRows();
});

afterEach(async () => {
  delete process.env["ALERT_DEBOUNCE_RETENTION_DAYS"];
  await clearTestRows();
});

afterAll(async () => {
  _stopAlertDebouncePrunerForTests();
  await clearTestRows();
});

test("deletes rows older than the retention cutoff and keeps recent ones", async () => {
  const now = Date.now();
  const retentionDays = getAlertDebounceRetentionDays();

  const staleKey = `${TEST_PREFIX}stale`;
  const freshKey = `${TEST_PREFIX}fresh`;
  const borderlineKey = `${TEST_PREFIX}borderline`;

  await db.insert(alertDebounceTable).values([
    // Comfortably past the retention window — must be deleted.
    {
      alertKey: staleKey,
      lastAlertedAt: new Date(now - (retentionDays + 5) * DAY_MS),
    },
    // Alerted an hour ago — must survive.
    { alertKey: freshKey, lastAlertedAt: new Date(now - 60 * 60 * 1000) },
    // One day INSIDE the window — must survive. Guards against an
    // off-by-one that prunes rows the moment they hit retention - 1.
    {
      alertKey: borderlineKey,
      lastAlertedAt: new Date(now - (retentionDays - 1) * DAY_MS),
    },
  ]);

  const deleted = await pruneStaleAlertDebounceRows();
  // Other suites' rows may also be deleted, so assert "at least ours".
  expect(deleted).toBeGreaterThanOrEqual(1);

  const remaining = await readTestKeys();
  expect(remaining).toEqual([borderlineKey, freshKey].sort());
});

test("no-op when every row is inside the retention window", async () => {
  const now = Date.now();
  const k1 = `${TEST_PREFIX}noop-1`;
  const k2 = `${TEST_PREFIX}noop-2`;
  await db.insert(alertDebounceTable).values([
    { alertKey: k1, lastAlertedAt: new Date(now) },
    { alertKey: k2, lastAlertedAt: new Date(now - DAY_MS) },
  ]);

  await pruneStaleAlertDebounceRows();

  // Both rows must survive untouched. (We don't assert deleted === 0
  // because rows written by other suites/processes could legitimately be
  // pruned in the same pass.)
  expect(await readTestKeys()).toEqual([k1, k2].sort());
});

test("no-op on an empty table (no test rows at all)", async () => {
  // Just verifies the delete on an empty (test-scoped) set doesn't throw
  // and reports a sane number.
  const deleted = await pruneStaleAlertDebounceRows();
  expect(deleted).toBeGreaterThanOrEqual(0);
  expect(await readTestKeys()).toEqual([]);
});

test("retention env override is honoured within bounds", async () => {
  process.env["ALERT_DEBOUNCE_RETENTION_DAYS"] = "10";
  expect(getAlertDebounceRetentionDays()).toBe(10);

  const now = Date.now();
  const staleKey = `${TEST_PREFIX}env-stale`;
  const freshKey = `${TEST_PREFIX}env-fresh`;
  await db.insert(alertDebounceTable).values([
    { alertKey: staleKey, lastAlertedAt: new Date(now - 12 * DAY_MS) },
    { alertKey: freshKey, lastAlertedAt: new Date(now - 8 * DAY_MS) },
  ]);

  await pruneStaleAlertDebounceRows();
  expect(await readTestKeys()).toEqual([freshKey]);
});

test("out-of-range or invalid retention env falls back to the default", () => {
  process.env["ALERT_DEBOUNCE_RETENTION_DAYS"] = "0";
  expect(getAlertDebounceRetentionDays()).toBe(
    ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
  );

  process.env["ALERT_DEBOUNCE_RETENTION_DAYS"] = "99999";
  expect(getAlertDebounceRetentionDays()).toBe(
    ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
  );

  process.env["ALERT_DEBOUNCE_RETENTION_DAYS"] = "not-a-number";
  expect(getAlertDebounceRetentionDays()).toBe(
    ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT,
  );
});
