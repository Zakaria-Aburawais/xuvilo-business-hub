import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import {
  db,
  spamEventsPruneStatusTable,
  SPAM_EVENTS_PRUNE_STATUS_ROW_ID,
  rateLimitBucketsPruneStatusTable,
  RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
  usersTable,
} from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const adminRouterImport = await import("../admin");
const adminRouter = adminRouterImport.default;
const { issueToken } = await import("../../lib/auth");
const { pruneOldSpamEvents } = await import("../../lib/spamEventsPrune");
const { pruneExpiredRateLimitBuckets } = await import(
  "../../lib/rateLimitBucketsPrune"
);
const { claimAlertSlot, _resetAlertDebounceForTests } = await import(
  "../../lib/alertDebounce"
);

const ADMIN_EMAIL = `admin-spamstats-${Date.now()}@example.test`;

function makeApp(): Express {
  const app = express();
  app.use("/api", adminRouter);
  return app;
}

beforeAll(async () => {
  // Seed a real admin user so requireRole("admin") + a forged token line up.
  // We use a unique-per-run email to avoid collisions with parallel test runs
  // or repeated invocations on the same database.
  await db.insert(usersTable).values({
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    email: ADMIN_EMAIL,
    passwordHash: "s1$00$00",
    role: "admin",
  });
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
  await db
    .delete(spamEventsPruneStatusTable)
    .where(eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID));
  await db
    .delete(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );
});

beforeEach(async () => {
  // Reset both pruner status rows so each test sees a clean state.
  await db
    .delete(spamEventsPruneStatusTable)
    .where(eq(spamEventsPruneStatusTable.id, SPAM_EVENTS_PRUNE_STATUS_ROW_ID));
  await db
    .delete(rateLimitBucketsPruneStatusTable)
    .where(
      eq(
        rateLimitBucketsPruneStatusTable.id,
        RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID,
      ),
    );
});

test("GET /admin/spam-stats includes a prune block (lastRun=null when never pruned)", async () => {
  const app = makeApp();
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(app)
    .get("/api/admin/spam-stats")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.prune).toBeDefined();
  expect(typeof res.body.prune.retentionDays).toBe("number");
  expect(res.body.prune.retentionDays).toBeGreaterThanOrEqual(7);
  expect(res.body.prune.lastRun).toBeNull();
  // `intervalMs` is the expected cadence the dashboard uses to drive the
  // per-pruner health badge (amber when the most recent run is older than
  // 2× this). Locking it as part of the contract prevents an accidental
  // server-side rename from silently breaking the badge.
  expect(typeof res.body.prune.intervalMs).toBe("number");
  expect(res.body.prune.intervalMs).toBeGreaterThan(0);
  // `lastSuccessAt` is reported alongside `lastRun` so the dashboard can
  // render "last good run N ago" beneath the failing/stale badge during an
  // incident. On a brand-new DB it must be present-but-null so the client
  // can distinguish "no successful run on record" from "older API server
  // hasn't been redeployed".
  expect(res.body.prune).toHaveProperty("lastSuccessAt");
  expect(res.body.prune.lastSuccessAt).toBeNull();

  // The rate-limit pruner mirrors the spam-events one — its status block must
  // be present even before either pruner has ever run, otherwise the admin
  // widget can't show "Never run yet" alongside the configured retention.
  expect(res.body.rateLimitPrune).toBeDefined();
  expect(typeof res.body.rateLimitPrune.retentionDays).toBe("number");
  expect(res.body.rateLimitPrune.retentionDays).toBeGreaterThanOrEqual(0);
  expect(res.body.rateLimitPrune.lastRun).toBeNull();
  expect(typeof res.body.rateLimitPrune.intervalMs).toBe("number");
  expect(res.body.rateLimitPrune.intervalMs).toBeGreaterThan(0);
  expect(res.body.rateLimitPrune).toHaveProperty("lastSuccessAt");
  expect(res.body.rateLimitPrune.lastSuccessAt).toBeNull();
});

test("GET /admin/spam-stats includes the alert cool-down ledger (never paged by default)", async () => {
  // Ensure no debounce rows linger from other suites so the "never paged"
  // state is deterministic.
  await _resetAlertDebounceForTests();

  const app = makeApp();
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(app)
    .get("/api/admin/spam-stats")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  const cooldowns = res.body.alertCooldowns as Array<{
    key: string;
    lastAlertedAt: string | null;
    debounceMs: number | null;
  }>;
  expect(Array.isArray(cooldowns)).toBe(true);
  // All three operational signals must be present in a stable order so the
  // dashboard can render a fixed-size ledger.
  expect(cooldowns.map((c) => c.key)).toEqual([
    "spam_spike",
    "pruner_health:spam_events",
    "pruner_health:rate_limit_buckets",
  ]);
  for (const entry of cooldowns) {
    // Never paged → null timestamp, and the row is still present (the UI
    // renders a "Never paged" state rather than hiding the signal).
    expect(entry.lastAlertedAt).toBeNull();
    // debounceMs is either null (alerting disabled in this env) or a
    // positive number matching the notifier's own cool-down window.
    if (entry.debounceMs !== null) {
      expect(entry.debounceMs).toBeGreaterThan(0);
    }
  }
});

test("GET /admin/spam-stats surfaces a claimed alert slot's timestamp", async () => {
  await _resetAlertDebounceForTests();
  // Claim the spam-spike slot exactly the way the notifier does, so the
  // endpoint reads back the very same ledger row the debouncer wrote.
  const nowMs = Date.now();
  const claimed = await claimAlertSlot("spam_spike", 60 * 60 * 1000, nowMs);
  expect(claimed).toBe(true);

  const app = makeApp();
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(app)
    .get("/api/admin/spam-stats")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  const cooldowns = res.body.alertCooldowns as Array<{
    key: string;
    lastAlertedAt: string | null;
    debounceMs: number | null;
  }>;
  const spike = cooldowns.find((c) => c.key === "spam_spike");
  expect(spike).toBeDefined();
  expect(typeof spike!.lastAlertedAt).toBe("string");
  const parsed = Date.parse(spike!.lastAlertedAt as string);
  expect(Number.isFinite(parsed)).toBe(true);
  // The reported timestamp must be the claim time (allow a little slack for
  // DB timestamp rounding).
  expect(Math.abs(parsed - nowMs)).toBeLessThan(5_000);
  // The other two signals remain never-paged.
  const others = cooldowns.filter((c) => c.key !== "spam_spike");
  expect(others).toHaveLength(2);
  for (const entry of others) {
    expect(entry.lastAlertedAt).toBeNull();
  }

  await _resetAlertDebounceForTests("spam_spike");
});

test("GET /admin/spam-stats reflects a recorded prune run", async () => {
  // Trigger a real prune so the status row is populated.
  await pruneOldSpamEvents();

  const app = makeApp();
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(app)
    .get("/api/admin/spam-stats")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.prune).toBeDefined();
  expect(res.body.prune.lastRun).not.toBeNull();
  const lastRun = res.body.prune.lastRun as {
    ranAt: string;
    deleted: number;
    retentionDays: number;
    error: string | null;
  };
  expect(typeof lastRun.ranAt).toBe("string");
  expect(Number.isFinite(Date.parse(lastRun.ranAt))).toBe(true);
  expect(lastRun.deleted).toBeGreaterThanOrEqual(0);
  expect(lastRun.retentionDays).toBeGreaterThanOrEqual(7);
  expect(lastRun.error).toBeNull();
  // A clean run must populate `lastSuccessAt` — that's the whole point of
  // the field. The dashboard uses it to render "last good run N ago" during
  // incidents, so a missing/null value here would silently break that.
  expect(typeof res.body.prune.lastSuccessAt).toBe("string");
  expect(Number.isFinite(Date.parse(res.body.prune.lastSuccessAt))).toBe(true);
});

test("GET /admin/spam-stats reflects a recorded rate-limit prune run", async () => {
  // Trigger a real rate-limit prune so its singleton status row is populated.
  // This is the new pruner's end-to-end check: pruner writes → endpoint
  // reads → JSON shape matches what the front-end widget expects.
  await pruneExpiredRateLimitBuckets();

  const app = makeApp();
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(app)
    .get("/api/admin/spam-stats")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.rateLimitPrune).toBeDefined();
  expect(res.body.rateLimitPrune.lastRun).not.toBeNull();
  const lastRun = res.body.rateLimitPrune.lastRun as {
    ranAt: string;
    deleted: number;
    retentionDays: number;
    error: string | null;
  };
  expect(typeof lastRun.ranAt).toBe("string");
  expect(Number.isFinite(Date.parse(lastRun.ranAt))).toBe(true);
  expect(lastRun.deleted).toBeGreaterThanOrEqual(0);
  // RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT is 1 (and an operator override
  // can drop it to 0). Asserting `>= 0` covers both without coupling the
  // test to the exact default value.
  expect(lastRun.retentionDays).toBeGreaterThanOrEqual(0);
  expect(lastRun.error).toBeNull();
  // Same `lastSuccessAt` contract as the spam-events pruner — both pruners
  // share the same status-row shape on the server, and the dashboard renders
  // both blocks identically.
  expect(typeof res.body.rateLimitPrune.lastSuccessAt).toBe("string");
  expect(
    Number.isFinite(Date.parse(res.body.rateLimitPrune.lastSuccessAt)),
  ).toBe(true);
});
