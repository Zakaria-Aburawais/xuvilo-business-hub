import { createSign } from "node:crypto";
import { logger } from "./logger";

/**
 * Server-side GA4 Data API client.
 *
 * Uses a Google service-account key (JSON) to mint an OAuth2 access token
 * via a signed JWT, then calls the GA4 Data API `runReport` endpoint.
 * No SDK dependency — the JWT is signed with node:crypto and the two REST
 * calls are plain fetch.
 *
 * Configuration (both required for the dashboard to be "configured"):
 *   GA4_PROPERTY_ID           — numeric GA4 property id (e.g. "123456789")
 *   GA4_SERVICE_ACCOUNT_JSON  — full JSON key of a service account that has
 *                               at least "Viewer" access on the GA4 property
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export function getGa4Config(): {
  propertyId: string;
  key: ServiceAccountKey;
} | null {
  const propertyId = (process.env.GA4_PROPERTY_ID ?? "").trim();
  const rawKey = (process.env.GA4_SERVICE_ACCOUNT_JSON ?? "").trim();
  if (!propertyId || !rawKey) return null;
  try {
    const parsed = JSON.parse(rawKey) as Partial<ServiceAccountKey>;
    if (
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return null;
    }
    return {
      propertyId,
      key: { client_email: parsed.client_email, private_key: parsed.private_key },
    };
  } catch {
    logger.warn("GA4_SERVICE_ACCOUNT_JSON is set but is not valid JSON");
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Cache the access token until shortly before expiry so a dashboard refresh
// doesn't mint a new token on every click.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.token;
  }

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = base64url(signer.sign(key.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GA4 token exchange failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

export interface Ga4ReportRow {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

interface RunReportBody {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: unknown;
  limit?: string;
}

export async function runGa4Report(
  config: { propertyId: string; key: ServiceAccountKey },
  body: RunReportBody,
): Promise<Ga4ReportRow[]> {
  const token = await getAccessToken(config.key);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(config.propertyId)}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GA4 runReport failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { rows?: Ga4ReportRow[] };
  return data.rows ?? [];
}
