import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { inArray } from "drizzle-orm";
import {
  db,
  prunerAlertEventsTable,
  PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
} from "@workspace/db";

// Silence pruner logs while exercising the real DB path, mirroring
// prunersIntegration.test.ts.
vi.mock("./logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const {
  pruneOldPrunerAlertEvents,
  getPrunerAlertEventsRetentionDays,
  _stopPrunerAlertEventsPrunerForTests,
} = await import("./prunerAlertEventsPrune");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Distinct id prefix so this file never collides with rows other suites
// (e.g. pruneHealthHistory.test.ts) write into the same table.
const ID_OLD_FAR = "test-alert-prune-old-far";
const ID_OLD_EDGE = "test-alert-prune-old-edge";
const ID_RECENT = "test-alert-prune-recent";
const ID_TODAY = "test-alert-prune-today";
const ALL_IDS = [ID_OLD_FAR, ID_OLD_EDGE, ID_RECENT, ID_TODAY];

const RETENTION_DAYS = 7;

let originalEnv: string | undefined;

async function clearTestRows(): Promise<void> {
  await db
    .delete(prunerAlertEventsTable)
    .where(inArray(prunerAlertEventsTable.id, ALL_IDS));
}

beforeEach(async () => {
  originalEnv = process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"];
  await clearTestRows();
});

afterEach(async () => {
  if (originalEnv === undefined) {
    delete process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"];
  } else {
    process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = originalEnv;
  }
  await clearTestRows();
});

afterAll(() => {
  _stopPrunerAlertEventsPrunerForTests();
});

function makeRow(id: string, ageMs: number) {
  return {
    id,
    prunerKey: "test_pruner",
    kind: "failing",
    createdAt: new Date(Date.now() - ageMs),
    intervalMs: DAY_MS,
  };
}

test("deletes rows older than retention, keeps newer ones", async () => {
  process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = String(RETENTION_DAYS);

  await db.insert(prunerAlertEventsTable).values([
    makeRow(ID_OLD_FAR, 400 * DAY_MS),
    makeRow(ID_OLD_EDGE, RETENTION_DAYS * DAY_MS + HOUR_MS),
    makeRow(ID_RECENT, RETENTION_DAYS * DAY_MS - HOUR_MS),
    makeRow(ID_TODAY, HOUR_MS),
  ]);

  const deleted = await pruneOldPrunerAlertEvents();
  expect(deleted).toBeGreaterThanOrEqual(2);

  const remaining = await db
    .select({ id: prunerAlertEventsTable.id })
    .from(prunerAlertEventsTable)
    .where(inArray(prunerAlertEventsTable.id, ALL_IDS));
  const ids = remaining.map((r) => r.id).sort();
  expect(ids).toEqual([ID_RECENT, ID_TODAY].sort());
});

test("retention env parsing: default, out-of-range, non-numeric", () => {
  delete process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"];
  expect(getPrunerAlertEventsRetentionDays()).toBe(
    PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
  );

  process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = "30";
  expect(getPrunerAlertEventsRetentionDays()).toBe(30);

  // Below the floor — falls back to the default so a typo can't wipe history.
  process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = "0";
  expect(getPrunerAlertEventsRetentionDays()).toBe(
    PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
  );

  // Above the ceiling.
  process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = "99999";
  expect(getPrunerAlertEventsRetentionDays()).toBe(
    PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
  );

  // Non-numeric.
  process.env["PRUNER_ALERT_EVENTS_RETENTION_DAYS"] = "abc";
  expect(getPrunerAlertEventsRetentionDays()).toBe(
    PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT,
  );
});
