import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

// Mock the notifier so we never actually fire webhooks or emails from the
// integration test. Each test installs its own implementation via the
// `mockSend` ref below.
const mockSend = vi.hoisted(() => ({
  fn: vi.fn(),
}));
vi.mock("../../lib/pruneHealthNotifier", () => ({
  sendPrunerHealthTestAlert: (...args: unknown[]) => mockSend.fn(...args),
}));

const adminRouterImport = await import("../admin");
const adminRouter = adminRouterImport.default;
const { issueToken } = await import("../../lib/auth");

const ADMIN_EMAIL = `admin-prune-test-${Date.now()}@example.test`;
const NON_ADMIN_EMAIL = `user-prune-test-${Date.now()}@example.test`;
// Track per-test throwaway admin users so afterAll can clean them up. We
// avoid a global rate-limit-table truncate between tests because that
// would race with other test files (e.g. contact.rateLimit.test.ts) that
// share the same Postgres-backed bucket store.
const ephemeralAdmins: string[] = [];

async function createThrowawayAdmin(): Promise<string> {
  const email = `admin-prune-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  await db.insert(usersTable).values({
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    email,
    passwordHash: "s1$00$00",
    role: "admin",
  });
  ephemeralAdmins.push(email);
  return email;
}

function makeApp(): Express {
  const app = express();
  app.use("/api", adminRouter);
  return app;
}

beforeAll(async () => {
  // Seed both an admin and a non-admin user so we can exercise the
  // requireRole("admin") branch without re-using the same identity.
  await db.insert(usersTable).values([
    {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      email: ADMIN_EMAIL,
      passwordHash: "s1$00$00",
      role: "admin",
    },
    {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}u`,
      email: NON_ADMIN_EMAIL,
      passwordHash: "s1$00$00",
      role: "user",
    },
  ]);
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
  await db.delete(usersTable).where(eq(usersTable.email, NON_ADMIN_EMAIL));
  for (const email of ephemeralAdmins) {
    await db.delete(usersTable).where(eq(usersTable.email, email));
  }
});

beforeEach(() => {
  mockSend.fn.mockReset();
});

test("POST /admin/prune-health/test-alert requires a bearer token (401)", async () => {
  const app = makeApp();
  const res = await request(app).post("/api/admin/prune-health/test-alert");
  expect(res.status).toBe(401);
  expect(mockSend.fn).not.toHaveBeenCalled();
});

test("POST /admin/prune-health/test-alert rejects non-admin users (403)", async () => {
  const app = makeApp();
  const token = issueToken(NON_ADMIN_EMAIL);
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(403);
  expect(mockSend.fn).not.toHaveBeenCalled();
});

test("POST /admin/prune-health/test-alert returns 503 when no channel is configured", async () => {
  mockSend.fn.mockResolvedValueOnce({
    enabled: false,
    webhook: { attempted: false, ok: null },
    email: { attempted: false, ok: null },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();
  // Each POST-issuing test uses its own throwaway admin so the per-admin
  // 30s test-alert cool-down (introduced in task #131) doesn't bleed
  // across tests. Avoids needing a global rate-limit reset that would
  // race with other parallel test files using the same bucket store.
  const token = issueToken(await createThrowawayAdmin());
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(503);
  expect(res.body.success).toBe(false);
  expect(res.body.error).toBe("alerts_not_configured");
  // The result envelope is still echoed so the dashboard can render the
  // per-channel breakdown without re-deriving it.
  expect(res.body.result).toEqual({
    enabled: false,
    webhook: { attempted: false, ok: null },
    email: { attempted: false, ok: null },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });
});

test("POST /admin/prune-health/test-alert returns 200 + success when every attempted channel succeeded", async () => {
  mockSend.fn.mockResolvedValueOnce({
    enabled: true,
    webhook: { attempted: true, ok: true },
    email: { attempted: true, ok: true },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();
  const token = issueToken(await createThrowawayAdmin());
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.result.webhook).toEqual({ attempted: true, ok: true });
  expect(res.body.result.email).toEqual({ attempted: true, ok: true });
});

test("POST /admin/prune-health/test-alert returns 200 + success=false when any attempted channel failed", async () => {
  // Webhook attempted but the sender returned false (Slack 500, etc).
  // Email succeeded. The endpoint reports overall success=false so the UI
  // can warn the operator that not every channel got the message — but
  // STILL returns 200 because the request itself was processed.
  mockSend.fn.mockResolvedValueOnce({
    enabled: true,
    webhook: { attempted: true, ok: false },
    email: { attempted: true, ok: true },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();
  const token = issueToken(await createThrowawayAdmin());
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(false);
  expect(res.body.result.webhook.ok).toBe(false);
  expect(res.body.result.email.ok).toBe(true);
});

test("POST /admin/prune-health/test-alert rate-limits repeated calls from the same admin (429 with retryAfter)", async () => {
  // Two back-to-back sends from the same admin — second must be throttled
  // even though the first succeeded. This is the accidental-double-click /
  // two-tabs scenario: without the limiter, both would fire into the real
  // on-call channel.
  mockSend.fn.mockResolvedValue({
    enabled: true,
    webhook: { attempted: true, ok: true },
    email: { attempted: true, ok: true },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();
  const token = issueToken(await createThrowawayAdmin());

  const first = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);
  expect(first.status).toBe(200);
  expect(first.body.success).toBe(true);

  const second = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);
  expect(second.status).toBe(429);
  expect(second.body.success).toBe(false);
  expect(second.body.error).toBe("rate_limited");
  expect(typeof second.body.message).toBe("string");
  expect(second.body.message).toMatch(/wait/i);
  expect(second.body.retryAfterSeconds).toBeGreaterThan(0);
  expect(second.headers["retry-after"]).toBeDefined();
  expect(Number(second.headers["retry-after"])).toBeGreaterThan(0);
  // Critically: the notifier must NOT have been called for the throttled
  // request. The whole point of the limit is to keep synthetic alerts off
  // the real channel.
  expect(mockSend.fn).toHaveBeenCalledTimes(1);
});

test("POST /admin/prune-health/test-alert cool-down is per-admin, not global", async () => {
  // A second admin must be able to fire their own test even if the first
  // admin just used theirs. Without per-key bucketing, one operator could
  // accidentally lock everyone else out of testing the wiring.
  const adminA = await createThrowawayAdmin();
  const adminB = await createThrowawayAdmin();

  mockSend.fn.mockResolvedValue({
    enabled: true,
    webhook: { attempted: true, ok: true },
    email: { attempted: true, ok: true },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();

  const first = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${issueToken(adminA)}`);
  expect(first.status).toBe(200);

  const second = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${issueToken(adminB)}`);
  expect(second.status).toBe(200);
  expect(mockSend.fn).toHaveBeenCalledTimes(2);
});

test("POST /admin/prune-health/test-alert: a single configured channel that succeeds reports success=true", async () => {
  mockSend.fn.mockResolvedValueOnce({
    enabled: true,
    webhook: { attempted: false, ok: null },
    email: { attempted: true, ok: true },
    generatedAt: "2026-05-01T12:00:00.000Z",
  });

  const app = makeApp();
  const token = issueToken(await createThrowawayAdmin());
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

test("POST /admin/prune-health/test-alert echoes the cleanup-health lines embedded in the sent alert", async () => {
  // The dashboard renders these lines in the test-alert result panel so an
  // operator can preview the "Background cleanup health" section without
  // opening Slack or their inbox. The route must pass them through verbatim.
  const lines = [
    "spam_events pruner: healthy — last success 2h ago (cadence 24h)",
    "rate_limit_buckets pruner: healthy — last success 30m ago (cadence 1h)",
  ];
  mockSend.fn.mockResolvedValueOnce({
    enabled: true,
    webhook: { attempted: true, ok: true },
    email: { attempted: false, ok: null },
    generatedAt: "2026-05-01T12:00:00.000Z",
    cleanupHealthLines: lines,
  });

  const app = makeApp();
  const token = issueToken(await createThrowawayAdmin());
  const res = await request(app)
    .post("/api/admin/prune-health/test-alert")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.result.cleanupHealthLines).toEqual(lines);
});
