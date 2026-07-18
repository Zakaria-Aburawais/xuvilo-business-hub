import app from "./app";
import { logger } from "./lib/logger";
// STRIPE DISABLED — re-enable along with initStripe() below when payments are ready.
// import { getStripeSync, StripeNotConnectedError } from "./lib/stripeClient";
import { startSpamEventsPruner } from "./lib/spamEventsPrune";
import { startRateLimitBucketsPruner } from "./lib/rateLimitBucketsPrune";
import { startAlertDebouncePruner } from "./lib/alertDebouncePrune";
import { startPrunerAlertEventsPruner } from "./lib/prunerAlertEventsPrune";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// STRIPE DISABLED — payments coming soon. Restore this block to re-enable.
// async function initStripe(): Promise<void> {
//   const databaseUrl = process.env["DATABASE_URL"];
//   if (!databaseUrl) {
//     logger.warn("DATABASE_URL not set, skipping Stripe init");
//     return;
//   }
//   try {
//     const { runMigrations } = await import("stripe-replit-sync");
//     await runMigrations({ databaseUrl });
//     logger.info("Stripe schema ready");
//
//     const stripeSync = await getStripeSync();
//     const baseUrl = process.env["PUBLIC_APP_URL"]
//       ?? (process.env["REPLIT_DOMAINS"]
//         ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
//         : null);
//
//     if (baseUrl) {
//       try {
//         const webhook = await stripeSync.findOrCreateManagedWebhook(
//           `${baseUrl}/api/stripe/webhook`,
//         );
//         logger.info({ url: webhook?.url, id: webhook?.id }, "Stripe managed webhook configured");
//       } catch (err) {
//         logger.warn({ err }, "Could not configure managed webhook");
//       }
//     }
//
//     stripeSync
//       .syncBackfill()
//       .then(() => logger.info("Stripe data backfilled"))
//       .catch((err: unknown) => logger.warn({ err }, "Stripe backfill failed"));
//   } catch (err) {
//     if (err instanceof StripeNotConnectedError) {
//       logger.warn("Stripe integration not connected; billing endpoints will return 503");
//       return;
//     }
//     logger.error({ err }, "Failed to initialize Stripe");
//   }
// }
//
// void initStripe();
logger.info("Stripe integration disabled — billing endpoints return 503");

// Background pruner for the `spam_events` table. Honeypot drops and captcha
// rejections both write a row, so without active cleanup the table grows
// without bound. The admin dashboard widget only ever looks back 90 days at
// most, so anything older is dead weight. Defers the first run by a few
// seconds and then ticks daily; the timer is `unref`-ed so it never blocks
// shutdown.
startSpamEventsPruner();

// Background pruner for the `app_rate_limit_buckets` table. Every (limiter,
// key) tuple — e.g. one row per IP, one per (IP, email) for the contact form
// — leaves a row behind, and `rateLimit.ts` already does opportunistic
// in-process cleanup but only fires when a request comes in. Keys that hit
// once and never return (or rows left during long quiet periods) need this
// scheduled backstop to keep the table small. Same `unref`-ed timer pattern
// as the spam_events pruner.
startRateLimitBucketsPruner();

// Background pruner for the `alert_debounce` table. Today it holds one row
// per distinct alert key (a handful), but nothing stops future alerting
// code from introducing high-cardinality keys (per-user, per-IP). Deleting
// rows whose cool-down expired long ago (default 30 days) keeps the ledger
// bounded regardless. Same `unref`-ed timer pattern as the other pruners.
startAlertDebouncePruner();

// Background trim for the `pruner_alert_events` table. Every dispatched
// problem/recovery alert appends a row and the dashboard only ever shows
// the latest 5 per pruner, so rows older than the retention window
// (default 90 days, `PRUNER_ALERT_EVENTS_RETENTION_DAYS`) are dead weight.
// Same `unref`-ed timer pattern as the other pruners.
startPrunerAlertEventsPruner();

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "Received shutdown signal, closing server");
  let exited = false;
  const finalize = (code: number) => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error closing server");
      finalize(1);
      return;
    }
    logger.info("Server closed cleanly");
    finalize(0);
  });
  setTimeout(() => {
    logger.warn("Forcing exit after shutdown timeout");
    finalize(0);
  }, 4000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
