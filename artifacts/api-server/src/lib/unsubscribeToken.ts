import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PURPOSE = "newsletter-unsub";

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

// Mirrors the secret-derivation strategy in `auth.ts` so unsubscribe tokens
// stay valid across restarts and don't require a separate env var to be
// provisioned. Falling back to DATABASE_URL keeps local/dev usable while
// production should set AUTH_SIGNING_SECRET explicitly.
function getSecret(): string {
  const fromEnv = process.env["AUTH_SIGNING_SECRET"];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const fallback = process.env["DATABASE_URL"];
  if (!fallback) {
    throw new Error(
      "AUTH_SIGNING_SECRET (or DATABASE_URL fallback) is required to sign unsubscribe links",
    );
  }
  return `derived::${fallback}`;
}

interface UnsubPayload {
  e: string;
  p: typeof TOKEN_PURPOSE;
}

/**
 * Sign a long-lived unsubscribe token for the given email. Tokens are
 * intentionally not time-bound: a subscriber clicking an unsubscribe link
 * from any historical email must always work. The token's `p` ("purpose")
 * field guards against accidentally accepting an unrelated token shape.
 */
export function signUnsubscribeToken(email: string): string {
  const payload: UnsubPayload = {
    e: email.toLowerCase().trim(),
    p: TOKEN_PURPOSE,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verify an unsubscribe token. Returns the lowercased email on success or
 * null on any failure (bad shape, bad signature, wrong purpose).
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expectedSig = b64url(
    createHmac("sha256", getSecret()).update(body).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as
      | UnsubPayload
      | Record<string, unknown>;
    if (
      typeof (payload as UnsubPayload).e !== "string" ||
      (payload as UnsubPayload).p !== TOKEN_PURPOSE
    ) {
      return null;
    }
    return (payload as UnsubPayload).e;
  } catch {
    return null;
  }
}

/**
 * Build a fully-qualified URL the email recipient can click to confirm an
 * unsubscribe. The frontend page at `/unsubscribe` reads the token from the
 * query string and posts it back to the API.
 */
export function buildUnsubscribeUrl(
  origin: string,
  email: string,
  lang: "en" | "ar" = "en",
): string {
  const base = origin.replace(/\/$/, "");
  const token = signUnsubscribeToken(email);
  const params = new URLSearchParams({ token, lang });
  return `${base}/unsubscribe?${params.toString()}`;
}
