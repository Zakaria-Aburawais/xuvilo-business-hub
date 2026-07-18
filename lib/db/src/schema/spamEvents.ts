import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Default retention window for `spam_events` rows. The admin dashboard widget
// only ever looks back 7 days (and at most 90), so anything older is dead
// weight that would otherwise grow unbounded as bots keep submitting. A
// background pruner in the API server deletes rows older than this many days.
// Operators can override the value at runtime via the
// `SPAM_EVENTS_RETENTION_DAYS` env var without touching code.
export const SPAM_EVENTS_RETENTION_DAYS_DEFAULT = 90;

export const spamEventsTable = pgTable(
  "spam_events",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: varchar("source", { length: 32 }).notNull().default("contact"),
    kind: varchar("kind", { length: 32 }).notNull(),
    reason: varchar("reason", { length: 64 }).notNull().default(""),
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
  },
  (table) => ({
    createdIdx: index("spam_events_created_idx").on(table.createdAt),
    kindCreatedIdx: index("spam_events_kind_created_idx").on(
      table.kind,
      table.createdAt,
    ),
  }),
);

export type SpamEvent = typeof spamEventsTable.$inferSelect;
export type InsertSpamEvent = typeof spamEventsTable.$inferInsert;
