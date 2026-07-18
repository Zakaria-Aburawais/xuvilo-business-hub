import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  spamEventsPruneStatusTable,
  SPAM_EVENTS_PRUNE_STATUS_ROW_ID,
  SPAM_EVENTS_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";

// Silence pruner logs while exercising the real DB path.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const { pruneOldSpamEvents } = await import("./spamEventsPrune");

async function clearStatus(): Promise<void> {
  await db
    .delete(spamEventsPruneStatusTable)
    .where(
      eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID),
    );
}

beforeEach(async () => {
  await clearStatus();
});

afterAll(async () => {
  await clearStatus();
});

test("pruneOldSpamEvents writes a status row that survives across runs", async () => {
  // First run: no status row exists yet, so the pruner must INSERT one.
  await pruneOldSpamEvents();
  const afterFirst = await db
    .select()
    .from(spamEventsPruneStatusTable)
    .where(eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID));

  expect(afterFirst.length).toBe(1);
  const firstRow = afterFirst[0]!;
  expect(firstRow.lastRetentionDays).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
  expect(firstRow.lastDeleted).toBeGreaterThanOrEqual(0);
  expect(firstRow.lastError).toBeNull();
  expect(firstRow.lastRunAt).toBeInstanceOf(Date);
  const firstRunAt = firstRow.lastRunAt as Date;

  // Second run: row already exists, so the pruner must UPSERT (not throw on
  // duplicate primary key) and the lastRunAt must move forward in time.
  await new Promise((resolve) => setTimeout(resolve, 5));
  await pruneOldSpamEvents();
  const afterSecond = await db
    .select()
    .from(spamEventsPruneStatusTable)
    .where(eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID));

  expect(afterSecond.length).toBe(1);
  const secondRow = afterSecond[0]!;
  expect(
    (secondRow.lastRunAt as Date).getTime(),
  ).toBeGreaterThanOrEqual(firstRunAt.getTime());
});
