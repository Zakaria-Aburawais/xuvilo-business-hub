import { afterEach, beforeEach, expect, test } from "vitest";
import { SPAM_EVENTS_RETENTION_DAYS_DEFAULT } from "@workspace/db";
import { getSpamEventsRetentionDays } from "./spamEventsPrune";

const ENV_KEY = "SPAM_EVENTS_RETENTION_DAYS";
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
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
});

test("falls back to default when env var is empty or whitespace", () => {
  process.env[ENV_KEY] = "";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
  process.env[ENV_KEY] = "   ";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
});

test("accepts a valid in-range integer override", () => {
  process.env[ENV_KEY] = "30";
  expect(getSpamEventsRetentionDays()).toBe(30);
});

test("floors fractional values rather than rounding", () => {
  process.env[ENV_KEY] = "45.9";
  expect(getSpamEventsRetentionDays()).toBe(45);
});

test("rejects values below the minimum retention floor", () => {
  // Floor is 7 days — anything smaller would also break the admin widget,
  // which queries up to 90 days of history.
  process.env[ENV_KEY] = "0";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
  process.env[ENV_KEY] = "-5";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
  process.env[ENV_KEY] = "6";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
});

test("rejects values above the maximum retention ceiling", () => {
  process.env[ENV_KEY] = "99999";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
});

test("rejects non-numeric values", () => {
  process.env[ENV_KEY] = "forever";
  expect(getSpamEventsRetentionDays()).toBe(SPAM_EVENTS_RETENTION_DAYS_DEFAULT);
});
