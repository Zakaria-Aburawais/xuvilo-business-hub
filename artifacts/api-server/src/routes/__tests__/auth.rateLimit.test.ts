import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// Like contact.rateLimit.test.ts, we do NOT mock @workspace/db — the rate
// limiter is Postgres-backed and exercising it through a real connection is
// the whole point. Every request in this file deliberately fails the route's
// own validation (bad credentials, weak password, invalid token, unknown
// email) so no users, tokens, or emails are ever created — but the limiters
// run BEFORE the handlers, so every attempt still counts against the caps.

vi.mock("../../lib/sendgrid", () => ({
  getUncachableSendGridClient: async () => ({
    client: { send: async () => undefined },
    fromEmail: "noreply@xuvilo.test",
  }),
}));

// CAPTCHA is environment-dependent (enforced only when TURNSTILE_SECRET_KEY
// is set). Force it to pass so these tests assert limiter behaviour only.
vi.mock("../../lib/turnstile", () => ({
  verifyTurnstile: async () => ({ ok: true, reason: "mocked" }),
  CAPTCHA_FAILED_RESPONSE: {
    success: false,
    error: "captcha_failed",
    message: "CAPTCHA verification failed. Please try again.",
  },
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const authRouterImport = await import("../auth");
const authRouter = authRouterImport.default;
const { _resetRateLimitForTests } = await import("../../lib/rateLimit");

function makeApp(): Express {
  const app = express();
  // Mirrors src/app.ts: trust the proxy so req.ip reflects the injected
  // X-Forwarded-For header, making per-IP keying testable.
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api", authRouter);
  return app;
}

const RATE_LIMIT_BODY = {
  success: false,
  error: "Too many requests",
  message: "Too many attempts. Please try again later.",
};

function expectRateLimited(res: request.Response): void {
  expect(res.status).toBe(429);
  expect(res.body).toEqual(RATE_LIMIT_BODY);
  expect(res.headers["retry-after"]).toBeDefined();
  expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
}

describe("auth route rate limits", () => {
  beforeEach(async () => {
    await _resetRateLimitForTests();
  });

  describe("POST /api/auth/login", () => {
    it("blocks a single (ip, email) pair after 5 attempts", async () => {
      const app = makeApp();
      const ip = "10.1.0.1";

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", ip)
          .send({ email: "victim@example.com", password: `wrong-${i}` });
        expect(res.status).toBe(401);
      }

      const blocked = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", ip)
        .send({ email: "victim@example.com", password: "wrong-again" });
      expectRateLimited(blocked);
    });

    it("blocks a single IP rotating emails after 20 attempts (credential stuffing)", { timeout: 30_000 }, async () => {
      const app = makeApp();
      const ip = "10.1.0.2";

      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", ip)
          .send({ email: `stuffed-${i}@example.com`, password: "hunter2" });
        expect(res.status).toBe(401);
      }

      const blocked = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", ip)
        .send({ email: "stuffed-20@example.com", password: "hunter2" });
      expectRateLimited(blocked);
    });

    it("isolates login limits between distinct IPs", async () => {
      const app = makeApp();

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", "10.1.0.3")
          .send({ email: "victim@example.com", password: "wrong" });
      }

      const otherIp = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.1.0.4")
        .send({ email: "victim@example.com", password: "wrong" });
      expect(otherIp.status).toBe(401);
      expect(otherIp.headers["retry-after"]).toBeUndefined();
    });
  });

  describe("POST /api/auth/register", () => {
    it("blocks a single IP after 10 attempts regardless of email", { timeout: 30_000 }, async () => {
      const app = makeApp();
      const ip = "10.1.0.5";

      for (let i = 0; i < 10; i++) {
        // Weak password → 400 from the handler; the limiter still counts it.
        const res = await request(app)
          .post("/api/auth/register")
          .set("X-Forwarded-For", ip)
          .send({ email: `bot-${i}@example.com`, password: "x" });
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ error: "weak_password" });
      }

      const blocked = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", ip)
        .send({ email: "bot-10@example.com", password: "x" });
      expectRateLimited(blocked);
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("blocks a single (ip, email) pair after 3 requests", async () => {
      const app = makeApp();
      const ip = "10.1.0.6";

      for (let i = 0; i < 3; i++) {
        // Unregistered email → generic 200, no mail sent; still counts.
        const res = await request(app)
          .post("/api/auth/forgot-password")
          .set("X-Forwarded-For", ip)
          .send({ email: "nobody-here@example.com" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
      }

      const blocked = await request(app)
        .post("/api/auth/forgot-password")
        .set("X-Forwarded-For", ip)
        .send({ email: "nobody-here@example.com" });
      expectRateLimited(blocked);
    });

    it("blocks a single IP rotating target emails after 10 requests", { timeout: 30_000 }, async () => {
      const app = makeApp();
      const ip = "10.1.0.7";

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post("/api/auth/forgot-password")
          .set("X-Forwarded-For", ip)
          .send({ email: `enum-${i}@example.com` });
        expect(res.status).toBe(200);
      }

      const blocked = await request(app)
        .post("/api/auth/forgot-password")
        .set("X-Forwarded-For", ip)
        .send({ email: "enum-10@example.com" });
      expectRateLimited(blocked);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("blocks a single IP after 5 attempts", async () => {
      const app = makeApp();
      const ip = "10.1.0.8";

      for (let i = 0; i < 5; i++) {
        // Missing token → 400 from the handler; the limiter still counts it.
        const res = await request(app)
          .post("/api/auth/reset-password")
          .set("X-Forwarded-For", ip)
          .send({ password: "newpassword123" });
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ error: "invalid_token" });
      }

      const blocked = await request(app)
        .post("/api/auth/reset-password")
        .set("X-Forwarded-For", ip)
        .send({ password: "newpassword123" });
      expectRateLimited(blocked);
    });

    it("isolates reset-password limits between distinct IPs", async () => {
      const app = makeApp();

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/auth/reset-password")
          .set("X-Forwarded-For", "10.1.0.9")
          .send({ password: "newpassword123" });
      }

      const otherIp = await request(app)
        .post("/api/auth/reset-password")
        .set("X-Forwarded-For", "10.1.0.10")
        .send({ password: "newpassword123" });
      expect(otherIp.status).toBe(400);
      expect(otherIp.headers["retry-after"]).toBeUndefined();
    });
  });
});
