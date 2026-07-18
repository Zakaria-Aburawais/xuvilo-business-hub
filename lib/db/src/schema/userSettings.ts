import { pgTable, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const userSettingsTable = pgTable(
  "user_settings",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 128 }).notNull(),
    value: text("value").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userKeyUniq: uniqueIndex("user_settings_user_key_uniq").on(table.userId, table.key),
  }),
);

export type UserSetting = typeof userSettingsTable.$inferSelect;
export type InsertUserSetting = typeof userSettingsTable.$inferInsert;
