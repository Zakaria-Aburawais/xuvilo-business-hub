import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, ilike } from "drizzle-orm";
import { db, contactMessagesTable, usersTable } from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const adminContactRouterImport = await import("../adminContact");
const adminContactRouter = adminContactRouterImport.default;
const { issueToken } = await import("../../lib/auth");

const ADMIN_EMAIL = `admin-needsfollowup-${Date.now()}@example.test`;

// Unique-per-run marker embedded in every seeded subject so the `q` filter
// scopes assertions to our fixtures even if the shared database already
// contains other contact_messages rows.
const MARKER = `nfu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const STATUSES = ["sent", "partial", "failed", "pending"] as const;

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", adminContactRouter);
  return app;
}

const seededIds: string[] = [];

beforeAll(async () => {
  await db.insert(usersTable).values({
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    email: ADMIN_EMAIL,
    passwordHash: "s1$00$00",
    role: "admin",
  });

  // One row per mail_status, each tagged with the marker.
  for (const status of STATUSES) {
    const rows = await db
      .insert(contactMessagesTable)
      .values({
        name: `Test ${status}`,
        email: `${status}@example.test`,
        subject: `${MARKER} ${status}`,
        message: "fixture row for needs_follow_up filter regression test",
        mailStatus: status,
      })
      .returning({ id: contactMessagesTable.id });
    const id = rows[0]?.id;
    if (id) seededIds.push(id);
  }
});

afterAll(async () => {
  await db
    .delete(contactMessagesTable)
    .where(ilike(contactMessagesTable.subject, `${MARKER}%`));
  await db.delete(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
});

function authedGet(app: Express, query: Record<string, string>) {
  const token = issueToken(ADMIN_EMAIL);
  return request(app)
    .get("/api/admin/contact-messages")
    .query({ ...query, q: MARKER })
    .set("Authorization", `Bearer ${token}`);
}

describe("GET /api/admin/contact-messages status filters", () => {
  it("seeds one row per mail_status", () => {
    expect(seededIds).toHaveLength(STATUSES.length);
  });

  it("status=needs_follow_up returns exactly the failed + partial rows with correct total", async () => {
    const app = makeApp();
    const res = await authedGet(app, { status: "needs_follow_up" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
    const statuses = res.body.items
      .map((r: { mailStatus: string }) => r.mailStatus)
      .sort();
    expect(statuses).toEqual(["failed", "partial"]);
    // Echo back the filter so the client can trust what was applied.
    expect(res.body.filter.status).toBe("needs_follow_up");
  });

  it.each(STATUSES)(
    "status=%s returns only that row",
    async (status) => {
      const app = makeApp();
      const res = await authedGet(app, { status });

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].mailStatus).toBe(status);
      expect(res.body.filter.status).toBe(status);
    },
  );

  it("unknown status values are ignored (all marker rows returned, filter echoed as null)", async () => {
    const app = makeApp();
    const res = await authedGet(app, { status: "bogus" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(STATUSES.length);
    expect(res.body.filter.status).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/admin/contact-messages")
      .query({ status: "needs_follow_up" });

    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/admin/contact-messages")
      .query({ status: "needs_follow_up" })
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });
});
