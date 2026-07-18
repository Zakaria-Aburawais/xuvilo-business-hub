import { afterEach, beforeEach, expect, test } from "vitest";
import { RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT } from "@workspace/db";
import { getRateLimitBucketsRetentionDays } from "./rateLimitBucketsPrune";

const ENV_KEY = "RATE_LIMIT_BUCKETS_RETENTION_DAYS";
let originalValue: string | undefined;

beforeEach(() => {
  originalValue = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
});

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalValue;
  }
});

test("falls back to the schema default when env var is unset", () => {
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
});

test("falls back to default when env var is empty or whitespace", () => {
  process.env[ENV_KEY] = "";
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
  process.env[ENV_KEY] = "   ";
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
});

test("accepts a valid in-range integer override", () => {
  process.env[ENV_KEY] = "7";
  expect(getRateLimitBucketsRetentionDays()).toBe(7);
});

test("accepts the zero floor (most aggressive cleanup)", () => {
  // 0 is a valid value: the opportunistic in-process purge already deletes
  // rows where reset_at <= now, so a 0-day grace is safe.
  process.env[ENV_KEY] = "0";
  expect(getRateLimitBucketsRetentionDays()).toBe(0);
});

test("floors fractional values rather than rounding", () => {
  process.env[ENV_KEY] = "3.9";
  expect(getRateLimitBucketsRetentionDays()).toBe(3);
});

test("rejects negative values", () => {
  process.env[ENV_KEY] = "-1";
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
});

test("rejects values above the maximum retention ceiling", () => {
  process.env[ENV_KEY] = "99999";
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
});

test("rejects non-numeric values", () => {
  process.env[ENV_KEY] = "forever";
  expect(getRateLimitBucketsRetentionDays()).toBe(
    RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT,
  );
});
