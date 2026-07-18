import { test, expect } from "vitest";
import {
  rateLimit,
  _resetRateLimitForTests,
  _simulateRestartForTests,
  _failNextStorageCallForTests,
} from "./rateLimit";

interface FakeRes {
  statusCode: number;
  jsonBody: unknown;
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => FakeRes;
  status: (code: number) => FakeRes;
  json: (body: unknown) => FakeRes;
}

interface CallResult {
  allowed: boolean;
  status: number;
  body: unknown;
  retryAfter: string | undefined;
}

function fakeReq(ip: string): unknown {
  return {
    ip,
    socket: { remoteAddress: ip },
    headers: {},
    body: {},
  };
}

function fakeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: 200,
    jsonBody: undefined,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
  return res;
}

/**
 * Invoke the middleware once and resolve with whether it passed (next called)
 * or denied (status/json called). The middleware does its DB work in a
 * promise chain, so we resolve when either path completes.
 */
async function invoke(
  middleware: ReturnType<typeof rateLimit>,
  ip: string,
): Promise<CallResult> {
  const req = fakeReq(ip);
  const res = fakeRes();
  return new Promise<CallResult>((resolve, reject) => {
    let settled = false;
    const settle = (v: CallResult) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const r = originalJson(body);
      settle({
        allowed: false,
        status: res.statusCode,
        body,
        retryAfter: res.headers["retry-after"],
      });
      return r;
    };
    try {
      middleware(req as never, res as never, (err?: unknown) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        settle({
          allowed: true,
          status: res.statusCode,
          body: undefined,
          retryAfter: undefined,
        });
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

test("rate limiter blocks the (max+1)th request and returns Retry-After", async () => {
  await _resetRateLimitForTests();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 3,
    prefix: "test:basic",
  });
  const ip = "10.0.0.1";

  for (let i = 0; i < 3; i++) {
    const r = await invoke(limiter, ip);
    expect(r.allowed, `attempt ${i + 1} should be allowed`).toBe(true);
  }

  const blocked = await invoke(limiter, ip);
  expect(blocked.allowed, "4th attempt should be blocked").toBe(false);
  expect(blocked.status).toBe(429);
  expect(
    blocked.retryAfter && Number(blocked.retryAfter) > 0,
    "Retry-After header should be a positive number of seconds",
  ).toBeTruthy();

  await _resetRateLimitForTests();
});

test("different IPs and prefixes get independent buckets", async () => {
  await _resetRateLimitForTests();

  const a = rateLimit({ windowMs: 60_000, max: 1, prefix: "test:isolation:a" });
  const b = rateLimit({ windowMs: 60_000, max: 1, prefix: "test:isolation:b" });

  expect((await invoke(a, "1.1.1.1")).allowed).toBe(true);
  expect((await invoke(a, "1.1.1.1")).allowed).toBe(false);
  expect((await invoke(a, "2.2.2.2")).allowed).toBe(true);

  // Same IP, different prefix => independent bucket.
  expect((await invoke(b, "1.1.1.1")).allowed).toBe(true);

  await _resetRateLimitForTests();
});

test("rate-limit counts persist across an API server restart", async () => {
  await _resetRateLimitForTests();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 2,
    prefix: "test:restart",
  });
  const ip = "10.99.99.1";

  // Use up the entire window pre-"restart".
  expect((await invoke(limiter, ip)).allowed).toBe(true);
  expect((await invoke(limiter, ip)).allowed).toBe(true);
  const blockedBefore = await invoke(limiter, ip);
  expect(blockedBefore.allowed, "should be blocked at cap").toBe(false);

  // Simulate the API server restarting. Wipes anything in-process, but the
  // persisted bucket survives — that's the whole point of the change. A
  // naive in-memory limiter would forget the count here.
  _simulateRestartForTests();

  const blockedAfter = await invoke(limiter, ip);
  expect(
    blockedAfter.allowed,
    "must still be blocked after restart — bucket should be persisted",
  ).toBe(false);
  expect(blockedAfter.status).toBe(429);

  // Different IP after the restart must still be allowed.
  expect(
    (await invoke(limiter, "10.99.99.2")).allowed,
    "fresh IP after restart should still be allowed",
  ).toBe(true);

  await _resetRateLimitForTests();
});

test("oversized keyer input cannot bypass the limit", async () => {
  await _resetRateLimitForTests();

  // Limiters key on body fields like `email` that are parsed BEFORE the
  // route's own validation. A malicious caller can submit huge input. The
  // limiter must still apply correctly — it must NOT fail the storage
  // write (which would push us into the storage-error path) just because
  // the input is huge.
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 2,
    prefix: "test:oversized",
    keyer: () => "x".repeat(100_000),
  });
  const ip = "10.0.0.42";

  expect(
    (await invoke(limiter, ip)).allowed,
    "1st oversized-key request should be allowed (within limit)",
  ).toBe(true);
  expect(
    (await invoke(limiter, ip)).allowed,
    "2nd oversized-key request should be allowed (within limit)",
  ).toBe(true);
  const blocked = await invoke(limiter, ip);
  expect(
    blocked.allowed,
    "3rd oversized-key request must be blocked — limit must still apply",
  ).toBe(false);
  expect(blocked.status).toBe(429);

  await _resetRateLimitForTests();
});

test("storage failure fails CLOSED with 503 (does not silently allow)", async () => {
  await _resetRateLimitForTests();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    prefix: "test:fail-closed",
  });
  const ip = "10.0.0.55";

  // Inject a synthetic store failure for the next call. The middleware MUST
  // refuse the request rather than silently letting it through — otherwise
  // an attacker who can briefly disrupt the store could disable abuse
  // protection on auth/contact for the duration.
  _failNextStorageCallForTests(new Error("synthetic: store unavailable"));
  const denied = await invoke(limiter, ip);
  expect(
    denied.allowed,
    "request must be denied when the rate-limit store is unavailable",
  ).toBe(false);
  expect(denied.status, "should be 503, not 429 or 200").toBe(503);
  expect(denied.retryAfter, "Retry-After should still be set on 503").toBeTruthy();

  // Confirm normal operation resumes after recovery.
  expect(
    (await invoke(limiter, ip)).allowed,
    "subsequent call after recovery should be allowed",
  ).toBe(true);

  await _resetRateLimitForTests();
});

test("oversized keyer input cannot bypass the limit", async () => {
  await _resetRateLimitForTests();

  // The contact and auth limiters key on the request body's `email` field,
  // and that body is parsed BEFORE the route's own validation runs. A
  // malicious caller can send an arbitrarily long string. The limiter must
  // still apply correctly — it must NOT fail the storage write (which
  // would push us into the storage-error path) just because the input
  // happens to be huge.
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 2,
    prefix: "test:oversized",
    // A 100KB string. Without internal hashing, this would overflow the
    // bucket-key column and break the insert.
    keyer: () => "x".repeat(100_000),
  });
  const ip = "10.0.0.42";

  expect(
    (await invoke(limiter, ip)).allowed,
    "1st oversized-key request should be allowed (within limit)",
  ).toBe(true);
  expect(
    (await invoke(limiter, ip)).allowed,
    "2nd oversized-key request should be allowed (within limit)",
  ).toBe(true);
  const blocked = await invoke(limiter, ip);
  expect(
    blocked.allowed,
    "3rd oversized-key request must be blocked — limit must still apply",
  ).toBe(false);
  expect(blocked.status).toBe(429);

  await _resetRateLimitForTests();
});

test("storage failure fails CLOSED with 503 (does not silently allow)", async () => {
  await _resetRateLimitForTests();

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    prefix: "test:fail-closed",
  });
  const ip = "10.0.0.55";

  // Inject a synthetic "store unavailable" error for the next call. The
  // middleware MUST refuse the request rather than silently letting it
  // through — otherwise an attacker who can briefly disrupt the store
  // could disable abuse protection on auth/contact for the duration.
  _failNextStorageCallForTests(new Error("synthetic: store unavailable"));
  const denied = await invoke(limiter, ip);
  expect(
    denied.allowed,
    "request must be denied when the rate-limit store is unavailable",
  ).toBe(false);
  expect(denied.status, "should be 503, not 429 or 200").toBe(503);
  expect(denied.retryAfter, "Retry-After should still be set on 503").toBeTruthy();

  // Confirm the next call works again (the failure was a one-shot injection).
  expect(
    (await invoke(limiter, ip)).allowed,
    "subsequent call after recovery should be allowed",
  ).toBe(true);

  await _resetRateLimitForTests();
});

test("expired window resets the bucket", async () => {
  await _resetRateLimitForTests();

  // 1ms window — guaranteed expired by the time the second request arrives.
  const limiter = rateLimit({ windowMs: 1, max: 1, prefix: "test:expiry" });
  const ip = "10.0.0.99";

  expect((await invoke(limiter, ip)).allowed).toBe(true);
  await new Promise((r) => setTimeout(r, 50));
  expect(
    (await invoke(limiter, ip)).allowed,
    "after window expires, bucket should reset and allow again",
  ).toBe(true);

  await _resetRateLimitForTests();
});
