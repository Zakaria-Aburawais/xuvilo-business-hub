import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

// Default grace period (in days, past `reset_at`) before a background pruner
// in the API server deletes a stale `app_rate_limit_buckets` row. The rate
// limiter itself is correct without any cleanup — expired rows are recycled
// in place by the next request from the same key — so this purely controls
// how aggressively dormant rows are reaped to keep the table small. A short
// 1-day grace covers any clock skew between the API server and Postgres and
// gives the opportunistic in-process purge in `rateLimit.ts` plenty of time
// to fire first under normal traffic. Operators can override the value at
// runtime via `RATE_LIMIT_BUCKETS_RETENTION_DAYS` without touching code.
export const RATE_LIMIT_BUCKETS_RETENTION_DAYS_DEFAULT = 1;

export const rateLimitBucketsTable = pgTable(
  "app_rate_limit_buckets",
  {
    key: varchar("key", { length: 64 }).primaryKey(),
    count: integer("count").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    resetAtIdx: index("app_rate_limit_buckets_reset_at_idx").on(table.resetAt),
  }),
);

export type RateLimitBucket = typeof rateLimitBucketsTable.$inferSelect;
export type InsertRateLimitBucket = typeof rateLimitBucketsTable.$inferInsert;
