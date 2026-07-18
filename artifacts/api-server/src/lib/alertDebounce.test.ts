import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db, alertDebounceTable } from "@workspace/db";

// Silence the helper's error log when we deliberately torpedo the DB call
// in the failure-mode test. Without this the test output is dominated by
// a structured pino line that obscures the assertion failure.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const { claimAlertSlot, _resetAlertDebounceForTests } = await import(
  "./alertDebounce"
);

// All test rows live under this prefix so this suite can scope its cleanup
// to its own keys and never collide with the spam-spike or pruner-health
// rows that other suites (or production) may have already written.
const TEST_PREFIX = "test:alert-debounce:";

async function clearTestRows(): Promise<void> {
  await db
    .delete(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} LIKE ${TEST_PREFIX + "%"}`);
}

beforeEach(async () => {
  await clearTestRows();
});

afterEach(async () => {
  await clearTestRows();
});

afterAll(async () => {
  await clearTestRows();
});

test("first claim wins when no row exists yet", async () => {
  const key = `${TEST_PREFIX}first-claim`;
  const now = Date.now();
  const ok = await claimAlertSlot(key, 60_000, now);
  expect(ok).toBe(true);

  const rows = await db
    .select()
    .from(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} = ${key}`);
  expect(rows.length).toBe(1);
  expect(rows[0]!.lastAlertedAt).toBeInstanceOf(Date);
  expect((rows[0]!.lastAlertedAt as Date).getTime()).toBe(now);
});

test("a second claim inside the cool-down window is rejected", async () => {
  const key = `${TEST_PREFIX}cooldown`;
  const t0 = Date.now();
  const debounceMs = 30 * 60 * 1000;

  const first = await claimAlertSlot(key, debounceMs, t0);
  expect(first).toBe(true);

  // 5 minutes later — still inside the 30-minute window.
  const second = await claimAlertSlot(key, debounceMs, t0 + 5 * 60 * 1000);
  expect(second).toBe(false);

  // Row must still hold the ORIGINAL timestamp — a buggy upsert that
  // accidentally overwrote it would let the next claim succeed too early.
  const rows = await db
    .select()
    .from(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} = ${key}`);
  expect((rows[0]!.lastAlertedAt as Date).getTime()).toBe(t0);
});

test("a claim past the cool-down window is accepted and advances the row", async () => {
  const key = `${TEST_PREFIX}past-window`;
  const t0 = Date.now();
  const debounceMs = 30 * 60 * 1000;

  await claimAlertSlot(key, debounceMs, t0);
  const t1 = t0 + 31 * 60 * 1000;
  const ok = await claimAlertSlot(key, debounceMs, t1);
  expect(ok).toBe(true);

  const rows = await db
    .select()
    .from(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} = ${key}`);
  expect((rows[0]!.lastAlertedAt as Date).getTime()).toBe(t1);
});

test("debounce is per-key: claiming key A does NOT block key B", async () => {
  const a = `${TEST_PREFIX}key-a`;
  const b = `${TEST_PREFIX}key-b`;
  const now = Date.now();
  const debounceMs = 60 * 60 * 1000;

  expect(await claimAlertSlot(a, debounceMs, now)).toBe(true);
  expect(await claimAlertSlot(b, debounceMs, now)).toBe(true);
  // Same key inside the window is still rejected.
  expect(await claimAlertSlot(a, debounceMs, now + 1_000)).toBe(false);
});

test("debounce survives a 'simulated restart' — state is in the DB, not memory", async () => {
  // Critical regression test for Task #118. We pre-seed the persistent
  // ledger with a recent claim and then call the helper FRESH (no shared
  // module-level state to clear, because there is none). The helper must
  // refuse the new claim because the DB row still says the cool-down is
  // active. Pre-fix this guarantee did not exist: a deploy wiped the
  // in-memory map and the very next event re-paged ops.
  const key = `${TEST_PREFIX}restart-survival`;
  const debounceMs = 30 * 60 * 1000;
  const t0 = Date.now();

  // Pre-seed the row directly — equivalent to "the previous process
  // already alerted at t0 and then the server was redeployed".
  await db
    .insert(alertDebounceTable)
    .values({ alertKey: key, lastAlertedAt: new Date(t0) });

  // 10 minutes after that pre-existing alert, well inside the cool-down.
  // The helper instance has zero in-memory knowledge of the prior claim;
  // its only source of truth is the DB row.
  const ok = await claimAlertSlot(key, debounceMs, t0 + 10 * 60 * 1000);
  expect(
    ok,
    "post-restart claim must be rejected when the DB row is still inside cool-down",
  ).toBe(false);

  // Past the window — the helper now correctly accepts the claim.
  const okLater = await claimAlertSlot(
    key,
    debounceMs,
    t0 + 31 * 60 * 1000,
  );
  expect(okLater).toBe(true);
});

test("two near-simultaneous claims for the same key produce exactly one winner", async () => {
  // The atomic upsert is what guarantees this — without `setWhere`, both
  // branches of `Promise.all` would observe an "empty" pre-state and both
  // would think they had won the slot.
  const key = `${TEST_PREFIX}race`;
  const debounceMs = 60 * 60 * 1000;
  const now = Date.now();

  const results = await Promise.all([
    claimAlertSlot(key, debounceMs, now),
    claimAlertSlot(key, debounceMs, now),
    claimAlertSlot(key, debounceMs, now),
  ]);
  const winners = results.filter(Boolean).length;
  expect(winners).toBe(1);
});

test("_resetAlertDebounceForTests scoped to a key only deletes that key's row", async () => {
  const k1 = `${TEST_PREFIX}reset-scoped-1`;
  const k2 = `${TEST_PREFIX}reset-scoped-2`;
  const now = Date.now();
  await claimAlertSlot(k1, 60_000, now);
  await claimAlertSlot(k2, 60_000, now);

  await _resetAlertDebounceForTests(k1);

  const rows = await db
    .select({ key: alertDebounceTable.alertKey })
    .from(alertDebounceTable)
    .where(sql`${alertDebounceTable.alertKey} LIKE ${TEST_PREFIX + "%"}`);
  const keys = rows.map((r) => r.key).sort();
  expect(keys).toEqual([k2]);
});
