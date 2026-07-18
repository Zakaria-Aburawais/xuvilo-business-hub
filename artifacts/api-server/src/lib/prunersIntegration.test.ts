import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { inArray } from "drizzle-orm";
import {
  db,
  rateLimitBucketsTable,
  spamEventsTable,
} from "@workspace/db";

// Silence pruner logs while exercising the real DB path. The pruners log on
// success, on no-op, and on failure — without this mock the test output is
// dominated by structured pino lines that obscure assertion failures.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const { pruneExpiredRateLimitBuckets } = await import(
  "./rateLimitBucketsPrune"
);
const { pruneOldSpamEvents } = await import("./spamEventsPrune");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Distinct prefixes so this integration test never collides with rows the
// rate-limit middleware tests (rateLimit.test.ts) leave behind, even if both
// suites happen to interleave.
const RL_KEY_EXPIRED_FAR = "test:prune-int:expired-far";
const RL_KEY_EXPIRED_EDGE = "test:prune-int:expired-edge";
const RL_KEY_FRESH_PAST = "test:prune-int:fresh-past";
const RL_KEY_FRESH_FUTURE = "test:prune-int:fresh-future";
const ALL_RL_KEYS = [
  RL_KEY_EXPIRED_FAR,
  RL_KEY_EXPIRED_EDGE,
  RL_KEY_FRESH_PAST,
  RL_KEY_FRESH_FUTURE,
];

const SPAM_ID_OLD_FAR = "test-prune-int-old-far";
const SPAM_ID_OLD_EDGE = "test-prune-int-old-edge";
const SPAM_ID_RECENT = "test-prune-int-recent";
const SPAM_ID_TODAY = "test-prune-int-today";
const ALL_SPAM_IDS = [
  SPAM_ID_OLD_FAR,
  SPAM_ID_OLD_EDGE,
  SPAM_ID_RECENT,
  SPAM_ID_TODAY,
];

const RL_RETENTION_DAYS = 1;
const SPAM_RETENTION_DAYS = 7;

let originalRlEnv: string | undefined;
let originalSpamEnv: string | undefined;

// Note: we deliberately do NOT touch `spam_events_prune_status` or
// `app_rate_limit_buckets_prune_status` here, even though both pruners
// upsert a row into their respective tables as a side effect.
// `spamEventsPruneStatus.test.ts` and `rateLimitBucketsPruneStatus.test.ts`
// already cover those rows' lifecycles, and Vitest runs test files in
// parallel against the same database — if multiple files raced on the
// singleton id=1 rows, one suite could delete them between another's
// prune call and its assertion. Confining ownership of those rows to a
// single test file each removes the race entirely.
async function clearTestRows(): Promise<void> {
  await db
    .delete(rateLimitBucketsTable)
    .where(inArray(rateLimitBucketsTable.key, ALL_RL_KEYS));
  await db
    .delete(spamEventsTable)
    .where(inArray(spamEventsTable.id, ALL_SPAM_IDS));
}

beforeEach(async () => {
  originalRlEnv = process.env["RATE_LIMIT_BUCKETS_RETENTION_DAYS"];
  originalSpamEnv = process.env["SPAM_EVENTS_RETENTION_DAYS"];
  process.env["RATE_LIMIT_BUCKETS_RETENTION_DAYS"] = String(RL_RETENTION_DAYS);
  process.env["SPAM_EVENTS_RETENTION_DAYS"] = String(SPAM_RETENTION_DAYS);
  await clearTestRows();
});

afterEach(() => {
  if (originalRlEnv === undefined) {
    delete process.env["RATE_LIMIT_BUCKETS_RETENTION_DAYS"];
  } else {
    process.env["RATE_LIMIT_BUCKETS_RETENTION_DAYS"] = originalRlEnv;
  }
  if (originalSpamEnv === undefined) {
    delete process.env["SPAM_EVENTS_RETENTION_DAYS"];
  } else {
    process.env["SPAM_EVENTS_RETENTION_DAYS"] = originalSpamEnv;
  }
});

afterAll(async () => {
  await clearTestRows();
});

test("pruneExpiredRateLimitBuckets deletes only rows with reset_at older than the cutoff", async () => {
  const now = Date.now();
  const cutoff = now - RL_RETENTION_DAYS * DAY_MS;

  await db.insert(rateLimitBucketsTable).values([
    // Far past the cutoff — must be deleted.
    {
      key: RL_KEY_EXPIRED_FAR,
      count: 1,
      resetAt: new Date(cutoff - 30 * DAY_MS),
    },
    // One minute past the cutoff — must still be deleted (proves the cutoff
    // arithmetic is in the right direction; an off-by-one that flipped the
    // comparison would let this row survive).
    {
      key: RL_KEY_EXPIRED_EDGE,
      count: 2,
      resetAt: new Date(cutoff - 60_000),
    },
    // Inside the retention window (between cutoff and now) — must survive.
    // Using a stale-but-recent row exercises the case the opportunistic
    // in-process purge misses: a key that hit the API once and never again.
    {
      key: RL_KEY_FRESH_PAST,
      count: 3,
      resetAt: new Date(now - HOUR_MS),
    },
    // Active bucket whose window has not yet ended — must survive. If the
    // pruner ever started deleting these, every live rate-limit count in
    // production would be reset on the hour.
    {
      key: RL_KEY_FRESH_FUTURE,
      count: 4,
      resetAt: new Date(now + 5 * 60_000),
    },
  ]);

  const deleted = await pruneExpiredRateLimitBuckets();
  expect(deleted, "exactly the two expired rows should be deleted").toBe(2);

  const survivors = await db
    .select({ key: rateLimitBucketsTable.key })
    .from(rateLimitBucketsTable)
    .where(inArray(rateLimitBucketsTable.key, ALL_RL_KEYS));
  const survivorKeys = survivors.map((r) => r.key).sort();
  expect(survivorKeys).toEqual(
    [RL_KEY_FRESH_PAST, RL_KEY_FRESH_FUTURE].sort(),
  );
});

test("pruneExpiredRateLimitBuckets is a no-op when no rows are expired", async () => {
  const now = Date.now();
  await db.insert(rateLimitBucketsTable).values([
    { key: RL_KEY_FRESH_PAST, count: 1, resetAt: new Date(now - HOUR_MS) },
    { key: RL_KEY_FRESH_FUTURE, count: 2, resetAt: new Date(now + HOUR_MS) },
  ]);

  const deleted = await pruneExpiredRateLimitBuckets();
  // The reported deleted count comes from Postgres' command tag (the only
  // place it can come from for a raw `db.execute(sql\`delete ...\`)`). If the
  // sql template tag changes how it compiles the table reference, this would
  // drop to NaN/undefined and the surrounding `?? 0` would mask the bug —
  // the explicit `toBe(0)` here is what catches that regression.
  expect(deleted).toBe(0);

  const survivors = await db
    .select({ key: rateLimitBucketsTable.key })
    .from(rateLimitBucketsTable)
    .where(inArray(rateLimitBucketsTable.key, ALL_RL_KEYS));
  expect(survivors.length).toBe(2);
});

test("pruneOldSpamEvents deletes only rows older than the retention cutoff", async () => {
  const now = Date.now();
  const cutoff = now - SPAM_RETENTION_DAYS * DAY_MS;

  await db.insert(spamEventsTable).values([
    // Far past the cutoff — must be deleted.
    {
      id: SPAM_ID_OLD_FAR,
      createdAt: new Date(cutoff - 60 * DAY_MS),
      kind: "honeypot",
      reason: "test-old-far",
      ip: "10.0.0.1",
      userAgent: "test",
    },
    // One minute past the cutoff — must still be deleted.
    {
      id: SPAM_ID_OLD_EDGE,
      createdAt: new Date(cutoff - 60_000),
      kind: "honeypot",
      reason: "test-old-edge",
      ip: "10.0.0.2",
      userAgent: "test",
    },
    // Inside the retention window — must survive.
    {
      id: SPAM_ID_RECENT,
      createdAt: new Date(now - 2 * DAY_MS),
      kind: "honeypot",
      reason: "test-recent",
      ip: "10.0.0.3",
      userAgent: "test",
    },
    // Created right now — must survive.
    {
      id: SPAM_ID_TODAY,
      createdAt: new Date(now),
      kind: "honeypot",
      reason: "test-today",
      ip: "10.0.0.4",
      userAgent: "test",
    },
  ]);

  const deleted = await pruneOldSpamEvents();
  expect(deleted, "exactly the two old rows should be deleted").toBe(2);

  const survivors = await db
    .select({ id: spamEventsTable.id })
    .from(spamEventsTable)
    .where(inArray(spamEventsTable.id, ALL_SPAM_IDS));
  const survivorIds = survivors.map((r) => r.id).sort();
  expect(survivorIds).toEqual([SPAM_ID_RECENT, SPAM_ID_TODAY].sort());

  // The status-row write performed by `pruneOldSpamEvents` is intentionally
  // NOT asserted here — that path is covered end-to-end by
  // `spamEventsPruneStatus.test.ts`, and asserting on the singleton id=1
  // row from two files in parallel would be racy.
});

test("pruneOldSpamEvents leaves all rows intact when none are older than the cutoff", async () => {
  const now = Date.now();
  await db.insert(spamEventsTable).values([
    {
      id: SPAM_ID_RECENT,
      createdAt: new Date(now - 2 * DAY_MS),
      kind: "honeypot",
      reason: "test-recent",
      ip: "10.0.0.3",
      userAgent: "test",
    },
    {
      id: SPAM_ID_TODAY,
      createdAt: new Date(now),
      kind: "honeypot",
      reason: "test-today",
      ip: "10.0.0.4",
      userAgent: "test",
    },
  ]);

  const deleted = await pruneOldSpamEvents();
  expect(deleted).toBe(0);

  const survivors = await db
    .select({ id: spamEventsTable.id })
    .from(spamEventsTable)
    .where(inArray(spamEventsTable.id, ALL_SPAM_IDS));
  expect(survivors.length).toBe(2);
});
