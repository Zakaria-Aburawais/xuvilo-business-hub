import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import {
  AUTO_REFRESH_INTERVAL_MS,
  computeHealth,
  pickLastSuccessTemplate,
  pickLastPagedTemplate,
  pickNextAllowedTemplate,
  PruneBlock,
  AlertCooldownBlock,
  useAutoRefresh,
} from "./SpamStatsCard";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = new Date("2026-05-01T12:00:00Z");

// Return the template strings the real i18n dictionary uses for the keys
// `computeHealth` substitutes into. Other keys fall back to the key itself
// so the test stays a faithful unit check that doesn't depend on the
// production translation file.
const TEMPLATES: Record<string, string> = {
  "admin.spam.prune.health.failing_title": "Last run reported an error: {message}",
  "admin.spam.prune.health.stale_title":
    "Last run is older than expected ({hours}h ago, cadence {cadence}).",
  "admin.spam.prune.last_success_minutes": "Last successful run: {minutes}m ago",
  "admin.spam.prune.last_success_hours": "Last successful run: {hours}h ago",
  "admin.spam.prune.last_success_days": "Last successful run: {days}d ago",
  "admin.spam.prune.last_success_never": "No successful run on record yet",
};
const t = (key: string) => TEMPLATES[key] ?? key;

interface FakeLastRun {
  ranAt: string;
  deleted: number;
  retentionDays: number;
  error: string | null;
}

function lastRun(overrides: Partial<FakeLastRun> = {}): FakeLastRun {
  return {
    ranAt: NOW.toISOString(),
    deleted: 0,
    retentionDays: 30,
    error: null,
    ...overrides,
  };
}

function isoAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
});

describe("computeHealth", () => {
  it("returns failing when the last run reported an error, even if recent", () => {
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 60_000).toISOString(),
        error: "connection refused",
      }),
      24 * HOUR_MS,
      t,
    );
    expect(result.level).toBe("failing");
    expect(result.label).toBe("admin.spam.prune.health.failing");
    expect(result.title).toContain("connection refused");
  });

  it("prefers the failing signal over staleness when both apply", () => {
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 10 * 24 * HOUR_MS).toISOString(),
        error: "boom",
      }),
      24 * HOUR_MS,
      t,
    );
    expect(result.level).toBe("failing");
  });

  it("returns unknown when no run has been recorded yet", () => {
    const result = computeHealth(null, 24 * HOUR_MS, t);
    expect(result.level).toBe("unknown");
    expect(result.label).toBe("admin.spam.prune.health.unknown");
  });

  it("returns healthy when the run is well within the cadence window", () => {
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 1 * HOUR_MS).toISOString(),
      }),
      24 * HOUR_MS,
      t,
    );
    expect(result.level).toBe("healthy");
    expect(result.label).toBe("admin.spam.prune.health.healthy");
  });

  it("returns stale when the run is older than 2x the configured cadence", () => {
    const intervalMs = HOUR_MS;
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 3 * intervalMs).toISOString(),
      }),
      intervalMs,
      t,
    );
    expect(result.level).toBe("stale");
    expect(result.label).toBe("admin.spam.prune.health.stale");
  });

  it("treats exactly 2x cadence as still healthy (strict greater-than threshold)", () => {
    const intervalMs = HOUR_MS;
    const equal = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 2 * intervalMs).toISOString(),
      }),
      intervalMs,
      t,
    );
    expect(equal.level).toBe("healthy");

    const justOver = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 2 * intervalMs - 1).toISOString(),
      }),
      intervalMs,
      t,
    );
    expect(justOver.level).toBe("stale");
  });

  it("falls back to error-only signaling when intervalMs is undefined", () => {
    // An older API response without intervalMs cannot be classified as stale
    // (no cadence to measure against), so an old-but-clean run is healthy.
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 30 * 24 * HOUR_MS).toISOString(),
      }),
      undefined,
      t,
    );
    expect(result.level).toBe("healthy");
  });

  it("falls back to error-only signaling when intervalMs is zero or negative", () => {
    const result = computeHealth(
      lastRun({
        ranAt: new Date(NOW.getTime() - 30 * 24 * HOUR_MS).toISOString(),
      }),
      0,
      t,
    );
    expect(result.level).toBe("healthy");
  });
});

describe("PruneBlock badge data-health attribute", () => {
  function renderBlock(opts: {
    intervalMs?: number;
    lastRun: FakeLastRun | null;
    lastSuccessAt?: string | null;
    testIdPrefix: string;
  }) {
    return render(
      <PruneBlock
        title="Cleanup"
        hint="hint"
        retentionDays={30}
        intervalMs={opts.intervalMs}
        lastRun={opts.lastRun}
        lastSuccessAt={opts.lastSuccessAt}
        lang="en"
        t={t}
        testIdPrefix={opts.testIdPrefix}
      />,
    );
  }

  it("marks the spam-prune badge as healthy when the last run is recent", () => {
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({
        ranAt: new Date(NOW.getTime() - HOUR_MS).toISOString(),
        deleted: 7,
      }),
      testIdPrefix: "admin-spam-prune",
    });
    const badge = screen.getByTestId("admin-spam-prune-health");
    expect(badge.getAttribute("data-health")).toBe("healthy");
  });

  it("marks the rate-limit-prune badge as stale when the run is past 2x cadence", () => {
    renderBlock({
      intervalMs: HOUR_MS,
      lastRun: lastRun({
        ranAt: new Date(NOW.getTime() - 3 * HOUR_MS).toISOString(),
      }),
      testIdPrefix: "admin-ratelimit-prune",
    });
    const badge = screen.getByTestId("admin-ratelimit-prune-health");
    expect(badge.getAttribute("data-health")).toBe("stale");
  });

  it("marks the spam-prune badge as failing when the run reported an error", () => {
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({
        ranAt: new Date(NOW.getTime() - HOUR_MS).toISOString(),
        error: "db down",
      }),
      testIdPrefix: "admin-spam-prune",
    });
    const badge = screen.getByTestId("admin-spam-prune-health");
    expect(badge.getAttribute("data-health")).toBe("failing");
  });

  it("marks the rate-limit-prune badge as unknown when no run has been recorded", () => {
    renderBlock({
      intervalMs: HOUR_MS,
      lastRun: null,
      testIdPrefix: "admin-ratelimit-prune",
    });
    const badge = screen.getByTestId("admin-ratelimit-prune-health");
    expect(badge.getAttribute("data-health")).toBe("unknown");
  });
});

describe("useAutoRefresh", () => {
  // Small probe component so the hook runs under real React rendering.
  function Probe({
    callback,
    resetKey,
  }: {
    callback: () => void;
    resetKey: number;
  }) {
    useAutoRefresh(callback, AUTO_REFRESH_INTERVAL_MS, resetKey);
    return null;
  }

  // jsdom exposes visibilityState as a getter; override it per-test and
  // restore afterwards so other suites see a "visible" document.
  function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("fires the callback on every interval tick while the tab is visible", () => {
    const cb = vi.fn();
    render(<Probe callback={cb} resetKey={0} />);
    expect(cb).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2 * AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("pauses while the tab is hidden and resumes when it becomes visible", () => {
    const cb = vi.fn();
    render(<Probe callback={cb} resetKey={0} />);

    act(() => {
      setVisibility("hidden");
      vi.advanceTimersByTime(10 * AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).not.toHaveBeenCalled();

    act(() => {
      setVisibility("visible");
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not start the timer at all when mounted in a hidden tab", () => {
    const cb = vi.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    render(<Probe callback={cb} resetKey={0} />);
    act(() => {
      vi.advanceTimersByTime(5 * AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it("restarts the interval from zero when resetKey changes (manual refresh)", () => {
    const cb = vi.fn();
    const { rerender } = render(<Probe callback={cb} resetKey={0} />);

    // Get 2/3 of the way to the next tick, then simulate a manual refresh.
    act(() => {
      vi.advanceTimersByTime((AUTO_REFRESH_INTERVAL_MS * 2) / 3);
    });
    rerender(<Probe callback={cb} resetKey={1} />);

    // The old tick (due in 1/3 period) must NOT fire — the timer restarted.
    act(() => {
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS / 2);
    });
    expect(cb).not.toHaveBeenCalled();

    // A full period after the reset, the callback fires.
    act(() => {
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS / 2);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("always invokes the latest callback, and a new closure alone does not reset the timer", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Probe callback={first} resetKey={0} />);

    act(() => {
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS / 2);
    });
    rerender(<Probe callback={second} resetKey={0} />);

    // Same resetKey: the original tick is still due half a period later,
    // and it must call the NEW callback.
    act(() => {
      vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS / 2);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops ticking after unmount", () => {
    const cb = vi.fn();
    const { unmount } = render(<Probe callback={cb} resetKey={0} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(5 * AUTO_REFRESH_INTERVAL_MS);
    });
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("pickLastSuccessTemplate", () => {
  it("uses the minutes template for sub-hour ages", () => {
    const { key, vars } = pickLastSuccessTemplate(5 * 60 * 1000);
    expect(key).toBe("admin.spam.prune.last_success_minutes");
    expect(vars).toEqual({ minutes: 5 });
  });

  it("uses the hours template for sub-day ages", () => {
    const { key, vars } = pickLastSuccessTemplate(14 * HOUR_MS);
    expect(key).toBe("admin.spam.prune.last_success_hours");
    expect(vars).toEqual({ hours: 14 });
  });

  it("uses the days template for ages >= 1 day", () => {
    const { key, vars } = pickLastSuccessTemplate(3 * DAY_MS);
    expect(key).toBe("admin.spam.prune.last_success_days");
    expect(vars).toEqual({ days: 3 });
  });

  it("clamps negative ages (clock skew) to a minimum of 1m", () => {
    // A server clock running ahead of the client could yield a negative age.
    // We never want to show "-3m ago" — the helper must clamp to 1m.
    const { key, vars } = pickLastSuccessTemplate(-10_000);
    expect(key).toBe("admin.spam.prune.last_success_minutes");
    expect(vars).toEqual({ minutes: 1 });
  });
});

describe("PruneBlock last-successful-run line", () => {
  function renderBlock(opts: {
    intervalMs?: number;
    lastRun: FakeLastRun | null;
    lastSuccessAt?: string | null;
    testIdPrefix: string;
  }) {
    return render(
      <PruneBlock
        title="Cleanup"
        hint="hint"
        retentionDays={30}
        intervalMs={opts.intervalMs}
        lastRun={opts.lastRun}
        lastSuccessAt={opts.lastSuccessAt}
        lang="en"
        t={t}
        testIdPrefix={opts.testIdPrefix}
      />,
    );
  }

  it("shows '14h ago' beneath the badge when the most recent run is failing", () => {
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({
        ranAt: isoAgo(30 * 60 * 1000),
        error: "db down",
      }),
      lastSuccessAt: isoAgo(14 * HOUR_MS),
      testIdPrefix: "admin-spam-prune",
    });
    const line = screen.getByTestId("admin-spam-prune-last-success");
    expect(line.textContent).toBe("Last successful run: 14h ago");
  });

  it("shows '3d ago' beneath the badge when the pruner is stale", () => {
    renderBlock({
      intervalMs: HOUR_MS,
      lastRun: lastRun({ ranAt: isoAgo(5 * HOUR_MS) }),
      lastSuccessAt: isoAgo(3 * DAY_MS),
      testIdPrefix: "admin-ratelimit-prune",
    });
    const line = screen.getByTestId("admin-ratelimit-prune-last-success");
    expect(line.textContent).toBe("Last successful run: 3d ago");
  });

  it("falls back to the 'never' label when failing with no successful run on record", () => {
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({
        ranAt: isoAgo(30 * 60 * 1000),
        error: "db down",
      }),
      lastSuccessAt: null,
      testIdPrefix: "admin-spam-prune",
    });
    const line = screen.getByTestId("admin-spam-prune-last-success");
    expect(line.textContent).toBe("No successful run on record yet");
  });

  it("hides the line entirely when the pruner is healthy", () => {
    // When healthy, the existing 'Last run' cell already carries the same
    // information; rendering 'Last successful run' a second time would just
    // be visual noise.
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({ ranAt: isoAgo(HOUR_MS) }),
      lastSuccessAt: isoAgo(HOUR_MS),
      testIdPrefix: "admin-spam-prune",
    });
    expect(
      screen.queryByTestId("admin-spam-prune-last-success"),
    ).toBeNull();
  });

  it("hides the line in the unknown state (no run recorded yet)", () => {
    // 'Unknown' means the pruner has never produced a status row at all,
    // so 'no successful run on record' follows trivially from the badge.
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: null,
      lastSuccessAt: null,
      testIdPrefix: "admin-spam-prune",
    });
    expect(
      screen.queryByTestId("admin-spam-prune-last-success"),
    ).toBeNull();
  });

  it("treats a malformed lastSuccessAt as 'never' rather than crashing", () => {
    // A server bug or schema drift could land a non-ISO string in the field.
    // The widget must degrade gracefully — surfacing 'never' is strictly
    // better than blanking the dashboard during an incident.
    renderBlock({
      intervalMs: 24 * HOUR_MS,
      lastRun: lastRun({
        ranAt: isoAgo(30 * 60 * 1000),
        error: "db down",
      }),
      lastSuccessAt: "not-a-date",
      testIdPrefix: "admin-spam-prune",
    });
    const line = screen.getByTestId("admin-spam-prune-last-success");
    expect(line.textContent).toBe("No successful run on record yet");
  });
});

// Templates for the alert cool-down ledger, mirroring the production i18n
// dictionary values so the assertions read like what an operator sees.
const COOLDOWN_TEMPLATES: Record<string, string> = {
  "admin.alert_cooldown.title": "Alert cool-downs",
  "admin.alert_cooldown.signal.spam_spike": "Spam spike",
  "admin.alert_cooldown.signal.pruner_spam_events":
    "Spam-events pruner health",
  "admin.alert_cooldown.signal.pruner_rate_limit_buckets":
    "Rate-limit pruner health",
  "admin.alert_cooldown.never": "Never paged",
  "admin.alert_cooldown.last_paged_just_now": "Last paged just now",
  "admin.alert_cooldown.last_paged_minutes": "Last paged {minutes} min ago",
  "admin.alert_cooldown.last_paged_hours": "Last paged {hours} h ago",
  "admin.alert_cooldown.last_paged_days": "Last paged {days} d ago",
  "admin.alert_cooldown.next_allowed_minutes":
    "next page allowed in {minutes} min",
  "admin.alert_cooldown.next_allowed_hours": "next page allowed in {hours} h",
  "admin.alert_cooldown.next_allowed_now": "next page allowed now",
  "admin.alert_cooldown.disabled": "alerts disabled",
};
const tCooldown = (key: string) => COOLDOWN_TEMPLATES[key] ?? key;

describe("pickLastPagedTemplate / pickNextAllowedTemplate", () => {
  it("renders sub-minute ages as 'just now'", () => {
    expect(pickLastPagedTemplate(30 * 1000).key).toBe(
      "admin.alert_cooldown.last_paged_just_now",
    );
  });

  it("scales last-paged through minutes, hours, and days", () => {
    expect(pickLastPagedTemplate(10 * 60 * 1000)).toEqual({
      key: "admin.alert_cooldown.last_paged_minutes",
      vars: { minutes: 10 },
    });
    expect(pickLastPagedTemplate(3 * HOUR_MS)).toEqual({
      key: "admin.alert_cooldown.last_paged_hours",
      vars: { hours: 3 },
    });
    expect(pickLastPagedTemplate(2 * DAY_MS)).toEqual({
      key: "admin.alert_cooldown.last_paged_days",
      vars: { days: 2 },
    });
  });

  it("says 'allowed now' when the cool-down has elapsed", () => {
    expect(pickNextAllowedTemplate(0).key).toBe(
      "admin.alert_cooldown.next_allowed_now",
    );
    expect(pickNextAllowedTemplate(-5000).key).toBe(
      "admin.alert_cooldown.next_allowed_now",
    );
  });

  it("ceils remaining minutes so it never understates the wait", () => {
    // 61 seconds remaining must say "2 min", not "1 min" — the notifier
    // would still suppress at the 1-minute mark.
    expect(pickNextAllowedTemplate(61 * 1000)).toEqual({
      key: "admin.alert_cooldown.next_allowed_minutes",
      vars: { minutes: 2 },
    });
    expect(pickNextAllowedTemplate(90 * 60 * 1000)).toEqual({
      key: "admin.alert_cooldown.next_allowed_hours",
      vars: { hours: 2 },
    });
  });
});

describe("AlertCooldownBlock", () => {
  // Other suites in this file (auto-refresh) advance the shared fake clock,
  // so re-pin the system time before each case — the block computes ages
  // against Date.now() and isoAgo() is anchored to NOW.
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  it("shows 'Never paged' when no row exists for a signal", () => {
    render(
      <AlertCooldownBlock
        entries={[
          { key: "spam_spike", lastAlertedAt: null, debounceMs: 3600000 },
        ]}
        t={tCooldown}
      />,
    );
    const row = screen.getByTestId("admin-alert-cooldown-spam_spike");
    expect(row.textContent).toContain("Spam spike");
    expect(row.textContent).toContain("Never paged");
  });

  it("shows last-paged age plus the remaining cool-down countdown", () => {
    // Paged 20 minutes ago with a 60-minute cool-down → 40 minutes remain.
    render(
      <AlertCooldownBlock
        entries={[
          {
            key: "pruner_health:spam_events",
            lastAlertedAt: isoAgo(20 * 60 * 1000),
            debounceMs: 60 * 60 * 1000,
          },
        ]}
        t={tCooldown}
      />,
    );
    const row = screen.getByTestId(
      "admin-alert-cooldown-pruner_health-spam_events",
    );
    expect(row.textContent).toContain("Spam-events pruner health");
    expect(row.textContent).toContain("Last paged 20 min ago");
    expect(row.textContent).toContain("next page allowed in 40 min");
  });

  it("says the next page is allowed now once the cool-down has elapsed", () => {
    render(
      <AlertCooldownBlock
        entries={[
          {
            key: "pruner_health:rate_limit_buckets",
            lastAlertedAt: isoAgo(2 * HOUR_MS),
            debounceMs: 60 * 60 * 1000,
          },
        ]}
        t={tCooldown}
      />,
    );
    const row = screen.getByTestId(
      "admin-alert-cooldown-pruner_health-rate_limit_buckets",
    );
    expect(row.textContent).toContain("Last paged 2 h ago");
    expect(row.textContent).toContain("next page allowed now");
  });

  it("marks the signal as disabled instead of counting down when alerting is off", () => {
    render(
      <AlertCooldownBlock
        entries={[
          {
            key: "spam_spike",
            lastAlertedAt: isoAgo(10 * 60 * 1000),
            debounceMs: null,
          },
        ]}
        t={tCooldown}
      />,
    );
    const row = screen.getByTestId("admin-alert-cooldown-spam_spike");
    expect(row.textContent).toContain("alerts disabled");
    expect(row.textContent).not.toContain("next page allowed");
  });
});
