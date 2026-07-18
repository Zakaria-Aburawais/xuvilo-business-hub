import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const clientsTable = pgTable(
  "user_clients",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull().default(""),
    company: varchar("company", { length: 255 }).notNull().default(""),
    email: varchar("email", { length: 320 }).notNull().default(""),
    phone: varchar("phone", { length: 64 }).notNull().default(""),
    address: text("address").notNull().default(""),
    city: varchar("city", { length: 128 }).notNull().default(""),
    country: varchar("country", { length: 64 }).notNull().default(""),
    taxId: varchar("tax_id", { length: 64 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    shortCode: varchar("short_code", { length: 64 }).notNull().default(""),
    rfqFormatNotes: text("rfq_format_notes").notNull().default(""),
    submissionEmail: varchar("submission_email", { length: 320 }).notNull().default(""),
    specialRequirements: text("special_requirements").notNull().default(""),
    industry: varchar("industry", { length: 128 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_clients_user_idx").on(table.userId),
  }),
);

export type UserClient = typeof clientsTable.$inferSelect;
export type InsertUserClient = typeof clientsTable.$inferInsert;
