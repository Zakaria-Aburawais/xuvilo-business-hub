import {
  pgTable,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const newsletterSubscribersTable = pgTable(
  "newsletter_subscribers",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 320 }).notNull().unique(),
    source: varchar("source", { length: 64 }).notNull().default("homepage"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (table) => ({
    createdIdx: index("newsletter_subscribers_created_idx").on(table.createdAt),
  }),
);

export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribersTable.$inferInsert;
