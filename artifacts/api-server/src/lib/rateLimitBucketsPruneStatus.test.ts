import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  rateLimitBucketsPruneStatusTable,
  RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
  RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";

// Silence pruner logs while exercising the real DB path. Without this the
// structured pino lines drown out assertion failures in the test output.
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

async function clearStatus(): Promise<void> {
  await db
    .delete(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );
}

beforeEach(async () => {
  await clearStatus();
});

afterAll(async () => {
  await clearStatus();
});

test("pruneExpiredRateLimitBuckets writes a status row that survives across runs", async () => {
  // First run: no status row exists yet, so the pruner must INSERT one.
  // This proves that a fresh database (or one where an operator manually
  // truncated the table) gets a status row populated on the very next
  // scheduled tick — without this insert path, the admin dashboard would
  // sit at "Never run yet" forever even while the pruner ran fine.
  await pruneExpiredRateLimitBuckets();
  const afterFirst = await db
    .select()
    .from(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );

  expect(afterFirst.length).toBe(1);
  const firstRow = afterFirst[0]!;
  expect(firstRow.lastRetentionDays).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
  expect(firstRow.lastDeleted).toBeGreaterThanOrEqual(0);
  expect(firstRow.lastError).toBeNull();
  expect(firstRow.lastRunAt).toBeInstanceOf(Date);
  const firstRunAt = firstRow.lastRunAt as Date;

  // Second run: row already exists, so the pruner must UPSERT (not throw on
  // duplicate primary key) and the lastRunAt must move forward in time. A
  // regression that turned the upsert into a plain insert would crash this
  // test with a unique-violation, which is exactly the operator-visible
  // failure mode we want to prevent.
  await new Promise((resolve) => setTimeout(resolve, 5));
  await pruneExpiredRateLimitBuckets();
  const afterSecond = await db
    .select()
    .from(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );

  expect(afterSecond.length).toBe(1);
  const secondRow = afterSecond[0]!;
  expect(
    (secondRow.lastRunAt as Date).getTime(),
  ).toBeGreaterThanOrEqual(firstRunAt.getTime());
});

test("pruneExpiredRateLimitBuckets persists lastError when the delete fails", async () => {
  // Force the delete query to throw so we exercise the catch branch. The
  // status-row write itself uses a separate `db.insert(...)` call, so a spy
  // limited to `db.execute` won't accidentally break the persistence path
  // we're trying to verify.
  const failure = new Error(
    "simulated postgres failure for rate-limit pruner test",
  );
  const executeSpy = vi.spyOn(db, "execute").mockRejectedValueOnce(failure);

  try {
    const deleted = await pruneExpiredRateLimitBuckets();
    // The catch path returns 0, never re-throws. A regression that bubbled
    // the error up would crash the background interval and silently stop
    // the pruner — the very failure mode the status row exists to surface.
    expect(deleted).toBe(0);
  } finally {
    executeSpy.mockRestore();
  }

  const rows = await db
    .select()
    .from(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );

  expect(rows.length).toBe(1);
  const row = rows[0]!;
  // Status row must record the failure so the admin dashboard can show
  // "Last run failed: ..." instead of silently displaying a stale success.
  expect(row.lastError).not.toBeNull();
  expect(row.lastError).toContain("simulated postgres failure");
  expect(row.lastDeleted).toBe(0);
  expect(row.lastRetentionDays).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
  expect(row.lastRunAt).toBeInstanceOf(Date);
});
