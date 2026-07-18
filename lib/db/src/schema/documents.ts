import { pgTable, varchar, text, timestamp, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const documentsTable = pgTable(
  "user_documents",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull().default(""),
    clientName: varchar("client_name", { length: 255 }).notNull().default(""),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_documents_user_idx").on(table.userId),
    typeIdx: index("user_documents_type_idx").on(table.type),
    statusIdx: index("user_documents_status_idx").on(table.status),
  }),
);

export type UserDocument = typeof documentsTable.$inferSelect;
export type InsertUserDocument = typeof documentsTable.$inferInsert;
