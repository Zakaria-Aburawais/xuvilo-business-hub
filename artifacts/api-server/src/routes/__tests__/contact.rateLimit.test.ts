import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// We deliberately do NOT mock @workspace/db here — the rate limiter is now
// Postgres-backed and exercising it through a real connection is the whole
// point of this regression test. The contact route also writes to
// `contact_messages`; those rows are harmless test fixtures.

vi.mock("../../lib/sendgrid", () => ({
  getUncachableSendGridClient: async () => ({
    client: { send: async () => undefined },
    fromEmail: "noreply@xuvilo.test",
  }),
}));

vi.mock("../../lib/contactFailureNotifier", () => ({
  notifyContactFailure: async () => undefined,
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const contactRouterImport = await import("../contact");
const contactRouter = contactRouterImport.default;
const { _resetRateLimitForTests } = await import("../../lib/rateLimit");

function makeApp(): Express {
  const app = express();
  // Mirrors src/app.ts: trust the immediate proxy so req.ip reflects the
  // X-Forwarded-For value our tests inject. Without this, every request
  // would key against the loopback socket and the IP-rotation test would
  // be meaningless.
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api", contactRouter);
  return app;
}

const validBody = (overrides: Partial<Record<string, string>> = {}) => ({
  name: "Aria Tester",
  email: "aria@example.com",
  subject: "Hello there",
  message: "I would like to learn more about your services, please.",
  ...overrides,
});

const RATE_LIMIT_BODY = {
  success: false,
  error: "Too many requests",
  message: "Too many attempts. Please try again later.",
};

describe("POST /api/contact rate limits", () => {
  beforeEach(async () => {
    await _resetRateLimitForTests();
  });

  it("blocks a single (ip, email) pair after 5 successful submissions", async () => {
    const app = makeApp();
    const ip = "10.0.0.1";

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", ip)
        .send(validBody());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    }

    const blocked = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", ip)
      .send(validBody());

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(RATE_LIMIT_BODY);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("blocks a single IP rotating distinct emails after 10 successful submissions", { timeout: 30_000 }, async () => {
    const app = makeApp();
    const ip = "10.0.0.2";

    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", ip)
        .send(validBody({ email: `bot${i}@example.com` }));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    }

    const blocked = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", ip)
      .send(validBody({ email: "bot10@example.com" }));

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(RATE_LIMIT_BODY);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("does not affect honest traffic of 1-2 submissions", async () => {
    const app = makeApp();
    const ip = "10.0.0.3";

    const res1 = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", ip)
      .send(validBody({ email: "honest@example.com" }));
    expect(res1.status).toBe(200);
    expect(res1.body).toMatchObject({ success: true });
    expect(res1.headers["retry-after"]).toBeUndefined();

    const res2 = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", ip)
      .send(validBody({ email: "honest@example.com" }));
    expect(res2.status).toBe(200);
    expect(res2.body).toMatchObject({ success: true });
    expect(res2.headers["retry-after"]).toBeUndefined();
  });

  it("isolates rate-limit state between distinct IPs", { timeout: 30_000 }, async () => {
    // Sanity check that the limiter actually keys by IP — without this, the
    // two tests above would also pass for a global counter, hiding a
    // catastrophic regression where every visitor shared one bucket.
    const app = makeApp();

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", "10.0.0.4")
        .send(validBody());
      expect(res.status).toBe(200);
    }

    const otherIp = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", "10.0.0.5")
      .send(validBody());
    expect(otherIp.status).toBe(200);
  });
});
