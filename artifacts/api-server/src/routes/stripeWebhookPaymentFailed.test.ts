import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

vi.mock("../lib/userStore", () => ({
  getUserByStripeCustomerId: vi.fn(),
  setPreferredLanguage: vi.fn(),
}));
vi.mock("../lib/subscriptionReceiptEmail", () => ({
  sendSubscriptionReceiptEmail: vi.fn(),
  sendSubscriptionCancellationEmail: vi.fn(),
  sendSubscriptionPaymentFailedEmail: vi.fn().mockResolvedValue(true),
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
vi.mock("../lib/alertDebounce", () => ({
  claimAlertSlot: vi.fn(),
  releaseAlertSlot: vi.fn(),
}));

import { getUserByStripeCustomerId } from "../lib/userStore";
import { sendSubscriptionPaymentFailedEmail } from "../lib/subscriptionReceiptEmail";
import { claimAlertSlot, releaseAlertSlot } from "../lib/alertDebounce";
import { sendPaymentFailedForInvoice } from "./stripeWebhook";

function makeInvoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
  return {
    id: "in_123",
    customer: "cus_123",
    amount_due: 1900,
    currency: "usd",
    next_payment_attempt: 1_790_500_000,
    parent: {
      subscription_details: {
        subscription: "sub_123",
        metadata: { plan: "pro" },
      },
    },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

const baseUser = {
  id: "u1",
  email: "user@example.com",
  name: "Test User",
  tier: "pro",
  preferredLanguage: "ar",
};

describe("sendPaymentFailedForInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue(baseUser as never);
    vi.mocked(claimAlertSlot).mockResolvedValue(true);
    vi.mocked(sendSubscriptionPaymentFailedEmail).mockResolvedValue(true);
  });

  it("sends the branded payment-failed email for a subscription invoice", async () => {
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(sendSubscriptionPaymentFailedEmail).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(sendSubscriptionPaymentFailedEmail).mock.calls[0]![0];
    expect(arg.to).toBe("user@example.com");
    expect(arg.lang).toBe("ar");
    expect(arg.planTier).toBe("pro");
    expect(arg.amountCents).toBe(1900);
    expect(arg.currency).toBe("usd");
    expect(arg.nextRetryDate).toEqual(new Date(1_790_500_000 * 1000));
    expect(arg.updatePaymentUrl).toMatch(/\/settings$/);
  });

  it("dedups per invoice via the alert-debounce claim key", async () => {
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(claimAlertSlot).toHaveBeenCalledWith(
      "payment_failed_email:in_123",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("skips the email when the invoice already claimed the slot (retry event)", async () => {
    vi.mocked(claimAlertSlot).mockResolvedValue(false);
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(sendSubscriptionPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("ignores non-subscription invoices", async () => {
    await sendPaymentFailedForInvoice(makeInvoice({ parent: null }));
    expect(claimAlertSlot).not.toHaveBeenCalled();
    expect(sendSubscriptionPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("keeps the claim when the email sends successfully", async () => {
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(sendSubscriptionPaymentFailedEmail).toHaveBeenCalledTimes(1);
    expect(releaseAlertSlot).not.toHaveBeenCalled();
  });

  it("releases the claim when the send fails, so a later retry event re-sends", async () => {
    vi.mocked(sendSubscriptionPaymentFailedEmail).mockResolvedValueOnce(false);
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(releaseAlertSlot).toHaveBeenCalledWith("payment_failed_email:in_123");

    // Simulate Stripe's next retry event: the slot is free again, so the
    // email is attempted (and this time succeeds).
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(sendSubscriptionPaymentFailedEmail).toHaveBeenCalledTimes(2);
    expect(releaseAlertSlot).toHaveBeenCalledTimes(1);
  });

  it("skips when no app user matches the Stripe customer", async () => {
    vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null as never);
    await sendPaymentFailedForInvoice(makeInvoice());
    expect(claimAlertSlot).not.toHaveBeenCalled();
    expect(sendSubscriptionPaymentFailedEmail).not.toHaveBeenCalled();
  });
});
