import { Router, type IRouter } from "express";

// STRIPE DISABLED — payments coming soon.
// All real billing handlers below have been wrapped in a comment block so they
// can be restored quickly. While disabled, every billing endpoint returns:
//   503 { message: "Payment system coming soon" }
// To re-enable: delete this stub block and uncomment the original handlers
// at the bottom of this file.

const router: IRouter = Router();

const paymentsDisabled = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => unknown } }) =>
  res.status(503).json({ message: "Payment system coming soon" });

router.post("/billing/checkout", paymentsDisabled);
router.post("/billing/portal", paymentsDisabled);
router.get("/billing/me", paymentsDisabled);
router.post("/billing/sync", paymentsDisabled);

export default router;

/* ---------------------------------------------------------------------------
ORIGINAL STRIPE-BACKED HANDLERS — restore by removing this comment block and
the stub above.

import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { getUncachableStripeClient, StripeNotConnectedError } from "../lib/stripeClient";
import { findOrCreateUser, getUserByEmail, setStripeCustomerId, setPreferredLanguage } from "../lib/userStore";
import { normalizeLang } from "../lib/emailTemplate";
import {
  findConfiguredPriceId,
  intervalFromString,
  tierFromString,
  checkoutCurrencyFromString,
  type Tier,
  type Interval,
} from "../lib/billing";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function publicBaseUrl(req: Request): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) {
    const first = replitDomains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  const replitDev = process.env["REPLIT_DEV_DOMAIN"];
  if (replitDev) return `https://${replitDev}`;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "localhost";
  return `${proto}://${host}`;
}

function handleStripeError(res: Response, err: unknown) {
  if (err instanceof StripeNotConnectedError) {
    logger.warn({ err: err.message }, "Stripe not connected");
    return res.status(503).json({
      error: "billing_not_configured",
      message: "Billing is not configured yet. Please connect Stripe in the Integrations tab.",
    });
  }
  logger.error({ err }, "Stripe operation failed");
  return res.status(500).json({ error: "stripe_error", message: "Something went wrong with billing." });
}

router.post("/billing/checkout", requireAuth, async (req, res) => {
  try {
    const email = req.userEmail!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body["name"] === "string" ? body["name"].trim() : "";
    const tier = tierFromString(body["plan"]);
    const interval = intervalFromString(body["interval"]) ?? "month";
    // UI language, forwarded so the post-checkout receipt email matches it.
    const lang = normalizeLang(body["lang"]);
    // Visitor's chosen display currency; charge in it when our Prices
    // support it (via currency_options), otherwise fall back to USD.
    const currency = checkoutCurrencyFromString(body["currency"]);

    if (tier === "free") {
      return res.status(400).json({ error: "free_plan_not_purchasable" });
    }

    const priceId = findConfiguredPriceId(tier, interval);
    if (!priceId) {
      return res.status(503).json({
        error: "price_not_configured",
        message: `No Stripe price configured for ${tier} ${interval}. Run the seed script and set the env vars.`,
      });
    }

    const stripe = await getUncachableStripeClient();
    const user = await findOrCreateUser(email, name);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { app_user_id: user.id },
      });
      customerId = customer.id;
      await setStripeCustomerId(user.id, customerId);
    }

    // Remember the user's UI language for transactional emails.
    try {
      await setPreferredLanguage(user.id, lang);
    } catch {
      // non-fatal
    }

    const baseUrl = publicBaseUrl(req);
    const sessionParams = (checkoutCurrency: string) => ({
      customer: customerId,
      mode: "subscription" as const,
      // Charge in the visitor's chosen currency. The seeded Prices carry
      // currency_options for every supported currency; USD (the Price's
      // base currency) needs no override.
      ...(checkoutCurrency !== "usd" ? { currency: checkoutCurrency } : {}),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?upgrade=success&plan=${tier}&interval=${interval}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?upgrade=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { app_user_id: user.id, plan: tier, interval, lang, currency: checkoutCurrency },
      subscription_data: { metadata: { app_user_id: user.id, plan: tier, interval, lang } },
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams(currency));
    } catch (err) {
      // If the Price doesn't carry a currency_option for the requested
      // currency (e.g. seed script not re-run yet), Stripe rejects the
      // session with an invalid_request_error. Fall back to USD for that
      // case only, instead of failing checkout outright.
      const isInvalidRequest =
        typeof err === "object" && err !== null &&
        (err as { type?: string }).type === "StripeInvalidRequestError";
      if (currency !== "usd" && isInvalidRequest) {
        logger.warn(
          { err, currency, priceId },
          "Checkout in requested currency failed; retrying in USD",
        );
        session = await stripe.checkout.sessions.create(sessionParams("usd"));
      } else {
        throw err;
      }
    }

    return res.json({ url: session.url });
  } catch (err) {
    return handleStripeError(res, err);
  }
});

router.post("/billing/portal", requireAuth, async (req, res) => {
  try {
    const email = req.userEmail!;
    const user = await getUserByEmail(email);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: "no_customer", message: "No billing account found." });
    }
    const stripe = await getUncachableStripeClient();
    const baseUrl = publicBaseUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    return handleStripeError(res, err);
  }
});

router.get("/billing/me", requireAuth, async (req, res) => {
  try {
    const email = req.userEmail!;
    const user = await getUserByEmail(email);
    if (!user) {
      return res.json({
        tier: "free" as Tier,
        billingInterval: null as Interval | null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasCustomer: false,
      });
    }
    return res.json({
      tier: user.tier as Tier,
      billingInterval: (user.billingInterval ?? null) as Interval | null,
      subscriptionStatus: user.subscriptionStatus ?? null,
      currentPeriodEnd: user.currentPeriodEnd ? user.currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd === "true",
      hasCustomer: Boolean(user.stripeCustomerId),
    });
  } catch (err) {
    logger.error({ err }, "billing/me failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/billing/sync", requireAuth, async (req, res) => {
  try {
    const email = req.userEmail!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = typeof body["sessionId"] === "string" ? body["sessionId"].trim() : "";

    if (sessionId) {
      try {
        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });
        // Verify the session actually belongs to the authenticated user before applying.
        const user = await getUserByEmail(email);
        const sessionCustomer = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
        if (
          user &&
          user.stripeCustomerId &&
          sessionCustomer &&
          sessionCustomer === user.stripeCustomerId &&
          session.subscription &&
          typeof session.subscription !== "string"
        ) {
          const { applySubscriptionToUser } = await import("../lib/billing");
          await applySubscriptionToUser(session.subscription);
        }
      } catch (e) {
        logger.warn({ err: e }, "Could not sync session immediately; webhook will catch up");
      }
    }

    const user = await getUserByEmail(email);
    if (!user) return res.json({ tier: "free" });
    return res.json({
      tier: user.tier,
      billingInterval: user.billingInterval,
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (err) {
    return handleStripeError(res, err);
  }
});

export default router;
--------------------------------------------------------------------------- */
