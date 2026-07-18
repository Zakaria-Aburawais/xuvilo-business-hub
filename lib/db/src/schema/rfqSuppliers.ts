import { pgTable, varchar, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const rfqSuppliersTable = pgTable(
  "rfq_suppliers",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull().default(""),
    country: varchar("country", { length: 64 }).notNull().default(""),
    city: varchar("city", { length: 128 }).notNull().default(""),
    address: text("address").notNull().default(""),
    contactName: varchar("contact_name", { length: 255 }).notNull().default(""),
    email: varchar("email", { length: 320 }).notNull().default(""),
    phone: varchar("phone", { length: 64 }).notNull().default(""),
    website: varchar("website", { length: 512 }).notNull().default(""),
    specialties: jsonb("specialties").notNull().default([]),
    isLocal: boolean("is_local").notNull().default(false),
    notes: text("notes").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("rfq_suppliers_user_idx").on(table.userId),
    activeIdx: index("rfq_suppliers_active_idx").on(table.active),
  }),
);

export type RfqSupplier = typeof rfqSuppliersTable.$inferSelect;
export type InsertRfqSupplier = typeof rfqSuppliersTable.$inferInsert;
