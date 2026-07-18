import { test, expect, beforeEach, afterEach } from "vitest";
import {
  recordRateLimitStorageFailure,
  readRateLimitAlertConfig,
  buildRateLimitAlertEmailBody,
  RATE_LIMIT_ALERT_DEBOUNCE_KEY,
  _resetRateLimitAlertStateForTests,
  type RateLimitFailurePayload,
} from "./rateLimitFailureNotifier";

interface Captured {
  webhookCalls: Array<{ url: string; payload: RateLimitFailurePayload }>;
  emailCalls: Array<{ to: string; payload: RateLimitFailurePayload }>;
  claimCalls: Array<{ alertKey: string; debounceMs: number; nowMs: number }>;
}

function makeCaptured(): Captured {
  return { webhookCalls: [], emailCalls: [], claimCalls: [] };
}

function makeDeps(opts: {
  captured: Captured;
  now?: () => number;
  // What the persistent claim should do. Default resolves true.
  claimResult?: "true" | "false" | "throw";
}): Parameters<typeof recordRateLimitStorageFailure>[1] {
  return {
    now: opts.now ?? (() => 1_700_000_000_000),
    claimSlotPersistent: async (alertKey, debounceMs, nowMs) => {
      opts.captured.claimCalls.push({ alertKey, debounceMs, nowMs });
      if (opts.claimResult === "throw") {
        throw new Error("db unreachable");
      }
      return opts.claimResult !== "false";
    },
    sendWebhook: async (url, payload) => {
      opts.captured.webhookCalls.push({ url, payload });
      return true;
    },
    sendEmail: async (to, payload) => {
      opts.captured.emailCalls.push({ to, payload });
      return true;
    },
  };
}

const ENV_KEYS = [
  "SPAM_SPIKE_WEBHOOK_URL",
  "SPAM_SPIKE_ALERT_EMAIL",
  "SPAM_SPIKE_DEBOUNCE_MINUTES",
  "RATE_LIMIT_ALERT_DEBOUNCE_MINUTES",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
  {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  _resetRateLimitAlertStateForTests();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetRateLimitAlertStateForTests();
});

// ---------------------------------------------------------------------------
// Config parsing
// ---------------------------------------------------------------------------

test("config is null when no channel is configured", () => {
  expect(readRateLimitAlertConfig()).toBeNull();
});

test("config picks up webhook-only, email-only, and debounce overrides", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  let cfg = readRateLimitAlertConfig();
  expect(cfg?.webhookUrl).toBe("https://hooks.example/x");
  expect(cfg?.alertEmail).toBeNull();
  expect(cfg?.debounceMs).toBe(60 * 60 * 1000);

  delete process.env["SPAM_SPIKE_WEBHOOK_URL"];
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "30";
  cfg = readRateLimitAlertConfig();
  expect(cfg?.alertEmail).toBe("ops@example.com");
  expect(cfg?.debounceMs).toBe(30 * 60 * 1000);

  // Dedicated env takes priority over the spam-spike fallback.
  process.env["RATE_LIMIT_ALERT_DEBOUNCE_MINUTES"] = "120";
  cfg = readRateLimitAlertConfig();
  expect(cfg?.debounceMs).toBe(120 * 60 * 1000);

  // Non-integer debounce falls back to the default.
  process.env["RATE_LIMIT_ALERT_DEBOUNCE_MINUTES"] = "1.5";
  delete process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"];
  cfg = readRateLimitAlertConfig();
  expect(cfg?.debounceMs).toBe(60 * 60 * 1000);
});

// ---------------------------------------------------------------------------
// Threshold behaviour
// ---------------------------------------------------------------------------

test("no alert below the failure threshold", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  const deps = makeDeps({ captured });

  for (let i = 0; i < 4; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(0);
});

test("alert fires at the threshold, names prefixes and counts", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured = makeCaptured();
  const deps = makeDeps({ captured });

  for (let i = 0; i < 3; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  await recordRateLimitStorageFailure("auth_login", deps);
  await recordRateLimitStorageFailure("auth_login", deps);

  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(1);
  const payload = captured.webhookCalls[0]!.payload;
  expect(payload.totalDenied).toBe(5);
  expect(payload.deniedByPrefix).toEqual({ contact: 3, auth_login: 2 });
  expect(payload.windowSeconds).toBe(60);
  expect(captured.emailCalls[0]!.to).toBe("ops@example.com");
});

test("failures older than the rolling window do not count", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  let t = 1_700_000_000_000;
  const deps = makeDeps({ captured, now: () => t });

  // 4 failures, then a 2-minute gap — the window empties out.
  for (let i = 0; i < 4; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  t += 2 * 60 * 1000;
  await recordRateLimitStorageFailure("contact", deps);
  expect(captured.webhookCalls).toHaveLength(0);
});

test("disabled config still counts but never sends", async () => {
  const captured = makeCaptured();
  const deps = makeDeps({ captured });
  for (let i = 0; i < 10; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(0);
  expect(captured.claimCalls).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Debounce behaviour
// ---------------------------------------------------------------------------

test("one incident sends one alert (in-memory debounce)", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  let t = 1_700_000_000_000;
  const deps = makeDeps({ captured, now: () => t });

  for (let i = 0; i < 20; i++) {
    t += 1000;
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(1);

  // After the cool-down elapses, a still-ongoing incident re-alerts once.
  t += 61 * 60 * 1000;
  for (let i = 0; i < 10; i++) {
    t += 1000;
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(2);
});

test("alert still fires when the persistent debounce ledger is down", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  const deps = makeDeps({ captured, claimResult: "throw" });

  for (let i = 0; i < 6; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(1);
});

test("alert still fires when the persistent claim reports false (ambiguous with DB-down)", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  const deps = makeDeps({ captured, claimResult: "false" });

  for (let i = 0; i < 6; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.webhookCalls).toHaveLength(1);
});

test("persistent ledger is written best-effort with the stable key", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  const deps = makeDeps({ captured });

  for (let i = 0; i < 5; i++) {
    await recordRateLimitStorageFailure("contact", deps);
  }
  expect(captured.claimCalls).toHaveLength(1);
  expect(captured.claimCalls[0]!.alertKey).toBe(RATE_LIMIT_ALERT_DEBOUNCE_KEY);
  expect(RATE_LIMIT_ALERT_DEBOUNCE_KEY).toBe("rate_limit_fail_closed");
});

// ---------------------------------------------------------------------------
// Email body rendering
// ---------------------------------------------------------------------------

test("email body names prefixes, counts, and the fail-closed cause", () => {
  const payload: RateLimitFailurePayload = {
    deniedByPrefix: { contact: 7, auth_login: 2 },
    totalDenied: 9,
    windowSeconds: 60,
    generatedAt: "2026-07-18T12:00:00.000Z",
  };
  const { subject, bodyText, bodyHtml } =
    buildRateLimitAlertEmailBody(payload);
  expect(subject).toContain("9");
  expect(bodyText).toContain("contact: 7 denied");
  expect(bodyText).toContain("auth_login: 2 denied");
  expect(bodyText).toContain("503");
  expect(bodyHtml).toContain("contact: 7 denied");
  expect(bodyHtml).toContain("~9");
});

test("notifier never throws even when a sender rejects", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example/x";
  const captured = makeCaptured();
  const deps = {
    ...makeDeps({ captured }),
    sendWebhook: async () => {
      throw new Error("boom");
    },
  };
  for (let i = 0; i < 6; i++) {
    await expect(
      recordRateLimitStorageFailure("contact", deps),
    ).resolves.toBeUndefined();
  }
});
