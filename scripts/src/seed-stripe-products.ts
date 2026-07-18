/**
 * Seed Stripe products & prices for the Xuvilo Business Hub.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed-stripe
 *
 * After running, copy the printed env vars into your Replit secrets:
 *   STRIPE_PRICE_PRO_MONTHLY=price_...
 *   STRIPE_PRICE_PRO_YEARLY=price_...
 *   STRIPE_PRICE_BUSINESS_MONTHLY=price_...
 *   STRIPE_PRICE_BUSINESS_YEARLY=price_...
 *
 * Requires the Stripe Replit integration to be connected.
 */

import Stripe from "stripe";

async function getStripeSecret(): Promise<string> {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const token = process.env["REPL_IDENTITY"]
    ? `repl ${process.env["REPL_IDENTITY"]}`
    : process.env["WEB_REPL_RENEWAL"]
      ? `depl ${process.env["WEB_REPL_RENEWAL"]}`
      : null;
  if (!hostname || !token) {
    throw new Error("Replit Connectors environment vars missing — run inside Replit.");
  }
  const isProduction = process.env["REPLIT_DEPLOYMENT"] === "1";
  const targetEnvironment = isProduction ? "production" : "development";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);
  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", X_REPLIT_TOKEN: token },
  });
  if (!resp.ok) throw new Error(`Connectors API: ${resp.status} ${resp.statusText}`);
  const data = (await resp.json()) as { items?: Array<{ settings?: { secret?: string } }> };
  const key = data.items?.[0]?.settings?.secret;
  if (!key) throw new Error("Stripe integration is not connected. Connect it in the Integrations tab.");
  return key;
}

/**
 * USD exchange rates for localized checkout pricing.
 * KEEP IN SYNC with artifacts/businesses-hub/src/lib/pricing-fx.ts
 * (PRICING_FX_RATES) so the price shown on the Pricing page matches
 * the amount Stripe actually charges.
 *
 * Gulf currencies are pegged to the USD, so those rates are exact.
 */
const CURRENCY_RATES: Record<string, number> = {
  EUR: 0.92,
  GBP: 0.78,
  SAR: 3.75, // pegged
  AED: 3.6725, // pegged
  QAR: 3.64, // pegged
  BHD: 0.376, // pegged
  OMR: 0.3845, // pegged
  KWD: 0.31,
  JOD: 0.709, // pegged
  EGP: 48.5,
};

/** ISO currencies Stripe treats as three-decimal (minor unit = 1/1000). */
const THREE_DECIMAL = new Set(["BHD", "KWD", "OMR", "JOD"]);

/**
 * Convert a USD amount (in cents) into a Stripe unit_amount for the target
 * currency, using the same rounding as the Pricing page display:
 * - 2-decimal currencies round to whole units (e.g. SAR 34, not 33.75)
 * - 3-decimal currencies round to 2 decimals; Stripe requires the last
 *   digit of a 3-decimal unit_amount to be 0, which this guarantees.
 */
function localUnitAmount(usdCents: number, code: string): number {
  const rate = CURRENCY_RATES[code];
  if (!rate) throw new Error(`No FX rate for ${code}`);
  const converted = (usdCents / 100) * rate;
  if (THREE_DECIMAL.has(code)) {
    return Math.round(converted * 100) * 10;
  }
  return Math.round(converted) * 100;
}

function buildCurrencyOptions(usdCents: number): Record<string, { unit_amount: number }> {
  const opts: Record<string, { unit_amount: number }> = {};
  for (const code of Object.keys(CURRENCY_RATES)) {
    opts[code.toLowerCase()] = { unit_amount: localUnitAmount(usdCents, code) };
  }
  return opts;
}

interface PlanDef {
  tierKey: "pro" | "business";
  productName: string;
  description: string;
  monthlyAmountCents: number;
  yearlyAmountCents: number;
}

const PLANS: PlanDef[] = [
  {
    tierKey: "pro",
    productName: "Xuvilo Business Hub — Pro",
    description: "Save documents, dashboard, saved clients, premium templates, priority support.",
    monthlyAmountCents: 900,
    yearlyAmountCents: 9000,
  },
  {
    tierKey: "business",
    productName: "Xuvilo Business Hub — Business",
    description: "Everything in Pro + multiple workspaces, team members, analytics, API access.",
    monthlyAmountCents: 2900,
    yearlyAmountCents: 29000,
  },
];

async function findOrCreateProduct(stripe: Stripe, plan: PlanDef): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['xuvilo_tier']:'${plan.tierKey}' AND active:'true'`,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({
    name: plan.productName,
    description: plan.description,
    metadata: { xuvilo_tier: plan.tierKey, tier: plan.tierKey },
  });
}

async function findOrCreatePrice(
  stripe: Stripe,
  product: Stripe.Product,
  plan: PlanDef,
  interval: "month" | "year",
): Promise<Stripe.Price> {
  const amount = interval === "month" ? plan.monthlyAmountCents : plan.yearlyAmountCents;
  const currencyOptions = buildCurrencyOptions(amount);
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.recurring?.interval === interval && p.unit_amount === amount && p.currency === "usd",
  );
  if (match) {
    // Ensure existing prices carry the multi-currency options too (idempotent).
    // Note: list() does not expand currency_options, so re-apply unconditionally.
    return stripe.prices.update(match.id, { currency_options: currencyOptions });
  }
  return stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amount,
    currency_options: currencyOptions,
    recurring: { interval },
    metadata: { tier: plan.tierKey, interval },
  });
}

async function main(): Promise<void> {
  const secretKey = await getStripeSecret();
  const stripe = new Stripe(secretKey);

  const envOut: string[] = [];
  for (const plan of PLANS) {
    const product = await findOrCreateProduct(stripe, plan);
    console.log(`✓ Product: ${product.name} (${product.id})`);
    for (const interval of ["month", "year"] as const) {
      const price = await findOrCreatePrice(stripe, product, plan, interval);
      console.log(`  └─ ${interval.padEnd(5)} price: ${price.id} = $${(price.unit_amount! / 100).toFixed(2)}`);
      const envKey = `STRIPE_PRICE_${plan.tierKey.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"}`;
      envOut.push(`${envKey}=${price.id}`);
    }
  }

  console.log("\n--- Add these to your Replit Secrets ---");
  for (const line of envOut) console.log(line);
  console.log("----------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
