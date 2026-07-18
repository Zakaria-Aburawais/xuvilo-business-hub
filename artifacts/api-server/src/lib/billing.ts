import type Stripe from "stripe";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { getUncachableStripeClient } from "./stripeClient";

export type Tier = "free" | "pro" | "business";
export type Interval = "month" | "year";

export interface PlanPrice {
  tier: Tier;
  interval: Interval;
  priceId: string;
}

const tierFromString = (raw: unknown): Tier => {
  if (raw === "pro" || raw === "business") return raw;
  return "free";
};

const intervalFromString = (raw: unknown): Interval | null => {
  if (raw === "month" || raw === "year") return raw;
  return null;
};

/**
 * Currencies our Stripe Prices carry currency_options for (seeded by
 * scripts/src/seed-stripe-products.ts). Must match the Pricing page's
 * PRICING_FX_RATES list (artifacts/businesses-hub/src/lib/pricing-fx.ts).
 * USD is the base currency of every Price, so it is always supported.
 */
export const SUPPORTED_CHECKOUT_CURRENCIES = new Set([
  "usd", "eur", "gbp", "sar", "aed", "qar", "bhd", "omr", "kwd", "jod", "egp",
]);

/**
 * Normalize a client-supplied currency code for Checkout.
 * Returns a lowercase supported code, or "usd" for anything unknown.
 */
export const checkoutCurrencyFromString = (raw: unknown): string => {
  if (typeof raw !== "string") return "usd";
  const code = raw.trim().toLowerCase();
  return SUPPORTED_CHECKOUT_CURRENCIES.has(code) ? code : "usd";
};

export function getConfiguredPriceMap(): Record<string, { tier: Tier; interval: Interval }> {
  const map: Record<string, { tier: Tier; interval: Interval }> = {};
  const entries: Array<[Tier, Interval, string | undefined]> = [
    ["pro", "month", process.env["STRIPE_PRICE_PRO_MONTHLY"]],
    ["pro", "year", process.env["STRIPE_PRICE_PRO_YEARLY"]],
    ["business", "month", process.env["STRIPE_PRICE_BUSINESS_MONTHLY"]],
    ["business", "year", process.env["STRIPE_PRICE_BUSINESS_YEARLY"]],
  ];
  for (const [tier, interval, priceId] of entries) {
    if (priceId) map[priceId] = { tier, interval };
  }
  return map;
}

export function findConfiguredPriceId(tier: Tier, interval: Interval): string | null {
  if (tier === "free") return null;
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"}`;
  return process.env[key] ?? null;
}

async function classifyByPrice(price: Stripe.Price | string | null): Promise<{ tier: Tier; interval: Interval | null }> {
  if (!price) return { tier: "free", interval: null };
  const priceObj: Stripe.Price | null = typeof price === "string"
    ? await (async () => {
        try {
          const stripe = await getUncachableStripeClient();
          return await stripe.prices.retrieve(price, { expand: ["product"] });
        } catch {
          return null;
        }
      })()
    : price;

  if (!priceObj) return { tier: "free", interval: null };

  const configMap = getConfiguredPriceMap();
  const fromConfig = configMap[priceObj.id];
  if (fromConfig) return { tier: fromConfig.tier, interval: fromConfig.interval };

  const metaTier = tierFromString((priceObj.metadata as Record<string, string> | null)?.["tier"]);
  let interval: Interval | null = null;
  if (priceObj.recurring?.interval === "year") interval = "year";
  else if (priceObj.recurring?.interval === "month") interval = "month";

  if (metaTier !== "free") return { tier: metaTier, interval };

  const product = priceObj.product;
  if (product && typeof product !== "string" && !("deleted" in product)) {
    const productMetaTier = tierFromString((product.metadata as Record<string, string> | null)?.["tier"]);
    if (productMetaTier !== "free") return { tier: productMetaTier, interval };
  }
  return { tier: "free", interval };
}

export async function applySubscriptionToUser(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const price = item?.price ?? null;
  const { tier, interval } = await classifyByPrice(price);

  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";
  const finalTier: Tier = isActive ? tier : "free";

  const periodEnd = item?.current_period_end ?? null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .limit(1);

  if (existing.length === 0) {
    logger.warn({ customerId, subscriptionId: subscription.id }, "No app user found for Stripe customer");
    return;
  }

  const user = existing[0];
  if (!user) return;

  await db
    .update(usersTable)
    .set({
      tier: finalTier,
      billingInterval: interval ?? null,
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? "true" : "false",
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id));

  logger.info(
    { userId: user.id, tier: finalTier, interval, status },
    "Updated user subscription state",
  );
}

export async function clearSubscriptionForUser(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .limit(1);
  const user = existing[0];
  if (!user) return;
  await db
    .update(usersTable)
    .set({
      tier: "free",
      billingInterval: null,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: "false",
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id));
  logger.info({ userId: user.id }, "Cleared user subscription");
}

export { tierFromString, intervalFromString };
