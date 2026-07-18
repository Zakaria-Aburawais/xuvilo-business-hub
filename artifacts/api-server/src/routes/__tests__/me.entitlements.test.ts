import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, usersTable } from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

// entitlements.ts reads BILLING_ENABLED once at module load, so the env stub
// must be in place before the me router (which imports it) is loaded.
vi.resetModules();
vi.stubEnv("BILLING_ENABLED", "true");

const meRouter = (await import("../me")).default;
const { issueToken } = await import("../../lib/auth");

const FREE_EMAIL = "entitlements-free-test@example.com";
const PRO_EMAIL = "entitlements-pro-test@example.com";
const TEST_EMAILS = [FREE_EMAIL, PRO_EMAIL];

function makeApp(): Express {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    next();
  });
  app.use("/api", meRouter);
  return app;
}

async function cleanupRows() {
  await db.delete(usersTable).where(inArray(usersTable.email, TEST_EMAILS));
}

beforeAll(async () => {
  await cleanupRows();
  await db.insert(usersTable).values([
    {
      id: randomUUID(),
      email: FREE_EMAIL,
      name: "Free User",
      tier: "free",
    },
    {
      id: randomUUID(),
      email: PRO_EMAIL,
      name: "Pro User",
      tier: "pro",
      subscriptionStatus: "active",
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ]);
});

afterAll(async () => {
  await cleanupRows();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("GET /api/me/entitlements with BILLING_ENABLED=true", () => {
  it("rejects unauthenticated requests", async () => {
    const app = makeApp();
    const res = await request(app).get("/api/me/entitlements");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthenticated");
  });

  it("locks the tracker for a free-tier user", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/me/entitlements")
      .set("Authorization", `Bearer ${issueToken(FREE_EMAIL)}`);
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe("free");
    expect(res.body.features.tracker).toBe(false);
  });

  it("grants the tracker to an active pro user", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/me/entitlements")
      .set("Authorization", `Bearer ${issueToken(PRO_EMAIL)}`);
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe("pro");
    expect(res.body.subscriptionStatus).toBe("active");
    expect(res.body.features.tracker).toBe(true);
  });
});
