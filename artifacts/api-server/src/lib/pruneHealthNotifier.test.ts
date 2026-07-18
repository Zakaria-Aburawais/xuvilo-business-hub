import { test, expect, beforeEach, afterEach } from "vitest";
import {
  maybeNotifyPrunerHealth,
  evaluatePrunerHealth,
  readPrunerHealthConfig,
  sendPrunerHealthTestAlert,
  _resetPrunerHealthStateForTests,
  _peekPrunerHealthStateForTests,
  type PrunerHealthAlertPayload,
  type PrunerHealthSnapshot,
} from "./pruneHealthNotifier";

interface Captured {
  webhookCalls: Array<{ url: string; payload: PrunerHealthAlertPayload }>;
  emailCalls: Array<{ to: string; payload: PrunerHealthAlertPayload }>;
  recordedEvents: Array<PrunerHealthAlertPayload>;
}

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

// Per-test fake debounce ledger. Mirrors the persistent `alert_debounce`
// table just enough to exercise the cool-down branch without hitting the
// real DB. Each test gets its own Map (passed via opts) so cases never
// share state through a module-level singleton.
function makeDeps(opts: {
  now?: number;
  captured: Captured;
  // Optional shared ledger — when omitted, every call gets a fresh Map
  // (i.e. the slot is always claimable). Pass the SAME map across calls
  // in a single test to exercise debounce.
  ledger?: Map<string, number>;
  // Optional cleanup-health lines the synthetic test alert should embed.
  // Defaults to [] so unit tests never hit the real DB-backed reader.
  cleanupHealthLines?: string[];
}): Parameters<typeof maybeNotifyPrunerHealth>[1] {
  const ledger = opts.ledger;
  return {
    readCleanupHealthLines: async () => opts.cleanupHealthLines ?? [],
    now: () => opts.now ?? 1_700_000_000_000,
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
    recordEvent: async (payload) => {
      opts.captured.recordedEvents.push(payload);
    },
  };
}

function snap(opts: {
  intervalMs?: number;
  ranAt?: Date | null;
  error?: string | null;
  lastSuccessAt?: Date | null;
  prunerKey?: string;
  prunerName?: string;
  noLastRun?: boolean;
}): PrunerHealthSnapshot {
  return {
    prunerKey: opts.prunerKey ?? "spam_events",
    prunerName: opts.prunerName ?? "spam_events pruner",
    intervalMs: opts.intervalMs ?? 24 * HOUR_MS,
    lastRun: opts.noLastRun
      ? null
      : {
          ranAt: opts.ranAt ?? new Date(1_700_000_000_000),
          error: opts.error ?? null,
          lastSuccessAt:
            opts.lastSuccessAt === undefined
              ? (opts.error ? null : opts.ranAt ?? new Date(1_700_000_000_000))
              : opts.lastSuccessAt,
        },
  };
}

const ENV_KEYS = [
  "SPAM_SPIKE_WEBHOOK_URL",
  "SPAM_SPIKE_ALERT_EMAIL",
  "SPAM_SPIKE_DEBOUNCE_MINUTES",
  "PRUNE_HEALTH_DEBOUNCE_MINUTES",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
  {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  _resetPrunerHealthStateForTests();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  _resetPrunerHealthStateForTests();
});

// ---------------------------------------------------------------------------
// readPrunerHealthConfig
// ---------------------------------------------------------------------------

test("readPrunerHealthConfig is null when no channel is configured (alerting OFF by default)", () => {
  expect(readPrunerHealthConfig()).toBeNull();
});

test("readPrunerHealthConfig parses webhook + email + dedicated debounce", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "45";
  expect(readPrunerHealthConfig()).toEqual({
    webhookUrl: "https://hooks.example.com/x",
    alertEmail: "ops@example.com",
    debounceMs: 45 * MIN_MS,
  });
});

test("readPrunerHealthConfig falls back to SPAM_SPIKE_DEBOUNCE_MINUTES when dedicated env is missing", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "20";
  const cfg = readPrunerHealthConfig();
  expect(cfg?.debounceMs).toBe(20 * MIN_MS);
});

test("readPrunerHealthConfig prefers dedicated env over the spam-spike fallback", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "5";
  process.env["SPAM_SPIKE_DEBOUNCE_MINUTES"] = "999";
  const cfg = readPrunerHealthConfig();
  expect(cfg?.debounceMs).toBe(5 * MIN_MS);
});

test("readPrunerHealthConfig rejects non-integer debounce values (no silent flooring)", () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  for (const bad of ["1.5", "abc", "-1", ""]) {
    process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = bad;
    const cfg = readPrunerHealthConfig();
    // Default of 60 minutes when input is invalid.
    expect(cfg?.debounceMs, `value=${JSON.stringify(bad)}`).toBe(60 * MIN_MS);
  }
});

// ---------------------------------------------------------------------------
// evaluatePrunerHealth
// ---------------------------------------------------------------------------

test("evaluatePrunerHealth: never-run pruner is NOT alerted on", () => {
  const result = evaluatePrunerHealth(
    snap({ noLastRun: true }),
    1_700_000_000_000,
  );
  expect(result).toBeNull();
});

test("evaluatePrunerHealth: lastError → failing (regardless of recency)", () => {
  const now = 1_700_000_000_000;
  const result = evaluatePrunerHealth(
    snap({ ranAt: new Date(now - 10), error: "boom" }),
    now,
  );
  expect(result).toBe("failing");
});

test("evaluatePrunerHealth: success within interval → no alert", () => {
  const now = 1_700_000_000_000;
  const result = evaluatePrunerHealth(
    snap({
      ranAt: new Date(now - HOUR_MS),
      intervalMs: 24 * HOUR_MS,
      error: null,
    }),
    now,
  );
  expect(result).toBeNull();
});

test("evaluatePrunerHealth: success older than 2× interval → stale", () => {
  const now = 1_700_000_000_000;
  const result = evaluatePrunerHealth(
    snap({
      ranAt: new Date(now - 3 * HOUR_MS),
      intervalMs: HOUR_MS,
      error: null,
    }),
    now,
  );
  expect(result).toBe("stale");
});

test("evaluatePrunerHealth: success exactly at 2× interval is NOT stale (strict >)", () => {
  const now = 1_700_000_000_000;
  const result = evaluatePrunerHealth(
    snap({
      ranAt: new Date(now - 2 * HOUR_MS),
      intervalMs: HOUR_MS,
      error: null,
    }),
    now,
  );
  expect(result).toBeNull();
});

// ---------------------------------------------------------------------------
// maybeNotifyPrunerHealth
// ---------------------------------------------------------------------------

test("does nothing when alerting is disabled (no env)", async () => {
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({ error: "boom" }),
    makeDeps({ captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(0);
});

test("does nothing for a healthy snapshot even when alerting is wired up", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const now = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(now - 60_000),
      intervalMs: 24 * HOUR_MS,
      error: null,
    }),
    makeDeps({ now, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
});

test("does nothing for a never-run pruner (avoids paging during fresh boots)", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({ noLastRun: true }),
    makeDeps({ captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
});

test("fires both channels on a failing pruner; payload carries name + error + age", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const now = 1_700_000_000_000;
  // Last successful run was 5 hours ago; this run just failed.
  const lastSuccess = new Date(now - 5 * HOUR_MS);
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      prunerName: "spam_events pruner",
      ranAt: new Date(now),
      error: "ECONNREFUSED 127.0.0.1:5432",
      lastSuccessAt: lastSuccess,
      intervalMs: 24 * HOUR_MS,
    }),
    makeDeps({ now, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(1);
  const p = captured.webhookCalls[0]!.payload;
  expect(p.health).toBe("failing");
  expect(p.prunerKey).toBe("spam_events");
  expect(p.prunerName).toBe("spam_events pruner");
  expect(p.lastError).toBe("ECONNREFUSED 127.0.0.1:5432");
  expect(p.lastSuccessAgeMs).toBe(5 * HOUR_MS);
  expect(p.lastRunAt).toBe(new Date(now).toISOString());
  expect(p.intervalMs).toBe(24 * HOUR_MS);
});

test("fires on a stale pruner; payload reports the age of the last successful run", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const now = 1_700_000_000_000;
  const ranAt = new Date(now - 50 * HOUR_MS);
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({
      ranAt,
      // Stale only when age > 2× interval; pick interval so 50h easily wins.
      intervalMs: 24 * HOUR_MS,
      error: null,
      lastSuccessAt: ranAt,
    }),
    makeDeps({ now, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  const p = captured.webhookCalls[0]!.payload;
  expect(p.health).toBe("stale");
  expect(p.lastError).toBeNull();
  expect(p.lastSuccessAgeMs).toBe(50 * HOUR_MS);
});

test("debounces follow-up alerts within the cool-down window", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "30";
  const t0 = 1_700_000_000_000;
  const captured: Captured = {
    webhookCalls: [],
    emailCalls: [],
    recordedEvents: [],
  };
  const ledger = new Map<string, number>();

  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured, ledger }),
  );
  // Inside the debounce window — should NOT alert again.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 5 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 5 * MIN_MS, captured, ledger }),
  );
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 29 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 29 * MIN_MS, captured, ledger }),
  );

  expect(captured.webhookCalls).toHaveLength(1);
});

test("re-alerts after the debounce window elapses", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "30";
  const t0 = 1_700_000_000_000;
  const captured: Captured = {
    webhookCalls: [],
    emailCalls: [],
    recordedEvents: [],
  };
  const ledger = new Map<string, number>();

  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured, ledger }),
  );
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 31 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 31 * MIN_MS, captured, ledger }),
  );

  expect(captured.webhookCalls).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// Recovery alerts ("pruner is healthy again")
// ---------------------------------------------------------------------------

test("does NOT fire a recovery alert without a prior problem alert", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const now = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  // Pruner has only ever been healthy. Multiple healthy ticks must not
  // produce a recovery alert.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(now - 60_000), error: null }),
    makeDeps({ now, captured }),
  );
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(now - 30_000), error: null }),
    makeDeps({ now, captured }),
  );

  expect(captured.webhookCalls).toHaveLength(0);
});

test("fires exactly one recovery alert per failure-then-recovery cycle", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const t0 = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  // 1. Failing → problem alert.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]!.payload.health).toBe("failing");
  expect(captured.emailCalls).toHaveLength(1);

  // 2. Healthy → exactly one recovery alert on BOTH channels.
  const tRecover = t0 + 10 * MIN_MS;
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(tRecover),
      error: null,
      lastSuccessAt: new Date(tRecover),
    }),
    makeDeps({ now: tRecover, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
  expect(captured.emailCalls).toHaveLength(2);
  const recovery = captured.webhookCalls[1]!.payload;
  expect(recovery.health).toBe("recovered");
  expect(recovery.prunerName).toBe("spam_events pruner");
  expect(recovery.generatedAt).toBe(new Date(tRecover).toISOString());
  // The pruner was unhealthy from t0 (when the problem alert fired) until
  // tRecover, i.e. 10 minutes.
  expect(recovery.unhealthyDurationMs).toBe(10 * MIN_MS);

  // 3. Subsequent healthy ticks must NOT fire more recovery alerts.
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(tRecover + 1 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(tRecover + 1 * MIN_MS),
    }),
    makeDeps({ now: tRecover + 1 * MIN_MS, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
  expect(captured.emailCalls).toHaveLength(2);
});

test("recovery duration spans multiple failing ticks within the problem-debounce window", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "60";
  const t0 = 1_700_000_000_000;
  const captured: Captured = {
    webhookCalls: [],
    emailCalls: [],
    recordedEvents: [],
  };
  // Shared ledger so the second failing tick is rejected by the persistent
  // debounce (mirrors the real `alert_debounce` row outliving the call).
    const ledger = new Map<string, number>();

  // First failing tick → problem alert (opens incident at t0).
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured, ledger }),
  );
  // Second failing tick within the debounce window — no extra problem
  // alert, but the incident remains open.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 30 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 30 * MIN_MS, captured, ledger }),
  );
  // Recover at t0 + 90 minutes.
  const tRecover = t0 + 90 * MIN_MS;
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(tRecover),
      error: null,
      lastSuccessAt: new Date(tRecover),
    }),
    makeDeps({ now: tRecover, captured, ledger }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
  const recovery = captured.webhookCalls[1]!.payload;
  expect(recovery.health).toBe("recovered");
  // Incident length is measured from the FIRST problem alert, not the
  // second tick that hit the debounce.
  expect(recovery.unhealthyDurationMs).toBe(90 * MIN_MS);
});

test("flap suppression: problem→recover→problem→recover within cool-down only sends ONE recovery alert", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "60";
  const t0 = 1_700_000_000_000;
  const captured: Captured = {
    webhookCalls: [],
    emailCalls: [],
    recordedEvents: [],
  };
  // Shared ledger so the t0+10m flap-back failing tick is rejected by the
  // persistent problem-alert debounce (still within the 60m cool-down
  // from t0). Without this the test would observe an extra problem alert.
    const ledger = new Map<string, number>();

  // Problem #1 at t0 → problem alert.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured, ledger }),
  );
  // Recover at t0 + 5m → recovery alert #1.
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(t0 + 5 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(t0 + 5 * MIN_MS),
    }),
    makeDeps({ now: t0 + 5 * MIN_MS, captured, ledger }),
  );
  // Flap back to problem at t0 + 10m → STILL inside the problem-debounce
  // window from t0, so no problem alert. No incident is re-opened (we
  // intentionally only open one when an alert actually goes out).
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 10 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 10 * MIN_MS, captured, ledger }),
  );
  // Recover again at t0 + 15m → no recovery alert (no open incident, AND
  // the previous recovery is well within the cool-down).
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(t0 + 15 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(t0 + 15 * MIN_MS),
    }),
    makeDeps({ now: t0 + 15 * MIN_MS, captured, ledger }),
  );

  // Total: one problem alert + one recovery alert.
  const kinds = captured.webhookCalls.map((c) => c.payload.health);
  expect(kinds).toEqual(["failing", "recovered"]);
});

test("flap suppression: a fresh problem alert + recovery within the recovery cool-down is debounced", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "30";
  const t0 = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  // Problem #1 at t0 → problem alert.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured }),
  );
  // Recover at t0 + 10m → recovery alert #1 (recovery cool-down starts).
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(t0 + 10 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(t0 + 10 * MIN_MS),
    }),
    makeDeps({ now: t0 + 10 * MIN_MS, captured }),
  );
  // Problem #2 at t0 + 31m. Past the problem debounce (30m from t0), so a
  // fresh problem alert fires and the incident is re-opened.
  await maybeNotifyPrunerHealth(
    snap({ ranAt: new Date(t0 + 31 * MIN_MS), error: "boom" }),
    makeDeps({ now: t0 + 31 * MIN_MS, captured }),
  );
  // Recover again at t0 + 35m. That's only 25m after the first recovery
  // alert, INSIDE the 30m recovery cool-down, so the recovery alert must
  // be suppressed (flap protection). The incident is silently closed so
  // the next failing tick can open a fresh one without bookkeeping drift.
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(t0 + 35 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(t0 + 35 * MIN_MS),
    }),
    makeDeps({ now: t0 + 35 * MIN_MS, captured }),
  );

  const kinds = captured.webhookCalls.map((c) => c.payload.health);
  expect(kinds).toEqual(["failing", "recovered", "failing"]);
});

test("recovery alert payload includes pruner name, recoveredAt, and unhealthy duration", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const t0 = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "rate_limit_buckets",
      prunerName: "rate_limit_buckets pruner",
      ranAt: new Date(t0),
      error: "boom",
    }),
    makeDeps({ now: t0, captured }),
  );
  const tRecover = t0 + 7 * HOUR_MS;
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "rate_limit_buckets",
      prunerName: "rate_limit_buckets pruner",
      ranAt: new Date(tRecover),
      error: null,
      lastSuccessAt: new Date(tRecover),
    }),
    makeDeps({ now: tRecover, captured }),
  );

  const recovery = captured.webhookCalls[1]!.payload;
  expect(recovery.health).toBe("recovered");
  expect(recovery.prunerName).toBe("rate_limit_buckets pruner");
  expect(recovery.prunerKey).toBe("rate_limit_buckets");
  expect(recovery.generatedAt).toBe(new Date(tRecover).toISOString());
  expect(recovery.unhealthyDurationMs).toBe(7 * HOUR_MS);
  expect(recovery.lastError).toBeNull();

  // Both channels must receive the recovery alert.
  expect(captured.emailCalls).toHaveLength(2);
  expect(captured.emailCalls[1]!.payload.health).toBe("recovered");
});

test("recovery alerts are per-pruner: a recovery on one does not affect the other", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const t0 = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  // Both pruners go failing.
  await maybeNotifyPrunerHealth(
    snap({ prunerKey: "spam_events", ranAt: new Date(t0), error: "boom" }),
    makeDeps({ now: t0, captured }),
  );
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "rate_limit_buckets",
      prunerName: "rate_limit_buckets pruner",
      ranAt: new Date(t0),
      error: "boom",
    }),
    makeDeps({ now: t0, captured }),
  );
  // Only spam_events recovers.
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      ranAt: new Date(t0 + 5 * MIN_MS),
      error: null,
      lastSuccessAt: new Date(t0 + 5 * MIN_MS),
    }),
    makeDeps({ now: t0 + 5 * MIN_MS, captured }),
  );

  const events = captured.webhookCalls.map((c) => ({
    key: c.payload.prunerKey,
    health: c.payload.health,
  }));
  expect(events).toEqual([
    { key: "spam_events", health: "failing" },
    { key: "rate_limit_buckets", health: "failing" },
    { key: "spam_events", health: "recovered" },
  ]);
});

test("debounce is per-pruner: rate_limit alert is not blocked by a recent spam_events alert", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "60";
  const now = 1_700_000_000_000;
  const captured: Captured = {
    webhookCalls: [],
    emailCalls: [],
    recordedEvents: [],
  };
  const ledger = new Map<string, number>();

  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      prunerName: "spam_events pruner",
      ranAt: new Date(now),
      error: "boom",
    }),
    makeDeps({ now, captured, ledger }),
  );
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "rate_limit_buckets",
      prunerName: "rate_limit_buckets pruner",
      ranAt: new Date(now),
      error: "boom",
    }),
    makeDeps({ now, captured, ledger }),
  );

  expect(captured.webhookCalls).toHaveLength(2);
  expect(captured.webhookCalls[0]!.payload.prunerKey).toBe("spam_events");
  expect(captured.webhookCalls[1]!.payload.prunerKey).toBe(
    "rate_limit_buckets",
  );
  // Sanity: each pruner gets its OWN row in the persistent ledger so a
  // chronic failure on one cannot silence the other across restarts.
  expect(ledger.size).toBe(2);
  expect(ledger.has("pruner_health:spam_events")).toBe(true);
  expect(ledger.has("pruner_health:rate_limit_buckets")).toBe(true);
});

test("debounce survives a simulated restart: cool-down honoured against the persisted ledger", async () => {
  // Same backing ledger across two notifier invocations, but BETWEEN them
  // we discard the in-process state by calling
  // _resetPrunerHealthStateForTests(). Pre-fix the per-pruner Map was the
  // only source of truth, so wiping it would let the next failing tick
  // re-page ops immediately. Post-fix the persisted ledger keeps the
  // cool-down active across the simulated restart.
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["PRUNE_HEALTH_DEBOUNCE_MINUTES"] = "60";
  const t0 = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const ledger = new Map<string, number>();

  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      ranAt: new Date(t0),
      error: "boom",
    }),
    makeDeps({ now: t0, captured, ledger }),
  );
  expect(captured.webhookCalls).toHaveLength(1);

  // Simulate a deploy: blow away ALL in-process state. The persistent
  // ledger (Map outside the module) survives, mirroring the real DB row.
  _resetPrunerHealthStateForTests();

  // 10 minutes after the original alert — well inside the 60-minute
  // cool-down. Without persistent debouncing this would re-page ops on
  // the very next pruner tick after a restart.
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      ranAt: new Date(t0 + 10 * MIN_MS),
      error: "boom",
    }),
    makeDeps({ now: t0 + 10 * MIN_MS, captured, ledger }),
  );
  expect(
    captured.webhookCalls,
    "restart must NOT cause a duplicate alert inside the cool-down window",
  ).toHaveLength(1);

  // Past the cool-down — re-alert is allowed again.
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      ranAt: new Date(t0 + 61 * MIN_MS),
      error: "boom",
    }),
    makeDeps({ now: t0 + 61 * MIN_MS, captured, ledger }),
  );
  expect(captured.webhookCalls).toHaveLength(2);
});

test("reports lastSuccessAgeMs=null when no successful run has ever been recorded", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const now = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({
      ranAt: new Date(now),
      error: "boom",
      lastSuccessAt: null,
    }),
    makeDeps({ now, captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]!.payload.lastSuccessAgeMs).toBeNull();
});

test("only fires webhook when only webhook is configured", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({ error: "boom" }),
    makeDeps({ captured }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(0);
});

test("only fires email when only email is configured", async () => {
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await maybeNotifyPrunerHealth(
    snap({ error: "boom" }),
    makeDeps({ captured }),
  );
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(1);
});

test("swallows errors thrown by the sender (never re-throws into the pruner)", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  await expect(
    maybeNotifyPrunerHealth(snap({ error: "boom" }), {
      now: () => Date.now(),
      // Always-claim stub so the test stays hermetic and doesn't touch
      // the real `alert_debounce` table — we want to assert the SENDER
      // error is swallowed, not the claim path.
      claimSlot: async () => true,
      sendWebhook: async () => {
        throw new Error("network down");
      },
      sendEmail: async () => true,
      // Stub recordEvent here too so this unit test never tries to write to
      // the real DB just because dispatchAlert now persists alongside the
      // channel sends.
      recordEvent: async () => {},
    }),
  ).resolves.toBeUndefined();
});

// ---------------------------------------------------------------------------
// sendPrunerHealthTestAlert (synthetic delivery test, admin-triggered)
// ---------------------------------------------------------------------------

test("sendPrunerHealthTestAlert: enabled=false when no channel is configured", async () => {
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const result = await sendPrunerHealthTestAlert(
    makeDeps({ now: 1_700_000_000_000, captured }),
  );
  expect(result.enabled).toBe(false);
  expect(result.webhook.attempted).toBe(false);
  expect(result.email.attempted).toBe(false);
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(0);
});

test("sendPrunerHealthTestAlert: fires on every configured channel with a clearly TEST-marked payload", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const now = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };

  const result = await sendPrunerHealthTestAlert(
    makeDeps({ now, captured }),
  );

  expect(result.enabled).toBe(true);
  expect(result.webhook).toEqual({ attempted: true, ok: true });
  expect(result.email).toEqual({ attempted: true, ok: true });
  expect(result.generatedAt).toBe(new Date(now).toISOString());

  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(1);

  const wPayload = captured.webhookCalls[0]!.payload;
  expect(wPayload.health).toBe("test");
  // Synthetic key/name marked so it can never collide with a real pruner.
  expect(wPayload.prunerKey).toBe("__delivery_test__");
  expect(wPayload.prunerName).toContain("test");
  expect(wPayload.lastError).toBeNull();
  expect(wPayload.lastSuccessAgeMs).toBeNull();
  expect(wPayload.lastRunAt).toBeNull();
  expect(wPayload.unhealthyDurationMs).toBeNull();

  const ePayload = captured.emailCalls[0]!.payload;
  expect(ePayload.health).toBe("test");
  expect(captured.emailCalls[0]!.to).toBe("ops@example.com");
});

test("sendPrunerHealthTestAlert: only fires webhook when only webhook is configured", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const result = await sendPrunerHealthTestAlert(makeDeps({ captured }));
  expect(result.enabled).toBe(true);
  expect(result.webhook).toEqual({ attempted: true, ok: true });
  expect(result.email).toEqual({ attempted: false, ok: null });
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(0);
});

test("sendPrunerHealthTestAlert: only fires email when only email is configured", async () => {
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const result = await sendPrunerHealthTestAlert(makeDeps({ captured }));
  expect(result.enabled).toBe(true);
  expect(result.webhook).toEqual({ attempted: false, ok: null });
  expect(result.email).toEqual({ attempted: true, ok: true });
  expect(captured.webhookCalls).toHaveLength(0);
  expect(captured.emailCalls).toHaveLength(1);
});

test("sendPrunerHealthTestAlert: reports per-channel failures without throwing", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const result = await sendPrunerHealthTestAlert({
    now: () => 1_700_000_000_000,
    readCleanupHealthLines: async () => [],
    sendWebhook: async () => false,
    sendEmail: async () => {
      throw new Error("smtp down");
    },
  });
  expect(result.enabled).toBe(true);
  // false from the sender → ok:false. A throw is also reported as ok:false
  // because the helper guarantees it never re-throws.
  expect(result.webhook).toEqual({ attempted: true, ok: false });
  expect(result.email).toEqual({ attempted: true, ok: false });
});

test("sendPrunerHealthTestAlert: does NOT mutate per-pruner debounce or open-incident state", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const now = 1_700_000_000_000;
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  // Shared persistent-debounce ledger across all calls in this test, so we
  // can prove the synthetic send doesn't touch it. The PROBLEM-alert
  // debounce now lives in `alert_debounce` (claimSlot), not in the
  // in-memory recovery state map — so we have to check both.
  const ledger = new Map<string, number>();

  // Seed a real failing alert so the spam_events pruner has its
  // `openIncidentSince` set in `alertState` AND a slot claimed in the
  // persistent debounce ledger. The synthetic test send must leave both
  // UNCHANGED, otherwise it could silence the next real alert (or
  // accidentally close an open incident).
  await maybeNotifyPrunerHealth(
    snap({
      prunerKey: "spam_events",
      ranAt: new Date(now),
      error: "boom",
    }),
    makeDeps({ now, captured, ledger }),
  );

  const before = _peekPrunerHealthStateForTests();
  const beforeSpam = before.get("spam_events");
  expect(beforeSpam?.openIncidentSince).toBe(now);
  // Snapshot the persistent debounce ledger so we can prove the
  // synthetic send doesn't claim/touch it.
  const ledgerBefore = new Map(ledger);
  expect(ledgerBefore.size).toBeGreaterThan(0);

  // Fire the synthetic test send a millisecond later.
  await sendPrunerHealthTestAlert(makeDeps({ now: now + 1, captured, ledger }));

  const after = _peekPrunerHealthStateForTests();
  // Same key set — no synthetic "__delivery_test__" entry should have been
  // created in alertState. (The helper passes it as the payload key but
  // never touches the per-pruner state map.)
  expect(Array.from(after.keys()).sort()).toEqual(
    Array.from(before.keys()).sort(),
  );
  // And the spam_events recovery state is byte-for-byte identical.
  expect(after.get("spam_events")).toEqual(beforeSpam);
  // And the persistent debounce ledger is byte-for-byte identical — the
  // synthetic send must never call claimSlot, since it would otherwise
  // burn a slot under its synthetic key (or worse, the real one).
  expect(Array.from(ledger.entries()).sort()).toEqual(
    Array.from(ledgerBefore.entries()).sort(),
  );
});

test("sendPrunerHealthTestAlert: embeds live cleanup-health lines in the payload", async () => {
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const lines = [
    "spam_events pruner: OK",
    "rate_limit_buckets pruner: FAILING — last good run 14h ago",
  ];
  await sendPrunerHealthTestAlert(
    makeDeps({ captured, cleanupHealthLines: lines }),
  );
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.emailCalls).toHaveLength(1);
  // Both channels receive the same payload with the same pre-rendered
  // health lines — exactly what a real spike alert's section would show.
  expect(captured.webhookCalls[0]!.payload.cleanupHealthLines).toEqual(lines);
  expect(captured.emailCalls[0]!.payload.cleanupHealthLines).toEqual(lines);
});

test("sendPrunerHealthTestAlert: still sends when the cleanup-health reader throws", async () => {
  // The reader is best-effort by design — a DB blip must never block the
  // delivery test itself. The payload simply carries an empty section.
  process.env["SPAM_SPIKE_WEBHOOK_URL"] = "https://hooks.example.com/x";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  const deps = makeDeps({ captured });
  const result = await sendPrunerHealthTestAlert({
    ...deps,
    readCleanupHealthLines: async () => {
      throw new Error("db down");
    },
  });
  expect(result.enabled).toBe(true);
  expect(result.webhook).toEqual({ attempted: true, ok: true });
  expect(captured.webhookCalls).toHaveLength(1);
  expect(captured.webhookCalls[0]!.payload.cleanupHealthLines).toEqual([]);
});

test("sendPrunerHealthTestAlert: never opens or extends a real per-pruner incident", async () => {
  // No prior alert state. After the synthetic test send, alertState should
  // STILL be empty — i.e. the helper hasn't lazily created an entry under
  // its synthetic prunerKey that a future recovery check could trip on.
  process.env["SPAM_SPIKE_ALERT_EMAIL"] = "ops@example.com";
  const captured: Captured = { webhookCalls: [], emailCalls: [], recordedEvents: [] };
  await sendPrunerHealthTestAlert(makeDeps({ captured }));
  expect(_peekPrunerHealthStateForTests().size).toBe(0);
});
