import { test, expect, beforeEach, afterEach } from "vitest";
import {
  maybeNotifySpamSpike,
  readSpikeConfig,
  getSpikeAlertSummary,
  buildSpikeEmailBody,
  _resetSpikeStateForTests,
  type SpikeAlertPayload,
} from "./spamSpikeNotifier";
import type { PrunerHealthSummary } from "./prunerHealthSummary";

interface Captured {
  webhookCalls: Array<{ url: string; payload: SpikeAlertPayload }>;
  emailCalls: Array<{ to: string; payload: SpikeAlertPayload }>;
}

// Per-test fake debounce ledger. Mirrors the persistent `alert_debounce`
// table just enough to exercise the cool-down branch without hitting the
// real DB. Each test gets its own Map (passed via opts) so cases never
// share state through a module-level singleton.
function makeDeps(opts: {
  honeypot: number;
  captcha: number;
  now?: number;
  captured: Captured;
  // Optional shared ledger — when omitted, every call gets a fresh Map
  // (i.e. the slot is always claimable). Pass the SAME map across calls
  // in a single test to exercise debounce.
  ledger?: Map<string, number>;
  // Optional pruner-health summaries to attach to fired alerts. Defaults
  // to an empty array so tests stay hermetic (no DB read).
  prunerHealth?: PrunerHealthSummary[];
}): Parameters<typeof maybeNotifySpamSpike>[1] {
  const ledger = opts.ledger;
  return {
    readPrunerHealth: async () => opts.prunerHealth ?? [],
    now: () => opts.now ?? 1_700_000_000_000,
    countLastHour: async () => ({
      honeypot: opts.honeypot,
      captcha: opts.captcha,
      total: opts.honeypot + opts.captcha,
    }),
    claimSlot: async (alertKey, debounceMs, nowMs) => {
      if (!ledger) return true;
      const last = ledger.get(alertKey);
      if (last !== undefined && nowMs - last < debounceMs) return false;
      ledger.set(alertKey, nowMs);
      return true;
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
  "SPAM_SPIKE_THRESHOLD",
  "SPAM_SPIKE_DEBOUNCE_MINUTES",
  "SPAM_SPIKE_WEBHOOK_URL",
  "SPAM_SPIKE_ALERT_EMAIL",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
  {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  _resetSpikeStateForTests();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  _resetSpikeStateForTests();
});

test("readSpikeConfig returns null when no env is set (alerting OFF by default)", () => {
  expect(readSpikeConfig()).toBeNull();
});

test("readSpikeConfig returns null when threshold is set but no channel is configured", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "10";
  expect(readSpikeConfig()).toBeNull();
});

test("readSpikeConfig returns null when channel is set but threshold is missing", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  expect(readSpikeConfig()).toBeNull();
});

test("readSpikeConfig parses a valid full configuration", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "25";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "30";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const cfg = readSpikeConfig();
  expect(cfg).toEqual({
    threshold: 25,
    debounceMs: 30 * 60 * 1000,
    webhookUrl: "https://hooks.example.com/x",
    alertEmail: "ops@example.com",
  });
});

test("readSpikeConfig rejects junk threshold values", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  for (const bad of ["", "0", "-5", "abc", "NaN", "1.9", "10.0", "1e3"]) {
    process.env["SPAM_SPIKE_THRESHOLD"] = bad;
    expect(readSpikeConfig(), `value=${JSON.stringify(bad)}`).toBeNull();
  }
});

test("readSpikeConfig rejects non-integer debounce values (no silent flooring)", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "10";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  for (const bad of ["1.5", "30.7", "-1", "abc"]) {
    process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = bad;
    const cfg = readSpikeConfig();
    expect(cfg?.debounceMs, `value=${JSON.stringify(bad)}`).toBe(60 * 60 * 1000);
  }
});

test("readSpikeConfig falls back to default debounce when input is invalid", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "10";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "garbage";
  const cfg = readSpikeConfig();
  expect(cfg?.debounceMs).toBe(60 * 60 * 1000);
});

test("does nothing when alerting is disabled", async () => {
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 999, captcha: 999, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(0);
});

test("does nothing when count is below threshold", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "20";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 5, captcha: 5, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
});

test("fires webhook AND email when both are configured and threshold is crossed", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "10";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "captcha",
    makeDeps({ honeypot: 7, captcha: 8, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]?.url).toBe("https://hooks.example.com/x");
  expect(captured.webhookCalls[0]?.payload.counts.total).toBe(15);
  expect(captured.webhookCalls[0]?.payload.triggerKind).toBe("captcha");
  expect(captured.emailCalls).toHaveLength(1);
  expect(captured.emailCalls[0]?.to).toBe("ops@example.com");
});

test("debounces follow-up alerts within the cool-down window", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "30";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  const ledger = new Map<string, number>();
  const t0 = 1_700_000_000_000;

  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 10, captcha: 0, now: t0, captured, ledger }),
  );
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 12,
      captcha: 0,
      now: t0 + 5 * 60 * 1000,
      captured,
      ledger,
    }),
  );
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 14,
      captcha: 0,
      now: t0 + 29 * 60 * 1000,
      captured,
      ledger,
    }),
  );

  expect(captured.webhookCalls).toHaveLength(1);
});

test("re-alerts after the debounce window elapses", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "30";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  const ledger = new Map<string, number>();
  const t0 = 1_700_000_000_000;

  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 10, captcha: 0, now: t0, captured, ledger }),
  );
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 20,
      captcha: 0,
      now: t0 + 31 * 60 * 1000,
      captured,
      ledger,
    }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
});

test("debounce survives a simulated restart: cool-down honoured against the persisted ledger", async () => {
  // Same backing ledger across two notifier invocations, but BETWEEN them
  // we discard the in-process state by calling _resetSpikeStateForTests().
  // Pre-fix this test would still pass against the in-memory map (because
  // the map was the only source of truth); the fix makes it pass against
  // the persistent ledger that survives the simulated wipe.
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "30";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  const ledger = new Map<string, number>();
  const t0 = 1_700_000_000_000;

  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 10, captcha: 0, now: t0, captured, ledger }),
  );
  expect(captured.webhookCalls).toHaveLength(1);

  // Simulate a deploy: blow away ALL in-process state. The persistent
  // ledger (Map outside the module) survives, mirroring the real DB.
  _resetSpikeStateForTests();

  // 5 minutes after the original alert — well inside the 30-minute cool-down.
  // Without persistent debouncing this would re-page ops on the very next
  // event after a restart.
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 12,
      captcha: 0,
      now: t0 + 5 * 60 * 1000,
      captured,
      ledger,
    }),
  );
  expect(
    captured.webhookCalls,
    "restart must NOT cause a duplicate alert inside the cool-down window",
  ).toHaveLength(1);

  // Past the cool-down — re-alert is allowed again.
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 12,
      captcha: 0,
      now: t0 + 31 * 60 * 1000,
      captured,
      ledger,
    }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
});

test("only fires webhook when only webhook is configured", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 10, captcha: 0, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(0);
});

test("only fires email when only email is configured", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({ honeypot: 10, captcha: 0, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(1);
});

test("swallows errors thrown by the count function", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await expect(
    maybeNotifySpamSpike("honeypot", {
      now: () => Date.now(),
      readPrunerHealth: async () => [],
      // Always-claim stub so the test stays hermetic and never touches
      // the real `alert_debounce` table.
      claimSlot: async () => true,
      countLastHour: async () => {
        throw new Error("db down");
      },
      sendWebhook: async (url, payload) => {
        captured.webhookCalls.push({ url, payload });
        return true;
      },
      sendEmail: async (to, payload) => {
        captured.emailCalls.push({ to, payload });
        return true;
      },
    }),
  ).resolves.toBeUndefined();
  expect(captured.webhookCalls).toHaveLength(0);
});

test("getSpikeAlertSummary reports disabled when env vars are missing", () => {
  const summary = getSpikeAlertSummary();
  expect(summary).toEqual({
    enabled: false,
    threshold: null,
    debounceMinutes: null,
    channels: { webhook: false, email: false },
  });
});

test("getSpikeAlertSummary reports disabled when threshold is set but no channel", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "10";
  const summary = getSpikeAlertSummary();
  expect(summary.enabled).toBe(false);
  expect(summary.channels).toEqual({ webhook: false, email: false });
});

test("getSpikeAlertSummary reports enabled with webhook channel only", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "25";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/abc";
  const summary = getSpikeAlertSummary();
  expect(summary).toEqual({
    enabled: true,
    threshold: 25,
    debounceMinutes: 60,
    channels: { webhook: true, email: false },
  });
});

test("getSpikeAlertSummary reports enabled with email channel only and custom debounce", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "15";
  const summary = getSpikeAlertSummary();
  expect(summary).toEqual({
    enabled: true,
    threshold: 5,
    debounceMinutes: 15,
    channels: { webhook: false, email: true },
  });
});

test("getSpikeAlertSummary never leaks the actual webhook URL or email", () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/super-secret";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops-secret@example.com";
  const summary = getSpikeAlertSummary();
  const json = JSON.stringify(summary);
  expect(json).not.toContain("super-secret");
  expect(json).not.toContain("ops-secret@example.com");
  expect(json).not.toContain("hooks.example.com");
});

// --- Background cleanup health section (Task: spike alerts tell the pruner story too) ---

const FAILING_PRUNER: PrunerHealthSummary = {
  prunerKey: "spam_events",
  prunerName: "spam_events pruner",
  health: "failing",
  lastSuccessAgeMs: 14 * 60 * 60 * 1000,
  lastSuccessAt: "2026-07-13T10:00:00.000Z",
};

const OK_PRUNER: PrunerHealthSummary = {
  prunerKey: "rate_limit_buckets",
  prunerName: "rate_limit_buckets pruner",
  health: "ok",
  lastSuccessAgeMs: 10 * 60 * 1000,
  lastSuccessAt: "2026-07-14T00:00:00.000Z",
};

test("webhook payload carries prunerHealth so downstream automation can read it", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  await maybeNotifySpamSpike(
    "honeypot",
    makeDeps({
      honeypot: 10,
      captcha: 0,
      captured,
      prunerHealth: [FAILING_PRUNER, OK_PRUNER],
    }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]?.payload.prunerHealth).toEqual([
    FAILING_PRUNER,
    OK_PRUNER,
  ]);
  expect(captured.emailCalls[0]?.payload.prunerHealth).toEqual([
    FAILING_PRUNER,
    OK_PRUNER,
  ]);
});

test("a pruner-health read failure never blocks the spike alert", async () => {
  process.env["SPAM_SPIKE_THRESHOLD"] = "5";
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [] };
  const deps = makeDeps({ honeypot: 10, captcha: 0, captured });
  deps!.readPrunerHealth = async () => {
    throw new Error("db down");
  };
  await maybeNotifySpamSpike("honeypot", deps);
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]?.payload.prunerHealth).toEqual([]);
});

function makePayload(
  prunerHealth: PrunerHealthSummary[],
): SpikeAlertPayload {
  return {
    threshold: 10,
    windowMinutes: 60,
    counts: { honeypot: 8, captcha: 7, total: 15 },
    triggerKind: "honeypot",
    generatedAt: "2026-07-14T00:10:00.000Z",
    prunerHealth,
  };
}

test("rendered email includes the Background cleanup health section when a pruner is failing", () => {
  const { bodyText, bodyHtml } = buildSpikeEmailBody(
    makePayload([FAILING_PRUNER, OK_PRUNER]),
  );
  expect(bodyText).toContain("Background cleanup health:");
  expect(bodyText).toContain(
    "spam_events pruner: FAILING — last good run 14h ago",
  );
  expect(bodyText).toContain("rate_limit_buckets pruner: OK");
  expect(bodyHtml).toContain("Background cleanup health");
  expect(bodyHtml).toContain(
    "spam_events pruner: FAILING — last good run 14h ago",
  );
});

test("rendered email includes the section for a stale pruner with no successful run on record", () => {
  const stale: PrunerHealthSummary = {
    ...FAILING_PRUNER,
    health: "stale",
    lastSuccessAgeMs: null,
    lastSuccessAt: null,
  };
  const { bodyText } = buildSpikeEmailBody(makePayload([stale]));
  expect(bodyText).toContain(
    "spam_events pruner: STALE — no successful run on record",
  );
});

test("rendered email omits the section when prunerHealth is empty", () => {
  const { bodyText, bodyHtml } = buildSpikeEmailBody(makePayload([]));
  expect(bodyText).not.toContain("Background cleanup health");
  expect(bodyHtml).not.toContain("Background cleanup health");
});
