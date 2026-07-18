import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

// Single-row status table that records the most recent execution of the
// background `app_rate_limit_buckets` pruner. Mirrors the `spam_events`
// equivalent (`spam_events_prune_status`) so the admin dashboard can show
// "last run / rows deleted / configured retention" for both pruners — even
// after a server restart, when any in-memory counter would be zero.
//
// The table is intentionally limited to one logical row (always id=1) — we
// only ever care about the latest result, not history. If history is needed
// later, switch the primary key to a timestamp and append on each run.
export const rateLimitBucketsPruneStatusTable = pgTable(
  "app_rate_limit_buckets_prune_status",
  {
    id: integer("id").primaryKey(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull(),
    lastDeleted: integer("last_deleted").notNull().default(0),
    lastRetentionDays: integer("last_retention_days").notNull(),
    lastError: text("last_error"),
    // Timestamp of the most recent SUCCESSFUL run (i.e. one that did not
    // record an error). Stays put when a failing run overwrites the row, so
    // operators (and the unhealthy-pruner notifier) can answer "how long has
    // it actually been since this thing last did its job?". Nullable so a
    // brand-new database, or one that has never seen a successful prune,
    // simply reports "no known success".
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  },
);

export const RATE_LIMIT_BUCKETS_PRUNE_STATUS_ROW_ID = 1;

export type RateLimitBucketsPruneStatus =
  typeof rateLimitBucketsPruneStatusTable.$inferSelect;
export type InsertRateLimitBucketsPruneStatus =
  typeof rateLimitBucketsPruneStatusTable.$inferInsert;
