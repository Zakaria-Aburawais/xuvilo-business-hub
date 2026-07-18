import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SpamStatsCard } from "./SpamStatsCard";
import { LanguageProvider } from "@/context/LanguageContext";

interface DailyBucket {
  date: string;
  honeypot: number;
  captcha: number;
}

interface SpamStatsResponseLike {
  rangeDays: number;
  generatedAt: string;
  totals: { honeypot: number; captcha: number };
  last24h: { honeypot: number; captcha: number };
  daily: DailyBucket[];
  recent: Array<{
    id: string;
    createdAt: string;
    kind: string;
    reason: string;
    ip: string;
  }>;
  turnstileEnabled: boolean;
  prune?: {
    retentionDays: number;
    intervalMs?: number;
    lastRun: null | {
      ranAt: string;
      deleted: number;
      retentionDays: number;
      error: string | null;
    };
  };
  rateLimitPrune?: {
    retentionDays: number;
    intervalMs?: number;
    lastRun: null | {
      ranAt: string;
      deleted: number;
      retentionDays: number;
      error: string | null;
    };
  };
  alerts?: {
    enabled: boolean;
    threshold: number | null;
    debounceMinutes: number | null;
    channels: { webhook: boolean; email: boolean };
  };
}

function basePayload(
  overrides: Partial<SpamStatsResponseLike> = {},
): SpamStatsResponseLike {
  return {
    rangeDays: 7,
    generatedAt: "2026-05-01T12:00:00Z",
    totals: { honeypot: 5, captcha: 2 },
    last24h: { honeypot: 1, captcha: 0 },
    daily: [
      { date: "2026-04-25", honeypot: 1, captcha: 0 },
      { date: "2026-04-26", honeypot: 2, captcha: 1 },
      { date: "2026-04-27", honeypot: 0, captcha: 0 },
    ],
    recent: [],
    turnstileEnabled: false,
    ...overrides,
  };
}

// Minimal fetch-Response shim. Avoids constructing a real `Response`
// (which is not always available in jsdom across Node versions) and only
// exposes the surface the component actually consumes.
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? status < 400,
    status,
    json: async () => body,
  } as unknown as Response;
}

function renderCard() {
  return render(
    <LanguageProvider>
      <SpamStatsCard />
    </LanguageProvider>,
  );
}

describe("SpamStatsCard fetch-driven states", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    // Pin the language so translation lookups are stable regardless of the
    // jsdom navigator/timezone defaults the LanguageProvider would otherwise
    // sniff.
    localStorage.setItem("bh_lang", "en");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    localStorage.clear();
  });

  it("renders the loading state while the request is in flight", async () => {
    let resolveFetch!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((res) => {
        resolveFetch = res;
      }),
    );

    renderCard();

    expect(await screen.findByText("Loading…")).toBeTruthy();
    expect(screen.queryByTestId("admin-spam-error")).toBeNull();
    expect(screen.queryByTestId("admin-spam-daily")).toBeNull();
    expect(screen.queryByTestId("admin-spam-turnstile-status")).toBeNull();

    // Resolve the in-flight request so the component can settle before
    // the next test runs (prevents act() warnings on cleanup).
    resolveFetch(jsonResponse(basePayload()));
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).toBeNull();
    });
  });

  it("renders the admin-spam-error banner on a non-OK response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

    renderCard();

    const banner = await screen.findByTestId("admin-spam-error");
    expect(banner.textContent).toContain("500");
    // The message must come from the translation dictionary, not a raw
    // developer-facing `Error.message`.
    expect(banner.textContent).toContain("Failed to load spam stats");
    expect(banner.textContent).not.toContain("Request failed");
    expect(screen.queryByTestId("admin-spam-daily")).toBeNull();
    expect(screen.queryByTestId("admin-spam-turnstile-status")).toBeNull();
  });

  it("renders a translated (Arabic) error banner on a non-OK response", async () => {
    localStorage.setItem("bh_lang", "ar");
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 503 }));

    renderCard();

    const banner = await screen.findByTestId("admin-spam-error");
    expect(banner.textContent).toContain("503");
    expect(banner.textContent).toContain("تعذّر تحميل إحصاءات السبام");
    // No English leakage in the localized error path.
    expect(banner.textContent).not.toMatch(/failed|request/i);
  });

  it("renders the translated generic error when the fetch itself rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("NetworkError when attempting to fetch resource"));

    renderCard();

    const banner = await screen.findByTestId("admin-spam-error");
    expect(banner.textContent).toContain("Failed to load spam stats");
    // The raw developer-facing exception message must not leak into the UI.
    expect(banner.textContent).not.toContain("NetworkError");
  });

  it("reflects turnstileEnabled: true with the on badge", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(basePayload({ turnstileEnabled: true })),
    );

    renderCard();

    const badge = await screen.findByTestId("admin-spam-turnstile-status");
    expect(badge.textContent).toMatch(/turnstile\s+on/i);
    expect(badge.textContent).not.toMatch(/off/i);
  });

  it("reflects turnstileEnabled: false with the off badge", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(basePayload({ turnstileEnabled: false })),
    );

    renderCard();

    const badge = await screen.findByTestId("admin-spam-turnstile-status");
    expect(badge.textContent).toMatch(/turnstile\s+off/i);
  });

  it("shows the alerts-on badge with the configured threshold", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        basePayload({
          alerts: {
            enabled: true,
            threshold: 12,
            debounceMinutes: 30,
            channels: { webhook: true, email: false },
          },
        }),
      ),
    );

    renderCard();

    const badge = await screen.findByTestId("admin-spam-alerts-status");
    expect(badge.textContent).toMatch(/alerts\s+on/i);
    expect(badge.textContent).toContain("12");
  });

  it("shows the alerts-off badge when alerts are disabled", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        basePayload({
          alerts: {
            enabled: false,
            threshold: null,
            debounceMinutes: null,
            channels: { webhook: false, email: false },
          },
        }),
      ),
    );

    renderCard();

    const badge = await screen.findByTestId("admin-spam-alerts-status");
    expect(badge.textContent).toMatch(/alerts\s+off/i);
  });

  it("omits the alerts badge entirely when the API does not include alerts", async () => {
    // Older API responses (mid-rollout) may not have an `alerts` block;
    // the badge should simply not render rather than crash.
    fetchMock.mockResolvedValue(jsonResponse(basePayload()));

    renderCard();

    // Wait until the body has rendered before asserting the badge is absent,
    // otherwise we'd be checking the loading state.
    await screen.findByTestId("admin-spam-daily");
    expect(screen.queryByTestId("admin-spam-alerts-status")).toBeNull();
  });

  it("renders one row per daily bucket", async () => {
    const daily: DailyBucket[] = [
      { date: "2026-04-25", honeypot: 1, captcha: 0 },
      { date: "2026-04-26", honeypot: 2, captcha: 1 },
      { date: "2026-04-27", honeypot: 0, captcha: 0 },
      { date: "2026-04-28", honeypot: 4, captcha: 2 },
      { date: "2026-04-29", honeypot: 3, captcha: 0 },
    ];
    fetchMock.mockResolvedValue(jsonResponse(basePayload({ daily })));

    renderCard();

    const container = await screen.findByTestId("admin-spam-daily");
    expect(container.children.length).toBe(daily.length);
  });

  it("re-issues the request and shows the loader when the refresh button is clicked", async () => {
    // First call resolves immediately so the card settles into its loaded
    // state. The second call (triggered by the refresh click) is left
    // pending so we can assert the in-flight loader/disabled state.
    let resolveSecond!: (r: Response) => void;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(basePayload()))
      .mockReturnValueOnce(
        new Promise<Response>((res) => {
          resolveSecond = res;
        }),
      );

    renderCard();

    // Wait until the initial load has settled so we know the click below
    // exercises the refresh path, not the mount-time fetch.
    await screen.findByTestId("admin-spam-daily");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const refresh = screen.getByTestId("admin-spam-refresh") as HTMLButtonElement;
    expect(refresh.disabled).toBe(false);
    // Steady-state shows the refresh icon, not the spinner.
    expect(screen.queryByTestId("admin-spam-refresh-spinner")).toBeNull();

    fireEvent.click(refresh);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // While the second request is pending the button should be disabled
    // and swap its icon for the spinning loader.
    await waitFor(() => {
      const btn = screen.getByTestId("admin-spam-refresh") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(screen.getByTestId("admin-spam-refresh-spinner")).toBeTruthy();
    });

    // Resolve the pending request so the component settles before the next
    // test runs (avoids act() warnings on cleanup).
    resolveSecond(jsonResponse(basePayload()));
    await waitFor(() => {
      const btn = screen.getByTestId("admin-spam-refresh") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  it("renders one row per recent spam event when the API includes them", async () => {
    const recent = [
      {
        id: "evt_1",
        createdAt: "2026-04-30T10:15:00Z",
        kind: "honeypot",
        reason: "filled honeypot field",
        ip: "203.0.113.10",
      },
      {
        id: "evt_2",
        createdAt: "2026-04-30T11:02:00Z",
        kind: "captcha",
        reason: "turnstile token rejected",
        ip: "198.51.100.42",
      },
      {
        id: "evt_3",
        createdAt: "2026-04-30T11:48:00Z",
        kind: "honeypot",
        reason: "submitted under 1s",
        ip: "192.0.2.7",
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(basePayload({ recent })));

    renderCard();

    const list = await screen.findByTestId("admin-spam-recent");
    const rows = screen.getAllByTestId("admin-spam-recent-row");
    expect(rows.length).toBe(recent.length);

    // Spot-check that each row carries its reason and IP so a future
    // refactor that drops a field would fail loudly here.
    expect(list.textContent).toContain("filled honeypot field");
    expect(list.textContent).toContain("203.0.113.10");
    expect(list.textContent).toContain("turnstile token rejected");
    expect(list.textContent).toContain("198.51.100.42");
    expect(list.textContent).toContain("submitted under 1s");
    expect(list.textContent).toContain("192.0.2.7");
  });

  describe("recent-events scanning aids", () => {
    const recent = [
      {
        id: "evt_1",
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        kind: "honeypot",
        reason: "filled honeypot field",
        ip: "203.0.113.10",
      },
      {
        id: "evt_2",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        kind: "captcha",
        reason: "turnstile token rejected",
        ip: "198.51.100.42",
      },
      {
        id: "evt_3",
        createdAt: new Date(Date.now() - 30 * 1000).toISOString(),
        kind: "honeypot",
        reason: "submitted under 1s",
        ip: "192.0.2.7",
      },
    ];

    it("shows a relative time-ago label on each row (absolute time in the title)", async () => {
      fetchMock.mockResolvedValue(jsonResponse(basePayload({ recent })));

      renderCard();

      await screen.findByTestId("admin-spam-recent");
      const labels = screen.getAllByTestId("admin-spam-recent-row-ago");
      expect(labels.length).toBe(3);
      const texts = labels.map((l) => l.textContent ?? "");
      expect(texts.some((s) => /5 min ago/i.test(s))).toBe(true);
      expect(texts.some((s) => /2 h ago/i.test(s))).toBe(true);
      expect(texts.some((s) => /just now/i.test(s))).toBe(true);
      // Each label keeps the absolute timestamp reachable via hover.
      for (const label of labels) {
        expect(label.getAttribute("title")).toBeTruthy();
      }
    });

    it("shows per-kind counts for the fetched window above the list", async () => {
      fetchMock.mockResolvedValue(jsonResponse(basePayload({ recent })));

      renderCard();

      const summary = await screen.findByTestId("admin-spam-recent-summary");
      expect(summary.textContent).toContain("2 honeypot");
      expect(summary.textContent).toContain("1 captcha");
    });

    it("filters rows by kind via the toggle and restores them with All", async () => {
      fetchMock.mockResolvedValue(jsonResponse(basePayload({ recent })));

      renderCard();

      await screen.findByTestId("admin-spam-recent");
      expect(screen.getAllByTestId("admin-spam-recent-row").length).toBe(3);

      fireEvent.click(screen.getByTestId("admin-spam-recent-filter-honeypot"));
      let rows = screen.getAllByTestId("admin-spam-recent-row");
      expect(rows.length).toBe(2);
      for (const row of rows) {
        expect(row.getAttribute("data-kind")).toBe("honeypot");
      }
      // The summary keeps showing the full-window mix while filtered.
      expect(
        screen.getByTestId("admin-spam-recent-summary").textContent,
      ).toContain("1 captcha");

      fireEvent.click(screen.getByTestId("admin-spam-recent-filter-captcha"));
      rows = screen.getAllByTestId("admin-spam-recent-row");
      expect(rows.length).toBe(1);
      expect(rows[0].getAttribute("data-kind")).toBe("captcha");

      fireEvent.click(screen.getByTestId("admin-spam-recent-filter-all"));
      expect(screen.getAllByTestId("admin-spam-recent-row").length).toBe(3);
    });

    it("shows an empty-state line when the active filter matches no events", async () => {
      const honeypotOnly = recent.filter((e) => e.kind === "honeypot");
      fetchMock.mockResolvedValue(
        jsonResponse(basePayload({ recent: honeypotOnly })),
      );

      renderCard();

      await screen.findByTestId("admin-spam-recent");
      fireEvent.click(screen.getByTestId("admin-spam-recent-filter-captcha"));

      expect(screen.queryAllByTestId("admin-spam-recent-row").length).toBe(0);
      const empty = screen.getByTestId("admin-spam-recent-empty");
      expect(empty.textContent).toMatch(/no captcha events/i);
    });
  });

  it("omits the recent-events list entirely when the API returns no recent rows", async () => {
    // The default basePayload has `recent: []`, so the section should not
    // render at all rather than showing an empty list shell.
    fetchMock.mockResolvedValue(jsonResponse(basePayload()));

    renderCard();

    await screen.findByTestId("admin-spam-daily");
    expect(screen.queryByTestId("admin-spam-recent")).toBeNull();
  });

  // The "Last test: …" status line is meant to survive a page refresh for
  // the current browser session — that's the whole point of the feature.
  // We simulate a refresh by seeding sessionStorage and mounting the card
  // fresh, then assert the line is hydrated with the per-channel outcome.
  describe("last test-alert status line", () => {
    const STORAGE_KEY = "admin-prune-test-alert.last-result.v1";

    afterEach(() => {
      sessionStorage.clear();
    });

    it("hydrates the last-test status line from sessionStorage on mount (success with both channels)", async () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          at: Date.now() - 2 * 60 * 1000,
          status: "success",
          webhook: { attempted: true, ok: true },
          email: { attempted: true, ok: false },
        }),
      );
      fetchMock.mockResolvedValue(jsonResponse(basePayload()));

      renderCard();

      const line = await screen.findByTestId("admin-prune-test-alert-last");
      expect(line.getAttribute("data-status")).toBe("success");
      expect(line.textContent).toMatch(/min ago/i);

      const webhook = screen.getByTestId(
        "admin-prune-test-alert-last-webhook",
      );
      expect(webhook.getAttribute("data-channel-ok")).toBe("true");
      const email = screen.getByTestId("admin-prune-test-alert-last-email");
      expect(email.getAttribute("data-channel-ok")).toBe("false");
    });

    it("renders the disabled summary when the persisted status is `disabled`", async () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          at: Date.now() - 30 * 1000,
          status: "disabled",
          webhook: null,
          email: null,
        }),
      );
      fetchMock.mockResolvedValue(jsonResponse(basePayload()));

      renderCard();

      const line = await screen.findByTestId("admin-prune-test-alert-last");
      expect(line.getAttribute("data-status")).toBe("disabled");
      expect(line.textContent).toMatch(/no channels configured/i);
      // No per-channel chips for the disabled outcome.
      expect(
        screen.queryByTestId("admin-prune-test-alert-last-webhook"),
      ).toBeNull();
      expect(
        screen.queryByTestId("admin-prune-test-alert-last-email"),
      ).toBeNull();
    });

    it("renders nothing when sessionStorage is empty (no prior test fired)", async () => {
      fetchMock.mockResolvedValue(jsonResponse(basePayload()));

      renderCard();

      // Wait for the card to settle, then assert the line is absent.
      await screen.findByTestId("admin-spam-daily");
      expect(screen.queryByTestId("admin-prune-test-alert-last")).toBeNull();
    });

    it("clears and ignores a corrupted sessionStorage payload", async () => {
      sessionStorage.setItem(STORAGE_KEY, "{not valid json");
      fetchMock.mockResolvedValue(jsonResponse(basePayload()));

      renderCard();

      await screen.findByTestId("admin-spam-daily");
      expect(screen.queryByTestId("admin-prune-test-alert-last")).toBeNull();
      // The corrupted entry should have been cleared so the next write
      // starts from a clean slate.
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
