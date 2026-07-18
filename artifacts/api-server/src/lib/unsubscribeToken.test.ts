import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
} from "./unsubscribeToken";

beforeAll(() => {
  // Stable secret so token output is deterministic for this test file. The
  // production app reads AUTH_SIGNING_SECRET from env.
  process.env["AUTH_SIGNING_SECRET"] =
    "test-secret-do-not-use-in-prod-1234567890";
});

describe("unsubscribeToken", () => {
  it("round-trips a token back to its email", () => {
    const token = signUnsubscribeToken("alice@example.com");
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifyUnsubscribeToken(token)).toBe("alice@example.com");
  });

  it("normalizes the email to lowercase before signing", () => {
    const token = signUnsubscribeToken("  Bob@Example.COM  ");
    expect(verifyUnsubscribeToken(token)).toBe("bob@example.com");
  });

  it("rejects an empty or malformed token", () => {
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("not-a-token")).toBeNull();
    expect(verifyUnsubscribeToken("only.one.dot.too.many")).toBeNull();
  });

  it("rejects a token whose body has been tampered with", () => {
    const token = signUnsubscribeToken("victim@example.com");
    const [body, sig] = token.split(".");
    // Swap in a different payload while keeping the original signature.
    const fakeBody = Buffer.from(
      JSON.stringify({ e: "attacker@example.com", p: "newsletter-unsub" }),
      "utf8",
    )
      .toString("base64")
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(verifyUnsubscribeToken(`${fakeBody}.${sig}`)).toBeNull();
    // Sanity: the original still verifies.
    expect(verifyUnsubscribeToken(`${body}.${sig}`)).toBe(
      "victim@example.com",
    );
  });

  it("rejects a token whose signature has been mangled", () => {
    const token = signUnsubscribeToken("carol@example.com");
    const [body] = token.split(".");
    expect(verifyUnsubscribeToken(`${body}.AAAA`)).toBeNull();
  });

  it("rejects tokens minted under a different secret", () => {
    const token = signUnsubscribeToken("dan@example.com");
    process.env["AUTH_SIGNING_SECRET"] =
      "different-secret-also-long-enough-9999";
    try {
      expect(verifyUnsubscribeToken(token)).toBeNull();
    } finally {
      process.env["AUTH_SIGNING_SECRET"] =
        "test-secret-do-not-use-in-prod-1234567890";
    }
  });

  it("rejects a token whose payload has the wrong purpose", () => {
    // Forge a payload with the right shape but the wrong `p` field, then
    // sign it with the same secret. The verifier must still reject it so a
    // session token (or other purpose) can never be replayed as an
    // unsubscribe.
    const wrongPurpose = Buffer.from(
      JSON.stringify({ e: "eve@example.com", p: "auth" }),
      "utf8",
    )
      .toString("base64")
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const sig = createHmac("sha256", process.env["AUTH_SIGNING_SECRET"]!)
      .update(wrongPurpose)
      .digest("base64")
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(verifyUnsubscribeToken(`${wrongPurpose}.${sig}`)).toBeNull();
  });

  it("builds an unsubscribe URL with the token and lang in the query", () => {
    const url = buildUnsubscribeUrl(
      "https://example.com/",
      "user@example.com",
      "ar",
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://example.com");
    expect(parsed.pathname).toBe("/unsubscribe");
    expect(parsed.searchParams.get("lang")).toBe("ar");
    const token = parsed.searchParams.get("token");
    expect(token).toBeTruthy();
    expect(verifyUnsubscribeToken(token!)).toBe("user@example.com");
  });
});
