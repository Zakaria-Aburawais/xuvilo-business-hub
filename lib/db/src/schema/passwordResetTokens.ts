import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const passwordResetTokensTable = pgTable(
  "app_password_reset_tokens",
  {
    tokenHash: varchar("token_hash", { length: 128 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("app_password_reset_tokens_email_idx").on(table.email),
    expiresIdx: index("app_password_reset_tokens_expires_idx").on(table.expiresAt),
  }),
);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokensTable.$inferInsert;
