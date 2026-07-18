import type { AppUser } from "@workspace/db";
import type { Tier } from "./billing";

export type FeatureKey = "tracker";

export interface Entitlements {
  tier: Tier;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  features: Record<FeatureKey, boolean>;
}

const PAID_TIERS: ReadonlyArray<Tier> = ["pro", "business"];

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

// When BILLING_ENABLED is not "true", every authenticated user gets all
// features regardless of their stored tier. Keep this guard as a single
// authoritative switch — all quota and entitlement checks reference it.
const BILLING_ENABLED = process.env["BILLING_ENABLED"] === "true";

export function deriveEntitlements(user: AppUser | null): Entitlements {
  const tier = ((user?.tier as Tier) ?? "free") as Tier;
  const subscriptionStatus = user?.subscriptionStatus ?? null;
  const currentPeriodEnd = user?.currentPeriodEnd ?? null;
  const currentPeriodEndIso = currentPeriodEnd ? currentPeriodEnd.toISOString() : null;

  // Launch mode: billing not yet live — unlock everything for every user.
  if (!BILLING_ENABLED) {
    return {
      tier,
      subscriptionStatus,
      currentPeriodEnd: currentPeriodEndIso,
      features: { tracker: true },
    };
  }

  const isPaidTier = PAID_TIERS.includes(tier);
  // Missing subscriptionStatus / currentPeriodEnd is allowed: it represents a
  // manually-granted (admin upgrade, lifetime) account that has no Stripe
  // metadata. A Stripe-managed account always has at least these fields set,
  // and a `canceled` status would explicitly fail ACTIVE_STATUSES.has(...).
  const statusOk = !subscriptionStatus || ACTIVE_STATUSES.has(subscriptionStatus);
  const notExpired = !currentPeriodEnd || currentPeriodEnd.getTime() > Date.now();
  const trackerAllowed = isPaidTier && statusOk && notExpired;

  return {
    tier,
    subscriptionStatus,
    currentPeriodEnd: currentPeriodEndIso,
    features: {
      tracker: trackerAllowed,
    },
  };
}
