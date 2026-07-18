import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@workspace/db";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    tier: "free",
    subscriptionStatus: null,
    currentPeriodEnd: null,
    ...overrides,
  } as AppUser;
}

async function loadWithBilling(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv("BILLING_ENABLED", enabled ? "true" : "false");
  const mod = await import("../entitlements");
  return mod.deriveEntitlements;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("deriveEntitlements with billing disabled (launch mode)", () => {
  it("grants tracker to everyone, including free tier", async () => {
    const derive = await loadWithBilling(false);
    expect(derive(makeUser({ tier: "free" })).features.tracker).toBe(true);
    expect(derive(null).features.tracker).toBe(true);
  });
});

describe("deriveEntitlements with billing enabled", () => {
  it("denies tracker for free tier", async () => {
    const derive = await loadWithBilling(true);
    const result = derive(makeUser({ tier: "free" }));
    expect(result.features.tracker).toBe(false);
    expect(result.tier).toBe("free");
  });

  it("denies tracker when there is no user", async () => {
    const derive = await loadWithBilling(true);
    expect(derive(null).features.tracker).toBe(false);
  });

  it("grants tracker for active pro and business subscriptions", async () => {
    const derive = await loadWithBilling(true);
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    for (const tier of ["pro", "business"] as const) {
      const result = derive(
        makeUser({ tier, subscriptionStatus: "active", currentPeriodEnd: future }),
      );
      expect(result.features.tracker).toBe(true);
      expect(result.tier).toBe(tier);
    }
  });

  it("grants tracker for trialing and past_due statuses", async () => {
    const derive = await loadWithBilling(true);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const status of ["trialing", "past_due"]) {
      expect(
        derive(
          makeUser({ tier: "pro", subscriptionStatus: status, currentPeriodEnd: future }),
        ).features.tracker,
      ).toBe(true);
    }
  });

  it("denies tracker for a canceled subscription", async () => {
    const derive = await loadWithBilling(true);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      derive(
        makeUser({ tier: "pro", subscriptionStatus: "canceled", currentPeriodEnd: future }),
      ).features.tracker,
    ).toBe(false);
  });

  it("denies tracker when the paid period has expired", async () => {
    const derive = await loadWithBilling(true);
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      derive(
        makeUser({ tier: "pro", subscriptionStatus: "active", currentPeriodEnd: past }),
      ).features.tracker,
    ).toBe(false);
  });

  it("grants tracker for manually-granted paid accounts with no Stripe metadata", async () => {
    const derive = await loadWithBilling(true);
    expect(
      derive(
        makeUser({ tier: "business", subscriptionStatus: null, currentPeriodEnd: null }),
      ).features.tracker,
    ).toBe(true);
  });

  it("serializes currentPeriodEnd as an ISO string", async () => {
    const derive = await loadWithBilling(true);
    const end = new Date("2026-08-01T00:00:00.000Z");
    const result = derive(
      makeUser({ tier: "pro", subscriptionStatus: "active", currentPeriodEnd: end }),
    );
    expect(result.currentPeriodEnd).toBe("2026-08-01T00:00:00.000Z");
  });
});
