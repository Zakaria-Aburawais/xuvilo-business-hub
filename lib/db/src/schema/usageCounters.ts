import { pgTable, varchar, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const usageCountersTable = pgTable(
  "user_usage_counters",
  {
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    periodMonth: varchar("period_month", { length: 7 }).notNull(), // "YYYY-MM"
    documentsCreated: integer("documents_created").notNull().default(0),
    aiWriterGenerations: integer("ai_writer_generations").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: uniqueIndex("user_usage_counters_pk").on(table.userId, table.periodMonth),
  }),
);

export type UserUsageCounter = typeof usageCountersTable.$inferSelect;
export type InsertUserUsageCounter = typeof usageCountersTable.$inferInsert;
