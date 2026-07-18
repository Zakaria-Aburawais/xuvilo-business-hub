import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "app_users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull().default(""),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 16 }).notNull().default("user"),
    preferredLanguage: varchar("preferred_language", { length: 8 }).notNull().default("en"),
    tier: varchar("tier", { length: 32 }).notNull().default("free"),
    billingInterval: varchar("billing_interval", { length: 16 }),
    subscriptionStatus: varchar("subscription_status", { length: 32 }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: varchar("cancel_at_period_end", { length: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stripeCustomerIdx: index("app_users_stripe_customer_idx").on(table.stripeCustomerId),
  }),
);

export type AppUser = typeof usersTable.$inferSelect;
export type InsertAppUser = typeof usersTable.$inferInsert;
