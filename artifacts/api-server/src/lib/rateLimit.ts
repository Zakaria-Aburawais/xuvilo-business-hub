import type { Request, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, rateLimitBucketsTable } from "@workspace/db";
import { logger } from "./logger";
import { recordRateLimitStorageFailure } from "./rateLimitFailureNotifier";

interface BucketRow {
  count: number;
  resetAt: Date;
}

let lastCleanupAt = 0;

/**
 * Best-effort opportunistic cleanup of expired buckets. Throttled to once per
 * minute and run as a side effect — the request path never blocks on it and
 * never fails when it errors out.
 */
function maybePurgeExpired(now: number): void {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  void db
    .execute(
      sql`delete from ${rateLimitBucketsTable} where ${rateLimitBucketsTable.resetAt} <= ${new Date(now)}`,
    )
    .catch((err: unknown) => {
      logger.warn({ err }, "rateLimit: purge of expired buckets failed");
    });
}

function getClientIp(req: Request): string {
  // Threat model: in real deployment, the API has exactly one ingress —
  // the Replit edge proxy — and that proxy rewrites X-Forwarded-For with
  // the actual client IP (it does NOT pass through arbitrary client-supplied
  // XFF chains). With `app.set("trust proxy", 1)` (see app.ts), Express's
  // `req.ip` therefore reflects the real client IP, and the per-IP rate
  // limit correctly buckets per real user.
  //
  // We additionally include `req.socket.remoteAddress` in the key as
  // belt-and-braces. This does NOT make spoofing impossible on a hypothetical
  // "skip the edge proxy and connect to the API server directly" path
  // (because the spoofed `req.ip` still varies and so does the combined
  // key) — it just adds an extra discriminator that costs us nothing.
  // Defending the bypass path would require dropping `req.ip` entirely and
  // using socket-only, which would lump all real production users into a
  // single bucket and break legitimate rate-limit semantics. The accepted
  // assumption is "edge-only ingress in production"; bypass attacks are
  // out of scope.
  const expressIp = (req as Request & { ip?: string }).ip ?? "";
  const socketIp = req.socket?.remoteAddress ?? "";
  const combined = `${socketIp}|${expressIp}`;
  return combined === "|" ? "unknown" : combined;
}

/**
 * Hash the composite (prefix, ip, extra) tuple to a fixed-size string. This
 * matters for security: `extra` is derived from request input (e.g. the
 * `email` body field) and is unbounded in length until the route's own
 * validation runs, which is AFTER this middleware. Without hashing, a caller
 * could submit a 100KB email and force a Postgres "value too long" error on
 * insert — and any error path that lets the request through (or even just
 * burning DB connections for failed inserts) would weaken the protection.
 *
 * SHA-256 hex (64 chars) fits comfortably in the table's varchar(64) primary
 * key column regardless of input length, and the cryptographic hash means
 * collisions across distinct logical buckets are not a practical concern.
 */
function deriveKey(prefix: string, ip: string, extra: string): string {
  return createHash("sha256")
    .update(`${prefix}|${ip}|${extra}`)
    .digest("hex");
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max attempts allowed per key per window. */
  max: number;
  /** Stable label so different limiters don't share buckets. */
  prefix: string;
  /**
   * Optional function that returns an extra discriminator for the bucket key
   * (e.g. the request body's `email`). The IP is always part of the key.
   * Returning an empty string means "use IP only".
   */
  keyer?: (req: Request) => string;
  /**
   * Optional override for the 429 response body. Lets a caller surface a
   * limiter-specific "please wait N seconds" message (e.g. for the admin
   * test-alert button) instead of the generic default. Receives the same
   * `Retry-After` value (in seconds) that's set on the response header so
   * the wording can be exact.
   */
  message?: (retryAfterSeconds: number) => string;
  /** Optional override for the `error` code in the 429 envelope. */
  errorCode?: string;
}

/**
 * Atomically apply a rate-limit window. Returns the post-update count and
 * reset_at for the bucket. The Postgres CASE expressions make the whole
 * "create OR reset OR increment" decision a single statement, so concurrent
 * requests from the same key cannot race to oversubscribe the limit.
 *
 * Notes on the semantics:
 *   - If no row exists, INSERT creates one with count=1, resetAt=newResetAt.
 *   - If a row exists but the existing window has expired (resetAt <= now),
 *     the row is reset to count=1 with the new window.
 *   - Otherwise, count is incremented and resetAt is preserved.
 *
 * The caller decides "allow" vs "deny" by comparing the returned count
 * against `max`: count <= max means this attempt is within the window.
 */
async function bumpBucket(
  key: string,
  now: Date,
  newResetAt: Date,
): Promise<BucketRow> {
  const rows = await db.execute<{ count: number; reset_at: Date }>(sql`
    insert into ${rateLimitBucketsTable} (key, count, reset_at)
    values (${key}, 1, ${newResetAt})
    on conflict (key) do update set
      count = case
        when ${rateLimitBucketsTable}.reset_at <= ${now} then 1
        else ${rateLimitBucketsTable}.count + 1
      end,
      reset_at = case
        when ${rateLimitBucketsTable}.reset_at <= ${now} then ${newResetAt}
        else ${rateLimitBucketsTable}.reset_at
      end
    returning count, reset_at
  `);
  const row = rows.rows[0];
  if (!row) {
    // Should be unreachable — INSERT ... ON CONFLICT ... RETURNING always
    // returns the row. Defensive default avoids an undefined access.
    return { count: 1, resetAt: newResetAt };
  }
  return { count: Number(row.count), resetAt: new Date(row.reset_at) };
}

/**
 * Hook for tests to inject a synthetic storage failure into the next bucket
 * write, so the failure-mode behaviour can be asserted without taking the
 * real database down. Production code never sets this.
 */
let _failNextBumpForTests: Error | null = null;

/**
 * Postgres-backed fixed-window rate limiter. State lives in
 * `app_rate_limit_buckets`, so counts and reset windows survive API server
 * restarts and are correct across multiple instances.
 *
 * Returns the same JSON shape as the global error middleware so the API
 * never returns HTML for 429s. Sets `Retry-After` (seconds) so clients can
 * back off cleanly.
 *
 * If the database is briefly unavailable we FAIL CLOSED with 503 rather
 * than letting the request through. The whole point of this middleware is
 * abuse protection on auth/contact/etc., and silently disabling it would
 * be worse than briefly serving 503s during a storage outage. The auth
 * and contact routes themselves also need the database to function, so a
 * 503 here is consistent with what the underlying handler would produce.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, prefix, keyer, message, errorCode } = options;

  return (req, res, next) => {
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const newResetAt = new Date(nowMs + windowMs);

    maybePurgeExpired(nowMs);

    const ip = getClientIp(req);
    const extra = keyer ? keyer(req).toLowerCase().trim() : "";
    const key = deriveKey(prefix, ip, extra);

    const work =
      _failNextBumpForTests !== null
        ? (() => {
            const err = _failNextBumpForTests;
            _failNextBumpForTests = null;
            return Promise.reject(err);
          })()
        : bumpBucket(key, now, newResetAt);

    work
      .then((bucket) => {
        if (bucket.count <= max) {
          return next();
        }
        const retryAfter = Math.max(
          1,
          Math.ceil((bucket.resetAt.getTime() - nowMs) / 1000),
        );
        res.setHeader("Retry-After", String(retryAfter));
        // Preserve the historical 429 envelope for callers that don't
        // customise the response (contact, auth, newsletter, …): those
        // existing consumers contract on `{success, error, message}` only.
        // When a caller opts into a limiter-specific message/errorCode
        // (e.g. the admin test-alert), include the structured
        // `retryAfterSeconds` field so the dashboard can render an exact
        // wait without parsing the message string.
        const isCustomised = Boolean(message || errorCode);
        const body: Record<string, unknown> = {
          success: false,
          error: errorCode ?? "Too many requests",
          message: message
            ? message(retryAfter)
            : "Too many attempts. Please try again later.",
        };
        if (isCustomised) {
          body["retryAfterSeconds"] = retryAfter;
        }
        res.status(429).json(body);
      })
      .catch((err: unknown) => {
        // Fail-CLOSED on storage failure. See the function-level comment.
        // We use 503 (Service Unavailable) rather than 429 because the
        // limiter never decided "you've hit the cap" — the underlying
        // store was unreachable. A short Retry-After lets clients back off
        // without hammering us, and well-behaved browsers will retry.
        logger.error(
          { err, prefix },
          "rateLimit: storage unavailable, denying request (fail-closed)",
        );
        // Fire-and-forget: tell admins when fail-closed denials pile up.
        // Must never affect the request path — the notifier swallows all
        // of its own errors, and the void guards against future changes.
        void recordRateLimitStorageFailure(prefix);
        if (!res.headersSent) {
          res.setHeader("Retry-After", "5");
          res.status(503).json({
            success: false,
            error: "Service temporarily unavailable",
            message: "We can't process this request right now. Please try again in a moment.",
          });
        }
      });
  };
}

/**
 * Test-only helper to clear all persisted rate-limit state. Truncates the
 * underlying table and resets the in-process cleanup throttle. Intended for
 * use from automated tests only.
 */
export async function _resetRateLimitForTests(): Promise<void> {
  lastCleanupAt = 0;
  _failNextBumpForTests = null;
  await db.execute(sql`delete from ${rateLimitBucketsTable}`);
}

/**
 * Test-only helper to simulate an API server restart without touching the
 * database. Resets only in-process state (the cleanup throttle) so tests can
 * verify that rate-limit counts persist across a "restart".
 */
export function _simulateRestartForTests(): void {
  lastCleanupAt = 0;
}

/**
 * Test-only helper to inject a synthetic storage failure for the next call
 * to the middleware, so tests can assert the fail-closed behaviour.
 */
export function _failNextStorageCallForTests(err: Error): void {
  _failNextBumpForTests = err;
}
