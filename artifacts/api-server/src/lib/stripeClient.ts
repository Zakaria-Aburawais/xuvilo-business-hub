// Stripe client.
// Credential resolution order:
//   1. Direct env vars: STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY  (works on any platform)
//   2. Replit Connectors API                                         (only available on Replit)
//
// NOTE: StripeSync (from stripe-replit-sync) is a Replit-specific helper that
// syncs Stripe subscription data into the app database. If you move off Replit,
// replace stripe-replit-sync with standard Stripe webhooks + your own sync logic.
// Stripe is currently DISABLED — see artifacts/api-server/src/index.ts for the
// full re-enable checklist.
import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
}

export class StripeNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeNotConnectedError";
  }
}

async function getStripeCredentials(): Promise<StripeCredentials> {
  // ── Path 1: direct env vars (standard, works on any host) ─────────────────
  const directSecret = process.env["STRIPE_SECRET_KEY"];
  const directPublishable = process.env["STRIPE_PUBLISHABLE_KEY"];
  if (directSecret && directPublishable) {
    return { secretKey: directSecret, publishableKey: directPublishable };
  }

  // ── Path 2: Replit Connectors (only available on Replit) ──────────────────
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (!hostname || !xReplitToken) {
    throw new StripeNotConnectedError(
      "Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY, or connect Stripe in the Replit Integrations tab.",
    );
  }

  const isProduction = process.env["REPLIT_DEPLOYMENT"] === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    throw new StripeNotConnectedError(
      `Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { secret?: string; publishable?: string } }>;
  };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret || !settings.publishable) {
    throw new StripeNotConnectedError(
      `Stripe ${targetEnvironment} connection not found. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY, or connect Stripe in the Replit Integrations tab.`,
    );
  }

  return { secretKey: settings.secret, publishableKey: settings.publishable };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  } as unknown as ConstructorParameters<typeof Stripe>[1]);
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeCredentials();
  return publishableKey;
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const { secretKey } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 2 },
    stripeSecretKey: secretKey,
  });
}
