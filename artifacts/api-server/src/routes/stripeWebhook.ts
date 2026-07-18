import { Router, type IRouter, type Request, type Response, raw } from "express";
import type Stripe from "stripe";
import { logger } from "../lib/logger";
import { getStripeSync, getUncachableStripeClient, StripeNotConnectedError } from "../lib/stripeClient";
import { applySubscriptionToUser, clearSubscriptionForUser, tierFromString, type Tier } from "../lib/billing";
import { getUserByStripeCustomerId, setPreferredLanguage } from "../lib/userStore";
import {
  sendSubscriptionReceiptEmail,
  sendSubscriptionCancellationEmail,
  sendSubscriptionPaymentFailedEmail,
  type ReceiptKind,
  type CancellationKind,
} from "../lib/subscriptionReceiptEmail";
import { claimAlertSlot, releaseAlertSlot } from "../lib/alertDebounce";
import { normalizeLang } from "../lib/emailTemplate";

function publicBaseUrl(): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) {
    const first = replitDomains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  const replitDev = process.env["REPLIT_DEV_DOMAIN"];
  if (replitDev) return `https://${replitDev}`;
  return "https://xuvilo.com";
}

async function sendReceiptForSubscription(opts: {
  subscription: Stripe.Subscription;
  kind: ReceiptKind;
  metadataLang?: unknown;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<void> {
  const { subscription, kind } = opts;
  const status = subscription.status;
  if (status !== "active" && status !== "trialing") return;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    logger.warn({ customerId }, "Receipt email skipped: no app user for Stripe customer");
    return;
  }

  // Language: checkout/subscription metadata wins, then the stored preference.
  const metaLangRaw = opts.metadataLang ?? subscription.metadata?.["lang"];
  const lang = normalizeLang(metaLangRaw ?? user.preferredLanguage);
  if (typeof metaLangRaw === "string" && normalizeLang(metaLangRaw) !== normalizeLang(user.preferredLanguage)) {
    try {
      await setPreferredLanguage(user.id, normalizeLang(metaLangRaw));
    } catch (e) {
      logger.warn({ err: e }, "Could not persist preferred language");
    }
  }

  const item = subscription.items.data[0];
  const metaTier: Tier = tierFromString(subscription.metadata?.["plan"]);
  const planTier =
    metaTier !== "free"
      ? metaTier
      : (user.tier !== "free" ? user.tier : (item?.price?.nickname ?? "Pro"));
  const interval = item?.price?.recurring?.interval ?? null;
  const amountCents = opts.amountCents ?? item?.price?.unit_amount ?? null;
  const currency = opts.currency ?? item?.price?.currency ?? null;
  const periodEnd = item?.current_period_end ?? null;
  const nextBillingDate = periodEnd ? new Date(periodEnd * 1000) : null;

  await sendSubscriptionReceiptEmail({
    to: user.email,
    name: user.name,
    lang,
    kind,
    planTier,
    interval: interval === "month" || interval === "year" ? interval : null,
    amountCents,
    currency,
    nextBillingDate,
    baseUrl: publicBaseUrl(),
  });
}

// Dedup window for the "payment failed" email. Stripe retries a failing
// invoice several times over ~2-3 weeks, each retry firing another
// invoice.payment_failed event. We only ever want one email per invoice,
// so the debounce window is effectively "forever" for a given invoice's
// retry cycle — 30 days comfortably outlasts Stripe's smart-retry
// schedule, and matches the alert_debounce table's default retention so
// rows are pruned only after the window has long passed.
const PAYMENT_FAILED_EMAIL_DEDUP_MS = 30 * 24 * 60 * 60 * 1000;

// Send the branded "payment failed — update your card" email for a failed
// subscription renewal invoice. At most one email per invoice: an atomic
// claim on the alert_debounce table wins exactly once per invoice ID, so
// Stripe's automatic retries (which re-fire invoice.payment_failed) don't
// spam the customer. The claim fails closed on DB errors (no email) —
// suppressing one dunning email beats double-sending on a flaky DB.
export async function sendPaymentFailedForInvoice(invoice: Stripe.Invoice): Promise<void> {
  const subDetails = invoice.parent?.subscription_details;
  const subRef = subDetails?.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  // Only subscription invoices — one-off invoices are out of scope.
  if (!subId) return;

  const invoiceId = invoice.id;
  if (!invoiceId) return;

  const customerRef = invoice.customer;
  const customerId = typeof customerRef === "string" ? customerRef : customerRef?.id;
  if (!customerId) return;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    logger.warn({ customerId }, "Payment-failed email skipped: no app user for Stripe customer");
    return;
  }

  // Atomically claim the per-invoice slot first so two near-simultaneous
  // webhook deliveries can never double-send. If the send below fails, the
  // claim is released so Stripe's next retry event gets another chance.
  const dedupKey = `payment_failed_email:${invoiceId}`;
  const shouldSend = await claimAlertSlot(
    dedupKey,
    PAYMENT_FAILED_EMAIL_DEDUP_MS,
    Date.now(),
  );
  if (!shouldSend) {
    logger.info({ invoiceId, customerId }, "Payment-failed email already sent for this invoice; skipping");
    return;
  }

  const lang = normalizeLang(user.preferredLanguage);
  const metaTier: Tier = tierFromString(subDetails?.metadata?.["plan"]);
  const planTier = metaTier !== "free" ? metaTier : (user.tier !== "free" ? user.tier : "Pro");
  const nextRetry = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000)
    : null;
  const baseUrl = publicBaseUrl();

  const sent = await sendSubscriptionPaymentFailedEmail({
    to: user.email,
    name: user.name,
    lang,
    planTier,
    amountCents: invoice.amount_due ?? null,
    currency: invoice.currency ?? null,
    nextRetryDate: nextRetry,
    // Settings page hosts the "manage billing" entry point, which opens a
    // fresh Stripe billing-portal session (portal session URLs expire, so
    // we never embed one directly in an email).
    updatePaymentUrl: `${baseUrl}/settings`,
    baseUrl,
  });

  if (!sent) {
    // The send failed (e.g. transient SendGrid outage). Release the claim
    // so the next invoice.payment_failed retry event re-attempts the email
    // instead of the customer never being warned.
    await releaseAlertSlot(dedupKey);
  }
}

// True only when this update event represents cancel_at_period_end flipping
// to true. previous_attributes contains only changed fields, so this fires
// exactly once per cancellation, not on every subsequent update.
export function isCancelScheduledTransition(
  subscription: Stripe.Subscription,
  previousAttributes: unknown,
): boolean {
  if (subscription.cancel_at_period_end !== true) return false;
  const prev = previousAttributes as Partial<Stripe.Subscription> | undefined;
  return (
    prev !== undefined &&
    Object.prototype.hasOwnProperty.call(prev, "cancel_at_period_end") &&
    prev.cancel_at_period_end !== true
  );
}

export async function sendCancellationForSubscription(opts: {
  subscription: Stripe.Subscription;
  kind: CancellationKind;
}): Promise<void> {
  const { subscription, kind } = opts;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    logger.warn({ customerId }, "Cancellation email skipped: no app user for Stripe customer");
    return;
  }

  // Honor the user's stored language preference; subscription metadata may be
  // stale (set at checkout time) so it is only a fallback.
  const lang = normalizeLang(user.preferredLanguage ?? subscription.metadata?.["lang"]);

  const item = subscription.items.data[0];
  const metaTier: Tier = tierFromString(subscription.metadata?.["plan"]);
  const planTier =
    metaTier !== "free"
      ? metaTier
      : (user.tier !== "free" ? user.tier : (item?.price?.nickname ?? "Pro"));

  // Access-until date: for a scheduled cancellation, the end of the paid
  // period; for a finished subscription, when it actually ended.
  const periodEnd =
    kind === "cancel_scheduled"
      ? (subscription.cancel_at ?? item?.current_period_end ?? null)
      : (subscription.ended_at ?? subscription.canceled_at ?? item?.current_period_end ?? null);

  await sendSubscriptionCancellationEmail({
    to: user.email,
    name: user.name,
    lang,
    kind,
    planTier,
    accessUntil: periodEnd ? new Date(periodEnd * 1000) : null,
    baseUrl: publicBaseUrl(),
  });
}

const router: IRouter = Router();

async function handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["stripe-signature"];
    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!sig) {
      res.status(400).json({ error: "missing_signature" });
      return;
    }

    const payload = req.body as Buffer;
    if (!Buffer.isBuffer(payload)) {
      logger.error("Webhook body is not a Buffer; check route ordering vs express.json()");
      res.status(500).json({ error: "internal" });
      return;
    }

    let event: Stripe.Event;
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, sig);
      const stripe = await getUncachableStripeClient();
      const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } else {
        event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
      }
    } catch (err) {
      if (err instanceof StripeNotConnectedError) {
        logger.warn("Stripe webhook called before integration connected");
        res.status(503).json({ error: "billing_not_configured" });
        return;
      }
      logger.error({ err }, "processWebhook failed");
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.subscription) {
            const stripe = await getUncachableStripeClient();
            const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
            const subscription = await stripe.subscriptions.retrieve(subId);
            await applySubscriptionToUser(subscription);
            await sendReceiptForSubscription({
              subscription,
              kind: "started",
              metadataLang: session.metadata?.["lang"],
              amountCents: session.amount_total ?? null,
              currency: session.currency ?? null,
            });
          }
          break;
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          // Only renewals — the initial payment is covered by checkout.session.completed.
          if (invoice.billing_reason !== "subscription_cycle") break;
          const subDetails = invoice.parent?.subscription_details;
          const subRef = subDetails?.subscription;
          const subId = typeof subRef === "string" ? subRef : subRef?.id;
          if (!subId) break;
          const stripe = await getUncachableStripeClient();
          const subscription = await stripe.subscriptions.retrieve(subId);
          await applySubscriptionToUser(subscription);
          await sendReceiptForSubscription({
            subscription,
            kind: "renewed",
            amountCents: invoice.amount_paid ?? null,
            currency: invoice.currency ?? null,
          });
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await sendPaymentFailedForInvoice(invoice);
          break;
        }
        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          await applySubscriptionToUser(subscription);
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await applySubscriptionToUser(subscription);
          if (isCancelScheduledTransition(subscription, event.data.previous_attributes)) {
            await sendCancellationForSubscription({
              subscription,
              kind: "cancel_scheduled",
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await clearSubscriptionForUser(subscription);
          await sendCancellationForSubscription({ subscription, kind: "ended" });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      logger.error({ err, type: event.type }, "Failed to apply webhook event");
    }

    res.status(200).json({ received: true });
}

router.post("/stripe/webhook", raw({ type: "application/json" }), (req, res) => {
  void handleWebhook(req, res);
});

export default router;
