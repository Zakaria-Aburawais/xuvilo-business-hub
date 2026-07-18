import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribersTable } from "@workspace/db";

vi.mock("../../lib/sendgrid", () => ({
  getUncachableSendGridClient: async () => ({
    client: { send: async () => undefined },
    fromEmail: "noreply@xuvilo.test",
  }),
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const newsletterRouterImport = await import("../newsletter");
const newsletterRouter = newsletterRouterImport.default;
const { _resetRateLimitForTests } = await import("../../lib/rateLimit");
const { buildUnsubscribeUrl } = await import("../../lib/unsubscribeToken");

const TEST_EMAIL = "resubscribe-test@example.com";

function makeApp(): Express {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use((req, _res, next) => {
    // pino-http normally provides req.log; in this minimal test app we stub
    // it so route handlers that call req.log.info/.warn/.error don't crash.
    (req as unknown as { log: unknown }).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    next();
  });
  app.use("/api", newsletterRouter);
  return app;
}

async function cleanupRow() {
  await db
    .delete(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, TEST_EMAIL));
}

beforeEach(async () => {
  await _resetRateLimitForTests();
  await cleanupRow();
});

afterEach(async () => {
  await cleanupRow();
});

describe("POST /api/newsletter/subscribe resubscribe flow", () => {
  it("subscribe → unsubscribe → subscribe again clears unsubscribed_at and returns resubscribed", async () => {
    const app = makeApp();

    // 1) Initial subscribe — fresh insert.
    const first = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: TEST_EMAIL, source: "test" });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ status: "subscribed" });

    // 2) Unsubscribe via the signed-token endpoint (the only way the row's
    //    unsubscribed_at gets set in production).
    const token = new URL(
      buildUnsubscribeUrl("https://example.com", TEST_EMAIL, "en"),
    ).searchParams.get("token");
    expect(token).toBeTruthy();

    const unsub = await request(app)
      .post("/api/newsletter/unsubscribe")
      .send({ token });
    expect(unsub.status).toBe(200);
    expect(unsub.body.status).toBe("unsubscribed");

    const afterUnsub = await db
      .select({ unsubscribedAt: newsletterSubscribersTable.unsubscribedAt })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, TEST_EMAIL));
    expect(afterUnsub[0]?.unsubscribedAt).not.toBeNull();

    // 3) Resubscribe — must clear unsubscribed_at and return the new status.
    const second = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: TEST_EMAIL, source: "test" });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: "resubscribed" });

    const afterResub = await db
      .select({ unsubscribedAt: newsletterSubscribersTable.unsubscribedAt })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, TEST_EMAIL));
    expect(afterResub).toHaveLength(1);
    expect(afterResub[0]?.unsubscribedAt).toBeNull();
  });

  it("subscribing an already-active email still returns subscribed (no enumeration)", async () => {
    const app = makeApp();

    const first = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: TEST_EMAIL, source: "test" });
    expect(first.body).toEqual({ status: "subscribed" });

    const second = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: TEST_EMAIL, source: "test" });
    expect(second.body).toEqual({ status: "subscribed" });
  });
});
