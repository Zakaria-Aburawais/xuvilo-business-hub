import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

vi.mock("../lib/userStore", () => ({
  getUserByStripeCustomerId: vi.fn(),
  setPreferredLanguage: vi.fn(),
}));
vi.mock("../lib/subscriptionReceiptEmail", () => ({
  sendSubscriptionReceiptEmail: vi.fn(),
  sendSubscriptionCancellationEmail: vi.fn(),
}));
vi.mock("../lib/stripeClient", () => ({
  getStripeSync: vi.fn(),
  getUncachableStripeClient: vi.fn(),
  StripeNotConnectedError: class StripeNotConnectedError extends Error {},
}));
vi.mock("../lib/billing", () => ({
  applySubscriptionToUser: vi.fn(),
  clearSubscriptionForUser: vi.fn(),
  tierFromString: (v: unknown) => (v === "pro" || v === "business" ? v : "free"),
}));

import { getUserByStripeCustomerId } from "../lib/userStore";
import { sendSubscriptionCancellationEmail } from "../lib/subscriptionReceiptEmail";
import {
  isCancelScheduledTransition,
  sendCancellationForSubscription,
} from "./stripeWebhook";

function makeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    ended_at: null,
    metadata: {},
    items: {
      data: [
        {
          current_period_end: 1_790_000_000,
          price: { nickname: "Pro", recurring: { interval: "month" } },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

const baseUser = {
  id: "u1",
  email: "user@example.com",
  name: "Test User",
  tier: "pro",
  preferredLanguage: "ar",
};

describe("isCancelScheduledTransition", () => {
  it("returns true only when cancel_at_period_end flips to true", () => {
    const sub = makeSubscription({ cancel_at_period_end: true });
    expect(isCancelScheduledTransition(sub, { cancel_at_period_end: false })).toBe(true);
  });

  it("returns false when the flag did not change in this event", () => {
    const sub = makeSubscription({ cancel_at_period_end: true });
    expect(isCancelScheduledTransition(sub, { metadata: {} })).toBe(false);
    expect(isCancelScheduledTransition(sub, undefined)).toBe(false);
  });

  it("returns false when cancel_at_period_end is not true", () => {
    const sub = makeSubscription({ cancel_at_period_end: false });
    expect(isCancelScheduledTransition(sub, { cancel_at_period_end: true })).toBe(false);
  });
});

describe("sendCancellationForSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the stored preferredLanguage even when subscription metadata disagrees", async () => {
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue(baseUser as never);
    const sub = makeSubscription({
      cancel_at_period_end: true,
      metadata: { lang: "en" },
    });

    await sendCancellationForSubscription({ subscription: sub, kind: "cancel_scheduled" });

    expect(sendSubscriptionCancellationEmail).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(sendSubscriptionCancellationEmail).mock.calls[0]![0];
    expect(arg.lang).toBe("ar");
    expect(arg.to).toBe("user@example.com");
    expect(arg.kind).toBe("cancel_scheduled");
  });

  it("falls back to subscription metadata lang when no stored preference", async () => {
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
      ...baseUser,
      preferredLanguage: null,
    } as never);
    const sub = makeSubscription({ metadata: { lang: "ar" }, ended_at: 1_780_000_000 });

    await sendCancellationForSubscription({ subscription: sub, kind: "ended" });

    const arg = vi.mocked(sendSubscriptionCancellationEmail).mock.calls[0]![0];
    expect(arg.lang).toBe("ar");
    expect(arg.kind).toBe("ended");
    expect(arg.accessUntil).toEqual(new Date(1_780_000_000 * 1000));
  });

  it("skips sending when no app user matches the Stripe customer", async () => {
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null as never);

    await sendCancellationForSubscription({
      subscription: makeSubscription(),
      kind: "ended",
    });

    expect(sendSubscriptionCancellationEmail).not.toHaveBeenCalled();
  });

  it("uses cancel_at for the access-until date on scheduled cancellations", async () => {
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue(baseUser as never);
    const sub = makeSubscription({
      cancel_at_period_end: true,
      cancel_at: 1_795_000_000,
    });

    await sendCancellationForSubscription({ subscription: sub, kind: "cancel_scheduled" });

    const arg = vi.mocked(sendSubscriptionCancellationEmail).mock.calls[0]![0];
    expect(arg.accessUntil).toEqual(new Date(1_795_000_000 * 1000));
  });
});
